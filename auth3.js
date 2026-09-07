// Dunamis Fit — autenticação e dados reais no Supabase
(function(){
  const sb=window.dunamisSupabase;
  if(!sb) return;

  async function cloudStudent(userId){
    const [p,s,e,pay]=await Promise.all([
      sb.from('profiles').select('*').eq('id',userId).maybeSingle(),
      sb.from('students').select('*').eq('id',userId).maybeSingle(),
      sb.from('evaluations').select('*').eq('student_id',userId).order('evaluation_date',{ascending:true}),
      sb.from('payments').select('*').eq('student_id',userId).order('due_date',{ascending:false})
    ]);
    if(p.error) throw p.error;
    if(s.error) throw s.error;
    const profile=p.data||{};
    const st=s.data||{};
    return {
      id:userId,supabaseId:userId,name:profile.full_name||'Aluno',birth:profile.birth_date||'',email:profile.email||'',phone:profile.phone||'',photo:profile.photo_url||'',
      plan:st.plan||'4 dias por semana',value:Number(st.monthly_value||80),due:Number(st.due_day||10),start:st.start_date||'',paymentMethod:st.payment_method||'Pix',status:st.status||'pending',
      evaluations:(e.data||[]).map(x=>({id:x.id,date:x.evaluation_date,weight:Number(x.weight||0),height:Number(x.height||0)})),cloudPayments:pay.data||[]
    };
  }

  async function cloudAdminData(){
    const [pr,st,ev,pa]=await Promise.all([
      sb.from('profiles').select('*').eq('role','student').order('full_name'),
      sb.from('students').select('*'),
      sb.from('evaluations').select('*').order('evaluation_date',{ascending:true}),
      sb.from('payments').select('*').order('due_date',{ascending:false})
    ]);
    if(pr.error) throw pr.error;if(st.error) throw st.error;if(ev.error) throw ev.error;if(pa.error) throw pa.error;
    data.students=(pr.data||[]).map(p=>{const s=(st.data||[]).find(x=>x.id===p.id)||{};return {
      id:p.id,supabaseId:p.id,name:p.full_name||'',birth:p.birth_date||'',email:p.email||'',phone:p.phone||'',photo:p.photo_url||'',plan:s.plan||'4 dias por semana',value:Number(s.monthly_value||80),due:Number(s.due_day||10),start:s.start_date||'',paymentMethod:s.payment_method||'Pix',status:s.status||'pending',
      evaluations:(ev.data||[]).filter(x=>x.student_id===p.id).map(x=>({id:x.id,date:x.evaluation_date,weight:Number(x.weight||0),height:Number(x.height||0)}))
    };});
    data.payments=(pa.data||[]).map(x=>({id:x.id,studentId:x.student_id,amount:Number(x.amount),dueDate:x.due_date,paidAt:x.paid_at,method:x.method,status:x.status}));
    save();
  }

  window.doLogin=async function(){
    const e=String(document.getElementById('email')?.value||'').trim().toLowerCase();
    const p=String(document.getElementById('pass')?.value||'');
    if(!e||!p)return alert('Informe e-mail e senha.');
    const {data:authData,error}=await sb.auth.signInWithPassword({email:e,password:p});
    if(error)return alert('E-mail ou senha incorretos.');
    const {data:profile,error:profileError}=await sb.from('profiles').select('*').eq('id',authData.user.id).maybeSingle();
    if(profileError||!profile){await sb.auth.signOut();return alert('Perfil do usuário não encontrado.');}
    current={email:profile.email,name:profile.full_name,role:profile.role==='admin'?'admin':'aluno',studentId:authData.user.id};
    try{
      if(current.role==='admin')await cloudAdminData();
      else{const st=await cloudStudent(authData.user.id);const i=data.students.findIndex(x=>x.supabaseId===authData.user.id||x.email===st.email);if(i>=0)data.students[i]=st;else data.students.push(st);save();}
    }catch(err){console.error(err);}
    page=current.role==='admin'?'dashboard':'meu';render();
  };

  window.logout=async function(){await sb.auth.signOut();current=null;if(typeof login==='function')login();};

  window.saveStudent=async function(id){
    const old=id?data.students.find(x=>x.id===id):null;
    const name=String(document.getElementById('sn')?.value||'').trim(),birth=document.getElementById('sb')?.value||'',email=String(document.getElementById('se')?.value||'').trim().toLowerCase(),phone=String(document.getElementById('sp')?.value||'').trim();
    const plan=document.getElementById('spl')?.value||'4 dias por semana',value=Number(document.getElementById('sv')?.value)||PLANS[plan],due=Number(document.getElementById('sd')?.value||10),start=document.getElementById('sst')?.value||'',paymentMethod=document.getElementById('spm')?.value||'Pix';
    const weight=Number(document.getElementById('sw')?.value||0),height=Number(document.getElementById('sh')?.value||0),password=String(document.getElementById('spw')?.value||'');
    if(!name||!email)return alert('Informe nome e e-mail.');
    if(!id&&password.length<6)return alert('A senha deve ter pelo menos 6 caracteres.');
    if(!current||current.role!=='admin')return alert('Somente o administrador pode cadastrar alunos.');
    try{
      let uid=old?.supabaseId||null;
      if(!uid){
        const {data:sessionData}=await sb.auth.getSession();
        const adminSession=sessionData.session;
        if(!adminSession)return alert('Sua sessão expirou. Entre novamente.');
        const {data:created,error}=await sb.auth.signUp({email,password,options:{data:{full_name:name}}});
        if(error)throw error;
        uid=created.user?.id;
        if(!uid)throw new Error('Não foi possível criar a conta do aluno.');
        const {error:restoreError}=await sb.auth.setSession({access_token:adminSession.access_token,refresh_token:adminSession.refresh_token});
        if(restoreError)throw restoreError;
      }
      const {error:pe}=await sb.from('profiles').upsert({id:uid,role:'student',full_name:name,email,phone,birth_date:birth,photo_url:old?.photo||null},{onConflict:'id'});if(pe)throw pe;
      const {error:se}=await sb.from('students').upsert({id:uid,plan,monthly_value:value,due_day:due,start_date:start,payment_method:paymentMethod,status:old?.status||'pending'},{onConflict:'id'});if(se)throw se;
      if(weight&&height){const {error:ee}=await sb.from('evaluations').insert({student_id:uid,evaluation_date:dateNow(),weight,height});if(ee)throw ee;}
      const local={id:uid,supabaseId:uid,name,birth,email,phone,plan,value,due,start,paymentMethod,status:old?.status||'pending',photo:old?.photo||'',evaluations:old?.evaluations||[]};
      if(weight&&height)local.evaluations=[...local.evaluations,{date:dateNow(),weight,height}];
      if(old)data.students=data.students.map(x=>x.id===old.id?local:x);else data.students.push(local);save();render();
    }catch(err){console.error(err);alert('Não foi possível salvar o aluno: '+(err?.message||'erro desconhecido'));}
  };
})();
