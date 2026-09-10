// Dunamis Fit — sincroniza notificações reais do administrador e adiciona leitura.
(function(){
  'use strict';
  const originalRefresh = window.refreshCloudData;
  const originalRender = window.render;

  async function loadAdminNotifications(){
    if (!window.current || window.current.role !== 'admin' || !window.dunamisSupabase) return;
    const { data, error } = await window.dunamisSupabase
      .from('notifications')
      .select('*')
      .eq('user_id', window.current.studentId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    window.data.notifications = data || [];
  }

  window.refreshCloudData = async function(){
    if (typeof originalRefresh === 'function') await originalRefresh();
    await loadAdminNotifications();
  };

  async function markAllRead(){
    const id = window.current?.studentId;
    if (!id || !window.dunamisSupabase) return;
    const { error } = await window.dunamisSupabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', id)
      .is('read_at', null);
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
    const box = document.createElement('div');
    box.className = 'panel';
    box.setAttribute('data-admin-notice-tools', '1');
    box.style.marginBottom = '18px';
    box.innerHTML = `<div class="panel-head"><div><h3>🔔 Central administrativa</h3><span class="muted">${unread ? `${unread} notificação(ões) não lida(s)` : 'Tudo em dia.'}</span></div><button class="btn small-btn" id="markAdminNoticesRead" ${unread ? '' : 'disabled'}>Marcar como lidas</button></div>`;
    main.prepend(box);
    box.querySelector('#markAdminNoticesRead')?.addEventListener('click', markAllRead);
  }

  window.render = function(){
    if (typeof originalRender === 'function') originalRender();
    setTimeout(inject, 0);
  };

  window.addEventListener('load', async () => {
    try { await loadAdminNotifications(); } catch (e) { console.error('Dunamis Fit notifications:', e); }
    setTimeout(inject, 0);
  });
})();
