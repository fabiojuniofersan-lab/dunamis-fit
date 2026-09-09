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
// Os campos e botões abaixo são apenas áreas funcionais transparentes sobre a arte,
// evitando duplicar o formulário que já está desenhado na imagem.
window.login=function(){
  app.innerHTML=`
    <div class="login-integrated">
      <img class="login-integrated-bg" src="dunamis-fit-abertura.png" alt="Dunamis Fit - Força que vem do alto">
      <div class="login-hitbox">
        <input id="email" class="login-hitbox-email" type="email" autocomplete="username" aria-label="E-mail">
        <input id="pass" class="login-hitbox-pass" type="password" autocomplete="current-password" aria-label="Senha" onkeydown="if(event.key==='Enter')doLogin()">
        <button class="login-hitbox-enter" type="button" aria-label="Entrar" onclick="doLogin()"></button>
        <button class="login-hitbox-forgot" type="button" aria-label="Esqueci minha senha" onclick="resetPassword()"></button>
      </div>
    </div>
    <style>
      .login-integrated{position:relative;width:100%;height:100vh;min-height:100vh;background:#050505;overflow:hidden}
      .login-integrated-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;display:block}
      .login-hitbox{position:absolute;z-index:2;left:2%;top:25%;width:53%;height:52%}
      .login-hitbox input{position:absolute;left:5%;width:94%;height:11%;box-sizing:border-box;border:0;background:transparent;color:#fff;font-size:16px;outline:none;padding:4px 12px}
      .login-hitbox input:focus{background:rgba(0,0,0,.08);border-bottom:1px solid rgba(255,148,24,.55)}
      .login-hitbox-email{top:11%}
      .login-hitbox-pass{top:31%}
      .login-hitbox-enter{position:absolute;left:3%;top:50%;width:94%;height:14%;border:0;background:transparent;border-radius:40px;cursor:pointer}
      .login-hitbox-forgot{position:absolute;left:25%;top:72%;width:50%;height:10%;border:0;background:transparent;cursor:pointer}
      @media(max-width:800px){
        .login-integrated-bg{object-position:center}
        .login-hitbox{left:2%;top:27%;width:57%;height:50%}
      }
      @media(max-width:520px){
        .login-integrated{height:100svh;min-height:100svh}
        .login-integrated-bg{object-position:58% center}
        .login-hitbox{left:3%;top:28%;width:64%;height:49%}
        .login-hitbox input{font-size:14px}
      }
    </style>`;
};

// O app.js chama a função login original antes deste arquivo ser carregado.
// Renderiza novamente agora, já usando a versão integrada.
window.login();
