// Dunamis Fit — usa endpoint seguro para alterar somente a foto do aluno.
(function(){
  'use strict';
  window.saveProfilePhoto = async function(id, dataUrl){
    if (!window.dunamisSupabase) throw new Error('Supabase indisponível.');
    const { data: sessionData } = await window.dunamisSupabase.auth.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) throw new Error('Sessão expirada. Entre novamente.');
    const response = await fetch('/api/profile-photo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ photoUrl: dataUrl })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Não foi possível salvar a foto.');
    if (typeof window.refreshCloudData === 'function') await window.refreshCloudData();
    if (typeof window.render === 'function') window.render();
  };
})();
