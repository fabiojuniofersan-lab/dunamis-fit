// Dunamis Fit — atualização segura da foto do próprio perfil do aluno.
// A alteração é feita no servidor para impedir que o aluno modifique outros campos do perfil.
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!token) return res.status(401).json({ ok: false, error: 'Não autenticado.' });
  if (!url || !serviceKey) return res.status(500).json({ ok: false, error: 'Configuração do servidor incompleta.' });

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
    const me = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } });
    const user = await me.json();
    if (!me.ok || !user?.id) return res.status(401).json({ ok: false, error: 'Sessão inválida.' });

    const photoUrl = String(req.body?.photoUrl || '');
    if (!photoUrl || photoUrl.length > 2000000) return res.status(400).json({ ok: false, error: 'Foto inválida ou muito grande.' });

    const profile = await api(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&role=eq.student&select=id,role`);
    const rows = await profile.json();
    if (!profile.ok || !rows?.[0]) return res.status(403).json({ ok: false, error: 'Somente alunos podem alterar a própria foto.' });

    const update = await api(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ photo_url: photoUrl })
    });
    if (!update.ok) return res.status(400).json({ ok: false, error: 'Não foi possível salvar a foto.' });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Dunamis Fit profile photo:', error);
    return res.status(500).json({ ok: false, error: error?.message || 'Erro ao salvar a foto.' });
  }
};
