// Dunamis Fit — desenvolvimento físico do aluno selecionado pelo administrador.
// Camada independente: não altera autenticação nem o fluxo de recuperação de senha.
(function(){
  'use strict';
  let selectedStudentId = null;

  function students(){ return Array.isArray(window.data?.students) ? window.data.students : []; }
  function esc(v){ return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  function ensureAdminNav(){
    if(!window.current || window.current.role!=='admin') return;
    const nav=document.querySelector('.nav');
    if(!nav || nav.querySelector('[data-admin-development-nav]')) return;
    const btn=document.createElement('button');
    btn.setAttribute('data-admin-development-nav','1');
    btn.className=window.page==='development'?'active':'';
    btn.innerHTML='📈 Desenvolvimento';
    btn.addEventListener('click',()=>{ window.page='development'; render(); });
    const paymentsBtn=Array.from(nav.querySelectorAll('button')).find(b=>b.textContent.includes('Pagamentos'));
    if(paymentsBtn) paymentsBtn.insertAdjacentElement('beforebegin',btn); else nav.appendChild(btn);
  }

  function selected(){
    const list=students();
    return list.find(s=>String(s.id)===String(selectedStudentId)) || list[0] || null;
  }

  function injectSelector(){
    if(!window.current || window.current.role!=='admin' || window.page!=='development') return;
    const main=document.querySelector('.main');
    if(!main) return;
    ensureAdminNav();
    let box=main.querySelector('[data-admin-development-selector]');
    if(!box){
      box=document.createElement('div');
      box.className='panel';
      box.setAttribute('data-admin-development-selector','1');
      main.prepend(box);
    }
    const s=selected();
    box.innerHTML=`<div class="panel-head"><div><h3>Aluno em acompanhamento</h3><span class="muted">Selecione um aluno para consultar avaliações e evolução.</span></div><select id="adminDevelopmentStudent" style="min-width:240px;max-width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:10px;font:inherit"><option value="">Selecione...</option>${students().map(x=>`<option value="${esc(x.id)}" ${s&&String(x.id)===String(s.id)?'selected':''}>${esc(x.name)} — ${esc(x.email)}</option>`).join('')}</select></div>`;
    const select=box.querySelector('#adminDevelopmentStudent');
    select?.addEventListener('change',()=>{
      selectedStudentId=select.value || null;
      render();
    });
  }

  const originalDevelopment=window.development;
  window.development=function(){
    if(!window.current || window.current.role!=='admin') return typeof originalDevelopment==='function' ? originalDevelopment() : '';
    const s=selected();
    if(!s) return typeof originalDevelopment==='function' ? originalDevelopment() : '';
    const previousId=window.current.studentId;
    // development-fix.js uses current.studentId only for aluno; for admin it takes data.students[0].
    // Temporarily expose the selected student through a narrow, reversible adapter.
    const originalStudents=window.data.students;
    window.data.students=[s];
    let html='';
    try{ html=typeof originalDevelopment==='function' ? originalDevelopment() : ''; }
    finally{ window.data.students=originalStudents; window.current.studentId=previousId; }
    setTimeout(injectSelector,0);
    return html;
  };

  const originalRender=window.render;
  window.render=function(){
    if(typeof originalRender==='function') originalRender();
    setTimeout(()=>{ ensureAdminNav(); injectSelector(); },0);
  };

  window.addEventListener('load',()=>setTimeout(()=>{ensureAdminNav();injectSelector()},0));
})();
