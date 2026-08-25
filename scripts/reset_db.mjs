import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbptbylxbykwbsepmsch.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bZhvm4fTpGSnepebByKEpg_FPmlD7tQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function resetDatabase() {
  console.log('🔄 Starting complete Supabase database reset & re-seed...');

  // 1. Delete all existing records
  console.log('Clearing existing table rows...');
  await supabase.from('jobs').delete().neq('job_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('providers').delete().neq('provider_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('users').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('cities').delete().neq('id', 0);
  await supabase.from('regions').delete().neq('id', 0);
  await supabase.from('roles').delete().neq('role_id', 0);

  // 2. Seed regions table
  console.log('Seeding regions table...');
  const regions = [
    { id: 1, name: 'North / צפון' },
    { id: 2, name: 'Haifa / חיפה' },
    { id: 3, name: 'Center / מרכז' },
    { id: 4, name: 'Tel Aviv / תל אביב' },
    { id: 5, name: 'Jerusalem / ירושלים' },
    { id: 6, name: 'South / דרום' }
  ];
  const { error: regionsErr } = await supabase.from('regions').insert(regions);
  if (regionsErr) console.error('Regions insert error:', regionsErr);

  // 3. Seed cities table
  console.log('Seeding cities table...');
  const cities = [
    { id: 1, name: 'Nazareth / נצרת', region_id: 1 },
    { id: 2, name: 'Afula / עפולה', region_id: 1 },
    { id: 3, name: 'Tiberias / טבריה', region_id: 1 },
    { id: 4, name: 'Haifa / חיפה', region_id: 2 },
    { id: 5, name: 'Hadera / חדרה', region_id: 2 },
    { id: 6, name: 'Netanya / נתניה', region_id: 3 },
    { id: 7, name: 'Petah Tikva / פתח תקווה', region_id: 3 },
    { id: 8, name: 'Rehovot / רחובות', region_id: 3 },
    { id: 9, name: 'Tel Aviv-Yafo / תל אביב-יפו', region_id: 4 },
    { id: 10, name: 'Ramat Gan / רמת גן', region_id: 4 },
    { id: 11, name: 'Holon / חולון', region_id: 4 },
    { id: 12, name: 'Jerusalem / ירושלים', region_id: 5 },
    { id: 13, name: 'Beit Shemesh / בית שמש', region_id: 5 },
    { id: 14, name: 'Beersheba / באר שבע', region_id: 6 },
    { id: 15, name: 'Ashdod / אשדוד', region_id: 6 },
    { id: 16, name: 'Eilat / אילת', region_id: 6 }
  ];
  const { error: citiesErr } = await supabase.from('cities').insert(cities);
  if (citiesErr) console.error('Cities insert error:', citiesErr);

  // 4. Insert Clean Roles
  console.log('Seeding clean roles table...');
  const roles = [
    { role_id: 1, role_name: 'Electrician' },
    { role_id: 2, role_name: 'Plumber' },
    { role_id: 3, role_name: 'Locksmith' },
    { role_id: 4, role_name: 'HVAC & AC Repair' },
    { role_id: 5, role_name: 'Carpenter' },
    { role_id: 6, role_name: 'Painter' }
  ];
  const { error: rolesErr } = await supabase.from('roles').insert(roles);
  if (rolesErr) console.error('Roles insert error:', rolesErr);
  console.log('✅ Supabase PostgreSQL Database cleanly reset & seeded with locations and roles successfully!');
}

resetDatabase();
