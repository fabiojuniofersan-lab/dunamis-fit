// Dunamis Fit — pagamento Pix seguro via cobrança individual Asaas.
(function(){
  const originalRender=window.render;
  function inject(){
    if(!window.current||window.current.role!=='aluno')return;
    const main=document.querySelector('.main'); if(!main||main.querySelector('[data-online-payment]'))return;
    const s=(window.data?.students||[]).find(x=>String(x.id)===String(window.current.studentId))||(window.data?.students||[])[0]; if(!s)return;
    const target=main.querySelector('.billing-card')||main.querySelector('.panel'); if(!target)return;
    const box=document.createElement('div'); box.setAttribute('data-online-payment','1'); box.className='panel'; box.style.marginTop='18px';
    box.innerHTML=`<div class="panel-head"><div><h3>💠 Pagar mensalidade</h3><span class="muted">Pagamento confirmado automaticamente pelo sistema.</span></div></div>
      <div class="payment-method-grid"><button class="online-method" onclick="window.dunamisStartPayment('pix')"><strong>▣ PIX</strong><span>QR Code e Pix Copia e Cola</span></button><button class="online-method" onclick="window.dunamisStartPayment('card')"><strong>💳 CARTÃO</strong><span>Pagamento seguro pelo gateway</span></button><button class="online-method" onclick="window.dunamisStartPayment('cash')"><strong>💵 DINHEIRO</strong><span>Pagamento presencial na academia</span></button></div>
      <div data-pix-box style="display:none;margin-top:16px"></div>
      <div class="notice" style="margin-top:14px">🔒 O Dunamis Fit não permite que o aluno marque a própria mensalidade como paga. A baixa ocorre somente após confirmação do gateway.</div>`;
    target.insertAdjacentElement('afterend',box);
  }

  function showPix(d){
    const box=document.querySelector('[data-pix-box]'); if(!box)return;
    const img=d.encodedImage?`<img src="data:image/png;base64,${d.encodedImage}" alt="QR Code Pix" style="display:block;width:220px;height:220px;max-width:100%;margin:0 auto 14px;border-radius:12px">`:'';
    const payload=d.payload||'';
    box.style.display='block';
    box.innerHTML=`<div class="notice" style="text-align:center"><strong>PIX da mensalidade</strong><div style="margin:10px 0">${img}<div style="font-size:13px;word-break:break-all;text-align:left;padding:10px;border:1px solid rgba(0,0,0,.12);border-radius:8px">${payload||'Código Pix indisponível'}</div><button class="btn small-btn" style="margin-top:10px" onclick="window.dunamisCopyPix()">📋 Copiar Pix Copia e Cola</button></div><div class="muted">Depois do pagamento, não é necessário informar nada. A confirmação será feita automaticamente.</div></div>`;
    window.__dunamisPixPayload=payload;
  }

  window.dunamisCopyPix=async function(){
    const p=window.__dunamisPixPayload||''; if(!p)return alert('Código Pix indisponível.');
    try{await navigator.clipboard.writeText(p);alert('Pix Copia e Cola copiado.');}catch(e){alert('Não foi possível copiar automaticamente.');}
  };

  window.dunamisStartPayment=async function(method){
    if(method==='cash')return alert('Pagamento em dinheiro: faça o pagamento presencialmente. A mensalidade só será marcada como paga após confirmação da academia.');
    try{
      const session=await window.dunamisSupabase?.auth.getSession(); const token=session?.data?.session?.access_token;
      if(!token)return alert('Sua sessão expirou. Entre novamente.');
      const r=await fetch('/api/asaas-create-payment',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({method})});
      const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||'Não foi possível iniciar o pagamento.');
      if(d.paid){alert('✅ Esta mensalidade já foi confirmada.');if(typeof window.refreshCloudData==='function')await window.refreshCloudData();if(typeof window.render==='function')window.render();return;}
      if(method==='pix'){
        const qr=await fetch('/api/asaas-pix',{headers:{'Authorization':`Bearer ${token}`}});
        const qd=await qr.json().catch(()=>({})); if(!qr.ok)throw new Error(qd.error||'Não foi possível carregar o QR Code Pix.');
        showPix(qd);return;
      }
      if(d.invoiceUrl){window.open(d.invoiceUrl,'_blank','noopener,noreferrer');return;}
      alert('Cobrança criada, mas o link ainda não foi disponibilizado.');
    }catch(e){alert(e.message||'Não foi possível iniciar o pagamento.');}
  };

  window.render=function(){if(typeof originalRender==='function')originalRender();setTimeout(inject,0)};
  window.addEventListener('load',()=>setTimeout(inject,0));
})();
