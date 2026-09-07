// Dunamis Fit — confirmação de pagamento
(function(){
  const sb=window.dunamisSupabase;
  if(!sb)return;
  window.pay=async function(id){
    try{
      const studentId=String(id);
      const {data:student,error:se}=await sb.from('students').select('id,monthly_value,due_day,payment_method').eq('id',studentId).maybeSingle();
      if(se)throw se;
      if(!student)throw new Error('Aluno não encontrado.');
      const now=new Date();
      const dueDate=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(Math.min(Math.max(Number(student.due_day)||1,1),28)).padStart(2,'0')}`;
      const paidAt=new Date().toISOString();
      const {data:existing,error:qe}=await sb.from('payments').select('id').eq('student_id',studentId).eq('due_date',dueDate).order('created_at',{ascending:false}).limit(1);
      if(qe)throw qe;
      let error;
      if(existing&&existing.length){
        ({error}=await sb.from('payments').update({amount:student.monthly_value,paid_at:paidAt,method:student.payment_method||'Pix',status:'paid'}).eq('id',existing[0].id));
      }else{
        ({error}=await sb.from('payments').insert({student_id:studentId,amount:student.monthly_value,due_date:dueDate,paid_at:paidAt,method:student.payment_method||'Pix',status:'paid'}));
      }
      if(error)throw error;
      const {error:ue}=await sb.from('students').update({status:'paid'}).eq('id',studentId);
      if(ue)throw ue;
      if(window.refreshCloudData)await window.refreshCloudData();
      if(window.render)window.render();
    }catch(e){
      console.error('Dunamis Fit pagamento:',e);
      alert('Não foi possível confirmar o pagamento: '+(e?.message||'erro desconhecido'));
    }
  };
})();
