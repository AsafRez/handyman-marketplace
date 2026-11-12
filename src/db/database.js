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
  { id: 1, name: 'North / צפון', lat: 32.7500, lng: 35.3500 },
  { id: 2, name: 'Haifa / חיפה', lat: 32.7940, lng: 34.9896 },
  { id: 3, name: 'Center / מרכז', lat: 32.1500, lng: 34.8500 },
  { id: 4, name: 'Tel Aviv / תל אביב', lat: 32.0853, lng: 34.7818 },
  { id: 5, name: 'Jerusalem / ירושלים', lat: 31.7683, lng: 35.2137 },
  { id: 6, name: 'South / דרום', lat: 31.2529, lng: 34.7915 }
];

export const INITIAL_CITIES = [
  // North
  { id: 1, name: 'Nazareth / נצרת', region_id: 1, lat: 32.7019, lng: 35.3033 },
  { id: 2, name: 'Afula / עפולה', region_id: 1, lat: 32.6078, lng: 35.2894 },
  { id: 3, name: 'Tiberias / טבריה', region_id: 1, lat: 32.7922, lng: 35.5312 },
  // Haifa
  { id: 4, name: 'Haifa / חיפה', region_id: 2, lat: 32.7940, lng: 34.9896 },
  { id: 5, name: 'Hadera / חדרה', region_id: 2, lat: 32.4340, lng: 34.9197 },
  // Center
  { id: 6, name: 'Netanya / נתניה', region_id: 3, lat: 32.3215, lng: 34.8532 },
  { id: 7, name: 'Petah Tikva / פתח תקווה', region_id: 3, lat: 32.0840, lng: 34.8878 },
  { id: 8, name: 'Rehovot / רחובות', region_id: 3, lat: 31.8928, lng: 34.8113 },
  // Tel Aviv
  { id: 9, name: 'Tel Aviv-Yafo / תל אביב-יפו', region_id: 4, lat: 32.0853, lng: 34.7818 },
  { id: 10, name: 'Ramat Gan / רמת גן', region_id: 4, lat: 32.0684, lng: 34.8248 },
  { id: 11, name: 'Holon / חולון', region_id: 4, lat: 32.0158, lng: 34.7874 },
  // Jerusalem
  { id: 12, name: 'Jerusalem / ירושלים', region_id: 5, lat: 31.7683, lng: 35.2137 },
  { id: 13, name: 'Beit Shemesh / בית שמש', region_id: 5, lat: 31.7470, lng: 34.9881 },
  // South
  { id: 14, name: 'Beersheba / באר שבע', region_id: 6, lat: 31.2529, lng: 34.7915 },
  { id: 15, name: 'Ashdod / אשדוד', region_id: 6, lat: 31.8044, lng: 34.6553 },
  { id: 16, name: 'Eilat / אילת', region_id: 6, lat: 29.5577, lng: 34.9519 }
];

export const resolveCoordinates = (target, cities = INITIAL_CITIES, regions = INITIAL_REGIONS, fallbackRef = null) => {
  if (!target && !fallbackRef) return { lat: 32.0853, lng: 34.7818 };

  // Explicit Lat / Lng provided directly on target
  if (typeof target === 'object' && target !== null) {
    if (target.lat !== undefined && target.lat !== null && target.lng !== undefined && target.lng !== null) {
      return {
        lat: Number(target.lat),
        lng: Number(target.lng)
      };
    }
    if (target.coords?.lat !== undefined && target.coords?.lng !== undefined) {
      return {
        lat: Number(target.coords.lat),
        lng: Number(target.coords.lng)
      };
    }
  }

  // 1. Text matching in specific job location (TOP PRIORITY for custom free-form addresses)
  const locText = (typeof target === 'string' ? target : (target?.location || target?.name || '')).toLowerCase();
  if (locText) {
    const matchedCity = cities.find(c => {
      const parts = c.name.toLowerCase().split('/');
      return parts.some(p => locText.includes(p.trim()));
    });
    if (matchedCity?.lat && matchedCity?.lng) {
      return {
        lat: Number(matchedCity.lat),
        lng: Number(matchedCity.lng)
      };
    }

    const matchedRegion = regions.find(r => {
      const parts = r.name.toLowerCase().split('/');
      return parts.some(p => locText.includes(p.trim()));
    });
    if (matchedRegion?.lat && matchedRegion?.lng) {
      return {
        lat: Number(matchedRegion.lat),
        lng: Number(matchedRegion.lng)
      };
    }
  }

  // 2. Direct city objects
  if (target?.customerCity?.lat && target?.customerCity?.lng) {
    return {
      lat: Number(target.customerCity.lat),
      lng: Number(target.customerCity.lng)
    };
  }

  // 3. City ID provided
  const cityId = target?.city_id || target?.cityId || target?.customer_city_id || (typeof target === 'number' ? target : null);
  if (cityId) {
    const matchedCity = cities.find(c => c.id === Number(cityId));
    if (matchedCity?.lat && matchedCity?.lng) {
      return {
        lat: Number(matchedCity.lat),
        lng: Number(matchedCity.lng)
      };
    }
  }

  // 4. Region ID provided
  const regionId = target?.region_id || target?.regionId || target?.preferred_region_id || target?.customer_region_id;
  if (regionId) {
    const matchedRegion = regions.find(r => r.id === Number(regionId));
    if (matchedRegion?.lat && matchedRegion?.lng) {
      return {
        lat: Number(matchedRegion.lat),
        lng: Number(matchedRegion.lng)
      };
    }
  }

  // 5. Fallback to reference (e.g. provider's coordinate)
  if (fallbackRef?.lat && fallbackRef?.lng) {
    return {
      lat: Number(fallbackRef.lat),
      lng: Number(fallbackRef.lng)
    };
  }

  return { lat: 32.0853, lng: 34.7818 };
};

export const joinJobDetails = (job, users, providers, roles, regions = INITIAL_REGIONS, cities = INITIAL_CITIES) => {
  const customer = users.find(u => u.user_id === job.customer_id) || null;
  const role = roles.find(r => r.role_id === job.role_id) || null;
  const providerRecord = providers.find(p => p.provider_id === job.provider_id) || null;
  const providerUser = providerRecord ? users.find(u => u.user_id === providerRecord.user_id) : null;

  // 1. Primary: Extract city directly from the job's custom location text first
  let customerCity = null;
  if (job.location) {
    const locLower = job.location.toLowerCase();
    customerCity = cities.find(c => {
      const names = c.name.toLowerCase().split('/');
      return names.some(name => locLower.includes(name.trim()));
    }) || null;
  }

  // 2. Fallback: Only if job location didn't specify a city, use customer's default profile city
  if (!customerCity && customer) {
    customerCity = cities.find(c => c.id === customer.city_id) || null;
  }

  const customerRegion = customerCity ? (regions.find(r => r.id === customerCity.region_id) || null) : null;

  const joinedProvider = providerRecord ? {
    ...providerRecord,
    id: providerRecord.provider_id,
    name: providerUser?.name || 'Unknown Pro',
    phone: providerUser?.phone || '',
    email: providerUser?.email || ''
  } : null;

  const jobCoords = (job.lat && job.lng) ? { lat: Number(job.lat), lng: Number(job.lng) } : null;

  return {
    id: job.job_id,
    job_id: job.job_id,
    category: job.role_id,
    problem: job.description,
    description: job.description,
    location: job.location,
    lat: job.lat || null,
    lng: job.lng || null,
    coords: jobCoords,
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
