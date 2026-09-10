// Dunamis Fit — confirmação de pagamento (Supabase)
(function(){
  const sb=window.dunamisSupabase;
  if(!sb)return;
  function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;')}
  function brazilToday(){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
  function dueFor(day){
    const today=brazilToday();
    const [y,m]=today.split('-').map(Number);
    const lastDay=new Date(Date.UTC(y,m,0)).getUTCDate();
    const d=Math.min(Math.max(Number(day)||1,1),lastDay);
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }
  window.payments=function(){
    if(!current||current.role!=='admin')return;
    return shell(header('Pagamentos','Controle financeiro e confirmação de mensalidades.')+
      `<div class="panel"><div class="panel-head"><div><h3>Mensalidades</h3><span class="muted">Confirme pagamentos recebidos para atualizar o status do aluno.</span></div></div>`+
      (data.students||[]).map(s=>{
        const id=esc(s.id); const currentMonth=brazilToday().slice(0,7);
        const paid=(data.payments||[]).some(p=>String(p.studentId||p.student_id)===String(s.id)&&String(p.dueDate||p.due_date||'').slice(0,7)===currentMonth&&p.status==='paid');
        return `<div class="payment-row"><div class="person">${avatar(s,46)}<div><b>${esc(s.name)}</b><small>R$ ${money(s.value)} • vence dia ${esc(s.due)} • ${esc(s.paymentMethod||'Pix')}</small></div></div><div><span class="badge ${statusClass(paid?'paid':s.status)}">${statusText(paid?'paid':s.status)}</span><button class="btn ${paid?'secondary':'primary'} small-btn" ${paid?'disabled':''} onclick="pay('${id}')">${paid?'Pago ✓':'Confirmar pagamento'}</button></div></div>`;
      }).join('')+
      `</div>`);
  };
  window.pay=async function(id){
    if(!current||current.role!=='admin')return alert('Somente o administrador pode confirmar pagamentos.');
    try{
      const studentId=String(id);
      const {data:student,error:se}=await sb.from('students').select('id,monthly_value,due_day,payment_method').eq('id',studentId).maybeSingle();
      if(se)throw se;if(!student)throw new Error('Aluno não encontrado.');
      const dueDate=dueFor(student.due_day),paidAt=new Date().toISOString();
      const {data:existing,error:qe}=await sb.from('payments').select('id,status').eq('student_id',studentId).eq('due_date',dueDate).maybeSingle();
      if(qe)throw qe;
      let pe;
      const payload={amount:student.monthly_value,paid_at:paidAt,method:student.payment_method||'Pix',status:'paid',updated_at:paidAt};
      if(existing){({error:pe}=await sb.from('payments').update(payload).eq('id',existing.id));}
      else{({error:pe}=await sb.from('payments').insert({student_id:studentId,due_date:dueDate,...payload}));}
      if(pe)throw pe;
      const {error:ue}=await sb.from('students').update({status:'paid'}).eq('id',studentId);if(ue)throw ue;
      const adminId=String(current.id||current.userId||current.studentId||'');
      if(adminId){
        const dedupe=`manual_payment:${studentId}:${dueDate}:${adminId}`;
        const {data:already}=await sb.from('notifications').select('id').eq('dedupe_key',dedupe).limit(1);
        if(!already?.length)await sb.from('notifications').insert({user_id:adminId,title:'Pagamento confirmado',message:`Pagamento confirmado: ${studentId} — R$ ${money(student.monthly_value)}`,type:'payment',dedupe_key:dedupe});
      }
      if(window.refreshCloudData)await window.refreshCloudData();
      if(window.render)window.render();
      alert('Pagamento confirmado com sucesso.');
    }catch(e){console.error('Dunamis Fit pagamento:',e);alert('Não foi possível confirmar o pagamento: '+(e?.message||'erro desconhecido'));}
  };
})();