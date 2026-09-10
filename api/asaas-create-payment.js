// Dunamis Fit — cria/recupera a cobrança Asaas da mensalidade atual do aluno.
// Idempotência: uma cobrança por aluno + vencimento, preservando o histórico no Supabase.
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

  const sb = (path, options = {}) => fetch(`${url}${path}`, {
    ...options,
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const aa = (path, options = {}) => fetch(`${asaasBase}${path}`, {
    ...options,
    headers: { access_token: asaasKey, 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const brToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const dueDateFor = day => {
    const [year, month] = brToday().split('-').map(Number);
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${year}-${String(month).padStart(2, '0')}-${String(Math.min(Math.max(Number(day) || 10, 1), last)).padStart(2, '0')}`;
  };

  try {
    const me = await fetch(`${url}/auth/v1/user`, { headers: { apikey: serviceKey, Authorization: `Bearer ${token}` } });
    const user = await me.json();
    if (!me.ok || !user?.id) return res.status(401).json({ error: 'Sessão inválida.' });

    const pr = await sb(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=id,full_name,email,phone,role`);
    const profile = (await pr.json())?.[0];
    const sr = await sb(`/rest/v1/students?id=eq.${encodeURIComponent(user.id)}&select=id,monthly_value,due_day,status,plan`);
    const student = (await sr.json())?.[0];
    if (!profile || !student || profile.role !== 'student') return res.status(404).json({ error: 'Aluno não encontrado.' });

    const due = dueDateFor(student.due_day);
    const externalReference = `${profile.id}:${due}`;

    // A linha do mês corrente é a fonte de verdade; o status antigo do aluno não pode bloquear outra competência.
    const existingResponse = await sb(`/rest/v1/payments?external_reference=eq.${encodeURIComponent(externalReference)}&select=id,status,gateway,gateway_payment_id,invoice_url,due_date,amount,method&limit=1`);
    const existing = (await existingResponse.json())?.[0];
    if (!existingResponse.ok) throw new Error('Não foi possível consultar a cobrança existente.');
    if (existing?.status === 'paid') return res.status(409).json({ error: 'Esta mensalidade já está paga.' });
    if (existing?.gateway_payment_id && existing?.invoice_url) {
      return res.status(200).json({ ok: true, reused: true, paymentId: existing.gateway_payment_id, invoiceUrl: existing.invoice_url, billingType: existing.method === 'Pix' ? 'PIX' : 'UNDEFINED', dueDate: due });
    }

    const method = req.body?.method === 'card' ? 'UNDEFINED' : 'PIX';
    const search = await aa(`/customers?email=${encodeURIComponent(profile.email)}`);
    const searchData = await search.json();
    if (!search.ok) throw new Error(searchData?.errors?.[0]?.description || 'Não foi possível localizar o cliente no Asaas.');

    let customerId = searchData?.data?.[0]?.id;
    if (!customerId) {
      const cr = await aa('/customers', {
        method: 'POST',
        body: JSON.stringify({ name: profile.full_name, email: profile.email, mobilePhone: profile.phone || undefined, externalReference: profile.id })
      });
      const cd = await cr.json();
      if (!cr.ok) throw new Error(cd?.errors?.[0]?.description || 'Não foi possível criar o cliente no Asaas.');
      customerId = cd.id;
    }

    const remoteSearch = await aa(`/payments?externalReference=${encodeURIComponent(externalReference)}`);
    const remoteData = await remoteSearch.json();
    if (!remoteSearch.ok) throw new Error(remoteData?.errors?.[0]?.description || 'Não foi possível consultar cobranças no Asaas.');
    let payment = remoteData?.data?.[0];

    // Se o Asaas já marcou a cobrança como recebida, não criamos outra e sincronizamos o histórico.
    if (payment && ['CONFIRMED', 'RECEIVED'].includes(payment.status)) {
      const sync = {
        amount: Number(payment.value || student.monthly_value),
        paid_at: payment.paymentDate || payment.confirmedDate || new Date().toISOString(),
        method: payment.billingType === 'PIX' ? 'Pix' : 'Cartão',
        status: 'paid', gateway: 'asaas', gateway_payment_id: payment.id,
        external_reference: externalReference, invoice_url: payment.invoiceUrl || null, updated_at: new Date().toISOString()
      };
      const saved = existing?.id
        ? await sb(`/rest/v1/payments?id=eq.${encodeURIComponent(existing.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(sync) })
        : await sb('/rest/v1/payments', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ student_id: profile.id, due_date: due, ...sync }) });
      if (!saved.ok && saved.status !== 409) throw new Error('O pagamento já foi recebido no Asaas, mas não foi sincronizado no Dunamis Fit.');
      return res.status(200).json({ ok: true, reused: true, paid: true, paymentId: payment.id, invoiceUrl: payment.invoiceUrl || null, billingType: payment.billingType, dueDate: due });
    }

    if (!payment) {
      const charge = await aa('/payments', {
        method: 'POST',
        body: JSON.stringify({ customer: customerId, billingType: method, value: Number(student.monthly_value), dueDate: due, description: `Dunamis Fit — ${student.plan}`, externalReference })
      });
      payment = await charge.json();
      if (!charge.ok) throw new Error(payment?.errors?.[0]?.description || 'Não foi possível criar a cobrança.');
    }

    const paymentRow = {
      student_id: profile.id, amount: Number(student.monthly_value), due_date: due,
      method: payment.billingType === 'PIX' ? 'Pix' : 'Cartão', status: 'pending', gateway: 'asaas',
      gateway_payment_id: payment.id, external_reference: externalReference, invoice_url: payment.invoiceUrl || null, updated_at: new Date().toISOString()
    };

    if (existing?.id) {
      const saved = await sb(`/rest/v1/payments?id=eq.${encodeURIComponent(existing.id)}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(paymentRow) });
      if (!saved.ok) throw new Error('A cobrança foi criada no Asaas, mas não foi registrada no histórico do Dunamis Fit.');
    } else {
      const saved = await sb('/rest/v1/payments', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(paymentRow) });
      if (!saved.ok) {
        const conflict = await sb(`/rest/v1/payments?external_reference=eq.${encodeURIComponent(externalReference)}&select=id`);
        const conflictRows = await conflict.json();
        if (!conflict.ok || !conflictRows?.[0]) throw new Error('A cobrança foi criada no Asaas, mas não foi registrada no histórico do Dunamis Fit.');
      }
    }

    return res.status(200).json({ ok: true, reused: Boolean(existing || remoteData?.data?.[0]), paymentId: payment.id, invoiceUrl: payment.invoiceUrl || null, billingType: payment.billingType || method, dueDate: due });
  } catch (error) {
    console.error('Dunamis Fit Asaas create:', error);
    return res.status(400).json({ error: error?.message || 'Não foi possível iniciar o pagamento.' });
  }
};
