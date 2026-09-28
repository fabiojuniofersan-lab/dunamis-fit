// Dunamis Fit — ajustes do formulário de aluno
(function(){
  function setup(){
    const modal=document.querySelector('.modal .modal-card');
    if(!modal) return;
    const form=modal.querySelector('.form-grid');
    if(!form) return;

    if(!document.getElementById('spw')){
      const fields=[...form.querySelectorAll('.field')];
      const payment=fields.find(el=>/forma de pagamento/i.test(el.querySelector('label')?.textContent||''));
      const box=document.createElement('div');
      box.className='field';
      const editing=modal.querySelector('h3')?.textContent?.startsWith('Editar');
      box.innerHTML='<label>Senha de acesso</label><input id="spw" type="password" autocomplete="new-password" placeholder="'+(editing?'Deixe em branco para manter':'Mínimo de 6 caracteres')+'">';
      if(payment && payment.nextSibling) form.insertBefore(box,payment.nextSibling); else form.appendChild(box);
    }

    const studentId=(document.querySelector('.modal .btn.primary[onclick*="saveStudent"]')?.getAttribute('onclick')||'').match(/saveStudent\((\d+)\)/)?.[1];
    if(studentId && window.data?.students){
      const s=window.data.students.find(x=>String(x.id)===String(studentId));
      const e=s && Array.isArray(s.evaluations) && s.evaluations.length ? s.evaluations[s.evaluations.length-1] : null;
      const w=document.getElementById('sw'),h=document.getElementById('sh');
      if(e){
        if(w && !w.value) w.value=e.weight||'';
        if(h && !h.value) h.value=e.height||'';
      }
    }
  }
  const start=()=>{setup();new MutationObserver(setup).observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();