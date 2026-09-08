// Dunamis Fit — cria cobrança Asaas para a mensalidade atual do aluno
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const asaasKey = process.env.ASAAS_API_KEY;
  const asaasBase = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  if (!url || !serviceKey || !asaasKey) return res.status(500).json({ error: 'Configuração do gateway ainda não foi concluída.' });
  const sb = (path, options = {}) => fetch(`${url}${path}`, { ...options, headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) } });
  const aa = (path, options = {}) => fetch(`${asaasBase}${path}`, { ...options, headers: { access_token: asaasKey, 'Content-Type': 'application/json', ...(options.headers || {}) } });
  try {
    const me = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } });
    const user = await me.json();
    if (!me.ok || !user?.id) return res.status(401).json({ error: 'Sessão inválida.' });
    const pr = await sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,full_name,email,phone`);
    const profile = (await pr.json())?.[0];
    const sr = await sb(`/rest/v1/students?id=eq.${encodeURIComponent(user.id)}&select=id,monthly_value,due_day,status,plan`);
    const student = (await sr.json())?.[0];
    if (!profile || !student) return res.status(404).json({ error: 'Aluno não encontrado.' });
    if (student.status === 'paid') return res.status(409).json({ error: 'Esta mensalidade já está paga.' });
    const method = req.body?.method === 'card' ? 'UNDEFINED' : 'PIX';
    const now = new Date();
    const due = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(Math.min(Math.max(Number(student.due_day)||10,1),28)).padStart(2,'0')}`;
    const search = await aa(`/customers?email=${encodeURIComponent(profile.email)}`);
    const searchData = await search.json();
    if (!search.ok) throw new Error(searchData?.errors?.[0]?.description || 'Não foi possível localizar o cliente no Asaas.');
    let customerId = searchData?.data?.[0]?.id;
    if (!customerId) {
      const cr = await aa('/customers', { method: 'POST', body: JSON.stringify({ name: profile.full_name, email: profile.email, mobilePhone: profile.phone || undefined, externalReference: profile.id }) });
      const cd = await cr.json();
      if (!cr.ok) throw new Error(cd?.errors?.[0]?.description || 'Não foi possível criar o cliente no Asaas.');
      customerId = cd.id;
    }
    const charge = await aa('/payments', { method: 'POST', body: JSON.stringify({ customer: customerId, billingType: method, value: Number(student.monthly_value), dueDate: due, description: `Dunamis Fit — ${student.plan}`, externalReference: `${profile.id}:${due}` }) });
    const payment = await charge.json();
    if (!charge.ok) throw new Error(payment?.errors?.[0]?.description || 'Não foi possível criar a cobrança.');
    return res.status(200).json({ ok: true, paymentId: payment.id, invoiceUrl: payment.invoiceUrl || null, billingType: method, dueDate: due });
  } catch (error) {
    console.error('Dunamis Fit Asaas create:', error);
    return res.status(400).json({ error: error?.message || 'Não foi possível iniciar o pagamento.' });
  }
};
