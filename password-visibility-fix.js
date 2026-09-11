// Dunamis Fit — botão de mostrar/ocultar senha
(function(){
  function addToggle(input){
    if(!input||input.dataset.eyeReady==='1')return;
    const field=input.closest('.field');
    if(!field)return;
    field.style.position='relative';
    input.style.paddingRight='48px';
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='password-eye-toggle';
    btn.setAttribute('aria-label','Mostrar senha');
    btn.textContent='👁';
    Object.assign(btn.style,{position:'absolute',right:'10px',bottom:'9px',width:'38px',height:'38px',border:'0',background:'transparent',color:'#fff',fontSize:'19px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',padding:'0',zIndex:'5'});
    btn.addEventListener('click',function(){
      const visible=input.type==='text';
      input.type=visible?'password':'text';
      btn.textContent=visible?'👁':'🙈';
      btn.setAttribute('aria-label',visible?'Mostrar senha':'Ocultar senha');
      input.focus();
    });
    field.appendChild(btn);
    input.dataset.eyeReady='1';
  }
  function scan(){
    document.querySelectorAll('input[type="password"]').forEach(addToggle);
  }
  scan();
  new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
})();
