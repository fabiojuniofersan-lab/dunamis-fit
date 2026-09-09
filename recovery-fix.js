// Dunamis Fit — tratamento robusto do evento PASSWORD_RECOVERY
(function(){
  const sb=window.dunamisSupabase;
  if(!sb||!sb.auth||typeof sb.auth.onAuthStateChange!=='function')return;
  let handled=false;
  const isPkceReturn=()=>new URLSearchParams(location.search).has('code');
  async function finishRecovery(){
    if(handled||!isPkceReturn())return;
    handled=true;
    const {data:sd}=await sb.auth.getSession();
    if(!sd.session){handled=false;alert('O link de recuperação expirou ou já foi utilizado. Solicite um novo e-mail de recuperação.');return;}
    let password=prompt('Defina uma nova senha para o Dunamis Fit (mínimo de 6 caracteres):');
    if(password===null){await sb.auth.signOut();return;}
    password=String(password);
    if(password.length<6){alert('A senha deve ter pelo menos 6 caracteres. Abra o e-mail de recuperação novamente para tentar de novo.');await sb.auth.signOut();return;}
    const confirmation=prompt('Digite novamente a nova senha para confirmar:');
    if(confirmation===null||String(confirmation)!==password){alert('As senhas não conferem. Abra o e-mail de recuperação novamente para tentar de novo.');await sb.auth.signOut();return;}
    const {error}=await sb.auth.updateUser({password});
    if(error){console.error(error);alert('Não foi possível atualizar a senha. Tente novamente com um novo link de recuperação.');await sb.auth.signOut();return;}
    await sb.auth.signOut();
    history.replaceState({},document.title,location.pathname);
    alert('Senha alterada com sucesso! Agora entre com seu e-mail e a nova senha.');
  }
  sb.auth.onAuthStateChange((event)=>{
    if(event==='PASSWORD_RECOVERY')void finishRecovery();
  });
})();
