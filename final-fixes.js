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

// Tela inicial: a própria arte é a interface visual.
// Os controles funcionais ficam dentro do mesmo quadro proporcional da arte,
// evitando desalinhamento quando a tela tem proporção diferente da imagem.
window.login=function(){
  app.innerHTML=`
    <div class="login-integrated">
      <div class="login-integrated-fill" aria-hidden="true"></div>
      <div class="login-art-frame">
        <img class="login-integrated-bg" src="dunamis-fit-abertura.png" alt="Dunamis Fit - Força que vem do alto">
        <div class="login-hitbox">
          <input id="email" class="login-hitbox-email" type="email" autocomplete="username" aria-label="E-mail" placeholder="">
          <input id="pass" class="login-hitbox-pass" type="password" autocomplete="current-password" aria-label="Senha" placeholder="" onkeydown="if(event.key==='Enter')doLogin()">
          <button class="login-hitbox-enter" type="button" aria-label="Entrar" onclick="doLogin()"></button>
          <button class="login-hitbox-forgot" type="button" aria-label="Esqueci minha senha" onclick="resetPassword()"></button>
        </div>
      </div>
    </div>
    <style>
      .login-integrated{position:relative;width:100%;height:100vh;min-height:100vh;background:#050505;overflow:hidden;display:flex;align-items:center;justify-content:center}
      /* Preenche as laterais sem alterar a arte principal. */
      .login-integrated-fill{position:absolute;inset:-24px;background:url('dunamis-fit-abertura.png') center/cover no-repeat;filter:blur(20px);transform:scale(1.06);opacity:.42;pointer-events:none}
      /* O quadro mantém exatamente a proporção original de 1222x1287. */
      .login-art-frame{position:relative;z-index:1;width:min(100vw,calc(100vh * .9495));height:min(100vh,calc(100vw * 1.0532));flex:0 0 auto}
      .login-integrated-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;object-position:center;display:block}
      .login-hitbox{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
      .login-hitbox input,.login-hitbox button{font-family:inherit!important}
      .login-hitbox input{position:absolute!important;box-sizing:border-box!important;border:0!important;border-radius:0!important;background:transparent!important;background-color:transparent!important;box-shadow:none!important;-webkit-box-shadow:none!important;color:#fff!important;-webkit-text-fill-color:#fff!important;outline:none!important;padding:0 6.1% 0 6.1%!important;margin:0!important;font-size:16px!important;pointer-events:auto!important;appearance:none!important;-webkit-appearance:none!important}
      .login-hitbox input::placeholder{color:transparent!important}
      .login-hitbox input:focus{background:transparent!important;background-color:transparent!important;border:0!important;box-shadow:none!important;-webkit-box-shadow:none!important}
      .login-hitbox input:-webkit-autofill,.login-hitbox input:-webkit-autofill:hover,.login-hitbox input:-webkit-autofill:focus,.login-hitbox input:-webkit-autofill:active{background-color:transparent!important;background-image:none!important;-webkit-box-shadow:0 0 0 1000px transparent inset!important;box-shadow:0 0 0 1000px transparent inset!important;-webkit-text-fill-color:#fff!important;color:#fff!important;caret-color:#fff!important;transition:background-color 9999s ease-out 0s!important}
      /* Coordenadas relativas à própria arte: coincidem com os campos desenhados na imagem. */
      .login-hitbox-email{left:28.9%!important;top:39.8%!important;width:41.8%!important;height:6%!important}
      .login-hitbox-pass{left:28.9%!important;top:47.2%!important;width:41.8%!important;height:6%!important}
      .login-hitbox-enter{position:absolute!important;left:28.9%!important;top:55.1%!important;width:41.8%!important;height:5.2%!important;border:0!important;border-radius:40px!important;background:transparent!important;box-shadow:none!important;cursor:pointer!important;pointer-events:auto!important}
      .login-hitbox-forgot{position:absolute!important;left:38%!important;top:61.8%!important;width:24%!important;height:3.2%!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;cursor:pointer!important;pointer-events:auto!important}
      @media(max-width:520px){
        .login-integrated{height:100svh;min-height:100svh}
        .login-integrated-fill{filter:blur(14px);opacity:.36}
        .login-hitbox input{font-size:14px!important}
      }
    </style>`;
};

// O app.js chama a função login original antes deste arquivo ser carregado.
// Renderiza novamente agora, já usando a versão integrada.
window.login();
