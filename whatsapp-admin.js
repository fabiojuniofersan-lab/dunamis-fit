// Dunamis Fit — central de WhatsApp no painel administrativo.
(function(){
  'use strict';
  const originalRender=window.render;
  let bound=false;
  function inject(){
    if(!window.current||window.current.role!=='admin'||window.page!=='notifications')return;
    const main=document.querySelector('.main');
    if(!main||main.querySelector('[data-whatsapp-center]'))return;
    const students=Array.isArray(window.data?.students)?window.data.students:[];
    const box=document.createElement('div');box.className='panel';box.setAttribute('data-whatsapp-center','1');box.style.marginBottom='18px';
    box.innerHTML=`<div class="panel-head"><div><h3>📱 Central de WhatsApp</h3><span class="muted">Envie mensagens individuais e acompanhe o resultado do envio.</span></div></div><div class="form-grid"><div class="field"><label>Aluno</label><select id="waStudent"><option value="">Selecione o aluno</option>${students.map(s=>`<option value="${String(s.id).replace(/"/g,'&quot;')}">${String(s.name||'').replace(/</g,'&lt;')} — ${String(s.phone||'sem WhatsApp')}</option>`).join('')}</select></div><div class="field" style="grid-column:1/-1"><label>Mensagem</label><textarea id="waMessage" rows="4" maxlength="4096" placeholder="Digite a mensagem que deseja enviar..."></textarea><small class="muted">Fora da janela de atendimento do WhatsApp, a Meta exige template previamente aprovado.</small></div></div><div class="actions"><button class="btn primary" id="waSend">📤 Enviar pelo WhatsApp</button></div><div id="waResult" class="notice" style="display:none;margin-top:14px"></div>`;
    main.prepend(box);
    box.querySelector('#waSend').addEventListener('click',send);
  }
  async function send(){
    const studentId=document.getElementById('waStudent')?.value;const message=document.getElementById('waMessage')?.value.trim();const result=document.getElementById('waResult');const button=document.getElementById('waSend');
    if(!studentId)return alert('Selecione um aluno.');if(!message)return alert('Digite uma mensagem.');
    const session=await window.dunamisSupabase?.auth.getSession();const token=session?.data?.session?.access_token;if(!token)return alert('Sua sessão expirou. Entre novamente.');
    button.disabled=true;button.textContent='Enviando...';
    try{const r=await fetch('/api/whatsapp-send',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({studentId,message})});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'Falha no envio.');result.style.display='block';result.className='notice success';result.textContent='✓ Mensagem enviada com sucesso.';document.getElementById('waMessage').value='';}catch(e){result.style.display='block';result.className='notice danger';result.textContent='⚠ '+(e.message||'Não foi possível enviar a mensagem.');}finally{button.disabled=false;button.textContent='📤 Enviar pelo WhatsApp';}
  }
  window.render=function(){if(typeof originalRender==='function')originalRender();setTimeout(inject,0)};
  window.addEventListener('load',()=>setTimeout(inject,0));
})();
