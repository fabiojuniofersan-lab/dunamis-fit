// Dunamis Fit — lembretes automáticos de mensalidade dentro do app.
// O cron é idempotente: cada aluno recebe no máximo uma ocorrência de cada tipo por competência.
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) return res.status(401).json({ error: 'Unauthorized' });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return res.status(500).json({ error: 'Supabase server configuration missing.' });

  const api = (path, options = {}) => fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });

  const brDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const [year, month, day] = brDate.split('-').map(Number);
  const today = new Date(Date.UTC(year, month - 1, day));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dueDateFor = (dueDay) => new Date(Date.UTC(year, month - 1, Math.min(Math.max(Number(dueDay) || 1, 1), daysInMonth)));
  const iso = (d) => d.toISOString().slice(0, 10);
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const period = `${year}-${String(month).padStart(2, '0')}`;

  try {
    const [sr, pr] = await Promise.all([
      api('/rest/v1/students?select=id,plan,monthly_value,due_day,status&order=due_day'),
      api('/rest/v1/profiles?role=eq.student&select=id,full_name,email')
    ]);
    const students = await sr.json();
    const profiles = await pr.json();
    if (!sr.ok || !pr.ok) throw new Error('Não foi possível carregar os alunos.');

    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const result = { created: 0, skipped: 0, overdue: 0 };

    for (const student of students || []) {
      if (student.status === 'paid') { result.skipped++; continue; }
      const profile = profileMap.get(student.id);
      if (!profile) { result.skipped++; continue; }

      const due = dueDateFor(student.due_day);
      const dueIso = iso(due);
      const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
      let type = null;
      let title = null;
      let message = null;

      if (diffDays === 3) {
        type = 'payment_reminder_3d';
        title = 'Mensalidade próxima do vencimento';
        message = `Sua mensalidade de R$ ${money(student.monthly_value)} vence em 3 dias (${dueIso}).`;
      } else if (diffDays === 0) {
        type = 'payment_due_today';
        title = 'Mensalidade vence hoje';
        message = `Sua mensalidade de R$ ${money(student.monthly_value)} vence hoje (${dueIso}).`;
      } else if (diffDays < 0) {
        type = 'payment_overdue';
        title = 'Mensalidade em atraso';
        message = `Sua mensalidade de R$ ${money(student.monthly_value)} está em atraso desde ${dueIso}.`;
        result.overdue++;
      }

      if (!type) { result.skipped++; continue; }

      const dedupeKey = `billing:${student.id}:${period}:${type}`;
      const nr = await api('/rest/v1/notifications', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ user_id: student.id, title, message, type, dedupe_key: dedupeKey })
      });
      if (nr.status === 409) { result.skipped++; continue; }
      if (!nr.ok) throw new Error('Não foi possível criar uma notificação.');
      result.created++;
    }

    return res.status(200).json({ ok: true, date: brDate, ...result });
  } catch (error) {
    console.error('Dunamis Fit notifications-daily:', error);
    return res.status(500).json({ error: error?.message || 'Erro ao processar notificações.' });
  }
};
