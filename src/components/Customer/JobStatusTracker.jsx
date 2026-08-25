import React, { useState, useEffect } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { CustomerRatingModal } from './CustomerRatingModal';
import { CustomerCancelModal } from './CustomerCancelModal';
import { ShieldCheck, Phone, MessageSquare, MapPin, CheckCircle2, Clock, XCircle, Star, Sparkles, Navigation, AlertCircle, Award, RefreshCw, UserX } from 'lucide-react';
import { decodeHTML } from '../../utils/sanitizer';
import { supabase } from '../../db/supabaseClient';

export const JobStatusTracker = ({ job, onCancel }) => {
  const context = useMarketplace();
  const doCancelJob = context.customerCancelJob || context.cancelJobRequest;
  const doRemovePro = context.customerRemoveProvider || context.removeProviderFromJob;
  const doSubmitReview = context.submitCustomerReview || context.submitReview;

  const [secondsWaiting, setSecondsWaiting] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [provider, setProvider] = useState(job.claimedBy || null);

  useEffect(() => {
    if (job.claimedBy) {
      setProvider(job.claimedBy);
      return;
    }
    if (!job.provider_id) {
      setProvider(null);
      return;
    }

    const fetchProviderFallback = async () => {
      try {
        const { data: provRec } = await supabase
          .from('providers')
          .select('*')
          .eq('provider_id', job.provider_id)
          .maybeSingle();

        if (provRec) {
          const { data: usrRec } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', provRec.user_id)
            .maybeSingle();

          if (usrRec) {
            setProvider({
              ...provRec,
              id: provRec.provider_id,
              name: usrRec.name || 'Unknown Pro',
              phone: usrRec.phone || '',
              email: usrRec.email || '',
              avatar: provRec.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
              title: provRec.title || `Licensed ${provRec.role_id} Specialist`,
              rating: provRec.rating || 5.0,
              jobsCompleted: provRec.jobs_completed || 0
            });
          }
        }
      } catch (e) {
        console.error('Failed to fetch provider fallback in JobStatusTracker:', e);
      }
    };

    fetchProviderFallback();
  }, [job?.claimedBy, job?.provider_id]);

  useEffect(() => {
    if (!job || job.status !== 'OPEN') {
      setSecondsWaiting(0);
      return;
    }
    const interval = setInterval(() => {
      setSecondsWaiting(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [job?.id, job?.status]);

  useEffect(() => {
    if (job && job.status === 'COMPLETED') {
      setShowRatingModal(true);
    }
  }, [job?.status]);

  if (!job) return null;

  const statusUpper = (job.status || '').toUpperCase();
  const isClaimed = statusUpper === 'CLAIMED';
  const isCompleted = statusUpper === 'COMPLETED';
  const isReviewed = statusUpper === 'REVIEWED';
  const isCancelled = statusUpper === 'CANCELLED';

  return (
    <div style={{ maxWidth: '680px', margin: '1.5rem auto 0 auto' }}>
      {/* Customer Rating Modal Overlay */}
      {showRatingModal && (
        <CustomerRatingModal
          job={job}
          onSubmitReview={(jobId, reviewData) => {
            if (typeof doSubmitReview === 'function') doSubmitReview(jobId, reviewData);
            setShowRatingModal(false);
          }}
          onClose={() => setShowRatingModal(false)}
        />
      )}

      {/* Customer Cancel / Remove Modal Overlay */}
      {showCancelModal && (
        <CustomerCancelModal
          job={job}
          onConfirmCancel={(jobId, reason) => {
            if (typeof doCancelJob === 'function') doCancelJob(jobId, reason);
            setShowCancelModal(false);
          }}
          onRemoveProvider={(jobId) => {
            if (typeof doRemovePro === 'function') doRemovePro(jobId);
            setShowCancelModal(false);
          }}
          onClose={() => setShowCancelModal(false)}
        />
      )}

      {/* Outer Status Card */}
      <div className="animate-slide-up" style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        border: (isClaimed || isCompleted || isReviewed) ? '2px solid var(--accent-emerald)' : '1px solid #E2E8F0',
        boxShadow: (isClaimed || isCompleted || isReviewed) ? '0 12px 32px rgba(16, 185, 129, 0.15)' : 'var(--shadow-md)',
        position: 'relative',
        overflow: 'hidden'
      }}>

        {/* Top Status Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '1.25rem',
          borderBottom: '1px solid #E2E8F0',
          marginBottom: '1.5rem'
        }}>
          <div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: (isCompleted || isReviewed) ? 'var(--accent-emerald)' : isClaimed ? 'var(--accent-emerald)' : 'var(--primary-amber)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '4px'
            }}>
              {isReviewed ? (
                <>
                  <Award size={16} /> SERVICE COMPLETED & REVIEWED
                </>
              ) : isCompleted ? (
                <>
                  <CheckCircle2 size={16} /> WORK FINISHED BY PRO
                </>
              ) : isClaimed ? (
                <>
                  <CheckCircle2 size={16} /> JOB LOCKED & ACCEPTED
                </>
              ) : isCancelled ? (
                <>
                  <XCircle size={16} /> JOB CANCELLED
                </>
              ) : (
                <>
                  <Sparkles size={16} /> BROADCASTING REAL-TIME REQUEST
                </>
              )}
            </span>

            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {isReviewed
                ? `Job Done • Rating Saved ⭐ ${job.review?.rating}/5`
                : isCompleted
                ? `Service Complete with ${provider?.name}`
                : isClaimed
                ? `Accepted by ${provider?.name}`
                : isCancelled
                ? 'Request has been cancelled'
                : `Searching for nearby ${(job.category || job.role_id || 'SERVICE').toUpperCase()}...`}
            </h3>
          </div>

          {!isClaimed && !isCompleted && !isReviewed && !isCancelled ? (
            <button
              onClick={() => setShowCancelModal(true)}
              style={{
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                background: '#FFF1F2',
                color: 'var(--accent-rose)',
                fontSize: '0.78rem',
                fontWeight: 700,
                border: '1px solid #FECDD3',
                cursor: 'pointer'
              }}
            >
              Cancel Options
            </button>
          ) : isClaimed && !isCompleted && !isReviewed ? (
            <span style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              background: '#ECFDF5',
              color: '#059669',
              fontSize: '0.78rem',
              fontWeight: 800,
              border: '1px solid #A7F3D0',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              🔒 Assigned & En Route
            </span>
          ) : null}

          {(isCompleted || isReviewed) && !showRatingModal && (
            <button
              onClick={() => setShowRatingModal(true)}
              style={{
                padding: '8px 14px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #F59E0B 0%, #FF6B35 100%)',
                color: '#FFFFFF',
                fontSize: '0.82rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Star size={14} fill="#FFF" />
              <span>{isReviewed ? 'Edit Rating' : 'Rate Provider'}</span>
            </button>
          )}
        </div>

        {/* Notice Banner if Pro cancelled previously */}
        {job.cancelReason && !isClaimed && !isCancelled && (
          <div style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 'var(--radius-md)',
            padding: '10px 14px',
            marginBottom: '1.25rem',
            fontSize: '0.82rem',
            color: '#92400E',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={18} style={{ color: '#D97706', flexShrink: 0 }} />
            <div>
              <strong>Dispatch Update:</strong> Previous provider cancelled ({job.cancelReason || 'No reason provided'}). Automatically re-searching for a new replacement pro!
            </div>
          </div>
        )}

        {/* State 1: OPEN (Radar Pulsing Animation) */}
        {!isClaimed && !isCompleted && !isReviewed && !isCancelled && (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
            <div style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              margin: '0 auto 1.5rem auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div className="animate-radar-1" style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.2)',
                border: '1px solid var(--primary-amber)'
              }} />
              <div className="animate-radar-2" style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid var(--primary-amber)'
              }} />

              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #F59E0B 0%, #FF6B35 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: 'var(--shadow-glow)',
                zIndex: 2
              }}>
                <Clock size={28} />
              </div>
            </div>

            <p style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
              Broadcasting your job to online pros...
            </p>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Time waiting: <span style={{ fontWeight: 800, color: 'var(--primary-amber)' }}>{secondsWaiting} seconds</span>
            </p>

            <div style={{
              background: '#F8FAFC',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              textAlign: 'left',
              border: '1px solid #E2E8F0'
            }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                Job Request Details:
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <strong>Issue:</strong> {decodeHTML(job.problem)}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <strong>Location:</strong> {decodeHTML(job.location)}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>Callback Phone:</strong> {job.phone}
              </div>
            </div>
          </div>
        )}

        {/* State 2: CLAIMED / COMPLETED / REVIEWED */}
        {(isClaimed || isCompleted || isReviewed) && provider && (
          <div>
            {/* Provider Spotlight Profile Card */}
            <div style={{
              background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)',
              borderRadius: 'var(--radius-md)',
              padding: '1.25rem',
              border: '1px solid #86EFAC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <img
                  src={provider.avatar}
                  alt={provider.name}
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '3px solid #FFFFFF',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      {provider.name}
                    </h4>
                    {provider.verified && (
                      <span style={{ color: 'var(--accent-emerald)', display: 'flex' }} title="Verified Pro">
                        <ShieldCheck size={18} />
                      </span>
                    )}
                  </div>

                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    {provider.title}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem' }}>
                    <span style={{ background: '#FFFFFF', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700, color: '#D97706', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Star size={13} fill="#F59E0B" color="#F59E0B" /> {provider.rating}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {provider.jobsCompleted} jobs completed
                    </span>
                  </div>
                </div>
              </div>

              {/* Remove Provider Button */}
              {isClaimed && (
                <button
                  onClick={() => (doRemovePro || context.removeProviderFromJob)(job.id || job.job_id)}
                  title="Remove this provider and request a replacement pro"
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: '#FFFFFF',
                    color: 'var(--accent-rose)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    border: '1px solid #FECDD3',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <UserX size={15} />
                  <span>Remove Pro & Re-assign</span>
                </button>
              )}
            </div>

            {/* If completed, prompt user for survey */}
            {(isCompleted || isReviewed) ? (
              <div style={{
                background: '#ECFDF5',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                border: '1.5px solid #10B981',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#065F46' }}>
                      {isReviewed ? '🎉 Thanks for rating!' : '🏁 Job Completed by Pro'}
                    </h4>
                    <p style={{ fontSize: '0.85rem', color: '#047857', marginTop: '2px' }}>
                      {isReviewed ? `You gave ${provider.name} a ${job.review?.rating} star rating.` : 'Please take a quick survey to rate your pro.'}
                    </p>
                  </div>

                  <button
                    onClick={() => setShowRatingModal(true)}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--accent-emerald)',
                      color: '#FFFFFF',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Star size={16} fill="#FFF" />
                    <span>{isReviewed ? 'View Review' : 'Rate & Tip Pro'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Estimated Arrival Banner */
              <div style={{
                background: '#0F172A',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-emerald)'
                  }}>
                    <Navigation size={22} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600 }}>ESTIMATED ARRIVAL</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {provider.etaMinutes} Minutes
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <a
                    href={`tel:${provider.phone}`}
                    style={{
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--accent-emerald)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <Phone size={15} /> Call
                  </a>

                  <button
                    onClick={() => alert(`Direct Messaging initiated with ${provider.name} (${provider.phone})`)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}
                  >
                    <MessageSquare size={15} /> Chat
                  </button>
                </div>
              </div>
            )}

            {/* Timeline Progress */}
            <div style={{ background: '#F8FAFC', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                Job Dispatch Status:
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                {[
                  { title: 'Request Sent', done: true },
                  { title: 'Job Locked', done: true },
                  { title: 'En Route', done: true },
                  { title: 'Job Complete & Rated', done: isCompleted || isReviewed }
                ].map((step, idx) => (
                  <div key={idx} style={{ textAlign: 'center', flex: 1, zIndex: 1 }}>
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: step.done ? 'var(--accent-emerald)' : '#E2E8F0',
                      color: step.done ? '#FFFFFF' : 'var(--text-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 4px auto',
                      fontSize: '0.72rem',
                      fontWeight: 800
                    }}>
                      {step.done ? '✓' : idx + 1}
                    </div>
                    <div style={{ fontSize: '0.72rem', fontWeight: step.done ? 700 : 500, color: step.done ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {step.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
