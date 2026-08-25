import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  INITIAL_ROLES,
  INITIAL_USERS,
  INITIAL_PROVIDERS,
  INITIAL_JOBS,
  joinJobDetails,
  INITIAL_REGIONS,
  INITIAL_CITIES
} from '../db/database';
import { subscribeToEvents, broadcastEvent, playSoundEffect, getSyncServerHosts } from '../utils/broadcast';
import { sseManager } from '../utils/sseEngine';
import { supabase } from '../db/supabaseClient';
import confetti from 'canvas-confetti';
import { ROLE_MAP, REVERSE_ROLE_MAP } from '../utils/roles';

const MarketplaceContext = createContext();

const SYNC_HOSTS = getSyncServerHosts();

// POST events to the sync server for cross-device broadcasting
const broadcastToServer = async (eventType, payload) => {
  for (const host of SYNC_HOSTS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000);
    try {
      const res = await fetch(`${host}/api/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: eventType, payload }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        console.log(`📡 Server broadcast OK [${eventType}] via ${host}`);
        return; // Success — stop trying other hosts
      }
    } catch (e) {
      clearTimeout(timeoutId);
      console.log(`📡 Server broadcast FAIL [${eventType}] via ${host}:`, e.message);
    }
  }
  console.warn(`📡 Server broadcast FAILED for [${eventType}] — all hosts unreachable`);
};

// Helper to generate a valid UUID v4 string fallback
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch (e) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const shouldNotifyProviderForJob = (provider, job, cities) => {
  if (!provider) return false;
  
  // Check trade match
  const cat = (job.category || job.role_id || '').toLowerCase();
  const catStr = REVERSE_ROLE_MAP[cat] || cat;
  const proTrade = (provider.trade || provider.role_id || '').toLowerCase();
  const proTradeStr = REVERSE_ROLE_MAP[proTrade] || proTrade;
  if (catStr !== proTradeStr) return false;
  
  // Check region match
  const preferredRegionId = provider.preferred_region_id;
  if (preferredRegionId) {
    let jobRegionId = job.customerRegion?.id;
    if (!jobRegionId && job.location) {
      const locLower = job.location.toLowerCase();
      const matchedCity = cities.find(c => {
        const names = c.name.split('/');
        return names.some(name => locLower.includes(name.trim().toLowerCase()));
      });
      if (matchedCity) {
        jobRegionId = matchedCity.region_id;
      }
    }
    
    if (jobRegionId && jobRegionId !== preferredRegionId) {
      return false;
    }
  }
  
  return true;
};

export const MarketplaceProvider = ({ children }) => {
  const [viewMode, setViewMode] = useState('CUSTOMER'); // CUSTOMER | PROVIDER | DUAL_SPLIT
  const [activeProviderId, setActiveProviderId] = useState('pro-marcus-electrician');
  const [currentCustomerJobId, setCurrentCustomerJobId] = useState(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Authentication state
  const [currentUser, setCurrentUser] = useState(null); // null when unauthenticated
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Provider application verification pending modal state
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pendingProviderUser, setPendingProviderUser] = useState(null);
  const [pendingProviderTrade, setPendingProviderTrade] = useState('');

  // Database tables in state
  const [rolesTable, setRolesTable] = useState(INITIAL_ROLES);
  const [usersTable, setUsersTable] = useState(INITIAL_USERS);
  const [providersTable, setProvidersTable] = useState(INITIAL_PROVIDERS);
  const [jobsTable, setJobsTable] = useState(INITIAL_JOBS);
  const [regionsTable, setRegionsTable] = useState(INITIAL_REGIONS);
  const [citiesTable, setCitiesTable] = useState(INITIAL_CITIES);

  // Memoized enriched current user
  const currentUserEnriched = useMemo(() => {
    if (!currentUser) return null;
    const userInTable = usersTable.find(u => u.user_id === currentUser.user_id || u.email === currentUser.email) || currentUser;
    const city = citiesTable.find(c => c.id === userInTable.city_id) || null;
    const region = city ? regionsTable.find(r => r.id === city.region_id) : null;
    return {
      ...userInTable,
      city,
      region
    };
  }, [currentUser, usersTable, citiesTable, regionsTable]);

  // Derived joined models (All providers, mapped to UI format)
  const allProvidersUI = useMemo(() => {
    return providersTable.map(p => {
      const user = usersTable.find(u => u.user_id === p.user_id);

      // Calculate real jobs completed from jobsTable
      const completedJobs = jobsTable.filter(j =>
        j.provider_id === p.provider_id &&
        (j.status === 'completed' || j.status === 'reviewed' ||
         j.status === 'COMPLETED' || j.status === 'REVIEWED')
      );
      const realJobsCompleted = (p.jobs_completed || 0) + completedJobs.length;

      // Calculate real rating from reviewed jobs
      const reviewedJobs = jobsTable.filter(j =>
        j.provider_id === p.provider_id &&
        (j.status === 'reviewed' || j.status === 'REVIEWED') &&
        j.review?.rating
      );
      let realRating = p.rating || 5.0;
      if (reviewedJobs.length > 0) {
        const totalRating = reviewedJobs.reduce((sum, j) => sum + (j.review?.rating || 5), 0);
        // Weighted average: DB baseline + new reviews
        const baseWeight = p.jobs_completed || 0;
        const baseRatingTotal = (p.rating || 5.0) * baseWeight;
        realRating = baseWeight + reviewedJobs.length > 0
          ? (baseRatingTotal + totalRating) / (baseWeight + reviewedJobs.length)
          : p.rating || 5.0;
        realRating = Math.round(realRating * 10) / 10; // Round to 1 decimal
      }

      const preferredRegion = regionsTable.find(r => r.id === p.preferred_region_id) || null;

      return {
        id: p.provider_id,
        user_id: p.user_id,
        name: user?.name || 'Unknown Pro',
        trade: p.role_id,
        rating: realRating,
        title: p.title || `Licensed ${p.role_id} Specialist`,
        avatar: p.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
        jobsCompleted: realJobsCompleted,
        phone: user?.phone || '',
        verified: p.verified,
        etaMinutes: p.eta_minutes || 10,
        distanceMiles: p.distance_miles || '1.2 mi away',
        preferred_region_id: p.preferred_region_id,
        preferredRegionName: preferredRegion ? preferredRegion.name : 'All / None'
      };
    });
  }, [providersTable, usersTable, jobsTable, regionsTable]);

  // Derived joined models (Unique verified pros only)
  const providersUI = useMemo(() => {
    return allProvidersUI.filter((p, index, self) =>
      p.verified === true && self.findIndex(t => t.user_id === p.user_id || t.id === p.id) === index
    );
  }, [allProvidersUI]);

  // Calculate online providers by trade (all verified providers are considered "online")
  const onlineProsByTrade = useMemo(() => {
    const counts = {};
    providersUI.forEach(p => {
      const trade = p.trade;
      counts[trade] = (counts[trade] || 0) + 1;
    });
    return counts;
  }, [providersUI]);

  const activeProvider = useMemo(() => {
    // 1. Look in all mapped providers (including unverified ones) for the logged-in user
    const loggedInPro = allProvidersUI.find(p =>
      (p.user_id && currentUser?.user_id && p.user_id.toLowerCase() === currentUser.user_id.toLowerCase()) ||
      (p.name && currentUser?.name && p.name.toLowerCase() === currentUser.name.toLowerCase())
    );
    if (loggedInPro) return loggedInPro;

    // 2. Fallback to active provider ID
    const fallbackById = allProvidersUI.find(p => p.id === activeProviderId);
    if (fallbackById) return fallbackById;

    // 3. Fallback to first provider (verified or not, to prevent crash)
    if (allProvidersUI.length > 0) return allProvidersUI[0];

    // 4. Ultimate fallback (empty object shape) to prevent crash
    return {
      id: activeProviderId || 'placeholder-id',
      user_id: currentUser?.user_id || '',
      name: currentUser?.name || 'New Provider',
      trade: 'electrician',
      rating: 5.0,
      title: 'Licensed Specialist',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
      jobsCompleted: 0,
      phone: currentUser?.phone || '',
      verified: false,
      etaMinutes: 10,
      distanceMiles: '1.2 mi away',
      preferred_region_id: null,
      preferredRegionName: 'All / None'
    };
  }, [allProvidersUI, currentUser, activeProviderId]);

  const joinedJobs = useMemo(() => {
    return jobsTable.map(j => joinJobDetails(j, usersTable, providersTable, rolesTable, regionsTable, citiesTable));
  }, [jobsTable, usersTable, providersTable, rolesTable, regionsTable, citiesTable]);

  const currentCustomerJob = useMemo(() => {
    return currentCustomerJobId
      ? (joinedJobs.find(j =>
          (j.id === currentCustomerJobId || j.job_id === currentCustomerJobId) &&
          ['open', 'claimed', 'completed'].includes((j.status || j.rawStatus || '').toLowerCase())
        ) || null)
      : null;
  }, [currentCustomerJobId, joinedJobs]);

  const triggerJobSound = (job) => {
    if (!soundEnabled) return;
    const isProviderView = viewMode === 'PROVIDER' || viewMode === 'DUAL_SPLIT';
    if (isProviderView && activeProvider) {
      if (shouldNotifyProviderForJob(activeProvider, job, citiesTable)) {
        playSoundEffect('incoming');
      }
    }
  };

  // Supabase Cloud Realtime Subscription & Polling Sync
  useEffect(() => {
    let channel;
    // 1. Initial fetch from Supabase Cloud DB (users, providers, jobs)
    const fetchSupabaseInitialData = async () => {
      try {
        const { data: regionsData } = await supabase.from('regions').select('*');
        if (regionsData && regionsData.length > 0) setRegionsTable(regionsData);

        const { data: citiesData } = await supabase.from('cities').select('*');
        if (citiesData && citiesData.length > 0) setCitiesTable(citiesData);

        const { data: usersData } = await supabase.from('users').select('*');
        if (usersData && usersData.length > 0) setUsersTable(usersData);

        const { data: provsData } = await supabase.from('providers').select('*');
        if (provsData && provsData.length > 0) {
          const mappedProvs = provsData.map(p => ({
            ...p,
            role_id: REVERSE_ROLE_MAP[p.role_id] || p.role_id
          }));
          setProvidersTable(mappedProvs);
        }

        const { data: jobsData } = await supabase.from('jobs').select('*').order('created_at', { ascending: false });
        if (jobsData) {
          const mappedJobs = jobsData.map(j => ({
            ...j,
            role_id: REVERSE_ROLE_MAP[j.role_id] || j.role_id
          }));
          setJobsTable(prev => {
            const merged = prev.map(localJob => {
              const serverJob = mappedJobs.find(sj => sj.job_id === localJob.job_id);
              if (serverJob) {
                return {
                  ...localJob,
                  status: serverJob.status,
                  provider_id: serverJob.provider_id,
                  accepted_at: serverJob.accepted_at,
                  completed_at: serverJob.completed_at,
                  cancel_reason: serverJob.cancel_reason,
                  cancelled_by: serverJob.cancelled_by,
                  review: serverJob.review || localJob.review
                };
              }
              return localJob;
            });
            const newServerJobs = mappedJobs.filter(sj => !prev.some(lj => lj.job_id === sj.job_id));
            return [...merged, ...newServerJobs];
          });
        }
      } catch (err) {
        console.error('Supabase initial fetch catch:', err);
      }
    };

    fetchSupabaseInitialData();

    try {
      channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'jobs' },
          (payload) => {
            console.log('⚡ Supabase Cloud Realtime DB Change [jobs]:', payload.eventType, payload.new);

            if (payload.eventType === 'INSERT') {
              const rawJob = payload.new;
              const newJob = {
                ...rawJob,
                role_id: REVERSE_ROLE_MAP[rawJob.role_id] || rawJob.role_id
              };
              setJobsTable(prev => {
                if (prev.some(j => j.job_id === newJob.job_id)) return prev;
                return [newJob, ...prev];
              });
              triggerJobSound(newJob);
            } else if (payload.eventType === 'UPDATE') {
              const rawJob = payload.new;
              const updatedJob = {
                ...rawJob,
                role_id: REVERSE_ROLE_MAP[rawJob.role_id] || rawJob.role_id
              };
              setJobsTable(prev => prev.map(j => j.job_id === updatedJob.job_id ? updatedJob : j));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'users' },
          (payload) => {
            console.log('⚡ Supabase Cloud Realtime DB Change [users]:', payload.eventType, payload.new);
            if (payload.eventType === 'INSERT') {
              const newUser = payload.new;
              setUsersTable(prev => {
                if (prev.some(u => u.user_id === newUser.user_id)) return prev;
                return [...prev, newUser];
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedUser = payload.new;
              setUsersTable(prev => prev.map(u => u.user_id === updatedUser.user_id ? updatedUser : u));
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'providers' },
          (payload) => {
            console.log('⚡ Supabase Cloud Realtime DB Change [providers]:', payload.eventType, payload.new);
            if (payload.eventType === 'INSERT') {
              const rawProvider = payload.new;
              const newProvider = {
                ...rawProvider,
                role_id: REVERSE_ROLE_MAP[rawProvider.role_id] || rawProvider.role_id
              };
              setProvidersTable(prev => {
                if (prev.some(p => p.provider_id === newProvider.provider_id)) return prev;
                return [...prev, newProvider];
              });
            } else if (payload.eventType === 'UPDATE') {
              const rawProvider = payload.new;
              const updatedProvider = {
                ...rawProvider,
                role_id: REVERSE_ROLE_MAP[rawProvider.role_id] || rawProvider.role_id
              };
              setProvidersTable(prev => prev.map(p => p.provider_id === updatedProvider.provider_id ? updatedProvider : p));
            }
          }
        )
        .subscribe();
    } catch (e) {}

    // 3. Fallback Polling sync server every 1.5s (only adds NEW jobs, never overwrites local state)
    const fetchSharedState = async () => {
      const hosts = getSyncServerHosts();
      for (const host of hosts) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1000);
        try {
          const res = await fetch(`${host}/api/jobs`, { signal: controller.signal });
          clearTimeout(timeoutId);
          if (res.ok) {
            const serverJobs = await res.json();
            if (Array.isArray(serverJobs)) {
              setJobsTable(prev => {
                const merged = prev.map(localJob => {
                  const serverJob = serverJobs.find(sj => sj.job_id === localJob.job_id);
                  if (serverJob) {
                    return {
                      ...localJob,
                      status: serverJob.status,
                      provider_id: serverJob.provider_id,
                      accepted_at: serverJob.accepted_at,
                      completed_at: serverJob.completed_at,
                      cancel_reason: serverJob.cancel_reason,
                      cancelled_by: serverJob.cancelled_by,
                      review: serverJob.review || localJob.review
                    };
                  }
                  return localJob;
                });
                const newServerJobs = serverJobs.filter(sj => !prev.some(lj => lj.job_id === sj.job_id));
                return [...merged, ...newServerJobs];
              });
            }
            break;
          }
        } catch (e) {
          clearTimeout(timeoutId);
        }
      }
    };

    const interval = setInterval(fetchSharedState, 3000);
    return () => {
      if (channel) supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [soundEnabled]);

  // SSE Stream listener & Cross-Tab Broadcast listener
  // Both handle the same event types — SSE for cross-device, Broadcast for cross-tab
  const handleSyncEvent = (event) => {
    if (!event || !event.type) return;

    if (event.type === 'NEW_JOB_BROADCAST') {
      const rawJob = event.data || event.payload;
      if (!rawJob) return;
      setJobsTable(prev => {
        if (prev.some(j => j.job_id === rawJob.job_id)) return prev;
        return [rawJob, ...prev];
      });
      triggerJobSound(rawJob);
    } else if (event.type === 'JOB_CLAIMED') {
      const payload = event.data || event.payload;
      const { jobId, providerId, acceptedAt } = payload;
      setJobsTable(prev => prev.map(j => {
        if (j.job_id === jobId || j.id === jobId) {
          return { ...j, status: 'claimed', provider_id: providerId, accepted_at: acceptedAt };
        }
        return j;
      }));
    } else if (event.type === 'PROVIDER_CANCELLED_JOB') {
      const payload = event.data || event.payload;
      const { jobId, reason } = payload;
      setJobsTable(prev => prev.map(j => {
        if (j.job_id === jobId || j.id === jobId) {
          return { ...j, status: 'open', provider_id: null, cancel_reason: reason || null, cancelled_by: 'provider' };
        }
        return j;
      }));
      if (soundEnabled) playSoundEffect('missed');
    } else if (event.type === 'CUSTOMER_CANCELLED_JOB') {
      const payload = event.data || event.payload;
      const { jobId } = payload;
      setJobsTable(prev => prev.map(j => {
        if (j.job_id === jobId || j.id === jobId) {
          return { ...j, status: 'cancelled' };
        }
        return j;
      }));
    } else if (event.type === 'CUSTOMER_REMOVED_PROVIDER') {
      const payload = event.data || event.payload;
      const { jobId } = payload;
      setJobsTable(prev => prev.map(j => {
        if (j.job_id === jobId || j.id === jobId) {
          return { ...j, status: 'open', provider_id: null };
        }
        return j;
      }));
    } else if (event.type === 'JOB_COMPLETED') {
      const payload = event.data || event.payload;
      const { jobId, completedAt } = payload;
      setJobsTable(prev => prev.map(j => {
        if (j.job_id === jobId || j.id === jobId) {
          return { ...j, status: 'completed', completed_at: completedAt };
        }
        return j;
      }));
    } else if (event.type === 'JOB_REVIEWED') {
      const payload = event.data || event.payload;
      const { jobId, reviewData, providerId } = payload;
      setJobsTable(prev => prev.map(j => {
        if (j.job_id === jobId || j.id === jobId) {
          return { ...j, status: 'reviewed', review: reviewData };
        }
        return j;
      }));
      if (providerId && reviewData?.rating) {
        setProvidersTable(prev => prev.map(p => {
          if (p.provider_id === providerId) {
            const newRating = Number(((p.rating * p.jobs_completed + reviewData.rating) / (p.jobs_completed + 1)).toFixed(1));
            return { ...p, rating: newRating, jobs_completed: p.jobs_completed + 1 };
          }
          return p;
        }));
      }
    } else if (event.type === 'RESET_DEMO') {
      setJobsTable([]);
      setCurrentCustomerJobId(null);
    }
  };

  useEffect(() => {
    const unsubscribeSSE = sseManager.connect(handleSyncEvent);

    const unsubscribeBroadcast = subscribeToEvents((event) => {
      if (!event || !event.type) return;

      if (event.type === 'NEW_JOB_BROADCAST') {
        const rawJob = event.payload;
        setJobsTable(prev => {
          if (prev.some(j => j.job_id === rawJob.job_id)) return prev;
          return [rawJob, ...prev];
        });
        triggerJobSound(rawJob);
      } else if (event.type === 'JOB_CLAIMED') {
        const { jobId, providerId, acceptedAt } = event.payload;
        setJobsTable(prev => prev.map(j => {
          if (j.job_id === jobId || j.id === jobId) {
            return { ...j, status: 'claimed', provider_id: providerId, accepted_at: acceptedAt };
          }
          return j;
        }));
      } else if (event.type === 'PROVIDER_CANCELLED_JOB') {
        const { jobId, reason } = event.payload;
        setJobsTable(prev => prev.map(j => {
          if (j.job_id === jobId || j.id === jobId) {
            return {
              ...j,
              status: 'open',
              provider_id: null,
              cancel_reason: reason || null,
              cancelled_by: 'provider'
            };
          }
          return j;
        }));
        if (soundEnabled) playSoundEffect('missed');
      } else if (event.type === 'CUSTOMER_REMOVED_PROVIDER') {
        const { jobId } = event.payload;
        setJobsTable(prev => prev.map(j => {
          if (j.job_id === jobId || j.id === jobId) {
            return {
              ...j,
              status: 'open',
              provider_id: null,
              cancel_reason: 'Customer requested provider replacement',
              cancelled_by: 'customer'
            };
          }
          return j;
        }));
      } else if (event.type === 'CUSTOMER_CANCELLED_JOB') {
        const { jobId, reason } = event.payload;
        setJobsTable(prev => prev.map(j => {
          if (j.job_id === jobId || j.id === jobId) {
            return {
              ...j,
              status: 'cancelled',
              cancel_reason: reason || 'Cancelled by customer',
              cancelled_by: 'customer'
            };
          }
          return j;
        }));
      } else if (event.type === 'JOB_COMPLETED') {
        const { jobId, completedAt } = event.payload;
        setJobsTable(prev => prev.map(j => {
          if (j.job_id === jobId || j.id === jobId) {
            return { ...j, status: 'completed', completed_at: completedAt };
          }
          return j;
        }));
        if (soundEnabled) playSoundEffect('success');
      } else if (event.type === 'JOB_REVIEWED') {
        const { jobId, reviewData, providerId } = event.payload;
        setJobsTable(prev => prev.map(j => (j.job_id === jobId || j.id === jobId) ? { ...j, status: 'reviewed', review: reviewData } : j));

        if (providerId && reviewData?.rating) {
          setProvidersTable(prev => prev.map(p => {
            if (p.provider_id === providerId) {
              const newRating = Number(((p.rating * p.jobs_completed + reviewData.rating) / (p.jobs_completed + 1)).toFixed(1));
              return { ...p, rating: newRating, jobs_completed: p.jobs_completed + 1 };
            }
            return p;
          }));
        }
      } else if (event.type === 'PROVIDER_APPROVED') {
        const { providerId } = event.payload;
        setProvidersTable(prev => prev.map(p => p.provider_id === providerId ? { ...p, verified: true } : p));
      }
    });

    return () => {
      unsubscribeSSE();
      unsubscribeBroadcast();
    };
  }, [soundEnabled]);

  // Handle Authentication (SignIn or SignUp)
  const handleUserAuthenticate = async (userObj, arg2 = false, arg3 = '') => {
    let isNewProvider = false;
    let selectedTrade = '';

    if (typeof arg2 === 'boolean') {
      isNewProvider = arg2;
      selectedTrade = typeof arg3 === 'string' ? arg3 : '';
    } else if (typeof arg2 === 'string') {
      selectedTrade = arg2;
      isNewProvider = typeof arg3 === 'boolean' ? arg3 : false;
    }

    const validUserId = (userObj.user_id && userObj.user_id.length === 36)
      ? userObj.user_id
      : generateUUID();

    const updatedUserObj = {
      ...userObj,
      user_id: validUserId,
      city_id: userObj.city_id || null
    };

    setCurrentUser(updatedUserObj);
    setIsAuthenticated(true);
    setUsersTable(prev => [updatedUserObj, ...prev.filter(u => u.email !== updatedUserObj.email)]);

    try {
      if (updatedUserObj.email) {
        const { error } = await supabase.from('users').upsert({
          user_id: validUserId,
          name: updatedUserObj.name || 'Anonymous User',
          phone: updatedUserObj.phone || '',
          email: updatedUserObj.email,
          password_hash: updatedUserObj.password_hash || 'hash_default',
          location: updatedUserObj.location || 'Sector 4',
          city_id: updatedUserObj.city_id || null
        }).eq('email', updatedUserObj.email);

        if (error) {
          console.error('Supabase user upsert database error:', error);
        }
      }
    } catch (err) {
      console.error('Supabase user upsert exception:', err);
    }

    const tradeStr = typeof selectedTrade === 'string'
      ? selectedTrade
      : (selectedTrade?.role_id || selectedTrade?.id || 'electrician');
    const capitalizedTrade = tradeStr ? (tradeStr.charAt(0).toUpperCase() + tradeStr.slice(1)) : 'Electrician';

    if (isNewProvider) {
      const validProviderId = generateUUID();
      const newProviderRecord = {
        provider_id: validProviderId,
        user_id: validUserId,
        role_id: tradeStr,
        rating: 5.0,
        jobs_completed: 0,
        verified: false,
        title: `Licensed ${capitalizedTrade} Specialist`,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        eta_minutes: 10,
        distance_miles: '1.2 mi away',
        preferred_region_id: userObj.preferred_region_id || null,
        created_at: Date.now()
      };
      setProvidersTable(prev => [newProviderRecord, ...prev]);
      setActiveProviderId(newProviderRecord.provider_id);

      try {
        const { data: existing, error: selectError } = await supabase.from('providers').select('provider_id').eq('user_id', validUserId);
        if (selectError) console.error('Supabase provider select database error:', selectError);

        if (!existing || existing.length === 0) {
          const { error: insertError } = await supabase.from('providers').insert([{
            provider_id: validProviderId,
            user_id: validUserId,
            role_id: ROLE_MAP[tradeStr] || tradeStr,
            rating: 5.0,
            verified: false,
            preferred_region_id: userObj.preferred_region_id || null
          }]);
          if (insertError) console.error('Supabase provider insert database error:', insertError);
        }
      } catch (err) {
        console.error('Supabase provider exception:', err);
      }

      // Send admin notification email dynamically by querying the online database for the admin user record
      try {
        console.log('🔍 Fetching admin email from online database...');
        const { data: adminUser, error: adminErr } = await supabase
          .from('users')
          .select('email')
          .eq('user_id', 'a0000000-0000-0000-0000-000000000009')
          .maybeSingle();

        if (adminErr) {
          console.error('Error fetching admin user from database:', adminErr.message);
        }

        const adminEmail = adminUser?.email;
        if (adminEmail) {
          console.log(`📩 Found admin email: ${adminEmail}. Dispatching registration alert...`);
          const hosts = getSyncServerHosts();

          for (const host of hosts) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 1500);
            try {
              const res = await fetch(`${host}/api/notify-admin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  adminEmail,
                  provider: {
                    name: updatedUserObj.name,
                    phone: updatedUserObj.phone,
                    email: updatedUserObj.email,
                    trade: capitalizedTrade
                  }
                }),
                signal: controller.signal
              });
              clearTimeout(timeoutId);
              if (res.ok) {
                console.log(`📩 Admin email dispatch request sent successfully via ${host}`);
                break;
              }
            } catch (fetchErr) {
              clearTimeout(timeoutId);
              console.warn(`Failed to dispatch admin email notification via ${host}:`, fetchErr.message);
            }
          }
        } else {
          console.warn('⚠️ No admin user with email admin@gmail.com found in database. Notification skipped.');
        }
      } catch (emailErr) {
        console.error('Error dispatching admin email notification:', emailErr);
      }

      setPendingProviderUser(updatedUserObj);
      setPendingProviderTrade(tradeStr);
      setShowPendingModal(false);
      setViewMode('CUSTOMER');
    } else {
      const existingPro = providersTable.find(p =>
        p.user_id === validUserId ||
        (p.user_id && p.user_id.toLowerCase() === validUserId.toLowerCase())
      ) || providersTable.find(p =>
        (selectedTrade && p.role_id?.toLowerCase() === selectedTrade.toLowerCase())
      );

      if (existingPro) {
        setActiveProviderId(existingPro.provider_id);
        setViewMode('PROVIDER');
      } else if (updatedUserObj.name?.includes('Sarah') || selectedTrade === 'locksmith') {
        const sarahPro = providersTable.find(p => p.provider_id === 'e0000000-0000-4000-8000-000000000003');
        if (sarahPro) setActiveProviderId(sarahPro.provider_id);
        setViewMode('PROVIDER');
      } else if (updatedUserObj.name?.includes('Dave') || selectedTrade === 'plumber') {
        const davePro = providersTable.find(p => p.provider_id === 'e0000000-0000-4000-8000-000000000004');
        if (davePro) setActiveProviderId(davePro.provider_id);
        setViewMode('PROVIDER');
      } else if (updatedUserObj.name?.includes('Marcus') || selectedTrade === 'electrician') {
        const marcusPro = providersTable.find(p => p.provider_id === 'e0000000-0000-4000-8000-000000000001');
        if (marcusPro) setActiveProviderId(marcusPro.provider_id);
        setViewMode('PROVIDER');
      } else {
        setViewMode('CUSTOMER');
      }
      console.log('🔐 Authenticated Provider User Info:', {
        user_id: updatedUserObj.user_id,
        name: updatedUserObj.name,
        email: updatedUserObj.email,
        phone: updatedUserObj.phone
      });
    }
  };

  // Admin approves pending provider application
  const adminApproveProvider = async (targetProviderId = null) => {
    const pid = targetProviderId || `pro-${pendingProviderUser?.user_id}`;
    setProvidersTable(prev => prev.map(p => p.provider_id === pid ? { ...p, verified: true } : p));

    try {
      await supabase.from('providers').update({ verified: true }).eq('provider_id', pid);
    } catch (err) {}

    broadcastEvent('PROVIDER_APPROVED', { providerId: pid });
    setShowPendingModal(false);
    setViewMode('PROVIDER');

    try {
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}
    if (soundEnabled) playSoundEffect('success');
  };

  const logoutUser = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCurrentCustomerJobId(null);
  };

  // Customer creates job request
  const createJobRequest = async (jobData) => {
    const validJobId = generateUUID();
    const validCustId = (currentUser?.user_id && currentUser?.user_id.length === 36)
      ? currentUser.user_id
      : generateUUID();

    const newJob = {
      job_id: validJobId,
      customer_id: validCustId,
      provider_id: null,
      role_id: jobData.category,
      description: jobData.problem,
      location: jobData.location || '742 Evergreen Terrace, Sector 4',
      phone: jobData.phone || currentUser?.phone || '+1 (555) 789-0123',
      urgency: jobData.urgency || 'MEDIUM',
      estimated_payout: jobData.estimatedPayout || '$120 - $160',
      status: 'open',
      cancel_reason: null,
      cancelled_by: null,
      created_at: new Date().toISOString(),
      accepted_at: null,
      completed_at: null
    };

    setJobsTable(prev => [newJob, ...prev]);
    setCurrentCustomerJobId(newJob.job_id);

    // Save to Supabase Cloud Database (using ONLY table schema columns)
    const dbPayload = {
      job_id: newJob.job_id,
      customer_id: newJob.customer_id,
      provider_id: null,
      role_id: ROLE_MAP[newJob.role_id] || newJob.role_id,
      description: newJob.description,
      location: newJob.location,
      status: newJob.status,
      cancel_reason: null,
      cancelled_by: null,
      created_at: newJob.created_at,
      accepted_at: null,
      completed_at: null
    };

    try {
      const { error } = await supabase.from('jobs').insert([dbPayload]);
      if (error) console.error('Supabase create job error:', error);
    } catch (e) {
      console.error('Supabase create job catch:', e);
    }

    broadcastEvent('NEW_JOB_BROADCAST', newJob);
    sseManager.emitSSE('NEW_JOB_BROADCAST', newJob);
    broadcastToServer('NEW_JOB_BROADCAST', newJob);
    return newJob;
  };

  // Provider claims open job
  const claimJob = async (jobId, provider) => {
    const targetJob = jobsTable.find(j => j.job_id === jobId || j.id === jobId);
    if (!targetJob) return { success: false, reason: 'NOT_FOUND' };
    if (targetJob.status === 'claimed' || targetJob.status === 'completed' || targetJob.status === 'CLAIMED') {
      return { success: false, reason: 'ALREADY_CLAIMED', claimedBy: targetJob.provider_id };
    }
    if (targetJob.status === 'cancelled' || targetJob.status === 'CANCELLED') {
      return { success: false, reason: 'CANCELLED' };
    }
    // Prevent removed provider from re-claiming the same job
    const claimingProviderId = provider?.id || provider?.provider_id;
    if (targetJob.removed_provider_id && targetJob.removed_provider_id === claimingProviderId) {
      return { success: false, reason: 'PROVIDER_REMOVED' };
    }

    const acceptedAt = new Date().toISOString();
    const actualJobId = targetJob.job_id || targetJob.id;
    const matchingPro = providersTable.find(p =>
      p.provider_id === provider?.id ||
      p.provider_id === provider?.provider_id ||
      p.user_id === provider?.user_id ||
      p.user_id === currentUser?.user_id
    );
    const validProviderId = matchingPro?.provider_id || provider?.provider_id || provider?.id || 'e0000000-0000-4000-8000-000000000002';

    // Query Supabase directly first to ensure the status is still 'open'
    try {
      const { data: latestJob, error: fetchError } = await supabase
        .from('jobs')
        .select('status, provider_id')
        .eq('job_id', actualJobId)
        .maybeSingle();

      if (latestJob && latestJob.status !== 'open') {
        const latestStatus = latestJob.status;
        setJobsTable(prev => prev.map(j => {
          if (j.job_id === actualJobId || j.id === actualJobId) {
            return { ...j, status: latestStatus, provider_id: latestJob.provider_id };
          }
          return j;
        }));
        return {
          success: false,
          reason: latestStatus === 'cancelled' ? 'CANCELLED' : 'ALREADY_CLAIMED',
          claimedBy: latestJob.provider_id
        };
      }
    } catch (e) {
      console.warn('Failed to perform pre-claim online status check:', e);
    }

    setJobsTable(prev => prev.map(j => {
      if (j.job_id === actualJobId || j.id === actualJobId) {
        return {
          ...j,
          status: 'claimed',
          provider_id: validProviderId,
          accepted_at: acceptedAt
        };
      }
      return j;
    }));

    // Update in Supabase Cloud Database
    try {
      await supabase.from('jobs').update({
        status: 'claimed',
        provider_id: validProviderId,
        accepted_at: acceptedAt
      }).eq('job_id', actualJobId);
    } catch (e) {
      console.error('Supabase claim job error:', e);
    }

    broadcastEvent('JOB_CLAIMED', { jobId: actualJobId, providerId: validProviderId, acceptedAt });
    sseManager.emitSSE('JOB_CLAIMED', { jobId: actualJobId, providerId: validProviderId });
    broadcastToServer('JOB_CLAIMED', { jobId: actualJobId, providerId: validProviderId, acceptedAt });

    try {
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}
    if (soundEnabled) playSoundEffect('success');

    return { success: true };
  };

  // Provider cancels claimed job
  const providerCancelJob = async (jobId, reason = '') => {
    const actualJobId = jobId;

    setJobsTable(prev => prev.map(j => {
      if (j.job_id === actualJobId || j.id === actualJobId) {
        return {
          ...j,
          status: 'open',
          provider_id: null,
          cancel_reason: reason || null,
          cancelled_by: 'provider'
        };
      }
      return j;
    }));

    try {
      await supabase.from('jobs').update({
        status: 'open',
        provider_id: null,
        cancel_reason: reason || null,
        cancelled_by: 'provider'
      }).eq('job_id', actualJobId);
    } catch (e) {}

    broadcastEvent('PROVIDER_CANCELLED_JOB', { jobId: actualJobId, reason });
    sseManager.emitSSE('PROVIDER_CANCELLED_JOB', { jobId: actualJobId, reason });
    broadcastToServer('PROVIDER_CANCELLED_JOB', { jobId: actualJobId, reason });
  };

  // Customer cancels job
  const cancelJobRequest = async (jobId, reason = '') => {
    const actualJobId = jobId;

    setJobsTable(prev => prev.map(j => {
      if (j.job_id === actualJobId || j.id === actualJobId) {
        return {
          ...j,
          status: 'cancelled',
          cancel_reason: reason || 'Cancelled by customer',
          cancelled_by: 'customer'
        };
      }
      return j;
    }));

    setCurrentCustomerJobId(null);

    try {
      await supabase.from('jobs').update({
        status: 'cancelled',
        cancel_reason: reason || 'Cancelled by customer',
        cancelled_by: 'customer'
      }).eq('job_id', actualJobId);
    } catch (e) {}

    broadcastEvent('CUSTOMER_CANCELLED_JOB', { jobId: actualJobId, reason });
    sseManager.emitSSE('CUSTOMER_CANCELLED_JOB', { jobId: actualJobId, reason });
    broadcastToServer('CUSTOMER_CANCELLED_JOB', { jobId: actualJobId, reason });
  };

  // Customer removes provider & re-assigns
  const removeProviderFromJob = async (jobId) => {
    const actualJobId = jobId;
    const targetJob = jobsTable.find(j => j.job_id === actualJobId || j.id === actualJobId);
    const removedProviderId = targetJob?.provider_id || null;

    setJobsTable(prev => prev.map(j => {
      if (j.job_id === actualJobId || j.id === actualJobId) {
        return {
          ...j,
          status: 'open',
          provider_id: null,
          removed_provider_id: removedProviderId,
          cancel_reason: 'Customer requested provider replacement',
          cancelled_by: 'customer'
        };
      }
      return j;
    }));

    try {
      await supabase.from('jobs').update({
        status: 'open',
        provider_id: null,
        cancel_reason: 'Customer requested provider replacement',
        cancelled_by: 'customer'
      }).eq('job_id', actualJobId);
    } catch (e) {}

    broadcastEvent('CUSTOMER_REMOVED_PROVIDER', { jobId: actualJobId, removedProviderId });
    sseManager.emitSSE('CUSTOMER_REMOVED_PROVIDER', { jobId: actualJobId, removedProviderId });
    broadcastToServer('CUSTOMER_REMOVED_PROVIDER', { jobId: actualJobId, removedProviderId });
  };

  // Complete job
  const completeJob = async (jobId) => {
    const completedAt = new Date().toISOString();
    const actualJobId = jobId;

    setJobsTable(prev => prev.map(j => {
      if (j.job_id === actualJobId || j.id === actualJobId) {
        return { ...j, status: 'completed', completed_at: completedAt };
      }
      return j;
    }));

    try {
      await supabase.from('jobs').update({
        status: 'completed',
        completed_at: completedAt
      }).eq('job_id', actualJobId);
    } catch (e) {}

    broadcastEvent('JOB_COMPLETED', { jobId: actualJobId, completedAt });
    sseManager.emitSSE('JOB_COMPLETED', { jobId: actualJobId });
    broadcastToServer('JOB_COMPLETED', { jobId: actualJobId, completedAt });

    try {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (e) {}
    if (soundEnabled) playSoundEffect('success');
  };

  // Submit review
  const submitReview = (jobId, reviewDataOrRating, maybeComment) => {
    // Support both calling conventions: (jobId, {rating, comment, ...}) or (jobId, rating, comment)
    let reviewData;
    if (typeof reviewDataOrRating === 'object' && reviewDataOrRating !== null) {
      reviewData = { ...reviewDataOrRating, created_at: Date.now() };
    } else {
      reviewData = { rating: reviewDataOrRating, comment: maybeComment || '', created_at: Date.now() };
    }

    const targetJob = jobsTable.find(j => j.job_id === jobId || j.id === jobId);

    setJobsTable(prev => prev.map(j => (j.job_id === jobId || j.id === jobId) ? { ...j, status: 'reviewed', review: reviewData } : j));

    // Provider stats (jobs_completed, rating) are now computed dynamically from jobsTable
    // No manual providersTable update needed

    if (currentCustomerJobId === jobId) {
      setCurrentCustomerJobId(null);
    }

    broadcastEvent('JOB_REVIEWED', { jobId, reviewData, providerId: targetJob?.provider_id });
    broadcastToServer('JOB_REVIEWED', { jobId, reviewData, providerId: targetJob?.provider_id });
  };

  const updateUserProfile = async (profileData) => {
    if (!currentUser) return;
    const updatedUser = {
      ...currentUser,
      name: profileData.name !== undefined ? profileData.name : currentUser.name,
      phone: profileData.phone !== undefined ? profileData.phone : currentUser.phone,
      city_id: profileData.city_id !== undefined ? profileData.city_id : currentUser.city_id
    };
    setCurrentUser(updatedUser);
    setUsersTable(prev => prev.map(u => u.user_id === currentUser.user_id ? { ...u, ...profileData } : u));

    try {
      await supabase.from('users').update({
        name: updatedUser.name,
        phone: updatedUser.phone,
        city_id: updatedUser.city_id
      }).eq('user_id', currentUser.user_id);
    } catch (e) {
      console.error('Failed to update user profile in Supabase:', e);
    }

    if (profileData.preferred_region_id !== undefined) {
      setProvidersTable(prev => prev.map(p => {
        if (p.user_id === currentUser.user_id) {
          return { ...p, preferred_region_id: profileData.preferred_region_id };
        }
        return p;
      }));
      try {
        await supabase.from('providers').update({
          preferred_region_id: profileData.preferred_region_id
        }).eq('user_id', currentUser.user_id);
      } catch (e) {
        console.error('Failed to update provider profile in Supabase:', e);
      }
    }
  };

  const resetState = async () => {
    setJobsTable([]);
    setCurrentCustomerJobId(null);
    broadcastEvent('RESET_DEMO', {});
    broadcastToServer('RESET_DEMO', {});

    // Clear jobs in Supabase Cloud DB
    try {
      await supabase.from('jobs').delete().neq('job_id', '00000000-0000-0000-0000-000000000000');
    } catch (e) {
      console.error('Failed to clear Supabase jobs on reset:', e);
    }
  };

  const fetchLatestUsers = async () => {
    try {
      const { data: usersData } = await supabase.from('users').select('*');
      if (usersData) setUsersTable(usersData);

      const { data: provsData } = await supabase.from('providers').select('*');
      if (provsData) {
        const mapped = provsData.map(p => ({
          ...p,
          role_id: REVERSE_ROLE_MAP[p.role_id] || p.role_id
        }));
        setProvidersTable(mapped);
      }

      return usersData || [];
    } catch (err) {
      console.error('Failed to fetch latest users:', err);
      return [];
    }
  };

  return (
    <MarketplaceContext.Provider value={{
      viewMode,
      setViewMode,
      activeProvider,
      activeProviderId,
      setActiveProviderId,
      providers: providersUI,
      roles: rolesTable,
      jobs: joinedJobs,
      rawJobsTable: jobsTable,
      jobsTable,
      users: usersTable,
      providersTable,
      currentCustomerJob,
      createJobRequest,
      claimJob,
      completeJob,
      providerCancelJob,
      cancelJobRequest,
      customerCancelJob: cancelJobRequest,
      removeProviderFromJob,
      customerRemoveProvider: removeProviderFromJob,
      submitReview,
      submitCustomerReview: submitReview,
      resetState,
      soundEnabled,
      setSoundEnabled,
      currentUser: currentUserEnriched,
      rawCurrentUser: currentUser,
      regions: regionsTable,
      cities: citiesTable,
      updateUserProfile,
      isAuthenticated,
      handleUserAuthenticate,
      logoutUser,
      showPendingModal,
      setShowPendingModal,
      pendingProviderUser,
      pendingProviderTrade,
      adminApproveProvider,
      onlineProsByTrade,
      fetchLatestUsers
    }}>
      {children}
    </MarketplaceContext.Provider>
  );
};

export const useMarketplace = () => useContext(MarketplaceContext);
