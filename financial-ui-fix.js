// Dunamis Fit — painel financeiro baseado no histórico real do mês corrente.
(function(){
  'use strict';
  const sb=window.dunamisSupabase;
  if(!sb)return;
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const brToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const currentMonth=()=>brToday().slice(0,7);
  const dueDate=(day)=>{const [y,m]=currentMonth().split('-').map(Number);const last=new Date(Date.UTC(y,m,0)).getUTCDate();return `${y}-${String(m).padStart(2,'0')}-${String(Math.min(Math.max(Number(day)||1,1),last)).padStart(2,'0')}`};
  function monthPayment(student){
    const month=currentMonth();
    const payments=Array.isArray(data?.payments)?data.payments:[];
    return payments.filter(p=>String(p.studentId||p.student_id)===String(student.id)&&String(p.dueDate||p.due_date||'').slice(0,7)===month).sort((a,b)=>String(b.dueDate||b.due_date).localeCompare(String(a.dueDate||a.due_date)))[0]||null;
  }
  function effectiveStatus(student){
    const p=monthPayment(student);
    if(p?.status==='paid')return 'paid';
    const due=dueDate(student.due);
    return brToday()>due?'late':'pending';
  }
  window.dashboard=function(){
    const students=Array.isArray(data?.students)?data.students:[];
    const rows=students.map(s=>({...s,monthStatus:effectiveStatus(s)}));
    const paid=rows.filter(s=>s.monthStatus==='paid');
    const late=rows.filter(s=>s.monthStatus==='late');
    const pending=rows.filter(s=>s.monthStatus==='pending');
    const total=rows.reduce((a,s)=>a+Number(s.value||0),0);
    const received=paid.reduce((a,s)=>a+Number(monthPayment(s)?.amount||s.value||0),0);
    const rate=rows.length?Math.round(paid.length/rows.length*100):0;
    return shell(header('Dashboard','Visão financeira atual da Dunamis Fit')+
      `<div class="grid"><div class="stat"><small>👥 Alunos ativos</small><b>${rows.length}</b><small>Base cadastrada</small></div><div class="stat"><small>💰 Receita prevista</small><b>R$ ${money(total)}</b><small>Mês corrente</small></div><div class="stat"><small>✅ Recebido</small><b>R$ ${money(received)}</b><small>${rate}% dos alunos pagos</small></div><div class="stat"><small>🔴 Inadimplentes</small><b>${late.length}</b><small>${pending.length} pendente(s)</small></div></div>`+
      `<div class="dashboard-grid"><div class="panel"><h3>Resumo financeiro</h3><span class="muted">Baseado nos pagamentos registrados no mês corrente.</span><div class="progress"><span style="width:${rate}%"></span></div><div class="metric-row"><span>Recebido</span><strong>R$ ${money(received)}</strong></div><div class="metric-row"><span>A receber</span><strong>R$ ${money(Math.max(total-received,0))}</strong></div><div class="metric-row"><span>Inadimplentes</span><strong>${late.length}</strong></div></div><div class="panel"><h3>Automação de cobrança</h3><p class="muted">O sistema prepara a cobrança Asaas 3 dias antes do vencimento, mostra o lembrete no app e envia WhatsApp somente quando houver atraso.</p><div class="notice success">✓ 3 dias antes: lembrete somente dentro do aplicativo</div><div class="notice danger">✓ Após o vencimento: aviso no aplicativo + WhatsApp</div></div></div>`+
      `<div class="panel"><div class="panel-head"><div><h3>Alunos em destaque</h3><span class="muted">Situação financeira do mês</span></div><button class="btn secondary small-btn" onclick="nav('students')">Ver todos</button></div>`+
      `<div class="table-wrap"><table class="table"><thead><tr><th>Aluno</th><th>Plano</th><th>Valor</th><th>Vencimento</th><th>Status</th></tr></thead><tbody>`+
      rows.slice(0,10).map(s=>`<tr><td><div class="person">${avatar(s,42)}<div><b>${esc(s.name)}</b><br><small>${esc(s.email)}</small></div></div></td><td>${esc(s.plan)}</td><td>R$ ${money(s.value)}</td><td>${fmtDate(dueDate(s.due))}</td><td><span class="badge ${s.monthStatus}">${statusText(s.monthStatus)}</span></td></tr>`).join('')+
      `</tbody></table></div></div>`);
  };
  window.payments=function(){
    if(!current||current.role!=='admin')return;
    const rows=(data.students||[]).map(s=>({...s,monthStatus:effectiveStatus(s)}));
    return shell(header('Pagamentos','Histórico e confirmação das mensalidades.')+
      `<div class="panel"><div class="panel-head"><div><h3>Mensalidades</h3><span class="muted">Os pagamentos confirmados ficam registrados no histórico do mês.</span></div><span class="integration"><i></i>Asaas integrado</span></div>`+
      rows.map(s=>`<div class="payment-row"><div class="person">${avatar(s,46)}<div><b>${esc(s.name)}</b><small>R$ ${money(s.value)} • vence ${fmtDate(dueDate(s.due))} • ${esc(s.paymentMethod||'Pix')}</small></div></div><div><span class="badge ${s.monthStatus}">${statusText(s.monthStatus)}</span>${s.monthStatus==='paid'?'<button class="btn secondary small-btn" disabled>Pago ✓</button>':`<button class="btn primary small-btn" onclick="pay('${esc(s.id)}')">Confirmar pagamento</button>`}</div></div>`).join('')+
      `</div>`);
  };
})();
