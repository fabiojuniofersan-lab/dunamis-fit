// Dunamis Fit — recuperação de senha
// IMPORTANTE: não remover o hash de recuperação antes que o Supabase processe
// os tokens. Fazer history.replaceState() imediatamente faz o link parecer
// expirado porque o cliente perde o token da sessão de recuperação.
(function(){
  const sb=window.dunamisSupabase;
  if(!sb)return;

  const originalOnAuthStateChange=sb.auth.onAuthStateChange.bind(sb.auth);
  sb.auth.onAuthStateChange=function(callback){
    return originalOnAuthStateChange((event,session)=>{
      if(event==='PASSWORD_RECOVERY'){
        setTimeout(()=>renderRecovery(session),0);
        return;
      }
      return callback(event,session);
    });
  };

  function renderRecovery(session){
    const app=document.getElementById('app');
    if(!app)return;
    app.innerHTML=`<div class="login"><section class="hero" style="padding:0;position:relative;overflow:hidden;background:#000;justify-content:center;align-items:center"><img src="dunamis-fit-abertura.png" alt="Dunamis Fit - Força que vem do alto" style="width:100%;height:100%;object-fit:cover;display:block"></section><section class="login-panel"><div class="card"><h2>CRIAR NOVA SENHA</h2><p class="muted">Defina uma nova senha para acessar o Dunamis Fit.</p><div class="field"><label>Nova senha</label><input id="recovery-pass" type="password" placeholder="Mínimo de 6 caracteres" autocomplete="new-password"></div><div class="field"><label>Confirmar nova senha</label><input id="recovery-pass-confirm" type="password" placeholder="Digite a senha novamente" autocomplete="new-password" onkeydown="if(event.key==='Enter')finishRecoveryPassword()"></div><button class="btn primary" id="recovery-save" onclick="finishRecoveryPassword()">Alterar senha →</button><button class="btn secondary" style="width:100%;margin-top:8px" onclick="cancelRecovery()">Cancelar</button></div></section></div>`;
  }

  window.finishRecoveryPassword=async function(){
    const p=String(document.getElementById('recovery-pass')?.value||'');
    const c=String(document.getElementById('recovery-pass-confirm')?.value||'');
    if(p.length<6)return alert('A senha deve ter pelo menos 6 caracteres.');
    if(p!==c)return alert('As senhas não conferem.');
    const b=document.getElementById('recovery-save');
    if(b){b.disabled=true;b.textContent='Salvando...';}
    const {error}=await sb.auth.updateUser({password:p});
    if(error){
      console.error(error);
      if(b){b.disabled=false;b.textContent='Alterar senha →';}
      return alert('Não foi possível atualizar a senha. Solicite um novo e-mail de recuperação e tente novamente.');
    }
    await sb.auth.signOut();
    history.replaceState({},document.title,location.pathname+location.search);
    alert('Senha alterada com sucesso! Agora entre com seu e-mail e a nova senha.');
    if(typeof window.login==='function')window.login();
  };

  window.cancelRecovery=async function(){
    await sb.auth.signOut();
    history.replaceState({},document.title,location.pathname+location.search);
    if(typeof window.login==='function')window.login();
  };

  window.renderPasswordRecoveryEmail=function(){
    const app=document.getElementById('app');
    if(!app)return;
    app.innerHTML=`<div class="login"><section class="hero" style="padding:0;position:relative;overflow:hidden;background:#000;justify-content:center;align-items:center"><img src="dunamis-fit-abertura.png" alt="Dunamis Fit - Força que vem do alto" style="width:100%;height:100%;object-fit:cover;display:block"></section><section class="login-panel"><div class="card"><h2>RECUPERAR SENHA</h2><p class="muted">Informe o e-mail cadastrado para receber o link de recuperação.</p><div class="field"><label>E-mail</label><input id="recovery-email" type="email" placeholder="voce@email.com" autocomplete="email" onkeydown="if(event.key==='Enter')sendRecoveryEmail()"></div><button class="btn primary" onclick="sendRecoveryEmail()">Enviar link →</button><button class="btn secondary" style="width:100%;margin-top:8px" onclick="login()">Voltar</button></div></section></div>`;
  };

  window.sendRecoveryEmail=async function(){
    const e=String(document.getElementById('recovery-email')?.value||'').trim().toLowerCase();
    if(!e)return alert('Informe seu e-mail.');
    const b=document.querySelector('.login-panel .btn.primary');
    if(b){b.disabled=true;b.textContent='Enviando...';}
    const redirectTo=location.origin+location.pathname;
    const {error}=await sb.auth.resetPasswordForEmail(e,{redirectTo});
    if(error){
      console.error('Falha no resetPasswordForEmail:',error);
      if(b){b.disabled=false;b.textContent='Enviar link →';}
      return alert('Não foi possível enviar o e-mail de recuperação. Verifique a configuração de e-mail do Supabase ou tente novamente em alguns minutos.');
    }
    alert('Se o e-mail estiver cadastrado, enviaremos as instruções para redefinir a senha.');
    login();
  };
})();
