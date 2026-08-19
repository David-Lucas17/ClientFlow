if (!window.supabaseClient) {
    const SUPABASE_URL = 'https://zmymvkmjrpryjxiqmxpk.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_uASZk4wNsVg-WSar78G5Mw_JMigOIIX';
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}