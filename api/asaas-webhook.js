// Dunamis Fit — recebe confirmações de pagamento do Asaas
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  if (expected && req.headers['asaas-access-token'] !== expected) return res.status(401).json({ error: 'Unauthorized' });
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase server configuration missing.' });
  const api = (path, options = {}) => fetch(`${url}${path}`, { ...options, headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
  try {
    const event = req.body || {};
    const payment = event.payment || {};
    const external = String(payment.externalReference || '');
    const [studentId, dueDate] = external.split(':');
    if (!studentId || !dueDate) return res.status(200).json({ ok: true, ignored: true });
    const received = ['PAYMENT_CONFIRMED','PAYMENT_RECEIVED'].includes(event.event) || ['CONFIRMED','RECEIVED'].includes(payment.status);
    if (!received) return res.status(200).json({ ok: true, ignored: true, event: event.event });
    const update = await api(`/rest/v1/payments?student_id=eq.${encodeURIComponent(studentId)}&due_date=eq.${encodeURIComponent(dueDate)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ amount: Number(payment.value || 0), paid_at: new Date().toISOString(), method: payment.billingType === 'PIX' ? 'Pix' : 'Cartão', status: 'paid' }) });
    if (!update.ok) throw new Error('Não foi possível atualizar o pagamento no Dunamis Fit.');
    const student = await api(`/rest/v1/students?id=eq.${encodeURIComponent(studentId)}&select=id,status`);
    const students = await student.json();
    if (!student.ok || !students?.[0]) throw new Error('Aluno não encontrado.');
    const st = await api(`/rest/v1/students?id=eq.${encodeURIComponent(studentId)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'paid' }) });
    if (!st.ok) throw new Error('Não foi possível atualizar o status do aluno.');
    const nr = await api('/rest/v1/notifications', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ user_id: studentId, title: 'Pagamento confirmado', message: `Sua mensalidade de R$ ${Number(payment.value || 0).toFixed(2).replace('.', ',')} foi confirmada.`, type: 'payment' }) });
    if (!nr.ok) console.error('Dunamis Fit: falha ao criar notificação de pagamento.');
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Dunamis Fit Asaas webhook:', error);
    return res.status(500).json({ error: error?.message || 'Webhook error' });
  }
};
