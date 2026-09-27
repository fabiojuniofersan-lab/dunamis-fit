// Dunamis Fit — cadastro de alunos sem confirmação manual de e-mail
(function(){
  const sb=window.dunamisSupabase;
  if(!sb)return;
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  window.saveStudent=async function(id){
    if(!current||current.role!=='admin')return alert('Somente o administrador pode cadastrar alunos.');
    const old=id?data.students.find(x=>String(x.id)===String(id)):null;
    const name=String(document.getElementById('sn')?.value||'').trim();
    const birth=document.getElementById('sb')?.value||'';
    const email=String(document.getElementById('se')?.value||'').trim().toLowerCase();
    const password=String(document.getElementById('spw')?.value||'');
    const phone=String(document.getElementById('sp')?.value||'').trim();
    const genderEl=[...document.querySelectorAll('.modal .field')].find(el=>/sexo/i.test(el.querySelector('label')?.textContent||''))?.querySelector('select,input');
    const gender=genderEl?.value||null;
    const plan=document.getElementById('spl')?.value||'4 dias por semana';
    const value=Number(document.getElementById('sv')?.value)||PLANS[plan];
    const due=Number(document.getElementById('sd')?.value||10);
    const start=document.getElementById('sst')?.value||'';
    const paymentMethod=document.getElementById('spm')?.value||'Pix';
    const weight=Number(document.getElementById('sw')?.value||0);
    const height=Number(document.getElementById('sh')?.value||0);
    if(!name||!email)return alert('Informe nome e e-mail.');
    if(!id&&password.length<6)return alert('A senha deve ter pelo menos 6 caracteres.');
    if(id&&password&&password.length<6)return alert('A nova senha deve ter pelo menos 6 caracteres.');
    if(data.students.some(x=>x.email===email&&String(x.id)!==String(id)))return alert('Este e-mail já está cadastrado.');
    const {data:sessionData,error:sessionError}=await sb.auth.getSession();
    if(sessionError||!sessionData?.session)return alert('A sessão do administrador expirou. Entre novamente.');
    const button=document.querySelector('.modal .btn.primary');
    if(button){button.disabled=true;button.textContent='Salvando...'}
    try{
      const payload={id:id||null,name,birth,email,password:password||null,phone,gender,plan,value,due,start,paymentMethod,weight:weight||null,height:height||null,status:old?.status||'pending'};
      let response;
      try{
        response=await fetch('/api/admin-student',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${sessionData.session.access_token}`},body:JSON.stringify(payload)});
        const result=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(result.error||'Não foi possível salvar o aluno.');
      }catch(apiError){
        // Fallback para edição: permite atualizar os dados administrativos mesmo se a função da Vercel estiver indisponível.
        if(!id)throw apiError;
        const pr=await sb.from('profiles').update({full_name:name,email,phone:phone||null,birth_date:birth||null,gender:gender||null}).eq('id',id);
        if(pr.error)throw new Error('Não foi possível salvar o sexo/dados do aluno: '+pr.error.message);
        const st=await sb.from('students').update({plan,monthly_value:value,due_day:Math.min(Math.max(due||10,1),31),start_date:start||null,payment_method:paymentMethod}).eq('id',id);
        if(st.error)throw new Error('Dados financeiros não foram salvos: '+st.error.message);
        if(weight&&height){
          const {data:latest,error:latestError}=await sb.from('evaluations').select('id,weight,height,evaluation_date').eq('student_id',id).order('evaluation_date',{ascending:false}).limit(1).maybeSingle();
          if(latestError)throw new Error('Não foi possível consultar a avaliação física: '+latestError.message);
          const changed=!latest||Number(latest.weight)!==weight||Number(latest.height)!==height;
          if(changed){
            const ev=await sb.from('evaluations').insert({student_id:id,evaluation_date:new Date().toISOString().slice(0,10),weight,height,sex:gender==='Feminino'?'female':gender==='Masculino'?'male':null});
            if(ev.error)throw new Error('Peso e altura não foram salvos: '+ev.error.message);
          }
        }
        if(password)throw new Error('Os dados foram salvos, mas a nova senha não pôde ser alterada enquanto a função do servidor estiver indisponível.');
      }
      await refreshCloudData();
      render();
      alert(id?'Aluno atualizado com sucesso.':'Aluno cadastrado com sucesso.');
    }catch(error){
      console.error('Dunamis Fit cadastro:',error);
      if(button){button.disabled=false;button.textContent='Salvar'}
      alert(error.message||'Não foi possível salvar o aluno.');
    }
  };
})();
