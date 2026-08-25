// HandyHub Relational Database Service Layer
import { hashPassword } from '../utils/sanitizer.js';

export const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const INITIAL_ROLES = [
  { role_id: 'electrician', role_name: 'Electrician' },
  { role_id: 'plumber', role_name: 'Plumber' },
  { role_id: 'locksmith', role_name: 'Locksmith' },
  { role_id: 'hvac', role_name: 'HVAC & AC Repair' },
  { role_id: 'carpenter', role_name: 'Carpenter' },
  { role_id: 'painter', role_name: 'Painter' }
];

export const INITIAL_USERS = [];

export const INITIAL_PROVIDERS = [];

export const INITIAL_JOBS = [];

export const INITIAL_REGIONS = [
  { id: 1, name: 'North / צפון' },
  { id: 2, name: 'Haifa / חיפה' },
  { id: 3, name: 'Center / מרכז' },
  { id: 4, name: 'Tel Aviv / תל אביב' },
  { id: 5, name: 'Jerusalem / ירושלים' },
  { id: 6, name: 'South / דרום' }
];

export const INITIAL_CITIES = [
  // North
  { id: 1, name: 'Nazareth / נצרת', region_id: 1 },
  { id: 2, name: 'Afula / עפולה', region_id: 1 },
  { id: 3, name: 'Tiberias / טבריה', region_id: 1 },
  // Haifa
  { id: 4, name: 'Haifa / חיפה', region_id: 2 },
  { id: 5, name: 'Hadera / חדרה', region_id: 2 },
  // Center
  { id: 6, name: 'Netanya / נתניה', region_id: 3 },
  { id: 7, name: 'Petah Tikva / פתח תקווה', region_id: 3 },
  { id: 8, name: 'Rehovot / רחובות', region_id: 3 },
  // Tel Aviv
  { id: 9, name: 'Tel Aviv-Yafo / תל אביב-יפו', region_id: 4 },
  { id: 10, name: 'Ramat Gan / רמת גן', region_id: 4 },
  { id: 11, name: 'Holon / חולון', region_id: 4 },
  // Jerusalem
  { id: 12, name: 'Jerusalem / ירושלים', region_id: 5 },
  { id: 13, name: 'Beit Shemesh / בית שמש', region_id: 5 },
  // South
  { id: 14, name: 'Beersheba / באר שבע', region_id: 6 },
  { id: 15, name: 'Ashdod / אשדוד', region_id: 6 },
  { id: 16, name: 'Eilat / אילת', region_id: 6 }
];

export const joinJobDetails = (job, users, providers, roles, regions = INITIAL_REGIONS, cities = INITIAL_CITIES) => {
  const customer = users.find(u => u.user_id === job.customer_id) || null;
  const role = roles.find(r => r.role_id === job.role_id) || null;
  const providerRecord = providers.find(p => p.provider_id === job.provider_id) || null;
  const providerUser = providerRecord ? users.find(u => u.user_id === providerRecord.user_id) : null;

  let customerCity = customer ? (cities.find(c => c.id === customer.city_id) || null) : null;

  // Fallback: Resolve city from location text string if customer user record is not in database
  if (!customerCity && job.location) {
    const locLower = job.location.toLowerCase();
    customerCity = cities.find(c => {
      const names = c.name.split('/');
      return names.some(name => locLower.includes(name.trim().toLowerCase()));
    }) || null;
  }

  const customerRegion = customerCity ? (regions.find(r => r.id === customerCity.region_id) || null) : null;

  const joinedProvider = providerRecord ? {
    ...providerRecord,
    id: providerRecord.provider_id,
    name: providerUser?.name || 'Unknown Pro',
    phone: providerUser?.phone || '',
    email: providerUser?.email || ''
  } : null;

  return {
    id: job.job_id,
    job_id: job.job_id,
    category: job.role_id,
    problem: job.description,
    description: job.description,
    location: job.location,
    phone: job.phone || customer?.phone || '',
    status: job.status.toUpperCase(),
    rawStatus: job.status,
    cancelReason: job.cancel_reason || null,
    cancelledBy: job.cancelled_by || null,
    urgency: job.urgency || 'MEDIUM',
    estimatedPayout: job.estimated_payout || '$120 - $160',
    createdAt: job.created_at,
    customer,
    customerCity,
    customerRegion,
    claimedBy: joinedProvider,
    provider_id: job.provider_id,
    role
  };
};
