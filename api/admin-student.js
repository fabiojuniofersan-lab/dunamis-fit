// Dunamis Fit — criação/atualização segura de alunos
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!accessToken) return res.status(401).json({ error: 'Não autenticado.' });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase server configuration missing.' });

  const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData?.user) return res.status(401).json({ error: 'Sessão inválida.' });

  const { data: profile, error: profileError } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
  if (profileError || profile?.role !== 'admin') return res.status(403).json({ error: 'Somente o administrador pode gerenciar alunos.' });

  const body = req.body || {};
  const { id, name, birth, email, password, phone, plan, value, due, start, paymentMethod, weight, height } = body;
  if (!name || !email || !plan || !paymentMethod) return res.status(400).json({ error: 'Dados obrigatórios ausentes.' });
  if (!id && (!password || password.length < 6)) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  if (id && password && password.length < 6) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });

  try {
    let uid = id || null;
    if (uid) {
      const update = { email, user_metadata: { full_name: name } };
      if (password) update.password = password;
      const { error } = await admin.auth.admin.updateUserById(uid, update);
      if (error) throw error;
    } else {
      const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
      if (error) throw error;
      uid = created.user.id;
    }

    const { error: pe } = await admin.from('profiles').upsert({ id: uid, role: 'student', full_name: name, email, phone: phone || null, birth_date: birth || null }, { onConflict: 'id' });
    if (pe) throw pe;

    const { error: se } = await admin.from('students').upsert({ id: uid, plan, monthly_value: Number(value) || 0, due_day: Number(due) || 10, start_date: start || null, payment_method: paymentMethod, status: 'pending' }, { onConflict: 'id' });
    if (se) throw se;

    if (weight && height) {
      const { error: ee } = await admin.from('evaluations').insert({ student_id: uid, evaluation_date: new Date().toISOString().slice(0, 10), weight: Number(weight), height: Number(height) });
      if (ee) throw ee;
    }

    return res.status(200).json({ ok: true, id: uid });
  } catch (error) {
    console.error('Dunamis Fit admin-student:', error);
    return res.status(400).json({ error: error?.message || 'Não foi possível salvar o aluno.' });
  }
};
