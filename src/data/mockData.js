export const SERVICE_CATEGORIES = [
  {
    id: 'electrician',
    title: 'Electrician',
    iconName: 'Zap',
    tagline: 'Outlets, wiring, breakers, lighting & EV chargers',
    avgResponse: '2-4 mins',
    activeProsCount: 8,
    badgeColor: '#F59E0B',
    gradient: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    iconBg: '#F59E0B',
    popularProblems: [
      'Circuit breaker keeps tripping',
      'Power outlet spark or not working',
      'Ceiling fan or light fixture installation',
      'EV Charger installation request',
      'Emergency power outage diagnostic'
    ]
  },
  {
    id: 'plumber',
    title: 'Plumber',
    iconName: 'Droplet',
    tagline: 'Leaks, clogged drains, water heaters & pipes',
    avgResponse: '3-5 mins',
    activeProsCount: 12,
    badgeColor: '#0EA5E9',
    gradient: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
    iconBg: '#0EA5E9',
    popularProblems: [
      'Water pipe leak / dripping faucet',
      'Clogged toilet or main drain',
      'No hot water / Water heater repair',
      'Garbage disposal stuck',
      'Shower pressure valve replacement'
    ]
  },
  {
    id: 'locksmith',
    title: 'Locksmith',
    iconName: 'Key',
    tagline: 'Emergency lockout, lock replacement & smart locks',
    avgResponse: '1-3 mins',
    activeProsCount: 6,
    badgeColor: '#10B981',
    gradient: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
    iconBg: '#10B981',
    popularProblems: [
      'Locked out of house / apartment',
      'Broken key in door lock',
      'Smart digital lock installation',
      'Re-key existing deadbolt locks',
      'Broken latch / door lock repair'
    ]
  },
  {
    id: 'hvac',
    title: 'HVAC & AC Repair',
    iconName: 'Snowflake',
    tagline: 'Air conditioning, heating, thermostat & ductwork',
    avgResponse: '4-6 mins',
    activeProsCount: 5,
    badgeColor: '#6366F1',
    gradient: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
    iconBg: '#6366F1',
    popularProblems: [
      'AC unit blowing warm air',
      'Heating system not turning on',
      'Smart Thermostat (Nest/Ecobee) setup',
      'Strange noise coming from HVAC unit',
      'Air filter replacement & coil cleaning'
    ]
  },
  {
    id: 'carpenter',
    title: 'Carpenter',
    iconName: 'Hammer',
    tagline: 'Furniture assembly, doors, cabinets & trim work',
    avgResponse: '5-8 mins',
    activeProsCount: 7,
    badgeColor: '#D97706',
    gradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
    iconBg: '#D97706',
    popularProblems: [
      'Custom shelf or cabinet installation',
      'Door hanging / hinge alignment',
      'IKEA / Flat-pack furniture assembly',
      'Drywall hole patch & wood trim',
      'Deck railing or wooden fence repair'
    ]
  },
  {
    id: 'painter',
    title: 'Painter',
    iconName: 'Paintbrush',
    tagline: 'Interior room painting, touch-ups & accent walls',
    avgResponse: '6-10 mins',
    activeProsCount: 9,
    badgeColor: '#F43F5E',
    gradient: 'linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 100%)',
    iconBg: '#F43F5E',
    popularProblems: [
      'Single room wall painting',
      'Drywall repair & paint touch-up',
      'Accent wall creation',
      'Cabinet door repainting',
      'Exterior door or porch painting'
    ]
  }
];

export const MOCK_PROVIDERS = [
  {
    id: 'pro-marcus',
    name: 'Marcus Vance',
    title: 'Master Licensed Electrician',
    trade: 'electrician',
    rating: 4.9,
    jobsCompleted: 342,
    avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
    phone: '+1 (555) 234-8901',
    etaMinutes: 12,
    verified: true,
    distanceMiles: '1.4 mi away',
    bio: 'Licensed electrician with 12+ years experience in residential wiring, EV chargers, and emergency diagnostics.',
    online: true
  },
  {
    id: 'pro-sarah',
    name: 'Sarah Jenkins',
    title: 'Rapid Response Locksmith',
    trade: 'locksmith',
    rating: 5.0,
    jobsCompleted: 489,
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    phone: '+1 (555) 345-6789',
    etaMinutes: 8,
    verified: true,
    distanceMiles: '0.8 mi away',
    bio: '24/7 Mobile locksmith service. Certified master key technician & smart lock installation specialist.',
    online: true
  },
  {
    id: 'pro-dave',
    name: 'Dave Miller',
    title: 'Emergency Master Plumber',
    trade: 'plumber',
    rating: 4.8,
    jobsCompleted: 512,
    avatar: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80',
    phone: '+1 (555) 987-6543',
    etaMinutes: 15,
    verified: true,
    distanceMiles: '2.1 mi away',
    bio: 'Emergency plumbing specialist. Hydro-jetting, pipe leak repair, and water heater replacements.',
    online: true
  },
  {
    id: 'pro-elena',
    name: 'Elena Rostova',
    title: 'HVAC & Cooling Technician',
    trade: 'hvac',
    rating: 4.9,
    jobsCompleted: 215,
    avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    phone: '+1 (555) 456-7890',
    etaMinutes: 18,
    verified: true,
    distanceMiles: '3.0 mi away',
    bio: 'EPA certified HVAC professional specializing in AC troubleshooting, heat pumps, and duct cleanings.',
    online: true
  }
];

export const MOCK_INITIAL_JOBS = [
  {
    id: 'job-demo-1',
    category: 'electrician',
    problem: 'Kitchen breaker keeps tripping whenever microwave and coffee maker run together.',
    phone: '+1 (555) 789-0123',
    location: '742 Evergreen Terrace, Sector 4',
    urgency: 'HIGH',
    estimatedPayout: '$140 - $180',
    createdAt: Date.now() - 60000,
    status: 'OPEN', // OPEN | CLAIMED | EXPIRED
    claimedBy: null
  }
];
