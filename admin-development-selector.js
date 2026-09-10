// Dunamis Fit — seleção de aluno para desenvolvimento no painel administrativo.
// Camada independente: não altera autenticação nem o fluxo de login.
(function(){
  'use strict';
  const originalDevelopment=window.development;
  if(typeof originalDevelopment!=='function')return;
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  window.dunamisSelectedDevelopmentStudentId=window.dunamisSelectedDevelopmentStudentId||null;

  window.development=function(){
    if(!window.current||window.current.role!=='admin')return originalDevelopment();
    const students=Array.isArray(window.data?.students)?window.data.students:[];
    if(!students.length)return originalDevelopment();
    let selected=students.find(s=>String(s.id)===String(window.dunamisSelectedDevelopmentStudentId));
    if(!selected)selected=students[0];

    // A implementação atual da tela usa o primeiro aluno. Durante a renderização,
    // colocamos o selecionado na primeira posição e restauramos a lista imediatamente depois.
    const originalStudents=window.data.students;
    window.data.students=[selected,...students.filter(s=>String(s.id)!==String(selected.id))];
    let html;
    try{html=originalDevelopment();}finally{window.data.students=originalStudents;}

    const options=students.map(s=>`<option value="${esc(s.id)}" ${String(s.id)===String(selected.id)?'selected':''}>${esc(s.name)}${s.email?` — ${esc(s.email)}`:''}</option>`).join('');
    const selector=`<div class="panel" style="margin-bottom:18px"><div class="panel-head"><div><h3>Aluno em análise</h3><span class="muted">Selecione qualquer aluno para visualizar a evolução física e as avaliações.</span></div></div><select id="development-student-selector" aria-label="Selecionar aluno" style="width:100%;padding:12px;border:1px solid #ddd;border-radius:12px;background:#fff;font:inherit" onchange="dunamisSelectDevelopmentStudent(this.value)">${options}</select></div>`;
    const marker='<div class="grid">';
    return html.includes(marker)?html.replace(marker,selector+marker):html;
  };

  window.dunamisSelectDevelopmentStudent=function(id){
    if(!window.current||window.current.role!=='admin')return;
    const exists=(window.data?.students||[]).some(s=>String(s.id)===String(id));
    if(!exists)return;
    window.dunamisSelectedDevelopmentStudentId=id;
    if(typeof window.render==='function')window.render();
  };
})();
