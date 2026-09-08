// Dunamis Fit — área de pagamento do aluno (gateway preparado para ativação futura)
(function(){
  const originalRender=window.render;
  function esc(v){return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
  function inject(){
    if(!window.current||window.current.role!=='aluno')return;
    const main=document.querySelector('.main');
    if(!main||main.querySelector('[data-online-payment]'))return;
    const s=(window.data?.students||[]).find(x=>String(x.id)===String(window.current.studentId))||(window.data?.students||[])[0];
    if(!s)return;
    const target=main.querySelector('.billing-card')||main.querySelector('.panel');
    if(!target)return;
    const box=document.createElement('div');
    box.setAttribute('data-online-payment','1');
    box.className='panel';
    box.style.marginTop='18px';
    box.innerHTML=`<div class="panel-head"><div><h3>💳 Pagar mensalidade</h3><span class="muted">Escolha como deseja pagar. O pagamento online será ativado quando a conta da academia for conectada ao gateway.</span></div></div>
      <div class="payment-method-grid">
        <button class="online-method" onclick="window.dunamisStartPayment('pix')"><strong>▣ PIX</strong><span>QR Code e Pix Copia e Cola</span></button>
        <button class="online-method" onclick="window.dunamisStartPayment('card')"><strong>💳 CARTÃO</strong><span>Pagamento seguro pelo gateway</span></button>
        <button class="online-method" onclick="window.dunamisStartPayment('cash')"><strong>💵 DINHEIRO</strong><span>Pagamento presencial na academia</span></button>
      </div>
      <div class="notice" style="margin-top:14px">🔒 Os dados completos do cartão não serão armazenados pelo Dunamis Fit.</div>`;
    target.insertAdjacentElement('afterend',box);
  }
  window.dunamisStartPayment=function(method){
    if(method==='cash')return alert('Pagamento em dinheiro: faça o pagamento presencialmente e aguarde a confirmação da academia.');
    alert(method==='pix'?'O PIX ficará disponível assim que a conta de pagamentos da academia for conectada.':'O pagamento por cartão ficará disponível assim que a conta de pagamentos da academia for conectada.');
  };
  window.render=function(){
    if(typeof originalRender==='function')originalRender();
    setTimeout(inject,0);
  };
  window.addEventListener('load',()=>setTimeout(inject,0));
})();
