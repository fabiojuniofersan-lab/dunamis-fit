(function(){
  window.payments=function(){
    if(!window.current||window.current.role!=='admin')return;
    const list=window.data.students||[];
    const esc=v=>String(v??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
    const money=v=>Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
    return window.shell(window.header('Pagamentos','Emita cobranças Pix ou cartão pelo Asaas.')+
      '<div class="panel"><h3>Mensalidades</h3><p class="muted">A emissão não confirma pagamento. O status muda após confirmação do Asaas.</p>'+
      list.map(s=>'<div class="payment-row"><div><b>'+esc(s.name)+'</b><br><small>R$ '+money(s.value)+' • vence dia '+esc(s.due)+'</small></div><div><span class="badge">'+esc(s.status==='late'?'Inadimplente':s.status==='paid'?'Pago':'Pendente')+'</span> <button class="btn primary small-btn" onclick="adminIssueCharge(\''+esc(s.id)+'\')">Emitir cobrança</button></div></div>').join('')+'</div>');
  };
  window.adminIssueCharge=async function(id){
    if(!window.current||window.current.role!=='admin')return alert('Acesso exclusivo do administrador.');
    const s=(window.data.students||[]).find(x=>String(x.id)===String(id)); if(!s)return alert('Aluno não encontrado.');
    const m=prompt('Digite PIX ou CARTAO para '+s.name,'PIX'); if(m===null)return;
    const method=/^pix$/i.test(m.trim())?'pix':(/^cart[aã]o$|^card$/i.test(m.trim())?'card':'');
    if(!method)return alert('Escolha PIX ou CARTAO.');
    if(!confirm('Gerar cobrança de R$ '+Number(s.value||0).toLocaleString('pt-BR',{minimumFractionDigits:2})+' para '+s.name+'?'))return;
    try{
      const sb=window.dunamisSupabase; const sess=await sb.auth.getSession(); const token=sess.data&&sess.data.session&&sess.data.session.access_token;
      if(!token)throw new Error('Sessão expirada. Entre novamente.');
      const r=await fetch('/api/asaas-create-payment',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({studentId:String(s.id),method})});
      const d=await r.json(); if(!r.ok||!d.ok)throw new Error(d.error||'Falha ao gerar cobrança.');
      if(d.paid){alert('O Asaas informa que esta mensalidade já foi paga; histórico sincronizado.');}
      else if(d.invoiceUrl){window.open(d.invoiceUrl,'_blank');alert('Cobrança criada. Compartilhe o link com o aluno. O status continuará pendente até confirmação do Asaas.');}
      else alert('Cobrança criada, mas não veio link de pagamento. Confira os logs antes de tentar novamente.');
      await window.refreshCloudData(); window.render();
    }catch(e){alert('Não foi possível emitir a cobrança: '+(e.message||e));}
  };
})();