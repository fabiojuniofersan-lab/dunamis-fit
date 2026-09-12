// Dunamis Fit — recebe e reconcilia eventos de pagamento do Asaas.
// O webhook é idempotente e aceita tanto cobranças criadas pelo app quanto testes criados no Sandbox.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected) return res.status(500).json({ error: 'ASAAS_WEBHOOK_TOKEN não configurado.' });
  if (req.headers['asaas-access-token'] !== expected) return res.status(401).json({ error: 'Unauthorized' });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const asaasKey = process.env.ASAAS_API_KEY;
  const asaasBase = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase server configuration missing.' });

  const api = (path, options = {}) => fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });

  const asaas = (path, options = {}) => fetch(`${asaasBase}${path}`, {
    ...options,
    headers: { access_token: asaasKey || '', 'Content-Type': 'application/json', ...(options.headers || {}) }
  });

  try {
    const event = req.body || {};
    const payment = event.payment || {};
    const paymentId = String(payment.id || '');
    const external = String(payment.externalReference || '');
    const [studentIdFromExternal, dueDateFromExternal] = external.split(':');
    if (!paymentId) return res.status(200).json({ ok: true, ignored: true });

    const paidEvent = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event.event) || ['CONFIRMED', 'RECEIVED'].includes(payment.status);
    const overdueEvent = event.event === 'PAYMENT_OVERDUE' || payment.status === 'OVERDUE';
    const cancelledEvent = ['PAYMENT_CANCELLED', 'PAYMENT_REFUNDED'].includes(event.event) || ['CANCELLED', 'REFUNDED'].includes(payment.status);
    if (!paidEvent && !overdueEvent && !cancelledEvent) return res.status(200).json({ ok: true, ignored: true, event: event.event });

    const byGateway = await api(`/rest/v1/payments?gateway_payment_id=eq.${encodeURIComponent(paymentId)}&select=id,student_id,due_date,status,external_reference,method&limit=1`);
    if (!byGateway.ok) throw new Error('Não foi possível localizar o pagamento pelo ID do gateway.');
    let localPayment = (await byGateway.json())?.[0] || null;

    if (!localPayment && external) {
      const byExternal = await api(`/rest/v1/payments?external_reference=eq.${encodeURIComponent(external)}&select=id,student_id,due_date,status,external_reference,method&limit=1`);
      if (!byExternal.ok) throw new Error('Não foi possível localizar o pagamento pela referência externa.');
      localPayment = (await byExternal.json())?.[0] || null;
    }

    let studentId = localPayment?.student_id || studentIdFromExternal || '';
    let dueDate = localPayment?.due_date || dueDateFromExternal || payment.dueDate || '';

    // Valida o aluno antes de alterar qualquer dado. Isso evita que uma referência antiga/incorreta
    // (por exemplo, uma referência ligada ao administrador) provoque HTTP 500.
    if (studentId) {
      const sr = await api(`/rest/v1/students?id=eq.${encodeURIComponent(studentId)}&select=id`);
      if (!sr.ok) throw new Error('Não foi possível validar o aluno.');
      if (!(await sr.json())?.[0]) studentId = '';
    }

    // Cobranças criadas manualmente no Sandbox podem não ter externalReference.
    // Nesses casos, resolve o aluno pelo cliente Asaas -> e-mail -> profile/student.
    if (!studentId && payment.customer && asaasKey) {
      const cr = await asaas(`/customers/${encodeURIComponent(String(payment.customer))}`);
      if (cr.ok) {
        const customer = await cr.json();
        const email = String(customer?.email || '').trim();
        if (email) {
          const pr = await api(`/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&role=eq.student&select=id&limit=1`);
          if (!pr.ok) throw new Error('Não foi possível localizar o perfil do aluno.');
          const profile = (await pr.json())?.[0];
          if (profile?.id) {
            const sr = await api(`/rest/v1/students?id=eq.${encodeURIComponent(profile.id)}&select=id`);
            if (!sr.ok) throw new Error('Não foi possível validar o aluno pelo perfil.');
            if ((await sr.json())?.[0]) studentId = profile.id;
          }
        }
      }
    }

    if (!dueDate) dueDate = payment.dueDate || '';
    if (!studentId || !dueDate) {
      // Evento válido, porém sem vínculo suficiente para reconciliação. Retornar 200 evita
      // reentregas infinitas do Asaas para uma cobrança que não pertence ao histórico local.
      return res.status(200).json({ ok: true, ignored: true, reason: 'missing_student_or_due_date' });
    }

    const status = paidEvent ? 'paid' : overdueEvent ? 'late' : 'pending';
    const method = payment.billingType === 'PIX' ? 'Pix' : payment.billingType === 'CREDIT_CARD' ? 'Cartão' : (localPayment?.method || 'Pix');
    const paidAt = payment.paymentDate || payment.confirmedDate || (paidEvent ? new Date().toISOString() : null);
    const paymentData = {
      student_id: studentId,
      amount: Number(payment.value || 0),
      paid_at: paidAt,
      method,
      status,
      gateway: 'asaas',
      gateway_payment_id: paymentId,
      external_reference: external || localPayment?.external_reference || `${studentId}:${dueDate}`,
      invoice_url: payment.invoiceUrl || null,
      updated_at: new Date().toISOString()
    };

    if (localPayment?.id) {
      const update = await api(`/rest/v1/payments?id=eq.${encodeURIComponent(localPayment.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(paymentData) });
      if (!update.ok) throw new Error('Não foi possível atualizar o histórico de pagamento.');
    } else {
      const insert = await api('/rest/v1/payments', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ student_id: studentId, due_date: dueDate, ...paymentData }) });
      if (!insert.ok && insert.status !== 409) throw new Error('Não foi possível registrar o pagamento recebido.');
      if (!insert.ok) {
        const retry = await api(`/rest/v1/payments?student_id=eq.${encodeURIComponent(studentId)}&due_date=eq.${encodeURIComponent(dueDate)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(paymentData) });
        if (!retry.ok) throw new Error('Não foi possível reconciliar o pagamento concorrente.');
      }
    }

    if (paidEvent) {
      const student = await api(`/rest/v1/students?id=eq.${encodeURIComponent(studentId)}&select=id,status`);
      const students = await student.json();
      if (!student.ok || !students?.[0]) return res.status(200).json({ ok: true, ignored: true, reason: 'student_not_found' });

      const st = await api(`/rest/v1/students?id=eq.${encodeURIComponent(studentId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'paid' }) });
      if (!st.ok) throw new Error('Não foi possível atualizar o status do aluno.');

      const value = Number(payment.value || 0).toFixed(2).replace('.', ',');
      const nr = await api('/rest/v1/notifications', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: studentId, title: 'Pagamento confirmado', message: `Sua mensalidade de R$ ${value} foi confirmada.`, type: 'payment', dedupe_key: `payment:${paymentId}:student` }) });
      if (!nr.ok && nr.status !== 409) console.error('Dunamis Fit: falha ao criar notificação do aluno.');

      const admins = await api('/rest/v1/profiles?role=eq.admin&select=id');
      const adminRows = admins.ok ? await admins.json() : [];
      for (const admin of adminRows || []) {
        const ar = await api('/rest/v1/notifications', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: admin.id, title: 'Pagamento confirmado', message: `Pagamento de mensalidade confirmado: R$ ${value}.`, type: 'payment_received_admin', dedupe_key: `payment:${paymentId}:admin:${admin.id}` }) });
        if (!ar.ok && ar.status !== 409) console.error('Dunamis Fit: falha ao notificar administrador.');
      }
    }

    return res.status(200).json({ ok: true, status });
  } catch (error) {
    console.error('Dunamis Fit Asaas webhook:', error);
    return res.status(500).json({ error: error?.message || 'Webhook error' });
  }
};
