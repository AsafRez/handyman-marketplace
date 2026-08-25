import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbptbylxbykwbsepmsch.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bZhvm4fTpGSnepebByKEpg_FPmlD7tQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
