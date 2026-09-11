// Dunamis Fit — olho da senha integrado ao campo, com toggle repetível
(function(){
  'use strict';

  const EYE_OPEN='<svg viewBox="0 0 32 24" aria-hidden="true" focusable="false"><path d="M2 12s3.8-7 14-7 14 7 14 7-3.8 7-14 7S2 12 2 12Z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="16" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
  const EYE_CLOSED='<svg viewBox="0 0 32 24" aria-hidden="true" focusable="false"><path d="M3 12s3.6-7 13-7c3.2 0 5.8.7 7.9 1.8M29 12s-1.4 2.6-4.8 4.6M5.2 5.2 26.8 18.8M12.2 10.2a4 4 0 0 0 5.6 5.6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function styleSvg(btn){
    const s=btn.querySelector('svg');
    if(s) Object.assign(s.style,{width:'68%',height:'68%',display:'block'});
  }

  function setup(){
    const input=document.getElementById('pass');
    if(!input) return;
    const hitbox=input.closest('.login-hitbox');
    if(!hitbox) return;

    let btn=hitbox.querySelector('.password-eye-toggle');
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.className='password-eye-toggle';
      btn.setAttribute('aria-label','Mostrar senha');
      btn.setAttribute('title','Mostrar senha');
      Object.assign(btn.style,{
        position:'absolute',left:'65.2%',top:'47.15%',width:'5.2%',height:'6.1%',minWidth:'0',
        border:'0',borderRadius:'0',background:'transparent',color:'#e8e8e8',padding:'0',margin:'0',
        display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',zIndex:'20',
        pointerEvents:'auto',boxShadow:'none',transform:'none'
      });
      hitbox.appendChild(btn);
    }

    function sync(){
      const shown=input.type==='text';
      btn.innerHTML=shown?EYE_CLOSED:EYE_OPEN;
      btn.setAttribute('aria-label',shown?'Ocultar senha':'Mostrar senha');
      btn.setAttribute('title',shown?'Ocultar senha':'Mostrar senha');
      styleSvg(btn);
    }

    if(btn.dataset.bound!=='1'){
      btn.addEventListener('pointerdown',function(e){e.preventDefault();e.stopPropagation();});
      btn.addEventListener('click',function(e){
        e.preventDefault();
        e.stopPropagation();
        input.type=input.type==='password'?'text':'password';
        sync();
        input.focus();
      });
      btn.dataset.bound='1';
    }
    sync();
    input.dataset.eyeReady='2';
  }

  function start(){
    setup();
    if(document.body)new MutationObserver(function(){setup();}).observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
