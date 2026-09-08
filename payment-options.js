// Dunamis Fit — opções de pagamento do aluno, prontas para gateway futuro
(function(){
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const moneyLocal=v=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2});
  const statusLocal=s=>s==='paid'?'Pago':s==='late'?'Inadimplente':'Pendente';
  window.meu=function(){
    if(!current||current.role!=='aluno')return;
    const s=(data.students||[]).find(x=>String(x.id)===String(current.studentId))||(data.students||[]).find(x=>x.email===current.email);
    if(!s)return shell(header('Minha mensalidade','Seus dados financeiros')); 
    const due=`Dia ${s.due}`;
    const paid=s.status==='paid';
    return shell(header('Minha mensalidade','Acompanhe e pague sua mensalidade')+
      `<div class="billing-card"><div class="billing-main"><span>Mensalidade atual</span><strong>R$ ${moneyLocal(s.value)}</strong><span>Vencimento: ${due}</span></div><span class="badge ${paid?'paid':s.status==='late'?'late':'pending'}">${statusLocal(s.status)}</span></div>`+
      `<div class="panel"><div class="panel-head"><div><h3>Escolha como pagar</h3><span class="muted">Pagamento seguro. Os dados do cartão não ficam armazenados no Dunamis Fit.</span></div></div>`+
      `<div class="payment-method-grid">`+
      `<button class="payment-method" onclick="startOnlinePayment('pix')"><span class="payment-icon">▣</span><div><b>PIX</b><small>QR Code e Pix Copia e Cola</small></div><span>›</span></button>`+
      `<button class="payment-method" onclick="startOnlinePayment('card')"><span class="payment-icon">▱</span><div><b>Cartão</b><small>Pagamento seguro pelo gateway</small></div><span>›</span></button>`+
      `<button class="payment-method" onclick="requestCashPayment()"><span class="payment-icon">R$</span><div><b>Dinheiro</b><small>Pagamento presencial na academia</small></div><span>›</span></button>`+
      `</div><div id="payment-action-area"></div></div>`+
      `<div class="panel"><h3>Como funciona</h3><div class="notice success">✓ PIX e cartão serão confirmados automaticamente quando o gateway estiver conectado.</div><div class="notice">ℹ O pagamento em dinheiro precisa ser confirmado pela administração.</div></div>`);
  };
  window.startOnlinePayment=function(method){
    const area=document.getElementById('payment-action-area');if(!area)return;
    const label=method==='pix'?'PIX':'Cartão';
    area.innerHTML=`<div class="payment-placeholder"><b>${label}</b><p>Esta opção já está preparada no aplicativo. O checkout seguro será ativado quando as credenciais do proprietário e do gateway forem adicionadas.</p><button class="btn secondary small-btn" onclick="document.getElementById('payment-action-area').innerHTML=''">Fechar</button></div>`;
  };
  window.requestCashPayment=function(){
    const area=document.getElementById('payment-action-area');if(!area)return;
    area.innerHTML=`<div class="payment-placeholder"><b>Pagamento em dinheiro</b><p>Leve o valor à academia. A mensalidade será atualizada para <strong>Pago</strong> assim que a administração confirmar o recebimento.</p><button class="btn secondary small-btn" onclick="document.getElementById('payment-action-area').innerHTML=''">Fechar</button></div>`;
  };
})();
