// Dunamis Fit — desenvolvimento físico do aluno selecionado pelo administrador.
// Corrige a navegação para que o item Desenvolvimento acompanhe o estado real da página.
(function(){
  'use strict';
  let selectedStudentId = null;

  function students(){ return Array.isArray(window.data?.students) ? window.data.students : []; }
  function esc(v){ return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;'); }

  function syncDevelopmentNav(){
    const nav=document.querySelector('.nav');
    if(!nav || !window.current || window.current.role!=='admin') return;
    let btn=nav.querySelector('[data-admin-development-nav]');
    if(!btn){
      btn=document.createElement('button');
      btn.setAttribute('data-admin-development-nav','1');
      btn.innerHTML='📈 Desenvolvimento';
      btn.type='button';
      const paymentsBtn=Array.from(nav.querySelectorAll('button')).find(b=>b.textContent.includes('Pagamentos'));
      if(paymentsBtn) paymentsBtn.insertAdjacentElement('beforebegin',btn); else nav.appendChild(btn);
    }
    // Sempre sincroniza o estado visual; não deixa o botão preso como ativo.
    btn.classList.toggle('active',window.page==='development');
    btn.onclick=()=>{ window.page='development'; if(typeof window.render==='function')window.render(); };
  }

  function selected(){
    const list=students();
    return list.find(s=>String(s.id)===String(selectedStudentId)) || list[0] || null;
  }

  function injectSelector(){
    if(!window.current || window.current.role!=='admin' || window.page!=='development') return;
    const main=document.querySelector('.main');
    if(!main) return;
    syncDevelopmentNav();
    let box=main.querySelector('[data-admin-development-selector]');
    if(!box){
      box=document.createElement('div');
      box.className='panel';
      box.setAttribute('data-admin-development-selector','1');
      main.prepend(box);
    }
    const list=students();
    const s=selected();
    box.innerHTML=`<div class="panel-head"><div><h3>Aluno em acompanhamento</h3><span class="muted">Selecione um aluno para consultar avaliações e evolução.</span></div><select id="adminDevelopmentStudent" aria-label="Selecionar aluno" style="min-width:240px;max-width:100%;padding:10px 12px;border:1px solid #ddd;border-radius:10px;font:inherit"><option value="">Selecione...</option>${list.map(x=>`<option value="${esc(x.id)}" ${s&&String(x.id)===String(s.id)?'selected':''}>${esc(x.name)}${x.email?` — ${esc(x.email)}`:''}</option>`).join('')}</select></div>`;
    const select=box.querySelector('#adminDevelopmentStudent');
    select?.addEventListener('change',()=>{
      const id=select.value || null;
      if(id && !list.some(x=>String(x.id)===String(id))) return;
      selectedStudentId=id;
      window.page='development';
      if(typeof window.render==='function')window.render();
    });
  }

  const originalDevelopment=window.development;
  window.development=function(){
    if(!window.current || window.current.role!=='admin') return typeof originalDevelopment==='function' ? originalDevelopment() : '';
    const s=selected();
    if(!s) return typeof originalDevelopment==='function' ? originalDevelopment() : '';
    const originalStudents=window.data.students;
    window.data.students=[s];
    try{ return typeof originalDevelopment==='function' ? originalDevelopment() : ''; }
    finally{ window.data.students=originalStudents; }
  };

  const originalRender=window.render;
  window.render=function(){
    if(typeof originalRender==='function') originalRender();
    // Aguarda o shell reconstruir a navegação e então sincroniza o botão.
    setTimeout(()=>{ syncDevelopmentNav(); injectSelector(); },0);
  };

  window.addEventListener('load',()=>setTimeout(()=>{syncDevelopmentNav();injectSelector()},0));
})();
