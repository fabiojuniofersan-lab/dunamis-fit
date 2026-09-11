// Dunamis Fit — revisão administrativa: dashboard, alunos, ranking e indicadores
(function(){
  'use strict';
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const monthNow=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit'}).format(new Date());
  const students=()=>Array.isArray(window.data?.students)?window.data.students:[];
  const rankScore=s=>{
    const ev=Array.isArray(s.evaluations)?s.evaluations:[];
    if(ev.length<2)return -Infinity;
    const first=Number(ev[0]?.weight||0), last=Number(ev[ev.length-1]?.weight||0);
    return first>0?((first-last)/first)*100:-Infinity;
  };
  const ranking=()=>students().slice().sort((a,b)=>{
    const sa=rankScore(a),sb=rankScore(b);
    if(sb!==sa)return sb-sa;
    return String(a.name||'').localeCompare(String(b.name||''),'pt-BR');
  });
  const rankLabel=(s,i)=>rankScore(s)===-Infinity?'Aguardando 2ª avaliação':`${rankScore(s)>=0?'−':''}${Math.abs(rankScore(s)).toFixed(1)}% no peso`;
  const bar=(label,value,total,cls='')=>{const pct=total?Math.round(value/total*100):0;return `<div class="md-bar-row"><div class="md-bar-label"><span>${esc(label)}</span><b>${value}</b></div><div class="md-bar"><i class="${cls}" style="width:${Math.max(2,pct)}%"></i></div></div>`};

  window.dashboard=function(){
    if(!window.current||window.current.role!=='admin')return;
    const list=students();
    const paid=list.filter(s=>s.status==='paid').length;
    const late=list.filter(s=>s.status==='late').length;
    const pending=list.filter(s=>s.status==='pending').length;
    const totalValue=list.reduce((a,s)=>a+Number(s.value||0),0);
    const month=monthNow();
    const newStudents=list.filter(s=>String(s.start||'').slice(0,7)===month).length;
    const female=list.filter(s=>s.gender==='Feminino').length;
    const male=list.filter(s=>s.gender==='Masculino').length;
    const other=list.length-female-male;
    const top=ranking().filter(s=>rankScore(s)!==-Infinity).slice(0,5);
    const maxScore=Math.max(...top.map(rankScore),0);
    const planNames=['3 dias por semana','4 dias por semana','5 dias por semana'];
    return shell(header('Dashboard','Visão geral administrativa da Dunamis Fit')+
      `<div class="md-kpis">
        <div class="md-kpi"><span>👥 Alunos</span><strong>${list.length}</strong><small>cadastros ativos</small></div>
        <div class="md-kpi"><span>🆕 Novos alunos</span><strong>${newStudents}</strong><small>neste mês</small></div>
        <div class="md-kpi"><span>💰 Receita prevista</span><strong>R$ ${money(totalValue)}</strong><small>mensalidades</small></div>
        <div class="md-kpi"><span>🔴 Inadimplentes</span><strong>${late}</strong><small>${pending} pendente(s)</small></div>
      </div>
      <div class="md-grid">
        <section class="panel md-panel"><div class="md-title"><div><h3>Distribuição por sexo</h3><small class="muted">Preenchido no cadastro de cada aluno</small></div></div>
          ${bar('Feminino',female,list.length,'female')}${bar('Masculino',male,list.length,'male')}${bar('Outro / não informado',other,list.length,'other')}
          <div class="md-total">Total: <b>${list.length}</b> alunos</div>
        </section>
        <section class="panel md-panel"><div class="md-title"><div><h3>Distribuição por plano</h3><small class="muted">Quantidade de alunos matriculados</small></div></div>
          ${planNames.map(p=>bar(p,list.filter(s=>s.plan===p).length,list.length,'plan')).join('')}
        </section>
      </div>
      <div class="md-grid">
        <section class="panel md-panel"><div class="md-title"><div><h3>💳 Saúde financeira</h3><small class="muted">Situação atual das mensalidades</small></div></div>
          ${bar('Pagos',paid,list.length,'paid')}${bar('Pendentes',pending,list.length,'pending')}${bar('Inadimplentes',late,list.length,'late')}
          <div class="md-total">Taxa de pagamento: <b>${list.length?Math.round(paid/list.length*100):0}%</b></div>
        </section>
        <section class="panel md-panel"><div class="md-title"><div><h3>🏆 Ranking de evolução</h3><small class="muted">Redução de peso entre avaliações registradas</small></div><button class="btn secondary small-btn" onclick="nav('students')">Ver alunos</button></div>
          ${top.length?top.map((s,i)=>`<div class="md-rank"><span class="md-pos">${i+1}º</span>${avatar(s,40)}<div class="md-rank-name"><b>${esc(s.name)}</b><small>${esc(rankLabel(s,i))}</small></div><strong>${rankScore(s).toFixed(1)}%</strong></div>`).join(''):'<div class="empty">Ainda não há alunos com duas avaliações para formar o ranking.</div>'}
        </section>
      </div>
      <section class="panel md-panel"><div class="md-title"><div><h3>🔎 Visão dos módulos</h3><small class="muted">Resumo para conferência rápida</small></div></div>
        <div class="md-module-grid"><button onclick="nav('students')"><b>👥 Alunos</b><span>${list.length} cadastrados • ${newStudents} novos</span></button><button onclick="nav('payments')"><b>💳 Pagamentos</b><span>${paid} pagos • ${late} inadimplentes</span></button><button onclick="nav('plans')"><b>📋 Planos</b><span>${new Set(list.map(s=>s.plan)).size} planos utilizados</span></button><button onclick="nav('notifications')"><b>🔔 Notificações</b><span>Central administrativa</span></button></div>
      </section>`+mdStyles());
  };

  window.students=function(){
    if(!window.current||window.current.role!=='admin')return;
    const list=students();
    const ranked=ranking();
    const rankMap=new Map(ranked.map((s,i)=>[String(s.id),i+1]));
    return shell(header('Alunos','Cadastro individual, e-mail de acesso e acompanhamento.')+
      `<div class="panel md-panel"><div class="md-student-head"><div><h3>Base de alunos</h3><small class="muted">Cada aluno possui seu próprio e-mail e senha de acesso.</small></div><button class="btn primary small-btn" onclick="studentForm()">+ Novo aluno</button></div>
      <div class="md-student-summary"><span><b>${list.length}</b> alunos</span><span><b>${list.filter(s=>s.gender==='Feminino').length}</b> mulheres</span><span><b>${list.filter(s=>s.gender==='Masculino').length}</b> homens</span><span><b>${list.filter(s=>String(s.start||'').slice(0,7)===monthNow()).length}</b> novos no mês</span></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>#</th><th>Aluno</th><th>E-mail de acesso</th><th>Plano</th><th>Sexo</th><th>Status</th><th>Ações</th></tr></thead><tbody>${list.map(s=>`<tr><td><b>${rankMap.get(String(s.id))||'—'}</b></td><td><div class="person">${avatar(s,42)}<div><b>${esc(s.name)}</b><br><small>${s.birth?fmtDate(s.birth):'Nascimento não informado'}</small></div></div></td><td>${esc(s.email)}</td><td>${esc(s.plan)}</td><td>${esc(s.gender||'Não informado')}</td><td><span class="badge ${statusClass(s.status)}">${statusText(s.status)}</span></td><td><div class="actions"><button class="btn secondary" onclick="studentForm('${esc(s.id)}')">Editar</button><button class="btn secondary" onclick="evaluationForm('${esc(s.id)}')">Avaliar</button></div></td></tr>`).join('')}</tbody></table></div></div>`+mdStyles());
  };

  window.studentForm=function(id){
    const s=id?students().find(x=>String(x.id)===String(id)):null;
    const base=s||{name:'',birth:'',email:'',phone:'',gender:'',plan:'4 dias por semana',value:80,due:10,start:new Date().toISOString().slice(0,10),paymentMethod:'Pix',status:'pending',evaluations:[],photo:''};
    const ev=Array.isArray(base.evaluations)?base.evaluations:[];
    app.insertAdjacentHTML('beforeend',`<div class="modal"><div class="card modal-card md-form-card"><h3>${id?'Editar':'Novo'} aluno</h3><p class="muted">${id?'Atualize os dados do aluno.':'O e-mail será usado pelo aluno para entrar no aplicativo.'}</p><div class="form-grid">
      <div class="field"><label>Nome completo</label><input id="sn" value="${esc(base.name)}"></div>
      <div class="field"><label>Data de nascimento</label><input id="sb" type="date" value="${esc(base.birth||'')}"></div>
      <div class="field"><label>E-mail de acesso *</label><input id="se" type="email" autocomplete="email" value="${esc(base.email)}"></div>
      <div class="field"><label>WhatsApp</label><input id="sp" value="${esc(base.phone||'')}"></div>
      <div class="field"><label>Sexo</label><select id="sg"><option value="">Selecione</option><option value="Feminino">Feminino</option><option value="Masculino">Masculino</option><option value="Outro">Outro</option><option value="Prefiro não informar">Prefiro não informar</option></select></div>
      <div class="field"><label>${id?'Nova senha (opcional)':'Senha de acesso *'}</label><input id="spw" type="password" autocomplete="new-password" placeholder="Mínimo de 6 caracteres"></div>
      <div class="field"><label>Plano</label><select id="spl"><option>3 dias por semana</option><option>4 dias por semana</option><option>5 dias por semana</option></select></div>
      <div class="field"><label>Valor mensal</label><input id="sv" type="number" step="0.01" value="${Number(base.value)||0}"></div>
      <div class="field"><label>Dia de vencimento</label><input id="sd" type="number" min="1" max="31" value="${Number(base.due)||10}"></div>
      <div class="field"><label>Data de início</label><input id="sst" type="date" value="${esc(base.start||'')}"></div>
      <div class="field"><label>Forma de pagamento</label><select id="spm"><option>Pix</option><option>Dinheiro</option><option>Cartão</option></select></div>
      <div class="field"><label>Peso atual (kg)</label><input id="sw" type="number" step="0.1" value="${ev.length?Number(ev[ev.length-1]?.weight||''):''}"></div>
      <div class="field"><label>Altura (m)</label><input id="sh" type="number" step="0.01" value="${ev.length?Number(ev[ev.length-1]?.height||''):''}"></div>
    </div><div class="actions"><button class="btn secondary" onclick="render()">Cancelar</button><button class="btn primary" onclick="saveStudent('${id||''}')">Salvar aluno</button></div></div></div>`);
    spl.value=base.plan||'4 dias por semana'; spm.value=base.paymentMethod||'Pix'; sg.value=base.gender||'';
  };

  function mdStyles(){return `<style>
    .md-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px}.md-kpi{background:linear-gradient(145deg,#151515,#242424);color:#fff;border-radius:20px;padding:20px;box-shadow:0 12px 28px rgba(0,0,0,.12)}.md-kpi span{display:block;font-size:13px;color:#ddd}.md-kpi strong{display:block;font-size:30px;margin:9px 0 3px}.md-kpi small{color:#aaa}.md-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}.md-panel{padding:22px}.md-title,.md-student-head{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:16px}.md-title h3{margin:0 0 4px}.md-title small{display:block}.md-bar-row{margin:15px 0}.md-bar-label{display:flex;justify-content:space-between;gap:12px;font-size:13px;margin-bottom:7px}.md-bar{height:9px;border-radius:20px;background:#eee;overflow:hidden}.md-bar i{display:block;height:100%;border-radius:20px;background:#f28c18}.md-total{margin-top:16px;padding-top:14px;border-top:1px solid #eee}.md-rank{display:flex;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #eee}.md-rank:last-child{border-bottom:0}.md-pos{width:28px;font-weight:900}.md-rank-name{flex:1}.md-rank-name b,.md-rank-name small{display:block}.md-rank-name small{color:#777;margin-top:3px}.md-module-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.md-module-grid button{border:1px solid #eee;background:#fff;border-radius:16px;padding:17px;text-align:left;cursor:pointer}.md-module-grid b,.md-module-grid span{display:block}.md-module-grid span{font-size:12px;color:#777;margin-top:7px}.md-student-summary{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px}.md-student-summary span{background:#f7f7f7;border-radius:12px;padding:9px 12px;font-size:13px}.md-form-card{max-height:90vh;overflow:auto}.password-eye-toggle{z-index:30!important}.md-form-card .field{position:relative}.md-form-card #spw{padding-right:48px}.md-form-card .password-eye-toggle{position:absolute!important;right:8px!important;top:50%!important;left:auto!important;width:40px!important;height:40px!important;transform:translateY(-50%)!important}.md-form-card .password-eye-toggle svg{width:68%!important;height:68%!important}.md-bar i.female,.md-bar i.male,.md-bar i.other,.md-bar i.plan,.md-bar i.paid,.md-bar i.pending,.md-bar i.late{background:#f28c18}
    @media(max-width:900px){.md-kpis{grid-template-columns:repeat(2,1fr)}.md-grid{grid-template-columns:1fr}.md-module-grid{grid-template-columns:repeat(2,1fr)}}
    @media(max-width:600px){.md-kpis{grid-template-columns:1fr 1fr}.md-kpi{padding:15px}.md-kpi strong{font-size:23px}.md-module-grid{grid-template-columns:1fr}.md-student-head{align-items:flex-start;flex-direction:column}.md-student-summary{display:grid;grid-template-columns:1fr 1fr}}
  </style>`}
})();
