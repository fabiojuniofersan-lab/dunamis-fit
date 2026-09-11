// Dunamis Fit — criação/atualização segura de alunos
module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  const accessToken = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!accessToken) return res.status(401).json({ error: 'Não autenticado.' });
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase server configuration missing.' });

  const api = (path, options = {}) => fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });

  try {
    const me = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}` } });
    const user = await me.json();
    if (!me.ok || !user?.id) return res.status(401).json({ error: 'Sessão inválida.' });

    const pr = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role`, { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } });
    const profiles = await pr.json();
    if (!pr.ok || profiles?.[0]?.role !== 'admin') return res.status(403).json({ error: 'Somente o administrador pode gerenciar alunos.' });

    const body = req.body || {};
    const { id, name, birth, email, password, phone, gender, plan, value, due, start, paymentMethod, weight, height } = body;
    if (!name || !email || !plan || !paymentMethod) return res.status(400).json({ error: 'Dados obrigatórios ausentes.' });
    if (gender && !['Feminino','Masculino','Outro','Prefiro não informar'].includes(gender)) return res.status(400).json({ error: 'Sexo inválido.' });
    if (!id && (!password || password.length < 6)) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
    if (id && password && password.length < 6) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });

    let uid = id || null;
    let previousStudent = null;
    if (uid) {
      const sr = await api(`/rest/v1/students?id=eq.${encodeURIComponent(uid)}&select=status,plan,monthly_value,due_day,start_date,payment_method`);
      const students = await sr.json();
      if (!sr.ok) throw new Error('Não foi possível consultar os dados atuais do aluno.');
      previousStudent = students?.[0] || null;

      const update = { email, email_confirm: true, user_metadata: { full_name: name } };
      if (password) update.password = password;
      const ur = await api(`/auth/v1/admin/users/${encodeURIComponent(uid)}`, { method: 'PUT', body: JSON.stringify(update) });
      const ud = await ur.json();
      if (!ur.ok) throw new Error(ud?.msg || ud?.message || 'Não foi possível atualizar a conta do aluno.');
    } else {
      const cr = await api('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: name } }) });
      const cd = await cr.json();
      if (!cr.ok) throw new Error(cd?.msg || cd?.message || 'Não foi possível criar a conta do aluno.');
      uid = cd.user?.id || cd.id;
      if (!uid) throw new Error('A conta do aluno não retornou um identificador.');
    }

    const pe = await api('/rest/v1/profiles?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: uid, role: 'student', full_name: name, email, phone: phone || null, birth_date: birth || null, gender: gender || null }) });
    if (!pe.ok) throw new Error('Não foi possível salvar o perfil do aluno.');

    const preservedStatus = previousStudent?.status || 'pending';
    const se = await api('/rest/v1/students?on_conflict=id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ id: uid, plan, monthly_value: Number(value) || 0, due_day: Math.min(Math.max(Number(due) || 10, 1), 31), start_date: start || null, payment_method: paymentMethod, status: preservedStatus }) });
    if (!se.ok) throw new Error('Não foi possível salvar os dados da mensalidade.');

    if (weight && height) {
      const er = await api(`/rest/v1/evaluations?student_id=eq.${encodeURIComponent(uid)}&select=weight,height&order=evaluation_date.desc&limit=1`);
      const latest = await er.json();
      if (!er.ok) throw new Error('Não foi possível consultar a última avaliação.');
      const last = latest?.[0];
      const changed = !last || Number(last.weight) !== Number(weight) || Number(last.height) !== Number(height);
      if (changed) {
        const ee = await api('/rest/v1/evaluations', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ student_id: uid, evaluation_date: new Date().toISOString().slice(0, 10), weight: Number(weight), height: Number(height) }) });
        if (!ee.ok) throw new Error('Não foi possível salvar a avaliação física.');
      }
    }

    return res.status(200).json({ ok: true, id: uid });
  } catch (error) {
    console.error('Dunamis Fit admin-student:', error);
    return res.status(400).json({ error: error?.message || 'Não foi possível salvar o aluno.' });
  }
};
