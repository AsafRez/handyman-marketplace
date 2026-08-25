import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbptbylxbykwbsepmsch.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bZhvm4fTpGSnepebByKEpg_FPmlD7tQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkJobs() {
  const { data: jobs, error } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(5);
  if (error) console.error('Error fetching jobs:', error);
  else {
    console.log('--- LATEST 5 JOBS ---');
    console.log(jobs);
  }
}

checkJobs();
