// Dunamis Fit — confirmação de pagamento (Supabase)
(function(){
  const sb=window.dunamisSupabase;
  if(!sb)return;

  function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
  function dueFor(day){
    const n=new Date();
    const d=Math.min(Math.max(Number(day)||1,1),28);
    return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  window.payments=function(){
    if(!current||current.role!=='admin')return;
    return shell(header('Pagamentos','Controle financeiro e confirmação de mensalidades.')+
      `<div class="panel"><div class="panel-head"><div><h3>Mensalidades</h3><span class="muted">Confirme pagamentos recebidos para atualizar o status do aluno.</span></div></div>`+
      (data.students||[]).map(s=>{
        const id=esc(s.id);
        const paid=s.status==='paid';
        return `<div class="payment-row"><div class="person">${avatar(s,46)}<div><b>${esc(s.name)}</b><small>R$ ${money(s.value)} • vence dia ${esc(s.due)} • ${esc(s.paymentMethod||'Pix')}</small></div></div><div><span class="badge ${statusClass(s.status)}">${statusText(s.status)}</span><button class="btn ${paid?'secondary':'primary'} small-btn" ${paid?'disabled':''} onclick="pay('${id}')">${paid?'Pago ✓':'Confirmar pagamento'}</button></div></div>`;
      }).join('')+
      `</div>`);
  };

  window.pay=async function(id){
    if(!current||current.role!=='admin')return alert('Somente o administrador pode confirmar pagamentos.');
    try{
      const studentId=String(id);
      const {data:student,error:se}=await sb.from('students').select('id,monthly_value,due_day,payment_method').eq('id',studentId).maybeSingle();
      if(se)throw se;
      if(!student)throw new Error('Aluno não encontrado.');

      const dueDate=dueFor(student.due_day);
      const paidAt=new Date().toISOString();
      const {data:existing,error:qe}=await sb.from('payments').select('id').eq('student_id',studentId).eq('due_date',dueDate).order('created_at',{ascending:false}).limit(1);
      if(qe)throw qe;

      let pe;
      if(existing&&existing.length){
        ({error:pe}=await sb.from('payments').update({amount:student.monthly_value,paid_at:paidAt,method:student.payment_method||'Pix',status:'paid'}).eq('id',existing[0].id));
      }else{
        ({error:pe}=await sb.from('payments').insert({student_id:studentId,amount:student.monthly_value,due_date:dueDate,paid_at:paidAt,method:student.payment_method||'Pix',status:'paid'}));
      }
      if(pe)throw pe;

      const {error:ue}=await sb.from('students').update({status:'paid'}).eq('id',studentId);
      if(ue)throw ue;

      // Registra a confirmação para o administrador sem bloquear o pagamento caso a notificação falhe.
      if(current.studentId){
        await sb.from('notifications').insert({user_id:current.studentId,title:'Pagamento confirmado',message:`Pagamento confirmado para ${studentId}.`,type:'payment'});
      }

      if(window.refreshCloudData)await window.refreshCloudData();
      if(window.render)window.render();
      alert('Pagamento confirmado com sucesso.');
    }catch(e){
      console.error('Dunamis Fit pagamento:',e);
      alert('Não foi possível confirmar o pagamento: '+(e?.message||'erro desconhecido'));
    }
  };
})();
