// Dunamis Fit — cliente Supabase no navegador
// A inicialização é feita depois que o listener de recuperação é registrado,
// evitando que o evento PASSWORD_RECOVERY seja perdido.
(function(){
  if(!window.supabase || typeof window.supabase.createClient!=='function') return;
  window.dunamisSupabase=window.supabase.createClient(
    window.DUNAMIS_SUPABASE_URL,
    window.DUNAMIS_SUPABASE_PUBLISHABLE_KEY,
    {auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true,skipAutoInitialize:true}}
  );
})();
