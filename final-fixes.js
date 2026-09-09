// Dunamis Fit — proteção final de dados e ações administrativas
(function(){
  const sb=window.dunamisSupabase;
  if(!sb)return;
  window.deleteStudent=async function(id){
    if(!current||current.role!=='admin')return alert('Somente o administrador pode excluir alunos.');
    const s=data.students.find(x=>String(x.id)===String(id));if(!s)return;
    if(!confirm(`Excluir o cadastro de ${s.name}? Esta ação remove também avaliações e pagamentos vinculados.`))return;
    try{const {error}=await sb.from('profiles').delete().eq('id',id);if(error)throw error;await window.refreshCloudData();render()}catch(e){console.error(e);alert('Não foi possível excluir o aluno.')}
  };
  const oldTable=window.table;
  window.table=function(list){const html=oldTable(list);return html.replace(/<button class="btn secondary" onclick='evaluationForm\(([^']+)\)'>Avaliar<\/button>/g,(m,id)=>`<button class="btn secondary" onclick='evaluationForm(${id})'>Avaliar</button><button class="btn secondary" onclick='deleteStudent(${id})'>Excluir</button>`) };
})();

// Tela inicial: usa a arte completa como interface visual.
// Os elementos abaixo são apenas áreas funcionais transparentes sobre a arte.
window.login=function(){
  app.innerHTML=`
    <div class="login-integrated">
      <img class="login-integrated-bg" src="dunamis-fit-abertura.png" alt="Dunamis Fit - Força que vem do alto">
      <div class="login-hitbox">
        <input id="email" class="login-hitbox-email" type="email" autocomplete="username" aria-label="E-mail" placeholder="">
        <input id="pass" class="login-hitbox-pass" type="password" autocomplete="current-password" aria-label="Senha" placeholder="" onkeydown="if(event.key==='Enter')doLogin()">
        <button class="login-hitbox-enter" type="button" aria-label="Entrar" onclick="doLogin()"></button>
        <button class="login-hitbox-forgot" type="button" aria-label="Esqueci minha senha" onclick="resetPassword()"></button>
      </div>
    </div>
    <style>
      .login-integrated{position:relative;width:100%;height:100vh;min-height:100vh;background:#050505;overflow:hidden;display:flex;align-items:center;justify-content:center}
      .login-integrated-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center;display:block}
      .login-hitbox{position:absolute;z-index:2;left:0;top:0;width:100%;height:100%;pointer-events:none}
      .login-hitbox input,
      .login-hitbox button{font-family:inherit!important}
      .login-hitbox input{position:absolute!important;box-sizing:border-box!important;border:0!important;border-radius:0!important;background:transparent!important;background-color:transparent!important;box-shadow:none!important;color:#fff!important;outline:none!important;padding:0 12px!important;margin:0!important;font-size:16px!important;pointer-events:auto!important}
      .login-hitbox input::placeholder{color:transparent!important}
      .login-hitbox input:focus{background:transparent!important;border:0!important;box-shadow:none!important}
      .login-hitbox-email{left:28.8%!important;top:39.9%!important;width:42.2%!important;height:5.9%!important}
      .login-hitbox-pass{left:28.8%!important;top:47.1%!important;width:42.2%!important;height:6%!important}
      .login-hitbox-enter{position:absolute!important;left:28.8%!important;top:55.1%!important;width:42.2%!important;height:5.2%!important;border:0!important;border-radius:40px!important;background:transparent!important;box-shadow:none!important;cursor:pointer!important;pointer-events:auto!important}
      .login-hitbox-forgot{position:absolute!important;left:39%!important;top:61.8%!important;width:22%!important;height:3%!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;cursor:pointer!important;pointer-events:auto!important}
      @media(max-width:800px){
        .login-integrated-bg{object-fit:contain;object-position:center}
      }
      @media(max-width:520px){
        .login-integrated{height:100svh;min-height:100svh}
        .login-integrated-bg{object-fit:contain;object-position:center}
        .login-hitbox input{font-size:14px!important}
      }
    </style>`;
};

// O app.js chama a função login original antes deste arquivo ser carregado.
// Renderiza novamente agora, já usando a versão integrada.
window.login();
