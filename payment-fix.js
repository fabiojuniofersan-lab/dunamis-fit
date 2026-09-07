// Dunamis Fit — confirmação de pagamento
(function(){
  const sb=window.dunamisSupabase;
  if(!sb)return;
  const dueFor=(day)=>{
    const d=new Date();
    const y=d.getFullYear(),m=d.getMonth()+1;
    const dd=Math.min(Math.max(Number(day)||1,1),28);
    return `${y}-${String(m).padStart(2,'0')}-${String(dd).padStart(2,'0')}`;
  };
  window.pay=async function(id){
    if(!current||current.role!=='admin')return alert('Somente o administrador pode confirmar pagamentos.');
    const s=data?.students?.find(x=>String(x.id)===String(id));
    if(!s)return alert('Aluno não encontrado.');
    const due=dueFor(s.due);
    try{
      const now=new Date().toISOString();
      const q=await sb.from('payments').select('id').eq('student_id',s.id).eq('due_date',due).order('created_at',{ascending:false}).limit(1);
      if(q.error)throw q.error;
      let r;
      if(q.data&&q.data.length){
        r=await sb.from('payments').update({amount:s.value,paid_at:now,method:s.paymentMethod,status:'paid'}).eq('id',q.data[0].id);
      }else{
        r=await sb.from('payments').insert({student_id:s.id,amount:s.value,due_date:due,paid_at:now,method:s.paymentMethod,status:'paid'});
      }
      if(r.error)throw r.error;
      const st=await sb.from('students').update({status:'paid'}).eq('id',s.id);
      if(st.error)throw st.error;
      if(current.id){
        const notification=await sb.from('notifications').insert({
          user_id:current.id,
          title:'Pagamento confirmado',
          message:`Pagamento confirmado: ${s.name} — R$ ${Number(s.value||0).toFixed(2).replace('.',',')}`,
          type:'payment'
        });
        if(notification.error)console.warn('Notificação não registrada:',notification.error);
      }
      await refreshCloudData();
      render();
      alert('Pagamento confirmado com sucesso.');
    }catch(e){
      console.error('Dunamis Fit pagamento:',e);
      alert('Não foi possível confirmar o pagamento. Verifique a conexão e tente novamente.');
    }
  };
})();
