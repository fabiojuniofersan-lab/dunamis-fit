// Independent UI enhancement: quick student search without touching authentication.
(function(){
  function enhance(){
    if(typeof page==='undefined' || page!=='students') return;
    const panel=document.querySelector('.main .panel');
    const table=document.querySelector('.main .table');
    if(!panel || !table || document.getElementById('student-search')) return;
    const head=panel.querySelector('.btn.primary');
    const wrap=document.createElement('div');
    wrap.style.cssText='display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin-bottom:14px';
    const label=document.createElement('div');
    label.innerHTML='<strong>Lista de alunos</strong><div class="muted" style="font-size:12px;margin-top:3px">Pesquise por nome ou e-mail</div>';
    const input=document.createElement('input');
    input.id='student-search';
    input.type='search';
    input.placeholder='🔎 Buscar aluno...';
    input.setAttribute('aria-label','Buscar aluno');
    input.style.cssText='width:min(320px,100%);padding:12px 14px;border:1px solid #ddd;border-radius:12px;background:#fff;outline:none';
    wrap.append(label,input);
    if(head) head.parentElement.insertBefore(wrap,head.nextSibling);
    else panel.insertBefore(wrap,panel.firstChild);
    input.addEventListener('input',function(){
      const term=this.value.trim().toLocaleLowerCase('pt-BR');
      table.querySelectorAll('tbody tr').forEach(row=>{
        row.style.display=row.innerText.toLocaleLowerCase('pt-BR').includes(term)?'':'none';
      });
    });
  }
  const observer=new MutationObserver(()=>setTimeout(enhance,0));
  observer.observe(document.getElementById('app'),{childList:true,subtree:true});
  setTimeout(enhance,50);
})();
