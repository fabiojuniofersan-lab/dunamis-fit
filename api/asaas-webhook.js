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
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  try {
    const event = req.body || {};
    const payment = event.payment || {};
    const external = String(payment.externalReference || '');
    const [studentId, dueDate] = external.split(':');
    if (!studentId || !dueDate || !payment.id) return res.status(200).json({ ok: true, ignored: true });

    const received = ['PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED'].includes(event.event) || ['CONFIRMED', 'RECEIVED'].includes(payment.status);
    if (!received) return res.status(200).json({ ok: true, ignored: true, event: event.event });

    const method = payment.billingType === 'PIX' ? 'Pix' : 'Cartão';
    const paidAt = payment.paymentDate || payment.confirmedDate || new Date().toISOString();
    const paymentData = {
      amount: Number(payment.value || 0),
      paid_at: paidAt,
      method,
      status: 'paid',
      gateway: 'asaas',
      gateway_payment_id: payment.id,
      external_reference: external,
      invoice_url: payment.invoiceUrl || null,
      updated_at: new Date().toISOString()
    };

    let update = await api(`/rest/v1/payments?gateway_payment_id=eq.${encodeURIComponent(payment.id)}`, {
      method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(paymentData)
    });
    let rows = await update.json().catch(() => []);
    if (!update.ok) throw new Error('Não foi possível atualizar o histórico de pagamento.');

    if (!rows?.length) {
      update = await api(`/rest/v1/payments?external_reference=eq.${encodeURIComponent(external)}`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(paymentData)
      });
      rows = await update.json().catch(() => []);
      if (!update.ok) throw new Error('Não foi possível reconciliar o histórico de pagamento.');
    }

    if (!rows?.length) {
      const insert = await api('/rest/v1/payments', {
        method: 'POST', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ student_id: studentId, due_date: dueDate, ...paymentData })
      });
      const inserted = await insert.json().catch(() => []);
      if (!insert.ok && insert.status !== 409) throw new Error('Não foi possível registrar o pagamento confirmado.');
      rows = inserted;
    }

    const student = await api(`/rest/v1/students?id=eq.${encodeURIComponent(studentId)}&select=id,status`);
    const students = await student.json();
    if (!student.ok || !students?.[0]) throw new Error('Aluno não encontrado.');

    const st = await api(`/rest/v1/students?id=eq.${encodeURIComponent(studentId)}`, {
      method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'paid' })
    });
    if (!st.ok) throw new Error('Não foi possível atualizar o status do aluno.');

    const value = Number(payment.value || 0).toFixed(2).replace('.', ',');
    const nr = await api('/rest/v1/notifications', {
      method: 'POST', headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id: studentId,
        title: 'Pagamento confirmado',
        message: `Sua mensalidade de R$ ${value} foi confirmada.`,
        type: 'payment',
        dedupe_key: `payment:${payment.id}:student`
      })
    });
    if (!nr.ok && nr.status !== 409) console.error('Dunamis Fit: falha ao criar notificação do aluno.');

    const admins = await api('/rest/v1/profiles?role=eq.admin&select=id,full_name');
    const adminRows = await admins.json();
    if (admins.ok) {
      for (const admin of adminRows || []) {
        const ar = await api('/rest/v1/notifications', {
          method: 'POST', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: admin.id,
            title: 'Pagamento confirmado',
            message: `Pagamento de mensalidade confirmado: R$ ${value}.`,
            type: 'payment_received_admin',
            dedupe_key: `payment:${payment.id}:admin:${admin.id}`
          })
        });
        if (!ar.ok && ar.status !== 409) console.error('Dunamis Fit: falha ao notificar administrador.');
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Dunamis Fit Asaas webhook:', error);
    return res.status(500).json({ error: error?.message || 'Webhook error' });
  }
};
