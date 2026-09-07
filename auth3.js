// Dunamis Fit — autenticação real via Supabase
(function(){
  const sb=window.dunamisSupabase;
  if(!sb) return;

  window.doLogin=async function(){
    const e=String(document.getElementById('email')?.value||'').trim().toLowerCase();
    const p=String(document.getElementById('pass')?.value||'');
    if(!e||!p) return alert('Informe e-mail e senha.');

    const {data:authData,error}=await sb.auth.signInWithPassword({email:e,password:p});
    if(error) return alert('E-mail ou senha incorretos.');

    const user=authData.user;
    const {data:profile, error:profileError}=await sb.from('profiles').select('*').eq('id',user.id).single();
    if(profileError||!profile){
      await sb.auth.signOut();
      return alert('Sua conta foi criada, mas o perfil do Dunamis Fit ainda não foi configurado.');
    }

    current={email:profile.email,name:profile.full_name,role:profile.role==='admin'?'admin':'aluno',studentId:profile.id};
    page=profile.role==='admin'?'dashboard':'meu';
    render();
  };

  window.logout=async function(){
    await sb.auth.signOut();
    current=null;
    if(typeof login==='function') login();
  };
})();
