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

// Tela inicial: login embutido sobre a arte de abertura, sem tela dividida.
window.login=function(){
  app.innerHTML=`
    <div class="login-integrated">
      <img class="login-integrated-bg" src="dunamis-fit-abertura.png" alt="Dunamis Fit - Força que vem do alto">
      <div class="login-integrated-form">
        <div class="login-integrated-field">
          <label for="email">E-mail</label>
          <input id="email" type="email" autocomplete="username" placeholder="Seu e-mail">
        </div>
        <div class="login-integrated-field">
          <label for="pass">Senha</label>
          <input id="pass" type="password" autocomplete="current-password" placeholder="Sua senha" onkeydown="if(event.key==='Enter')doLogin()">
        </div>
        <button class="login-integrated-btn" onclick="doLogin()">Entrar <span>→</span></button>
        <button class="login-integrated-forgot" type="button" onclick="resetPassword()">Esqueci minha senha</button>
      </div>
    </div>
    <style>
      .login-integrated{position:relative;width:100%;min-height:100vh;background:#050505;overflow:hidden;display:flex;align-items:center;justify-content:center}
      .login-integrated-bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block}
      .login-integrated-form{position:absolute;z-index:2;width:min(31vw,430px);right:7.5%;top:52%;transform:translateY(-50%);display:flex;flex-direction:column;gap:12px}
      .login-integrated-field{display:flex;flex-direction:column;gap:5px}
      .login-integrated-field label{font-size:13px;font-weight:600;color:#f5f5f5;text-shadow:0 1px 3px #000}
      .login-integrated-field input{width:100%;box-sizing:border-box;border:0;border-bottom:1px solid rgba(255,255,255,.55);background:rgba(8,8,8,.22);color:#fff;padding:12px 4px;font-size:15px;outline:none;border-radius:0}
      .login-integrated-field input::placeholder{color:rgba(255,255,255,.75)}
      .login-integrated-field input:focus{border-bottom-color:#ff9418}
      .login-integrated-btn{margin-top:5px;width:100%;border:0;border-radius:28px;padding:13px 18px;background:linear-gradient(90deg,#ffb51b,#f47d0b);color:#fff;font-weight:800;font-size:16px;cursor:pointer;box-shadow:0 7px 22px rgba(0,0,0,.28)}
      .login-integrated-btn span{margin-left:8px}
      .login-integrated-forgot{align-self:flex-end;border:0;background:transparent;color:#f6a126;font-size:12px;cursor:pointer;padding:2px 0}
      @media(max-width:800px){.login-integrated-form{width:70%;right:8%;top:56%}}
      @media(max-width:520px){.login-integrated{min-height:100svh}.login-integrated-bg{object-position:58% center}.login-integrated-form{width:78%;right:6%;top:60%}.login-integrated-field input{padding:10px 3px}.login-integrated-btn{padding:12px;font-size:15px}}
    </style>`;
};

// O app.js chama a função login original antes deste arquivo ser carregado.
// Renderiza novamente agora, já usando a versão integrada.
window.login();
