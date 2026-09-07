const app=document.getElementById("app");
const KEY="dunamis_fit_data_v2";
const demoUsers={
  admin:{email:"admin@dunamisfit.com",password:"admin123",name:"Administrador"},
  aluno:{email:"ana@aluno.com",password:"aluno123",name:"Ana"}
};
const seed={
 students:[
  {id:1,name:"Ana Oliveira",birth:"1996-05-10",email:"ana@aluno.com",phone:"(00) 99999-0001",plan:"4 dias por semana",value:80,due:10,start:"2026-01-10",paymentMethod:"Pix",status:"paid",
   evaluations:[{date:"2026-09-07",weight:82.5,height:1.75}]},
  {id:2,name:"Carlos Silva",birth:"1992-03-15",email:"carlos@aluno.com",phone:"(00) 99999-0002",plan:"3 dias por semana",value:75,due:15,start:"2026-02-15",paymentMethod:"Dinheiro",status:"paid",
   evaluations:[{date:"2026-09-07",weight:78,height:1.72}]},
  {id:3,name:"Mariana Souza",birth:"1998-11-05",email:"mariana@aluno.com",phone:"(00) 99999-0003",plan:"5 dias por semana",value:100,due:5,start:"2026-03-05",paymentMethod:"Cartão",status:"late",
   evaluations:[{date:"2026-09-07",weight:68,height:1.65}]}
 ],
 payments:[]
};
let data=JSON.parse(localStorage.getItem(KEY)||"null")||seed;
function cleanEvaluations(){
  (data.students||[]).forEach(s=>{
    const seen=new Set();
    s.evaluations=(s.evaluations||[]).filter(e=>{
      const key=`${e.date}|${e.weight}|${e.height}`;
      if(seen.has(key)) return false;
      seen.add(key); return true;
    }).sort((a,b)=>a.date.localeCompare(b.date));
  });
}
cleanEvaluations();
let current=null,page="dashboard";

