// Dunamis Fit — sincroniza notificações reais do administrador, leitura e atualização em tempo real.
(function(){
  'use strict';
  const originalRefresh = window.refreshCloudData;
  const originalRender = window.render;
  let channel = null;

  async function loadAdminNotifications(){
    if (!window.current || window.current.role !== 'admin' || !window.dunamisSupabase) return;
    const { data, error } = await window.dunamisSupabase.from('notifications').select('*').eq('user_id', window.current.studentId).order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    window.data.notifications = data || [];
  }

  function subscribeRealtime(){
    if (!window.current || window.current.role !== 'admin' || !window.dunamisSupabase || channel) return;
    channel = window.dunamisSupabase.channel(`admin-notifications-${window.current.studentId}`)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`user_id=eq.${window.current.studentId}`},async(payload)=>{
        const n=payload.new;
        window.data.notifications=[n,...(window.data.notifications||[])].slice(0,100);
        try{ if(typeof window.render==='function') window.render(); }catch(e){console.error('Dunamis Fit notification render:',e); }
        if(typeof Notification!=='undefined' && Notification.permission==='granted' && document.visibilityState==='hidden'){
          try{new Notification(n.title||'Dunamis Fit',{body:n.message||'Nova notificação'});}catch(e){}
        }
      }).subscribe();
  }

  window.refreshCloudData = async function(){
    if (typeof originalRefresh === 'function') await originalRefresh();
    await loadAdminNotifications();
    subscribeRealtime();
  };

  async function markAllRead(){
    const id = window.current?.studentId;
    if (!id || !window.dunamisSupabase) return;
    const { error } = await window.dunamisSupabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('user_id', id).is('read_at', null);
    if (error) return alert('Não foi possível marcar as notificações como lidas.');
    await window.refreshCloudData();
    if (typeof window.render === 'function') window.render();
  }

  function inject(){
    if (!window.current || window.current.role !== 'admin' || window.page !== 'notifications') return;
    const main = document.querySelector('.main');
    if (!main || main.querySelector('[data-admin-notice-tools]')) return;
    const list = Array.isArray(window.data?.notifications) ? window.data.notifications : [];
    const unread = list.filter(n => !n.read_at).length;
    const box = document.createElement('div'); box.className='panel'; box.setAttribute('data-admin-notice-tools','1'); box.style.marginBottom='18px';
    box.innerHTML=`<div class="panel-head"><div><h3>🔔 Central administrativa</h3><span class="muted">${unread?`${unread} notificação(ões) não lida(s)`:'Tudo em dia.'}</span></div><button class="btn small-btn" id="markAdminNoticesRead" ${unread?'':'disabled'}>Marcar como lidas</button></div>`;
    main.prepend(box); box.querySelector('#markAdminNoticesRead')?.addEventListener('click',markAllRead);
  }

  window.render=function(){if(typeof originalRender==='function')originalRender();setTimeout(inject,0)};
  window.addEventListener('load',async()=>{try{await loadAdminNotifications();subscribeRealtime();}catch(e){console.error('Dunamis Fit notifications:',e)}setTimeout(inject,0)});
})();
