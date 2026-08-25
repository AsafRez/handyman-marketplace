import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbptbylxbykwbsepmsch.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bZhvm4fTpGSnepebByKEpg_FPmlD7tQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkProviders() {
  const { data: providers, error: pErr } = await supabase.from('providers').select('*');
  const { data: users, error: uErr } = await supabase.from('users').select('*');
  
  console.log('--- SUPABASE USERS ---');
  console.log(users);

  console.log('--- SUPABASE PROVIDERS ---');
  console.log(providers);
}

checkProviders();