function save(){localStorage.setItem(KEY,JSON.stringify(data))}
function ageFromBirth(b){if(!b)return "—";const d=new Date(b+"T00:00:00"),n=new Date();let a=n.getFullYear()-d.getFullYear();if(n.getMonth()<d.getMonth()||(n.getMonth()===d.getMonth()&&n.getDate()<d.getDate()))a--;return a}
function bmi(w,h){if(!w||!h)return null;return w/(h*h)}
function bmiLabel(v){if(v===null)return "—";if(v<18.5)return "Abaixo do peso";if(v<25)return "Faixa considerada adequada";if(v<30)return "Sobrepeso";return "Obesidade"}
function lastEval(s){return s.evaluations?.length?s.evaluations[s.evaluations.length-1]:null}
function money(v){return Number(v||0).toFixed(2)}
function fmtDate(v){if(!v)return "—";const [y,m,d]=v.split("-");return `${d}/${m}/${y}`}
function statusText(s){return s==="paid"?"Pago":s==="late"?"Inadimplente":"Pendente"}
function login(){app.innerHTML=`<div class="login"><section class="hero"><div class="brand">🏋️ DUNAMIS FIT</div><h1>SUA ACADEMIA,<br><span>NO CONTROLE</span></h1><p>Gerencie alunos, mensalidades e acompanhe a evolução física em um só lugar.</p></section><section class="login-panel"><div class="card"><h2>ENTRAR</h2><p class="muted">Acesse sua conta para continuar.</p><div class="field"><label>E-mail</label><input id="email" placeholder="voce@email.com"></div><div class="field"><label>Senha</label><input id="pass" type="password" placeholder="Sua senha"></div><button class="btn primary" onclick="doLogin()">Entrar →</button><div class="demo"><button class="btn" onclick="fillDemo('admin')"><strong>🛡 Administrador</strong><span>admin@dunamisfit.com</span></button><button class="btn" onclick="fillDemo('aluno')"><strong>♙ Aluno</strong><span>ana@aluno.com</span></button></div><p class="muted" style="text-align:center;font-size:13px">Senhas de demonstração: admin123 / aluno123</p></div></section></div>`}
function fillDemo(t){document.getElementById("email").value=demoUsers[t].email;document.getElementById("pass").value=demoUsers[t].password}
function doLogin(){const e=document.getElementById("email").value,p=document.getElementById("pass").value;const role=e===demoUsers.admin.email&&p===demoUsers.admin.password?"admin":e===demoUsers.aluno.email&&p===demoUsers.aluno.password?"aluno":null;if(!role)return alert("E-mail ou senha incorretos.");current={...demoUsers[role],role};page=role==="admin"?"dashboard":"meu";render()}
function logout(){current=null;login()}
function nav(p){page=p;render()}
function shell(content){app.innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand">🏋️ DUNAMIS FIT</div><nav class="nav">${current.role==="admin"?`<button class="${page==='dashboard'?'active':''}" onclick="nav('dashboard')">📊 Dashboard</button><button class="${page==='students'?'active':''}" onclick="nav('students')">👥 Alunos</button><button class="${page==='payments'?'active':''}" onclick="nav('payments')">💳 Pagamentos</button><button class="${page==='plans'?'active':''}" onclick="nav('plans')">📋 Planos</button><button class="${page==='notifications'?'active':''}" onclick="nav('notifications')">🔔 Notificações</button>`:`<button class="${page==='meu'?'active':''}" onclick="nav('meu')">🏠 Minha mensalidade</button><button class="${page==='development'?'active':''}" onclick="nav('development')">📈 Meu desenvolvimento</button><button class="${page==='history'?'active':''}" onclick="nav('history')">💳 Histórico</button><button class="${page==='notices'?'active':''}" onclick="nav('notices')">🔔 Avisos</button>`}</nav><button class="btn logout" onclick="logout()">Sair</button></aside><main class="main">${content}</main></div>`}
function header(title,sub=""){return `<div class="top"><div><h1>${title}</h1><div class="muted">${sub}</div></div><b>${current.name}</b></div>`}
function table(list){return `<table class="table"><thead><tr><th>Aluno</th><th>Plano</th><th>Valor</th><th>Vencimento</th><th>Status</th><th>Ações</th></tr></thead><tbody>${list.map(s=>`<tr><td><b>${s.name}</b><br><small>${s.email}</small></td><td>${s.plan}</td><td>R$ ${money(s.value)}</td><td>Dia ${s.due}</td><td><span class="badge ${s.status}">${statusText(s.status)}</span></td><td><div class="actions"><button class="btn secondary" onclick="studentForm(${s.id})">Editar</button><button class="btn secondary" onclick="evaluationForm(${s.id})">Avaliar</button></div></td></tr>`).join("")}</tbody></table>`}
function dashboard(){
  const paid=data.students.filter(s=>s.status==="paid").length,
        late=data.students.filter(s=>s.status==="late").length,
        pending=data.students.filter(s=>s.status==="pending").length,
        total=data.students.reduce((a,s)=>a+Number(s.value||0),0),
        received=data.students.filter(s=>s.status==="paid").reduce((a,s)=>a+Number(s.value||0),0),
        rate=data.students.length?Math.round(paid/data.students.length*100):0;
  const recent=data.students.slice().sort((a,b)=>a.name.localeCompare(b.name)).slice(0,5);
  return shell(header("Dashboard","Visão geral da Dunamis Fit")+
  `<div class="grid">
    <div class="stat"><small>👥 Alunos ativos</small><b>${data.students.length}</b><small>Base cadastrada</small></div>
    <div class="stat"><small>💰 Receita prevista</small><b>R$ ${money(total)}</b><small>Mensalidades atuais</small></div>
    <div class="stat"><small>✅ Pagamentos pagos</small><b>${paid}</b><small>${rate}% da base</small></div>
    <div class="stat"><small>🔴 Inadimplentes</small><b>${late}</b><small>${pending} pendente(s)</small></div>
  </div>
  <div class="dashboard-grid">
    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div><h3 style="margin-bottom:3px">Resumo financeiro</h3><span class="muted">Situação das mensalidades</span></div>
        <b>${rate}% pagos</b>
      </div>
      <div class="progress"><span style="width:${rate}%"></span></div>
      <div class="metric-row"><span>Recebido</span><strong>R$ ${money(received)}</strong></div>
      <div class="metric-row"><span>A receber</span><strong>R$ ${money(total-received)}</strong></div>
      <div class="metric-row"><span>Inadimplentes</span><strong>${late}</strong></div>
    </div>
    <div class="panel">
      <h3>Atalhos rápidos</h3>
      <div class="quick-actions">
        <button class="btn primary" onclick="studentForm()">+ Novo aluno</button>
        <button class="btn secondary" onclick="nav('payments')">Pagamentos</button>
        <button class="btn secondary" onclick="nav('students')">Alunos</button>
        <button class="btn secondary" onclick="nav('notifications')">Notificações</button>
      </div>
    </div>
  </div>
  <div class="panel">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div><h3 style="margin-bottom:3px">Alunos em destaque</h3><span class="muted">Resumo cadastral</span></div><button class="btn secondary" style="width:auto" onclick="nav('students')">Ver todos</button></div>
    ${table(recent)}
  </div>`)
}
function students(){return shell(header("Alunos","Cadastre, edite e acompanhe os alunos.")+`<div class="panel"><button class="btn primary" style="width:auto;margin-bottom:18px" onclick="studentForm()">+ Novo aluno</button>${table(data.students)}</div>`)}
function studentForm(id=null){const s=id?data.students.find(x=>x.id===id):{name:"",birth:"",email:"",phone:"",plan:"4 dias por semana",value:80,due:10,start:new Date().toISOString().slice(0,10),paymentMethod:"Pix",status:"pending",evaluations:[]};app.insertAdjacentHTML("beforeend",`<div class="modal"><div class="card"><h3>${id?"Editar":"Novo"} aluno</h3><div class="form-grid"><div class="field"><label>Nome completo</label><input id="sn" value="${s.name}"></div><div class="field"><label>Data de nascimento</label><input id="sb" type="date" value="${s.birth||""}"></div><div class="field"><label>E-mail</label><input id="se" value="${s.email}"></div><div class="field"><label>WhatsApp</label><input id="sp" value="${s.phone}"></div><div class="field"><label>Plano</label><select id="spl"><option>3 dias por semana</option><option>4 dias por semana</option><option>5 dias por semana</option></select></div><div class="field"><label>Valor</label><input id="sv" type="number" step="0.01" value="${s.value}"></div><div class="field"><label>Dia de vencimento</label><input id="sd" type="number" min="1" max="31" value="${s.due}"></div><div class="field"><label>Data de início</label><input id="sst" type="date" value="${s.start||""}"></div><div class="field"><label>Forma de pagamento</label><select id="spm"><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select></div><div class="field"><label>Peso atual (kg)</label><input id="sw" type="number" step="0.1" value="${lastEval(s)?.weight||""}"></div><div class="field"><label>Altura (m)</label><input id="sh" type="number" step="0.01" value="${lastEval(s)?.height||""}"></div></div><div class="actions"><button class="btn secondary" onclick="render()">Cancelar</button><button class="btn primary" onclick="saveStudent(${id||0})">Salvar</button></div></div></div>`);document.getElementById("spl").value=s.plan;document.getElementById("spm").value=s.paymentMethod||"Pix"}
function saveStudent(id){const old=id?data.students.find(x=>x.id===id):null;const w=Number(sw.value),h=Number(sh.value);let evaluations=old?.evaluations||[];if(w&&h){evaluations=[...evaluations,{date:new Date().toISOString().slice(0,10),weight:w,height:h}]}
const s={id:id||Date.now(),name:sn.value,birth:sb.value,email:se.value,phone:sp.value,plan:spl.value,value:Number(sv.value),due:Number(sd.value),start:sst.value,paymentMethod:spm.value,status:old?.status||"pending",evaluations};if(id)data.students=data.students.map(x=>x.id===id?s:x);else data.students.push(s);save();render()}
function evaluationForm(id){const s=data.students.find(x=>x.id===id);app.insertAdjacentHTML("beforeend",`<div class="modal"><div class="card"><h3>Nova avaliação — ${s.name}</h3><div class="form-grid"><div class="field"><label>Data</label><input id="ed" type="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Peso (kg)</label><input id="ew" type="number" step="0.1"></div><div class="field"><label>Altura (m)</label><input id="eh" type="number" step="0.01" value="${lastEval(s)?.height||""}"></div></div><p class="muted">O IMC será calculado automaticamente.</p><div class="actions"><button class="btn secondary" onclick="render()">Cancelar</button><button class="btn primary" onclick="saveEvaluation(${id})">Salvar avaliação</button></div></div></div>`)}
function saveEvaluation(id){const s=data.students.find(x=>x.id===id);const w=Number(ew.value),h=Number(eh.value);if(!w||!h)return alert("Informe peso e altura.");s.evaluations.push({date:ed.value,weight:w,height:h});save();render()}
function payments(){return shell(header("Pagamentos","Registre pagamentos confirmados.")+`<div class="panel"><h3>Controle de pagamentos</h3>${data.students.map(s=>`<div style="display:flex;justify-content:space-between;gap:10px;padding:14px 0;border-bottom:1px solid #eee"><span><b>${s.name}</b><br><small>R$ ${money(s.value)} • vencimento dia ${s.due}</small></span><button class="btn ${s.status==='paid'?'secondary':'primary'}" style="width:auto" onclick="pay(${s.id})">${s.status==='paid'?'Pago ✓':'Confirmar pagamento'}</button></div>`).join("")}</div>`)}
function pay(id){const s=data.students.find(x=>x.id===id);s.status="paid";data.payments.push({student:s.name,value:s.value,date:new Date().toLocaleDateString("pt-BR")});save();alert("Pagamento confirmado. O administrador foi atualizado.");render()}
function plans(){return shell(header("Planos","Planos cadastrados para a Dunamis Fit.")+`<div class="grid"><div class="stat"><small>3 dias por semana</small><b>R$ 75</b></div><div class="stat"><small>4 dias por semana</small><b>R$ 80</b></div><div class="stat"><small>5 dias por semana</small><b>R$ 100</b></div></div><div class="panel"><h3>Formas de pagamento</h3><p>Pix • Dinheiro • Cartão</p></div>`)}
function notifications(){return shell(header("Notificações","Regras de aviso da academia.")+`<div class="panel"><div class="notice"><b>3 dias antes:</b> aviso somente dentro do aplicativo.</div><div class="notice"><b>No vencimento:</b> aviso dentro do aplicativo.</div><div class="notice"><b>Após o vencimento:</b> aviso no aplicativo + WhatsApp.</div><div class="notice"><b>Pagamento confirmado:</b> notificação para o administrador.</div><p class="muted">A integração real com WhatsApp será conectada na próxima etapa.</p></div>`)}
function student(){
  const s=data.students.find(x=>x.email===current.email)||data.students[0],e=lastEval(s),v=e?bmi(e.weight,e.height):null;
  const first=s.evaluations?.[0], delta=e&&first?Number(e.weight)-Number(first.weight):0;
  return shell(header("Olá, "+current.name,"Seu espaço pessoal na Dunamis Fit")+
  `<div class="student-hero"><div class="avatar">${(s.name||"A").charAt(0).toUpperCase()}</div><div><h2>${s.name}</h2><p>${s.plan} • vencimento dia ${s.due}</p></div></div>
  <div class="profile-grid">
    <div class="profile-card highlight"><div class="label">Minha mensalidade</div><div class="value">R$ ${money(s.value)}</div><p class="muted">Plano ${s.plan}</p><span class="badge ${s.status}">${statusText(s.status)}</span></div>
    <div class="profile-card"><div class="label">Próximo vencimento</div><div class="value">Dia ${s.due}</div><p class="muted">Forma de pagamento: ${s.paymentMethod||"—"}</p></div>
  </div>
  <div class="panel"><div style="display:flex;justify-content:space-between;align-items:center"><div><h3 style="margin-bottom:3px">Meu desenvolvimento</h3><span class="muted">Acompanhe seus principais indicadores</span></div><button class="btn primary" style="width:auto" onclick="nav('development')">Ver evolução →</button></div>
    <div class="evolution-summary" style="margin-top:18px">
      <div class="profile-card"><div class="label">Peso atual</div><div class="value">${e?e.weight+" kg":"—"}</div>${delta<0?`<div class="change-down">↓ ${Math.abs(delta).toFixed(1)} kg desde a 1ª avaliação</div>`:delta>0?`<div class="change-up">↑ ${delta.toFixed(1)} kg desde a 1ª avaliação</div>`:"<div class='muted'>Primeira avaliação</div>"}</div>
      <div class="profile-card"><div class="label">Altura</div><div class="value">${e?e.height+" m":"—"}</div><div class="muted">Última avaliação</div></div>
      <div class="profile-card"><div class="label">IMC</div><div class="value">${v?v.toFixed(1):"—"}</div><div class="muted">${bmiLabel(v)}</div></div>
    </div>
  </div>`)
}
function development(){const s=data.students.find(x=>x.email===current.email)||data.students[0];const ev=[...(s.evaluations||[])].sort((a,b)=>a.date.localeCompare(b.date));return shell(header("Meu desenvolvimento","Acompanhe sua evolução ao longo do tempo.")+`<div class="panel"><h3>Medidas atuais</h3>${(() => {const e=lastEval(s),v=e?bmi(e.weight,e.height):null;return `<div class="grid"><div class="stat"><small>Idade</small><b>${ageFromBirth(s.birth)}</b></div><div class="stat"><small>Peso</small><b>${e?e.weight+" kg":"—"}</b></div><div class="stat"><small>Altura</small><b>${e?e.height+" m":"—"}</b></div><div class="stat"><small>IMC</small><b>${v?v.toFixed(1):"—"}</b><small>${bmiLabel(v)}</small></div></div>`})()}</div><div class="panel"><div style="display:flex;justify-content:space-between;align-items:center"><div><h3 style="margin-bottom:3px">Evolução do peso</h3><span class="muted">Veja como seu peso mudou entre as avaliações</span></div><b>${ev.length} avaliação(ões)</b></div>${weightChart(ev)}</div><div class="panel"><h3>Histórico de avaliações</h3>${ev.length?`<table class="table"><thead><tr><th>Data</th><th>Peso</th><th>Altura</th><th>IMC</th></tr></thead><tbody>${ev.slice().reverse().map(e=>{const v=bmi(e.weight,e.height);return `<tr><td>${fmtDate(e.date)}</td><td>${e.weight} kg</td><td>${e.height} m</td><td>${v.toFixed(1)} <small>${bmiLabel(v)}</small></td></tr>`}).join("")}</tbody></table>`:"<div class='empty'>Nenhuma avaliação registrada ainda.</div>"}</div>`)}
function history(){const s=data.students.find(x=>x.email===current.email)||data.students[0];const ps=data.payments.filter(p=>p.student===s.name);return shell(header("Histórico de pagamentos","Seus pagamentos confirmados.")+`<div class="panel">${ps.length?ps.map(p=>`<p>R$ ${money(p.value)} — ${p.date} <span class="badge paid">Pago</span></p>`).join(""):"<div class='empty'>Nenhum pagamento registrado ainda.</div>"}</div>`)}
function notices(){return shell(header("Avisos","Notificações importantes.")+`<div class="panel"><div class="notice"><b>3 dias antes do vencimento:</b> você receberá um lembrete dentro do aplicativo.</div><div class="notice"><b>Após o vencimento:</b> caso não haja pagamento, sua mensalidade ficará marcada como inadimplente e o aviso será reforçado.</div></div>`)}
const baseRender=render;
function render(){if(!current)return login();if(current.role==="aluno"){if(page==="development")return development();if(page==="history")return history();if(page==="notices")return notices();return student()}if(page==="students")return students();if(page==="payments")return payments();if(page==="plans")return plans();if(page==="notifications")return notifications();return dashboard()}
login();
