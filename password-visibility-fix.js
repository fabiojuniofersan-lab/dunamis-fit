// Dunamis Fit — olho da senha integrado ao campo
(function(){
  'use strict';

  function setup(){
    // Remove qualquer olho antigo que tenha sido criado fora do campo.
    document.querySelectorAll('.password-eye-toggle').forEach(function(el){el.remove();});

    const input=document.getElementById('pass');
    if(!input) return;
    if(input.dataset.eyeReady==='2') return;

    const frame=input.closest('.login-art-frame');
    const hitbox=input.closest('.login-hitbox');
    if(!frame || !hitbox) return;

    const btn=document.createElement('button');
    btn.type='button';
    btn.className='password-eye-toggle';
    btn.setAttribute('aria-label','Mostrar senha');
    btn.setAttribute('title','Mostrar senha');
    btn.innerHTML='<svg viewBox="0 0 32 24" aria-hidden="true" focusable="false"><path d="M2 12s3.8-7 14-7 14 7 14 7-3.8 7-14 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="16" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';

    Object.assign(btn.style,{
      position:'absolute',
      left:'65.2%',
      top:'47.15%',
      width:'5.2%',
      height:'6.1%',
      minWidth:'0',
      border:'0',
      borderRadius:'0',
      background:'transparent',
      color:'#e8e8e8',
      padding:'0',
      margin:'0',
      display:'flex',
      alignItems:'center',
      justifyContent:'center',
      cursor:'pointer',
      zIndex:'20',
      pointerEvents:'auto',
      boxShadow:'none',
      transform:'none'
    });

    const svg=btn.querySelector('svg');
    Object.assign(svg.style,{width:'68%',height:'68%',display:'block'});

    btn.addEventListener('click',function(e){
      e.preventDefault();
      e.stopPropagation();
      const show=input.type==='password';
      input.type=show?'text':'password';
      btn.innerHTML=show
        ? '<svg viewBox="0 0 32 24" aria-hidden="true" focusable="false"><path d="M3 12s3.6-7 13-7c3.2 0 5.8.7 7.9 1.8M29 12s-1.4 2.6-4.8 4.6M5.2 5.2 26.8 18.8M12.2 10.2a4 4 0 0 0 5.6 5.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg viewBox="0 0 32 24" aria-hidden="true" focusable="false"><path d="M2 12s3.8-7 14-7 14 7 14 7-3.8 7-14 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="16" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
      const s=btn.querySelector('svg');
      Object.assign(s.style,{width:'68%',height:'68%',display:'block'});
      btn.setAttribute('aria-label',show?'Ocultar senha':'Mostrar senha');
      btn.setAttribute('title',show?'Ocultar senha':'Mostrar senha');
      input.focus();
    });

    hitbox.appendChild(btn);
    input.dataset.eyeReady='2';
  }

  function start(){
    setup();
    if(document.body)new MutationObserver(function(){setup();}).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
