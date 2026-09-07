// Dunamis Fit — correção da tela de pagamentos para IDs UUID
(function(){
  window.payments=function(){
    const esc=(v)=>String(v??'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");
    return shell(header('Pagamentos','Controle financeiro e confirmação de mensalidades.')+
      `<div class="panel"><div class="panel-head"><div><h3>Mensalidades</h3><span class="muted">Pagamentos em dinheiro podem ser confirmados manualmente. Pix/cartão serão automatizados quando o gateway for conectado.</span></div></div>`+
      data.students.map(s=>`<div class="payment-row"><div class="person">${avatar(s,46)}<div><b>${s.name}</b><small>R$ ${money(s.value)} • vence dia ${s.due} • ${s.paymentMethod}</small></div></div><div><span class="badge ${statusClass(s.status)}">${statusText(s.status)}</span><button class="btn ${s.status==='paid'?'secondary':'primary'} small-btn" onclick="pay('${esc(s.id)}')">${s.status==='paid'?'Pago ✓':'Confirmar pagamento'}</button></div></div>`).join('')+
      `</div>`);
  };
})();
