// Dunamis Fit — cobrança automática via WhatsApp Cloud API
// Executado diariamente pelo Vercel Cron. Segredos ficam somente nas variáveis de ambiente.

function json(data, status = 200) {
  return { status, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(data) };
}

function normalizePhone(value) {
  let phone = String(value || '').replace(/\D/g, '');
  if (!phone) return '';
  if (!phone.startsWith('55')) phone = '55' + phone;
  return phone;
}

function brazilToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function currentMonthRange(today) {
  const [year, month] = today.split('-').map(Number);
  return { year, month, start: `${year}-${String(month).padStart(2,'0')}-01` };
}

async function supabaseRequest(path, options = {}) {
  const url = `${process.env.SUPABASE_URL}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!response.ok) throw new Error(typeof data === 'string' ? data : JSON.stringify(data));
  return data;
}

async function sendTemplate(to, name, amount, dueDate) {
  const version = process.env.WHATSAPP_API_VERSION || 'v26.0';
  const template = process.env.WHATSAPP_TEMPLATE_LATE || 'dunamis_mensalidade_atrasada';
  const language = process.env.WHATSAPP_TEMPLATE_LANG || 'pt_BR';
  const endpoint = `https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: template,
        language: { code: language },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: amount },
            { type: 'text', text: dueDate }
          ]
        }]
      }
    })
  });

  const body = await response.text();
  let parsed = null;
  try { parsed = body ? JSON.parse(body) : null; } catch { parsed = body; }
  if (!response.ok) throw new Error(typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
  return parsed;
}

module.exports = async function handler(request, response) {
  try {
    if (request.method !== 'GET') return response.status(405).json({ ok: false, error: 'Method not allowed' });
    if (!process.env.CRON_SECRET || request.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return response.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length) return response.status(500).json({ ok: false, error: `Variáveis ausentes: ${missing.join(', ')}` });

    const today = brazilToday();
    const { year, month, start } = currentMonthRange(today);
    const day = Number(today.slice(8, 10));
    const students = await supabaseRequest('/rest/v1/students?select=id,monthly_value,due_day,status&status=neq.paid');
    const profiles = await supabaseRequest('/rest/v1/profiles?select=id,full_name,phone&role=eq.student');
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    let sent = 0, skipped = 0, failed = 0;
    const results = [];

    for (const student of students || []) {
      const profile = profileMap.get(student.id);
      const dueDay = Number(student.due_day || 1);
      const lastValidDay = daysInMonth(year, month);
      const effectiveDueDay = Math.min(dueDay, lastValidDay);
      if (day <= effectiveDueDay) { skipped++; continue; }

      const phone = normalizePhone(profile?.phone);
      if (!phone) { skipped++; results.push({ id: student.id, status: 'sem_whatsapp' }); continue; }

      const already = await supabaseRequest(`/rest/v1/notifications?select=id&user_id=eq.${student.id}&type=eq.whatsapp_overdue&created_at=gte.${encodeURIComponent(start + 'T00:00:00-03:00')}&limit=1`);
      if (already?.length) { skipped++; continue; }

      const dueDate = `${year}-${String(month).padStart(2,'0')}-${String(effectiveDueDay).padStart(2,'0')}`;
      try {
        await sendTemplate(phone, `R$ ${Number(student.monthly_value || 0).toLocaleString('pt-BR',{minimumFractionDigits:2})}`, dueDate);
        await supabaseRequest('/rest/v1/notifications', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            user_id: student.id,
            title: 'Cobrança enviada pelo WhatsApp',
            message: `Aviso de mensalidade em atraso enviado para ${profile?.full_name || 'aluno'}.`,
            type: 'whatsapp_overdue'
          })
        });
        sent++;
        results.push({ id: student.id, status: 'enviado' });
      } catch (error) {
        failed++;
        results.push({ id: student.id, status: 'erro', error: String(error.message || error).slice(0, 300) });
      }
    }

    return response.status(200).json({ ok: true, date: today, sent, skipped, failed, results });
  } catch (error) {
    console.error('Dunamis Fit WhatsApp cron:', error);
    return response.status(500).json({ ok: false, error: String(error.message || error) });
  }
};
