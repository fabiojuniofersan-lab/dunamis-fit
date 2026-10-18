// Dunamis Fit — recupera o QR Code Pix da cobrança Asaas do aluno autenticado.
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const asaasKey = process.env.ASAAS_API_KEY;
  const asaasBase = (process.env.ASAAS_API_URL || 'https://api.asaas.com/v3').trim().replace(/\/+$/, '');
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  if (!url || !serviceKey || !asaasKey) return res.status(500).json({ error: 'Configuração do gateway ainda não foi concluída.' });

  const sb = (path, options = {}) => fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const aa = (path, options = {}) => fetch(`${asaasBase}${path}`, {
    ...options,
    headers: { access_token: asaasKey, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });

  let stage = 'SUPABASE_AUTH';
  try {
    stage = 'SUPABASE_AUTH';
    const me = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } });
    const user = await me.json();
    if (!me.ok || !user?.id) return res.status(401).json({ error: 'Sessão inválida.' });

    stage = 'SUPABASE_PROFILE';
    const pr = await sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role`);
    const profileData = await pr.json();
    if (!pr.ok) throw new Error(`Falha ao consultar perfil (HTTP ${pr.status}).`);
    const profile = profileData?.[0];
    if (!profile || profile.role !== 'student') return res.status(403).json({ error: 'Somente alunos podem consultar esta cobrança.' });

    const due = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    stage = 'SUPABASE_PAYMENT_LOOKUP';
    const sr = await sb(`/rest/v1/payments?student_id=eq.${encodeURIComponent(user.id)}&due_date=lte.${due}&status=neq.paid&gateway=eq.asaas&select=id,gateway_payment_id,due_date,amount,status&order=due_date.desc&limit=1`);
    const local = (await sr.json())?.[0];
    if (!sr.ok) throw new Error('Não foi possível localizar a cobrança da mensalidade.');
    if (!local?.gateway_payment_id) return res.status(404).json({ error: 'A cobrança Pix ainda não está disponível.' });

    stage = 'ASAAS_PIX_QR';
    const qr = await aa(`/payments/${encodeURIComponent(local.gateway_payment_id)}/pixQrCode`);
    const data = await qr.json();
    if (!qr.ok) throw new Error(data?.errors?.[0]?.description || 'Não foi possível obter o QR Code Pix.');

    return res.status(200).json({ ok: true, paymentId: local.gateway_payment_id, amount: local.amount, dueDate: local.due_date, encodedImage: data.encodedImage || null, payload: data.payload || null, expirationDate: data.expirationDate || null });
  } catch (error) {
    const message = String(error?.message || 'Erro desconhecido');
    console.error('Dunamis Fit Asaas Pix failed', {
      stage,
      name: error?.name || 'Error',
      message: message.slice(0, 240),
      asaasHost: (() => { try { return new URL(asaasBase).host; } catch { return 'URL_INVALIDA'; } })()
    });
    const isFetchFailure = /fetch failed|network|timeout|ENOTFOUND|ECONN|EAI_AGAIN/i.test(message);
    return res.status(isFetchFailure ? 502 : 400).json({
      error: isFetchFailure ? `Falha de conexão na etapa ${stage}.` : message,
      stage
    });
  }
};
