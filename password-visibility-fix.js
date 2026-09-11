// Dunamis Fit — mostrar/ocultar senha (correção robusta)
(function(){
  'use strict';

  function addToggle(input){
    if(!input || input.dataset.eyeReady==='1') return;

    const field=input.closest('.field') || input.parentElement;
    if(!field) return;

    field.style.position='relative';
    input.style.paddingRight='52px';

    const btn=document.createElement('button');
    btn.type='button';
    btn.className='password-eye-toggle';
    btn.setAttribute('aria-label','Mostrar senha');
    btn.setAttribute('title','Mostrar senha');
    btn.textContent='👁️';

    Object.assign(btn.style,{
      position:'absolute',right:'8px',top:'50%',transform:'translateY(-50%)',
      width:'40px',height:'40px',minWidth:'40px',border:'0',borderRadius:'10px',
      background:'transparent',color:'#fff',fontSize:'20px',lineHeight:'1',cursor:'pointer',
      display:'flex',alignItems:'center',justifyContent:'center',padding:'0',margin:'0',
      zIndex:'9999',pointerEvents:'auto'
    });

    function toggle(e){
      if(e){e.preventDefault();e.stopPropagation();}
      const show=input.type==='password';
      input.type=show?'text':'password';
      btn.textContent=show?'🙈':'👁️';
      btn.setAttribute('aria-label',show?'Ocultar senha':'Mostrar senha');
      btn.setAttribute('title',show?'Ocultar senha':'Mostrar senha');
      input.focus();
    }

    btn.addEventListener('click',toggle);
    btn.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();});
    field.appendChild(btn);
    input.dataset.eyeReady='1';
  }

  function scan(){document.querySelectorAll('input[type="password"]').forEach(addToggle);}

  function start(){
    scan();
    if(document.body)new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
