// Dunamis Fit — pagamentos online via gateway
(function(){
  const originalRender=window.render;
  function inject(){
    if(!window.current||window.current.role!=='aluno')return;
    const main=document.querySelector('.main'); if(!main||main.querySelector('[data-online-payment]'))return;
    const s=(window.data?.students||[]).find(x=>String(x.id)===String(window.current.studentId))||(window.data?.students||[])[0]; if(!s)return;
    const target=main.querySelector('.billing-card')||main.querySelector('.panel'); if(!target)return;
    const box=document.createElement('div'); box.setAttribute('data-online-payment','1'); box.className='panel'; box.style.marginTop='18px';
    box.innerHTML=`<div class="panel-head"><div><h3>💳 Pagar mensalidade</h3><span class="muted">Escolha uma forma de pagamento segura.</span></div></div>
      <div class="payment-method-grid"><button class="online-method" onclick="window.dunamisStartPayment('pix')"><strong>▣ PIX</strong><span>QR Code e Pix Copia e Cola</span></button><button class="online-method" onclick="window.dunamisStartPayment('card')"><strong>💳 CARTÃO</strong><span>Pagamento seguro pelo gateway</span></button><button class="online-method" onclick="window.dunamisStartPayment('cash')"><strong>💵 DINHEIRO</strong><span>Pagamento presencial na academia</span></button></div>
      <div class="notice" style="margin-top:14px">🔒 Os dados completos do cartão não são armazenados pelo Dunamis Fit.</div>`;
    target.insertAdjacentElement('afterend',box);
  }
  window.dunamisStartPayment=async function(method){
    if(method==='cash')return alert('Pagamento em dinheiro: faça o pagamento presencialmente e aguarde a confirmação da academia.');
    try{
      const session=await window.dunamisSupabase?.auth.getSession(); const token=session?.data?.session?.access_token;
      if(!token)return alert('Sua sessão expirou. Entre novamente.');
      const r=await fetch('/api/asaas-create-payment',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${token}`},body:JSON.stringify({method})});
      const d=await r.json().catch(()=>({})); if(!r.ok)throw new Error(d.error||'Não foi possível iniciar o pagamento.');
      if(d.invoiceUrl){window.open(d.invoiceUrl,'_blank','noopener,noreferrer');return;}
      alert('Cobrança criada, mas o link de pagamento ainda não foi disponibilizado.');
    }catch(e){alert(e.message||'Não foi possível iniciar o pagamento.');}
  };
  window.render=function(){if(typeof originalRender==='function')originalRender();setTimeout(inject,0)};
  window.addEventListener('load',()=>setTimeout(inject,0));
})();
