import React, { useState, useEffect } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { ShieldCheck, Zap, Phone, MapPin, DollarSign, Clock, CheckCircle2, User, Play, AlertCircle, Sparkles, Filter, Lock, AlertTriangle, Compass } from 'lucide-react';
import { IncomingJobAlert } from './IncomingJobAlert';
import { ProviderCancelModal } from './ProviderCancelModal';
import { ProviderMiniMap } from './ProviderMiniMap';
import { NavigationModal } from '../Navigation/NavigationModal';
import { subscribeToEvents } from '../../utils/broadcast';
import { decodeHTML } from '../../utils/sanitizer';
import { resolveCoordinates } from '../../db/database';

export const ProviderDashboard = () => {
  const {
    activeProvider,
    activeProviderId,
    setActiveProviderId,
    providers,
    jobs,
    claimJob,
    completeJob,
    providerCancelJob,
    createJobRequest,
    regions,
    cities,
    providerLiveCoords,
    aiDetectedLocation,
    autoSyncRegionWithAi,
    updateUserProfile,
    updateProviderAvailability
  } = useMarketplace();

  const [activeAlertJob, setActiveAlertJob] = useState(null);
  const [cancellingJob, setCancellingJob] = useState(null);
  const [navTarget, setNavTarget] = useState(null);
  const [tradeFilterMode, setTradeFilterMode] = useState('MY_TRADE');
  const [regionFilterMode, setRegionFilterMode] = useState('AI_AUTO'); // 'AI_AUTO' | 'PREFERRED_REGION' | 'ALL_REGIONS'
  const [dismissedJobIds, setDismissedJobIds] = useState(new Set());

  // Filter open jobs list for feed (excluding cancelled or claimed)
  const openJobs = jobs.filter(j => {
    if (activeProvider?.available === false) return false;
    const jobStatus = (j.status || j.rawStatus || '').toUpperCase();
    if (jobStatus !== 'OPEN') return false;
    if (dismissedJobIds.has(j.id)) return false;
    // Don't show jobs where this provider was previously removed by customer
    const myProviderId = activeProvider?.id || activeProvider?.provider_id;
    if (j.removed_provider_id === myProviderId) return false;
    
    // Trade filter
    if (tradeFilterMode === 'MY_TRADE') {
      const cat = (j.category || j.role_id || '').toLowerCase();
      const proTrade = (activeProvider?.trade || activeProvider?.role_id || '').toLowerCase();
      if (cat !== proTrade) return false;
    }

    // Region filter
    if (regionFilterMode === 'AI_AUTO') {
      const detectedRegionId = aiDetectedLocation?.regionId;
      if (detectedRegionId) {
        if (!j.customerRegion || j.customerRegion.id !== detectedRegionId) {
          return false;
        }
      }
    } else if (regionFilterMode === 'PREFERRED_REGION') {
      const preferredRegionId = activeProvider?.preferred_region_id;
      if (preferredRegionId) {
        if (!j.customerRegion || j.customerRegion.id !== preferredRegionId) {
          return false;
        }
      }
    }
    
    return true;
  });

  const myClaimedJobs = jobs.filter(j => {
    const isMatchedStatus = j.status === 'CLAIMED' || j.status === 'COMPLETED' || j.status === 'REVIEWED';
    if (!isMatchedStatus) return false;
    const provId = activeProvider?.id || activeProvider?.provider_id;
    const userId = activeProvider?.user_id;
    return (
      j.claimedBy?.id === provId ||
      j.claimedBy?.provider_id === provId ||
      (userId && j.claimedBy?.user_id === userId) ||
      (provId && j.provider_id === provId)
    );
  });

  // Print provider info to console every time a provider logs in / mounts dashboard
  useEffect(() => {
    if (activeProvider) {
      console.log('👷 Provider Logged In & Dashboard Active:', {
        name: activeProvider.name,
        trade: activeProvider.trade,
        provider_id: activeProvider.id,
        user_id: activeProvider.user_id,
        phone: activeProvider.phone,
        rating: activeProvider.rating,
        title: activeProvider.title,
        verified: activeProvider.verified
      });
    }
  }, [activeProvider?.id, activeProvider?.name]);

  // Auto-trigger alert popup modal when a new matching open job appears
  useEffect(() => {
    if (activeProvider?.available === false) {
      setActiveAlertJob(null);
      return;
    }

    const isBusy = myClaimedJobs.some(j => {
      const statusUpper = (j.status || '').toUpperCase();
      return statusUpper === 'CLAIMED';
    });

    if (!isBusy && activeAlertJob === null && openJobs.length > 0) {
      const preferredRegionId = activeProvider?.preferred_region_id;
      const latestMatchingJob = openJobs.find(j => {
        if (preferredRegionId) {
          return j.customerRegion && j.customerRegion.id === preferredRegionId;
        }
        return true;
      });

      if (latestMatchingJob && !dismissedJobIds.has(latestMatchingJob.id)) {
        setActiveAlertJob({
          id: latestMatchingJob.id,
          category: latestMatchingJob.category || latestMatchingJob.role_id,
          problem: latestMatchingJob.problem || latestMatchingJob.description,
          location: latestMatchingJob.location,
          phone: latestMatchingJob.phone,
          estimatedPayout: latestMatchingJob.estimatedPayout || '$140 - $180'
        });
      }
    }
  }, [jobs, dismissedJobIds, activeAlertJob, myClaimedJobs, activeProvider?.preferred_region_id, activeProvider?.available]);

  // Auto-dismiss alert popup if the job is no longer open (e.g., cancelled or claimed by another pro)
  useEffect(() => {
    if (activeAlertJob) {
      const stillOpen = openJobs.some(j => j.id === activeAlertJob.id);
      if (!stillOpen) {
        setActiveAlertJob(null);
      }
    }
  }, [openJobs, activeAlertJob]);

  const handleSimulateTestJob = () => {
    const providerCity = cities?.find(c => c.id === activeProvider?.city_id) ||
                         cities?.find(c => c.region_id === activeProvider?.preferred_region_id) ||
                         cities?.[0];
    const cityDisplayName = providerCity?.name || 'Tel Aviv-Yafo / תל אביב-יפו';
    const streetSamples = ['14 Herzl Street', '28 Ben Yehuda Blvd', '52 Weizmann Street', '8 Sokolov Street', '36 Bialik Street', '19 HaBanim Street'];
    const randomStreet = streetSamples[Math.floor(Math.random() * streetSamples.length)];
    const jobLocation = `${randomStreet}, ${cityDisplayName}`;

    const testJob = createJobRequest({
      category: activeProvider.trade,
      problem: `Emergency diagnostic request for ${activeProvider.trade.toUpperCase()} - Urgent response needed`,
      phone: '+1 (555) 912-3456',
      location: jobLocation,
      city_id: providerCity?.id,
      region_id: providerCity?.region_id,
      urgency: 'URGENT',
      estimatedPayout: '$180 - $240'
    });
    setActiveAlertJob(testJob);
  };

  const handleDismissAlert = (jobId) => {
    if (jobId) {
      setDismissedJobIds(prev => new Set([...prev, jobId]));
    }
    setActiveAlertJob(null);
  };

  return (
    <div style={{ padding: '0.5rem 0' }}>
      {/* Incoming Job Popup Modal */}
      {activeAlertJob && (
        <IncomingJobAlert
          job={activeAlertJob}
          onClose={() => handleDismissAlert(activeAlertJob.id)}
        />
      )}

      {/* Provider Cancel Modal */}
      {cancellingJob && (
        <ProviderCancelModal
          job={cancellingJob}
          onClose={() => setCancellingJob(null)}
          onConfirmCancel={(jobId, reason) => {
            providerCancelJob(jobId, reason);
            setDismissedJobIds(prev => new Set([...prev, jobId]));
            setCancellingJob(null);
          }}
        />
      )}

      {/* Provider Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        color: '#FFFFFF',
        marginBottom: '1.5rem',
        boxShadow: 'var(--shadow-md)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img
              src={activeProvider.avatar}
              alt={activeProvider.name}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2.5px solid var(--primary-amber)'
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF' }}>
                  {activeProvider.name}
                </h2>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 'var(--radius-full)',
                  background: '#F59E0B22',
                  color: '#F59E0B',
                  border: '1px solid #F59E0B'
                }}>
                  {activeProvider.trade.toUpperCase()} PRO
                </span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#94A3B8' }}>
                {activeProvider.title} • ⭐ {activeProvider.rating} ({activeProvider.jobsCompleted} Jobs)
              </p>
              <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <MapPin size={12} style={{ color: '#F59E0B' }} />
                <span>Preferred Region: <strong>{activeProvider.preferredRegionName || 'None / All'}</strong></span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {/* Preferred Region selector */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(255, 255, 255, 0.08)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 800 }}>Preferred Region:</span>
              <select
                value={activeProvider?.preferred_region_id || ''}
                onChange={async (e) => {
                  const val = e.target.value;
                  await updateUserProfile({
                    preferred_region_id: val ? parseInt(val, 10) : null
                  });
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#FFFFFF',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="" style={{ background: '#0F172A', color: '#FFFFFF' }}>All Regions</option>
                {regions?.map(r => (
                  <option key={r.id} value={r.id} style={{ background: '#0F172A', color: '#FFFFFF' }}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => updateProviderAvailability(activeProvider.id, !activeProvider.available)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                background: activeProvider?.available ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                border: activeProvider?.available ? '1px solid #10B981' : '1px solid rgba(255, 255, 255, 0.2)',
                color: activeProvider?.available ? '#10B981' : '#94A3B8',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: activeProvider?.available ? '#10B981' : '#94A3B8' }} />
              {activeProvider?.available ? 'ONLINE' : 'OFFLINE'}
            </button>

            <button
              onClick={handleSimulateTestJob}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-full)',
                background: 'linear-gradient(135deg, #F59E0B 0%, #FF6B35 100%)',
                color: '#FFFFFF',
                fontSize: '0.78rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              <Play size={13} fill="#FFF" />
              <span>Simulate Request</span>
            </button>
          </div>
        </div>


      </div>

      {/* Provider Live Mini Map & Job Radar */}
      <ProviderMiniMap activeAlertJob={activeAlertJob} visibleJobs={openJobs} />

      {/* AI Smart Region Auto-Detection Banner */}
      {aiDetectedLocation && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)',
          border: '1px solid #BFDBFE',
          borderRadius: '12px',
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: '#EEF2FF',
              color: '#4F46E5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1E40AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>AI Location Auto-Detect:</span>
                <span style={{ color: '#4F46E5' }}>{aiDetectedLocation.city?.name || 'Current GPS'}</span>
              </div>
              <div style={{ fontSize: '0.74rem', color: '#475569' }}>
                {aiDetectedLocation.summary}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={async () => {
                await autoSyncRegionWithAi();
                setRegionFilterMode('AI_AUTO');
              }}
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Sparkles size={12} />
              <span>Set as My Region ⚡</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Column 1: Open Jobs Feed */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Zap size={16} style={{ color: 'var(--primary-amber)' }} />
              Broadcasted Feed ({openJobs.length})
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* Trade Filters */}
              <div style={{ display: 'flex', background: '#E2E8F0', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
                <button
                  onClick={() => setTradeFilterMode('MY_TRADE')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: tradeFilterMode === 'MY_TRADE' ? '#FFFFFF' : 'transparent',
                    color: tradeFilterMode === 'MY_TRADE' ? 'var(--text-main)' : 'var(--text-muted)'
                  }}
                >
                  🎯 {activeProvider.trade.toUpperCase()} Only
                </button>

                <button
                  onClick={() => setTradeFilterMode('ALL_TRADES')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: tradeFilterMode === 'ALL_TRADES' ? '#FFFFFF' : 'transparent',
                    color: tradeFilterMode === 'ALL_TRADES' ? 'var(--text-main)' : 'var(--text-muted)'
                  }}
                >
                  🌐 All
                </button>
              </div>

              {/* Region Filters */}
              <div style={{ display: 'flex', background: '#E2E8F0', padding: '2px', borderRadius: 'var(--radius-sm)' }}>
                <button
                  onClick={() => setRegionFilterMode('AI_AUTO')}
                  title="Auto-filter by your live GPS location"
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: regionFilterMode === 'AI_AUTO' ? 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' : 'transparent',
                    color: regionFilterMode === 'AI_AUTO' ? '#FFFFFF' : 'var(--text-muted)'
                  }}
                >
                  ✨ AI Auto
                </button>

                <button
                  onClick={() => setRegionFilterMode('PREFERRED_REGION')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: regionFilterMode === 'PREFERRED_REGION' ? '#FFFFFF' : 'transparent',
                    color: regionFilterMode === 'PREFERRED_REGION' ? 'var(--text-main)' : 'var(--text-muted)'
                  }}
                >
                  📍 Preferred
                </button>

                <button
                  onClick={() => setRegionFilterMode('ALL_REGIONS')}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: regionFilterMode === 'ALL_REGIONS' ? '#FFFFFF' : 'transparent',
                    color: regionFilterMode === 'ALL_REGIONS' ? 'var(--text-main)' : 'var(--text-muted)'
                  }}
                >
                  🌍 All
                </button>
              </div>
            </div>
          </div>

          {openJobs.length === 0 ? (
            <div style={{
              background: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem 1rem',
              textAlign: 'center',
              border: '1px solid #E2E8F0',
              color: 'var(--text-muted)'
            }}>
              <Clock size={32} style={{ color: '#CBD5E1', marginBottom: '0.5rem' }} />
              <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>No open {activeProvider.trade} jobs right now</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '4px' }}>
                Use "Simulate Request" above to test receiving job offers.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {openJobs.map(job => {
                const isMyTrade = job.category.toLowerCase() === activeProvider.trade.toLowerCase();
                return (
                  <div
                    key={job.id}
                    className="animate-slide-up"
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      border: isMyTrade ? '2px solid #F59E0B' : '1px solid #E2E8F0',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: isMyTrade ? '#FEF3C7' : '#F1F5F9',
                        color: isMyTrade ? '#D97706' : '#64748B'
                      }}>
                        {isMyTrade ? 'MATCHING YOUR TRADE 🎯' : `${job.category.toUpperCase()} JOB`}
                      </span>

                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                        {job.estimatedPayout || '$140 - $180'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                      {decodeHTML(job.problem)}
                    </h4>

                    {job.cancelReason && (
                      <div style={{ fontSize: '0.72rem', color: '#B45309', background: '#FEF3C7', padding: '4px 8px', borderRadius: '4px', marginBottom: '0.5rem' }}>
                        Notice: Previous pro unassigned ({job.cancelReason})
                      </div>
                    )}

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={13} style={{ color: 'var(--primary-amber)' }} />
                      <span>
                        {decodeHTML(job.location)}
                        {job.customerCity && (
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                            {' '}({job.customerCity.name}
                            {job.customerRegion && `, ${job.customerRegion.name}`})
                          </span>
                        )}
                      </span>
                    </p>

                    <button
                      onClick={async () => {
                        const res = await claimJob(job.id, activeProvider);
                        if (res && !res.success) alert(`Could not claim job: ${res.reason}`);
                      }}
                      style={{
                        width: '100%',
                        padding: '9px',
                        borderRadius: 'var(--radius-sm)',
                        background: isMyTrade
                          ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                          : '#64748B',
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      <CheckCircle2 size={15} />
                      <span>{isMyTrade ? 'Lock & Claim Job Atomic' : `Claim ${job.category.toUpperCase()} Job`}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Column 2: My Accepted Jobs */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={16} style={{ color: 'var(--accent-emerald)' }} />
              My Accepted Jobs ({myClaimedJobs.length})
            </h3>
            <span style={{ fontSize: '0.72rem', color: 'var(--accent-emerald)', fontWeight: 700 }}>Locked To You</span>
          </div>

          {myClaimedJobs.length === 0 ? (
            <div style={{
              background: '#FFFFFF',
              borderRadius: 'var(--radius-lg)',
              padding: '2rem 1rem',
              textAlign: 'center',
              border: '1px solid #E2E8F0',
              color: 'var(--text-muted)'
            }}>
              <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>No claimed jobs yet</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-light)', marginTop: '4px' }}>
                Accept open jobs from the feed to start working.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {myClaimedJobs.map(job => {
                const isFinished = job.status === 'COMPLETED' || job.status === 'REVIEWED';
                return (
                  <div
                    key={job.id}
                    style={{
                      background: '#FFFFFF',
                      borderRadius: 'var(--radius-md)',
                      padding: '1rem',
                      border: isFinished ? '1.5px solid #E2E8F0' : '1.5px solid #A7F3D0',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                        background: isFinished ? '#ECFDF5' : '#FEF3C7',
                        color: isFinished ? '#059669' : '#D97706'
                      }}>
                        {isFinished ? (job.status === 'REVIEWED' ? 'RATED & COMPLETE ⭐' : 'WORK FINISHED 🏁') : 'ACCEPTED & IN PROGRESS'}
                      </span>

                      {!isFinished && (
                        <button
                          onClick={() => setCancellingJob(job)}
                          style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: '#F43F5E',
                            background: '#FFF1F2',
                            border: '1px solid #FECDD3',
                            padding: '2px 6px',
                            borderRadius: 'var(--radius-sm)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}
                        >
                          <AlertTriangle size={12} /> Cancel
                        </button>
                      )}
                    </div>

                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                      {decodeHTML(job.problem)}
                    </h4>

                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      <div><strong>Customer Phone:</strong> {job.phone}</div>
                      <div>
                        <strong>Service Address:</strong> {decodeHTML(job.location)}
                        {job.customerCity && (
                          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                            {' '}({job.customerCity.name}
                            {job.customerRegion && `, ${job.customerRegion.name}`})
                          </span>
                        )}
                      </div>
                    </div>

                    {!isFinished ? (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <a
                          href={`tel:${job.phone}`}
                          style={{
                            flex: 1,
                            textAlign: 'center',
                            padding: '8px',
                            borderRadius: 'var(--radius-sm)',
                            background: '#0F172A',
                            color: '#FFFFFF',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            textDecoration: 'none'
                          }}
                        >
                          📞 Call
                        </a>

                        <button
                          onClick={() => {
                            const destCoords = job.coords || resolveCoordinates(job, cities, regions, providerLiveCoords);
                            setNavTarget({
                              job: job,
                              coords: destCoords,
                              address: job.location || job.customerCity?.name
                            });
                          }}
                          style={{
                            flex: 1.2,
                            padding: '8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                            color: '#FFFFFF',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)'
                          }}
                        >
                          <Compass size={14} />
                          <span>Navigate</span>
                        </button>

                        <button
                          onClick={() => completeJob(job.id)}
                          style={{
                            flex: 1.4,
                            padding: '8px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            color: '#FFFFFF',
                            fontSize: '0.82rem',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px'
                          }}
                        >
                          <CheckCircle2 size={15} />
                          <span>DONE 🏁</span>
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-sm)',
                        background: '#F8FAFC',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: 'var(--accent-emerald)',
                        textAlign: 'center',
                        border: '1px solid #E2E8F0'
                      }}>
                        {job.status === 'REVIEWED'
                          ? `Customer Left Review: "${job.review?.comment || 'Great service!'}"`
                          : 'Job completed • Waiting for customer rating survey'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* External Navigation Selection Modal */}
      <NavigationModal
        isOpen={!!navTarget}
        onClose={() => setNavTarget(null)}
        targetJob={navTarget?.job}
        coords={navTarget?.coords}
        address={navTarget?.address}
      />
    </div>
  );
};
