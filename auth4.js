// Dunamis Fit — autenticação e dados integrados no Supabase
(function(){
  const sb=window.dunamisSupabase;
  if(!sb)return;
  const monthDue=(day)=>{const d=new Date(),m=d.getMonth()+1,y=d.getFullYear();return `${y}-${String(m).padStart(2,'0')}-${String(Math.min(Math.max(Number(day)||1,1),28)).padStart(2,'0')}`};
  const mapStudent=(p,s,ev,pa)=>({id:p.id,supabaseId:p.id,name:p.full_name||'',birth:p.birth_date||'',email:p.email||'',phone:p.phone||'',photo:p.photo_url||'',gender:p.gender||((ev||[]).slice().reverse().find(x=>x.sex==='female'||x.sex==='male')?.sex==='female'?'Feminino':((ev||[]).slice().reverse().find(x=>x.sex==='female'||x.sex==='male')?.sex==='male'?'Masculino':'')),plan:s?.plan||'4 dias por semana',value:Number(s?.monthly_value||80),due:Number(s?.due_day||10),start:s?.start_date||'',paymentMethod:s?.payment_method||'Pix',status:s?.status||'pending',evaluations:(ev||[]).map(x=>({id:x.id,date:x.evaluation_date,weight:Number(x.weight||0),height:Number(x.height||0),sex:x.sex||null,activity_level:x.activity_level||null,age_at_evaluation:x.age_at_evaluation||null,plan_at_evaluation:x.plan_at_evaluation||null,activity_factor:x.activity_factor?Number(x.activity_factor):null,bmi:x.bmi?Number(x.bmi):null,tmb:x.tmb?Number(x.tmb):null,get:x.get?Number(x.get):null})),cloudPayments:pa||[]});
  function saveLocal(){try{localStorage.setItem('dunamis_fit_cloud_cache',JSON.stringify(data))}catch(e){}}
  async function refreshCloudData(){
    if(!current)return;
    if(current.role==='admin'){
      const [pr,st,ev,pa,n]=await Promise.all([sb.from('profiles').select('*').order('full_name'),sb.from('students').select('*'),sb.from('evaluations').select('*').order('evaluation_date',{ascending:true}),sb.from('payments').select('*').order('due_date',{ascending:false}),sb.from('notifications').select('*').eq('user_id',current.studentId).order('created_at',{ascending:false})]);
      if(pr.error)throw pr.error;if(st.error)throw st.error;if(ev.error)throw ev.error;if(pa.error)throw pa.error;if(n.error)throw n.error;
      data.students=(st.data||[]).map(s=>{const p=(pr.data||[]).find(x=>x.id===s.id);return p?mapStudent(p,s,(ev.data||[]).filter(x=>x.student_id===s.id),(pa.data||[]).filter(x=>x.student_id===s.id)):null}).filter(Boolean);
      data.payments=(pa.data||[]).map(x=>({id:x.id,studentId:x.student_id,amount:Number(x.amount||0),value:Number(x.amount||0),dueDate:x.due_date,paidAt:x.paid_at,paid_at:x.paid_at,method:x.method,status:x.status,date:x.paid_at?String(x.paid_at).slice(0,10):x.due_date}));data.notifications=n.data||[];saveLocal();
    }else{
      const id=current.studentId;const [p,s,e,pa,n]=await Promise.all([sb.from('profiles').select('*').eq('id',id).maybeSingle(),sb.from('students').select('*').eq('id',id).maybeSingle(),sb.from('evaluations').select('*').eq('student_id',id).order('evaluation_date',{ascending:true}),sb.from('payments').select('*').eq('student_id',id).order('due_date',{ascending:false}),sb.from('notifications').select('*').eq('user_id',id).order('created_at',{ascending:false})]);
      if(p.error)throw p.error;if(s.error)throw s.error;if(e.error)throw e.error;if(pa.error)throw pa.error;if(n.error)throw n.error;
      if(p.data){data.students=[mapStudent(p.data,s.data,e.data,pa.data)];data.payments=(pa.data||[]).map(x=>({id:x.id,studentId:x.student_id,amount:Number(x.amount||0),value:Number(x.amount||0),dueDate:x.due_date,paidAt:x.paid_at,paid_at:x.paid_at,method:x.method,status:x.status,date:x.paid_at?String(x.paid_at).slice(0,10):x.due_date}));data.notifications=n.data||[];saveLocal();}
    }
  }
  window.refreshCloudData=refreshCloudData;
  async function loadSession(){const {data:sd}=await sb.auth.getSession();if(!sd.session){current=null;return false}const {data:p,error}=await sb.from('profiles').select('*').eq('id',sd.session.user.id).maybeSingle();if(error||!p){await sb.auth.signOut();current=null;return false}current={email:p.email,name:p.full_name,role:p.role==='admin'?'admin':'aluno',studentId:sd.session.user.id};try{await refreshCloudData()}catch(e){console.error(e)}page=current.role==='admin'?'dashboard':'meu';return true}
  window.doLogin=async function(){const e=String(document.getElementById('email')?.value||'').trim().toLowerCase(),p=String(document.getElementById('pass')?.value||'');if(!e||!p)return alert('Informe e-mail e senha.');const b=document.querySelector('.login-panel .btn.primary');if(b){b.disabled=true;b.textContent='Entrando...'}const {data:a,error}=await sb.auth.signInWithPassword({email:e,password:p});if(error){if(b){b.disabled=false;b.textContent='Entrar →'}if(error.message?.toLowerCase().includes('confirm'))return alert('Este e-mail ainda não foi confirmado.');return alert('E-mail ou senha incorretos')}const {data:profile,error:pe}=await sb.from('profiles').select('*').eq('id',a.user.id).maybeSingle();if(pe||!profile){await sb.auth.signOut();return alert('Perfil do usuário não encontrado.')}current={email:profile.email,name:profile.full_name,role:profile.role==='admin'?'admin':'aluno',studentId:a.user.id};try{await refreshCloudData()}catch(err){console.error(err)}page=current.role==='admin'?'dashboard':'meu';render()};
  window.logout=async function(){await sb.auth.signOut();current=null;data={students:[],payments:[],notifications:[]};login()};
  window.resetPassword=async function(){const e=String(document.getElementById('email')?.value||'').trim().toLowerCase();if(!e)return alert('Informe seu e-mail primeiro.');const {error}=await sb.auth.resetPasswordForEmail(e,{redirectTo:location.origin+location.pathname});if(error)return alert('Não foi possível enviar o e-mail de recuperação.');alert('Se o e-mail estiver cadastrado, enviaremos as instruções para redefinir a senha.')};
  window.saveStudent=async function(id){
    if(!current||current.role!=='admin')return alert('Somente o administrador pode cadastrar alunos.');
    const oldStudent=id?data.students.find(x=>String(x.id)===String(id)):null;
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
    const genderEl=document.getElementById('sgender');
    const selectedGender=genderEl ? String(genderEl.value||genderEl.dataset?.selectedGender||'').trim() : '';
    const gender=selectedGender || String(oldStudent?.gender||'').trim();
    const weight=Number(document.getElementById('sw')?.value||0);
    const heightRaw=Number(document.getElementById('sh')?.value||0);
    const height=heightRaw>3?heightRaw/100:heightRaw;
    if(!name||!email)return alert('Informe nome e e-mail.');
    if(!id&&password.length<6)return alert('A senha deve ter pelo menos 6 caracteres.');
    if(id&&password&&password.length<6)return alert('A nova senha deve ter pelo menos 6 caracteres.');
    if(data.students.some(x=>x.email===email&&String(x.id)!==String(id)))return alert('Este e-mail já está cadastrado.');
    try{
      const {data:sessionData}=await sb.auth.getSession();
      const token=sessionData?.session?.access_token;
      if(!token)throw new Error('Sessão do administrador expirada. Entre novamente.');
      const payload={id:id||null,name,birth,email,password:password||null,phone,gender,plan,value,due,start,paymentMethod,weight,height,status:oldStudent?.status||'pending'};
      console.log('[Dunamis] salvando aluno:',{id:id||null,email,gender,payload});
      const response=await fetch(`${window.DUNAMIS_SUPABASE_URL}/functions/v1/admin-student`,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},
        body:JSON.stringify(payload)
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||'Não foi possível salvar o aluno.');
      const savedGender=String(result.gender||'').trim();
      if(gender && savedGender!==gender)throw new Error('O servidor não confirmou o sexo selecionado. Recebido: '+(savedGender||'vazio'));
      await refreshCloudData();
      const saved=data.students.find(x=>String(x.id)===String(result.id||id));
      if(gender && saved && saved.gender!==gender)throw new Error('O sexo foi salvo no servidor, mas a tela recebeu um valor diferente.');
      render();
      if(!oldStudent)alert('Aluno cadastrado com sucesso.');
    }catch(err){
      console.error('[Dunamis] erro ao salvar aluno:',err);
      alert('Não foi possível salvar o aluno: '+(err?.message||'erro desconhecido'));
    }
  };
  window.saveEvaluation=async function(id){if(!current||current.role!=='admin')return alert('Somente o administrador pode registrar avaliações.');const w=Number(document.getElementById('ew')?.value||0),rawH=Number(document.getElementById('eh')?.value||0),h=rawH>3?rawH/100:rawH,d=document.getElementById('ed')?.value||dateNow(),sex=document.getElementById('esex')?.value||null;if(!w||!h)return alert('Informe peso e altura.');const {data:latest,error:qe}=await sb.from('evaluations').select('weight,height,evaluation_date').eq('student_id',id).order('evaluation_date',{ascending:false}).limit(1);if(qe)return alert('Não foi possível consultar a avaliação anterior.');const previous=latest?.[0];if(previous&&Number(previous.weight)===w&&Number(previous.height)===h&&String(previous.evaluation_date)===String(d))return alert('Essa avaliação já está registrada.');const {error}=await sb.from('evaluations').insert({student_id:id,evaluation_date:d,weight:w,height:h,sex});if(error)return alert('Não foi possível salvar a avaliação.');if(sex){const gender=sex==='female'?'Feminino':'Masculino';const {error:ge}=await sb.from('profiles').update({gender}).eq('id',id);if(ge)return alert('Avaliação salva, mas não foi possível salvar o sexo do aluno.');}await refreshCloudData();render()};
  window.pay=async function(id){if(!current||current.role!=='admin')return alert('Somente o administrador pode confirmar pagamentos.');const s=data.students.find(x=>String(x.id)===String(id));if(!s)return;const due=monthDue(s.due);const {data:existing,error:qe}=await sb.from('payments').select('*').eq('student_id',s.id).eq('due_date',due).maybeSingle();if(qe)return alert('Não foi possível consultar o pagamento.');let error;if(existing){({error}=await sb.from('payments').update({amount:s.value,paid_at:new Date().toISOString(),method:s.paymentMethod,status:'paid'}).eq('id',existing.id))}else{({error}=await sb.from('payments').insert({student_id:s.id,amount:s.value,due_date:due,paid_at:new Date().toISOString(),method:s.paymentMethod,status:'paid'}))}if(error)return alert('Não foi possível confirmar o pagamento.');await sb.from('students').update({status:'paid'}).eq('id',s.id);await sb.from('notifications').insert({user_id:current.studentId,title:'Pagamento confirmado',message:`Pagamento confirmado: ${s.name} — R$ ${money(s.value)}`,type:'payment'});await refreshCloudData();alert('Pagamento confirmado com sucesso.');render()};
  window.saveProfilePhoto=async function(id,dataUrl){const {error}=await sb.from('profiles').update({photo_url:dataUrl}).eq('id',id);if(error)throw error;await refreshCloudData();render()};
  // O PASSWORD_RECOVERY é tratado exclusivamente por password-recovery-fix.js.
  window.addEventListener('load',async()=>{await new Promise(resolve=>setTimeout(resolve,800));if(window.__dunamisRecoveryActive)return;const ok=await loadSession();if(ok)render()});
})();
