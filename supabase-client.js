// Dunamis Fit — cliente Supabase no navegador
(function(){
  if(!window.supabase || typeof window.supabase.createClient!=='function') return;
  window.dunamisSupabase=window.supabase.createClient(
    window.DUNAMIS_SUPABASE_URL,
    window.DUNAMIS_SUPABASE_PUBLISHABLE_KEY,
    {auth:{autoRefreshToken:true,persistSession:true,detectSessionInUrl:true}}
  );
})();
