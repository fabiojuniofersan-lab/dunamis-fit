// Autenticacao individual dos alunos — Dunamis Fit
(function(){
  const originalSeedKey='dunamis_fit_data_v3';
  const raw=localStorage.getItem(originalSeedKey);
  if(raw){
    try{
      const d=JSON.parse(raw);
      let changed=false;
      (d.students||[]).forEach(s=>{
        if(!s.password){
          s.password=s.email==='ana@aluno.com'?'aluno123':'123456';
          changed=true;
        }
      });
      if(changed)localStorage.setItem(originalSeedKey,JSON.stringify(d));
    }catch(e){}
  }

  window.doLogin=function(){
    const e=document.getElementById('email').value.trim().toLowerCase();
    const p=document.getElementById('pass').value;
    if(e==='admin@dunamisfit.com' && p==='admin123'){
      current={email:e,password:p,name:'Administrador',role:'admin'};
      page='dashboard';
      render();
      return;
    }
    const aluno=data.students.find(s=>String(s.email||'').trim().toLowerCase()===e && s.password===p);
    if(!aluno)return alert('E-mail ou senha incorretos.');
    current={email:aluno.email,name:aluno.name,role:'aluno',studentId:aluno.id};
    page='meu';
    render();
  };

  window.studentForm=function(id){
    const s=id?data.students.find(x=>x.id===id):{name:'',birth:'',email:'',phone:'',plan:'4 dias por semana',value:80,due:10,start:dateNow(),paymentMethod:'Pix',status:'pending',evaluations:[],photo:'',password:''};
    app.insertAdjacentHTML('beforeend',`<div class="modal"><div class="card modal-card"><h3>${id?'Editar':'Novo'} aluno</h3><div class="form-grid">
      <div class="field"><label>Nome completo</label><input id="sn" value="${esc(s.name)}"></div>
      <div class="field"><label>Data de nascimento</label><input id="sb" type="date" value="${s.birth||''}"></div>
      <div class="field"><label>E-mail de acesso</label><input id="se" type="email" value="${esc(s.email)}" placeholder="aluno@email.com"></div>
      <div class="field"><label>Senha do aluno</label><input id="spw" type="password" value="${esc(s.password||'')}" placeholder="Crie uma senha"></div>
      <div class="field"><label>WhatsApp</label><input id="sp" value="${esc(s.phone||'')}" placeholder="(00) 00000-0000"></div>
      <div class="field"><label>Plano</label><select id="spl" onchange="sv.value=PLANS[this.value]"><option>3 dias por semana</option><option>4 dias por semana</option><option>5 dias por semana</option></select></div>
      <div class="field"><label>Valor</label><input id="sv" type="number" step="0.01" value="${s.value}"></div>
      <div class="field"><label>Dia de vencimento</label><input id="sd" type="number" min="1" max="31" value="${s.due}"></div>
      <div class="field"><label>Data de início</label><input id="sst" type="date" value="${s.start||''}"></div>
      <div class="field"><label>Forma de pagamento</label><select id="spm"><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select></div>
      <div class="field"><label>Peso atual (kg)</label><input id="sw" type="number" step="0.1" value="${last(s)?.weight||''}"></div>
      <div class="field"><label>Altura (m)</label><input id="sh" type="number" step="0.01" value="${last(s)?.height||''}"></div>
    </div><p class="muted">O aluno usará este e-mail e esta senha para entrar na Área do Aluno.</p><div class="actions"><button class="btn secondary" onclick="render()">Cancelar</button><button class="btn primary" onclick="saveStudent(${id||0})">Salvar</button></div></div></div>`);
    spl.value=s.plan; spm.value=s.paymentMethod||'Pix';
  };

  window.saveStudent=function(id){
    const old=id?data.students.find(x=>x.id===id):null;
    const name=document.getElementById('sn').value.trim();
    const birth=document.getElementById('sb').value;
    const email=document.getElementById('se').value.trim().toLowerCase();
    const password=document.getElementById('spw').value;
    const phone=document.getElementById('sp').value.trim();
    const plan=document.getElementById('spl').value;
    const value=Number(document.getElementById('sv').value)||PLANS[plan];
    const due=Number(document.getElementById('sd').value);
    const start=document.getElementById('sst').value;
    const paymentMethod=document.getElementById('spm').value;
    const w=Number(document.getElementById('sw').value),h=Number(document.getElementById('sh').value);
    if(!name||!email)return alert('Informe nome e e-mail.');
    if(!password)return alert('Informe uma senha para o aluno.');
    if(password.length<6)return alert('A senha deve ter pelo menos 6 caracteres.');
    const duplicate=data.students.find(x=>x.email===email && x.id!==id);
    if(duplicate)return alert('Este e-mail já está cadastrado para outro aluno.');
    let evaluations=old?.evaluations||[];
    if(w&&h)evaluations=[...evaluations,{date:dateNow(),weight:w,height:h}];
    const s={id:id||Date.now(),name,birth,email,phone,plan,value,due,start,paymentMethod,status:old?.status||'pending',photo:old?.photo||'',password,evaluations};
    if(id)data.students=data.students.map(x=>x.id===id?s:x);else data.students.push(s);
    save();render();
  };

  function esc(v){return String(v||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
})();
