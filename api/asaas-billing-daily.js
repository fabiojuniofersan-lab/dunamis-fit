// Dunamis Fit — prepara automaticamente as cobranças Asaas três dias antes do vencimento.
// Não envia WhatsApp. O objetivo é deixar a cobrança pronta para o aluno pagar dentro do app.
module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const asaasKey = process.env.ASAAS_API_KEY;
  const asaasBase = process.env.ASAAS_API_URL || 'https://api.asaas.com/v3';
  if (!url || !serviceKey || !asaasKey) return res.status(500).json({ ok: false, error: 'Configuração do gateway ainda não foi concluída.' });

  const sb = (path, options = {}) => fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const aa = (path, options = {}) => fetch(`${asaasBase}${path}`, {
    ...options,
    headers: { access_token: asaasKey, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const money = (v) => Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  try {
    const today = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) + 'T00:00:00Z');
    const year = today.getUTCFullYear();
    const month = today.getUTCMonth() + 1;
    const day = today.getUTCDate();
    const target = new Date(Date.UTC(year, month - 1, day + 3));
    const targetYear = target.getUTCFullYear();
    const targetMonth = target.getUTCMonth() + 1;
    const targetDay = target.getUTCDate();
    const targetIso = `${targetYear}-${String(targetMonth).padStart(2,'0')}-${String(targetDay).padStart(2,'0')}`;
    const targetPeriod = `${targetYear}-${String(targetMonth).padStart(2,'0')}`;
    const targetNextMonth = new Date(Date.UTC(targetYear, targetMonth, 1));
    const targetNextIso = `${targetNextMonth.getUTCFullYear()}-${String(targetNextMonth.getUTCMonth()+1).padStart(2,'0')}-01`;

    // O status mensal da cobrança é a fonte de verdade. Nunca usamos o status
    // agregado do aluno para decidir se a competência futura já foi paga.
    const [sr, pr, payr] = await Promise.all([
      sb('/rest/v1/students?select=id,monthly_value,due_day,status,plan,payment_method'),
      sb('/rest/v1/profiles?role=eq.student&select=id,full_name,email,phone'),
      sb(`/rest/v1/payments?due_date=gte.${targetPeriod}-01&due_date=lt.${targetNextIso}&select=student_id,due_date,status,external_reference,gateway_payment_id,invoice_url`)
    ]);
    const students = await sr.json();
    const profiles = await pr.json();
    const monthPayments = await payr.json();
    if (!sr.ok || !pr.ok || !payr.ok) throw new Error('Não foi possível carregar os dados de cobrança.');
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const paymentMap = new Map((monthPayments || []).map(p => [p.external_reference || `${p.student_id}:${p.due_date}`, p]));

    let created = 0, reused = 0, reconciled = 0, skipped = 0, failed = 0;
    const results = [];

    for (const student of students || []) {
      const profile = profileMap.get(student.id);
      if (!profile) { skipped++; continue; }
      const dueDay = Math.min(Math.max(Number(student.due_day) || 1, 1), new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate());
      if (dueDay !== targetDay) { skipped++; continue; }

      if (student.payment_method === 'Dinheiro') { skipped++; results.push({ id: student.id, status: 'dinheiro_presencial' }); continue; }

      const due = targetIso;
      const externalReference = `${student.id}:${due}`;
      const method = student.payment_method === 'Pix' ? 'Pix' : 'Cartão';
      try {
        let existing = paymentMap.get(externalReference) || null;
        if (existing?.status === 'paid') { skipped++; results.push({ id: student.id, status: 'ja_pago' }); continue; }
        if (existing?.gateway_payment_id) { reused++; results.push({ id: student.id, status: 'ja_preparado' }); continue; }

        const customerSearch = await aa(`/customers?email=${encodeURIComponent(profile.email)}`);
        const customerData = await customerSearch.json();
        if (!customerSearch.ok) throw new Error(customerData?.errors?.[0]?.description || 'Falha ao consultar cliente Asaas.');
        let customerId = customerData?.data?.[0]?.id;
        if (!customerId) {
          const cr = await aa('/customers', { method: 'POST', body: JSON.stringify({ name: profile.full_name, email: profile.email, mobilePhone: profile.phone || undefined, externalReference: profile.id }) });
          const cd = await cr.json();
          if (!cr.ok) throw new Error(cd?.errors?.[0]?.description || 'Falha ao criar cliente Asaas.');
          customerId = cd.id;
        }

        const remoteSearch = await aa(`/payments?externalReference=${encodeURIComponent(externalReference)}`);
        const remoteData = await remoteSearch.json();
        if (!remoteSearch.ok) throw new Error(remoteData?.errors?.[0]?.description || 'Falha ao consultar cobrança Asaas.');
        let payment = remoteData?.data?.[0];
        if (!payment) {
          const charge = await aa('/payments', {
            method: 'POST',
            body: JSON.stringify({ customer: customerId, billingType: method === 'Pix' ? 'PIX' : 'CREDIT_CARD', value: Number(student.monthly_value), dueDate: due, description: `Dunamis Fit — ${student.plan}`, externalReference })
          });
          payment = await charge.json();
          if (!charge.ok) throw new Error(payment?.errors?.[0]?.description || 'Falha ao criar cobrança Asaas.');
          created++;
        } else {
          reused++;
        }

        const remotePaid = ['CONFIRMED', 'RECEIVED'].includes(String(payment.status || '').toUpperCase());
        const localStatus = remotePaid ? 'paid' : 'pending';
        const payload = {
          student_id: student.id,
          amount: Number(payment.value ?? student.monthly_value),
          due_date: due,
          method: payment.billingType === 'PIX' ? 'Pix' : payment.billingType === 'CREDIT_CARD' ? 'Cartão' : method,
          status: localStatus,
          paid_at: remotePaid ? (payment.paymentDate || payment.confirmedDate || new Date().toISOString()) : null,
          gateway: 'asaas',
          gateway_payment_id: payment.id,
          external_reference: externalReference,
          invoice_url: payment.invoiceUrl || null,
          updated_at: new Date().toISOString()
        };
        const saved = existing
          ? await sb(`/rest/v1/payments?id=eq.${encodeURIComponent(existing.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) })
          : await sb('/rest/v1/payments', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
        if (!saved.ok) throw new Error('Cobrança criada no Asaas, mas não registrada no histórico local.');

        if (remotePaid) {
          const st = await sb(`/rest/v1/students?id=eq.${encodeURIComponent(student.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ status: 'paid' }) });
          if (!st.ok) throw new Error('Pagamento confirmado no Asaas, mas não foi possível atualizar o status do aluno.');
          reconciled++;
          results.push({ id: student.id, status: 'reconciliado_pago', amount: money(student.monthly_value), method });
        } else {
          results.push({ id: student.id, status: payment.invoiceUrl ? 'preparado' : 'preparado_sem_link', amount: money(student.monthly_value), method });
        }
      } catch (error) {
        failed++;
        results.push({ id: student.id, status: 'erro', error: String(error.message || error).slice(0, 300) });
      }
    }

    return res.status(200).json({ ok: true, targetDueDate: targetIso, created, reused, reconciled, skipped, failed, results });
  } catch (error) {
    console.error('Dunamis Fit Asaas billing cron:', error);
    return res.status(500).json({ ok: false, error: String(error.message || error) });
  }
};
