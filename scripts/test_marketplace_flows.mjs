import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://pbptbylxbykwbsepmsch.supabase.co';
const SUPABASE_KEY = 'sb_publishable_bZhvm4fTpGSnepebByKEpg_FPmlD7tQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function generateUUID() {
  return 'f' + '0'.repeat(7) + '-0000-4000-8000-' + Math.floor(Math.random() * 1000000000000).toString(16).padStart(12, '0');
}

async function runMarketplaceTests() {
  console.log('🧪 Starting Marketplace Automated Integration Tests...\n');

  let passedTests = 0;
  let failedTests = 0;

  // Ensure test users and providers exist in the database (since reset_db clears them)
  const aliceId = 'a11ce000-0000-4000-8000-000000000001';
  const marcusUserId = 'e0000000-0000-4000-8000-000000000002';
  const marcusProviderId = 'e0000000-0000-4000-8000-000000000001';

  try {
    console.log('Setup: Ensuring test users and providers exist in Supabase...');
    await supabase.from('users').upsert({
      user_id: aliceId,
      name: 'Alice Smith',
      phone: '+1 (555) 019-2834',
      email: 'alice@example.com',
      password_hash: 'hash_alice',
      location: '742 Evergreen Terrace, Sector 4'
    });

    await supabase.from('users').upsert({
      user_id: marcusUserId,
      name: 'Marcus Vance',
      phone: '+1 (555) 234-8901',
      email: 'marcus@example.com',
      password_hash: 'hash_marcus',
      location: '104 Pine Street, Sector 2'
    });

    await supabase.from('providers').upsert({
      provider_id: marcusProviderId,
      user_id: marcusUserId,
      role_id: 'electrician',
      rating: 4.9,
      verified: true
    });
    console.log('Setup: Test users and provider verified in Supabase.\n');
  } catch (setupErr) {
    console.error('Setup failed:', setupErr.message);
  }

  // TEST 1: Customer Creates Job and Cancels it
  console.log('----------------------------------------------------');
  console.log('TEST 1: Customer Cancels Job (Before Provider Claim)');
  console.log('----------------------------------------------------');
  try {
    const testJob1Id = generateUUID();

    // 1a. Insert new job request as Alice
    console.log(`1a. Inserting job request (ID: ${testJob1Id}) for Electrician...`);
    const newJob1 = {
      job_id: testJob1Id,
      customer_id: aliceId,
      provider_id: null,
      role_id: 'electrician',
      description: 'Circuit breaker keeping tripping in kitchen',
      location: '742 Evergreen Terrace, Sector 4',
      status: 'open',
      cancel_reason: null,
      cancelled_by: null,
      created_at: new Date().toISOString()
    };

    const { error: insertErr1 } = await supabase.from('jobs').insert([newJob1]);
    if (insertErr1) throw new Error(`Insert failed: ${insertErr1.message}`);
    console.log('   ✓ Job successfully inserted with status: open');

    // 1b. Customer cancels job
    console.log('1b. Customer clicking "Cancel Options -> Confirm Cancel Job"...');
    const { error: updateErr1 } = await supabase.from('jobs').update({
      status: 'cancelled',
      cancel_reason: 'Cancelled by customer',
      cancelled_by: 'customer'
    }).eq('job_id', testJob1Id);

    if (updateErr1) throw new Error(`Cancel update failed: ${updateErr1.message}`);

    // 1c. Verify in Supabase DB
    const { data: dbJob1 } = await supabase.from('jobs').select('*').eq('job_id', testJob1Id).single();
    if (dbJob1 && dbJob1.status === 'cancelled' && dbJob1.cancelled_by === 'customer') {
      console.log('   ✅ PASS: Job status in DB is "cancelled" with cancelled_by: "customer"');
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: Unexpected DB job state: ${JSON.stringify(dbJob1)}`);
      failedTests++;
    }
  } catch (err) {
    console.log(`   ❌ FAIL: Exception in Test 1 - ${err.message}`);
    failedTests++;
  }

  // TEST 2: Customer Removes/Reassigns Claimed Provider
  console.log('\n----------------------------------------------------');
  console.log('TEST 2: Customer Removes/Reassigns Claimed Provider');
  console.log('----------------------------------------------------');
  try {
    const testJob2Id = generateUUID();
    const aliceId = 'a11ce000-0000-4000-8000-000000000001';
    const marcusProviderId = 'e0000000-0000-4000-8000-000000000001';

    // 2a. Insert job
    console.log(`2a. Inserting job request (ID: ${testJob2Id})...`);
    const newJob2 = {
      job_id: testJob2Id,
      customer_id: aliceId,
      provider_id: null,
      role_id: 'electrician',
      description: 'Need outlet replacement',
      location: '742 Evergreen Terrace, Sector 4',
      status: 'open',
      created_at: new Date().toISOString()
    };
    await supabase.from('jobs').insert([newJob2]);

    // 2b. Provider (Marcus) Claims Job
    console.log('2b. Provider Marcus Vance claims the job...');
    await supabase.from('jobs').update({
      status: 'claimed',
      provider_id: marcusProviderId,
      accepted_at: new Date().toISOString()
    }).eq('job_id', testJob2Id);

    const { data: claimedJob } = await supabase.from('jobs').select('*').eq('job_id', testJob2Id).single();
    console.log(`   ✓ Job claimed by Marcus (provider_id: ${claimedJob.provider_id}, status: ${claimedJob.status})`);

    // 2c. Customer removes provider (requests replacement)
    console.log('2c. Customer removes assigned provider to re-assign...');
    await supabase.from('jobs').update({
      status: 'open',
      provider_id: null,
      cancel_reason: 'Customer requested provider replacement',
      cancelled_by: 'customer'
    }).eq('job_id', testJob2Id);

    // 2d. Verify job is reset to OPEN with provider_id: null
    const { data: reassignedJob } = await supabase.from('jobs').select('*').eq('job_id', testJob2Id).single();
    if (reassignedJob && reassignedJob.status === 'open' && reassignedJob.provider_id === null) {
      console.log('   ✅ PASS: Provider successfully removed! Job status reset to "open" with provider_id: null');
      passedTests++;
    } else {
      console.log(`   ❌ FAIL: Job after provider removal: ${JSON.stringify(reassignedJob)}`);
      failedTests++;
    }
  } catch (err) {
    console.log(`   ❌ FAIL: Exception in Test 2 - ${err.message}`);
    failedTests++;
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST RESULTS SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
  console.log('====================================================');
}

runMarketplaceTests();
