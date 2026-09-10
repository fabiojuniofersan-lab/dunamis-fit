// Dunamis Fit — recebe e reconcilia eventos de pagamento do Asaas.
// O webhook é idempotente e não depende de uma linha pré-existente no histórico.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!expected) return res.status(500).json({ error: 'ASAAS_WEBHOOK_TOKEN não configurado.' });
  if (req.headers['asaas-access-token'] !== expected) return res.status(401).json({ error: 'Unauthorized' });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase server configuration missing.' });

  const api = (path, options = {}) => fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
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

    const studentId = localPayment?.student_id || studentIdFromExternal;
    const dueDate = localPayment?.due_date || dueDateFromExternal;
    if (!studentId || !dueDate) return res.status(200).json({ ok: true, ignored: true, reason: 'missing_student_or_due_date' });

    const status = paidEvent ? 'paid' : overdueEvent ? 'late' : 'pending';
    const method = payment.billingType === 'PIX' ? 'Pix' : payment.billingType === 'CREDIT_CARD' ? 'Cartão' : (localPayment?.method || 'Pix');
    const paidAt = payment.paymentDate || payment.confirmedDate || (paidEvent ? new Date().toISOString() : null);
    const paymentData = {
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
      if (!student.ok || !students?.[0]) throw new Error('Aluno não encontrado.');
      const st = await api(`/rest/v1/students?id=eq.${encodeURIComponent(studentId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'paid' }) });
      if (!st.ok) throw new Error('Não foi possível atualizar o status do aluno.');

      const value = Number(payment.value || 0).toFixed(2).replace('.', ',');
      const nr = await api('/rest/v1/notifications', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: studentId, title: 'Pagamento confirmado', message: `Sua mensalidade de R$ ${value} foi confirmada.`, type: 'payment', dedupe_key: `payment:${paymentId}:student` }) });
      if (!nr.ok && nr.status !== 409) console.error('Dunamis Fit: falha ao criar notificação do aluno.');

      const admins = await api('/rest/v1/profiles?role=eq.admin&select=id,full_name');
      const adminRows = await admins.json();
      if (admins.ok) for (const admin of adminRows || []) {
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
