import React, { useState, useEffect } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Bell, MapPin, DollarSign, Clock, Check, X, ShieldAlert, AlertCircle, Sparkles } from 'lucide-react';
import { decodeHTML } from '../../utils/sanitizer';
import { resolveCoordinates } from '../../db/database';

export const IncomingJobAlert = ({ job, onClose }) => {
  const { activeProvider, currentUser, cities, regions, claimJob, providerLiveCoords, calculateDistanceKm } = useMarketplace();
  const [timeLeft, setTimeLeft] = useState(30);
  const [claimResult, setClaimResult] = useState(null); // null | { success: true } | { success: false, claimedBy }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onClose]);

  // Sync if job status changed externally
  useEffect(() => {
    if (job && job.status === 'CLAIMED' && job.claimedBy?.id !== activeProvider.id && !claimResult) {
      setClaimResult({ success: false, reason: 'CLAIMED_BY_OTHER', claimedBy: job.claimedBy });
    }
  }, [job, activeProvider, claimResult]);

  if (!job) return null;

  const handleAccept = async () => {
    const res = await claimJob(job.id, activeProvider);
    setClaimResult(res);
    if (res && res.success) {
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  // Calculate accurate live distance in KM
  const providerCoords = providerLiveCoords || resolveCoordinates(
    {
      city_id: currentUser?.city_id || activeProvider?.city_id,
      region_id: activeProvider?.preferred_region_id || currentUser?.region_id || activeProvider?.region_id
    },
    cities,
    regions
  );
  const jobCoords = resolveCoordinates(job, cities, regions, providerCoords);
  const distanceKm = calculateDistanceKm(providerCoords.lat, providerCoords.lng, jobCoords.lat, jobCoords.lng);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 300,
      padding: '1rem'
    }}>
      <div className="animate-slide-up animate-alert-pulse" style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '520px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        border: '2px solid var(--primary-amber)'
      }}>
        {/* Top Glowing Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          padding: '1.25rem 1.5rem',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #F59E0B 0%, #FF6B35 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: 'var(--shadow-glow)'
            }}>
              <Bell size={22} className="animate-float" />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#F59E0B', letterSpacing: '0.05em' }}>
                ⚡ NEW INCOMING JOB DISPATCH
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF' }}>
                {job.category.toUpperCase()} REQUEST
              </h3>
            </div>
          </div>

          {/* Countdown badge */}
          <div style={{
            background: 'rgba(245, 158, 11, 0.2)',
            border: '1px solid #F59E0B',
            color: '#F59E0B',
            borderRadius: 'var(--radius-full)',
            padding: '4px 12px',
            fontSize: '0.82rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            <Clock size={14} /> {timeLeft}s
          </div>
        </div>

        {/* Content Body */}
        <div style={{ padding: '1.5rem' }}>
          {/* Claim Status Overlay Banner */}
          {claimResult && (
            <div style={{
              padding: '1.25rem',
              borderRadius: 'var(--radius-md)',
              background: claimResult.success ? '#ECFDF5' : '#FFF1F2',
              border: claimResult.success ? '1.5px solid #10B981' : '1.5px solid #F43F5E',
              marginBottom: '1.25rem',
              textAlign: 'center'
            }}>
              {claimResult.success ? (
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-emerald)', marginBottom: '4px' }}>
                    🎉 Job Successfully Locked & Claimed!
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Customer has been notified. Address: <strong>{decodeHTML(job.location)}</strong>
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--accent-rose)', marginBottom: '4px' }}>
                    ⏱️ Job No Longer Available
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Already locked by another pro ({claimResult.claimedBy?.name || 'Another Specialist'}).
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Payout & Distance Stats Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1.25rem',
            background: '#F8FAFC',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #E2E8F0'
          }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                ESTIMATED PAYOUT
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>
                {job.estimatedPayout || '$140 - $180'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                DISTANCE / LOCATION
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                <MapPin size={16} style={{ color: 'var(--primary-amber)' }} />
                {distanceKm} km away
              </div>
            </div>
          </div>

          {/* Problem description box */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '4px' }}>
              CUSTOMER ISSUE:
            </div>
            <div style={{
              fontSize: '0.92rem',
              fontWeight: 600,
              color: 'var(--text-main)',
              background: '#FFFBEB',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid #FDE68A'
            }}>
              "{decodeHTML(job.problem)}"
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MapPin size={14} /> <strong>Address:</strong> {decodeHTML(job.location)}
          </div>

          {/* Action buttons */}
          {!claimResult && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: '#F1F5F9',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}
              >
                Decline
              </button>

              <button
                onClick={handleAccept}
                style={{
                  flex: 2,
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)'
                }}
              >
                <Check size={20} />
                <span>ACCEPT JOB (Lock in)</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
