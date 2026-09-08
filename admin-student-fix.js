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
      const response=await fetch('/api/admin-student',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${sessionData.session.access_token}`},body:JSON.stringify({id:id||null,name,birth,email,password:password||null,phone,plan,value,due,start,paymentMethod,weight:weight||null,height:height||null,status:old?.status||'pending'})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Não foi possível salvar o aluno.');
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
