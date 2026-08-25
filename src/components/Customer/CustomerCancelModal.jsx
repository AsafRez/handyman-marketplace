import React, { useState } from 'react';
import { XCircle, X, RefreshCw, CheckCircle2 } from 'lucide-react';

const CUSTOMER_REASON_PRESETS = [
  '🛠️ Issue fixed by itself / No longer needed',
  '⏰ Need to reschedule / Unavailable now',
  '💰 Found alternate solution',
  '🔄 Remove provider & request replacement pro'
];

export const CustomerCancelModal = ({ job, onConfirmCancel, onRemoveProvider, onClose }) => {
  const [selectedReason, setSelectedReason] = useState(CUSTOMER_REASON_PRESETS[0]);
  const [customReason, setCustomReason] = useState('');

  const handleCancelSubmit = (e) => {
    e.preventDefault();
    const targetJobId = job.job_id || job.id;
    if (selectedReason.includes('Remove provider')) {
      onRemoveProvider(targetJobId);
    } else {
      const finalReason = customReason || selectedReason;
      onConfirmCancel(targetJobId, finalReason);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 350,
      padding: '1rem'
    }}>
      <div className="animate-slide-up" style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '480px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        border: '1.5px solid #F43F5E'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
          padding: '1.25rem 1.5rem',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(244, 63, 94, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F43F5E'
            }}>
              <XCircle size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Cancel Job Request</h3>
              <p style={{ fontSize: '0.75rem', opacity: 0.85 }}>Select why you are cancelling or re-assigning</p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              color: '#FFFFFF',
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleCancelSubmit} style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            Select cancellation reason:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
            {CUSTOMER_REASON_PRESETS.map((preset, idx) => (
              <div
                key={idx}
                onClick={() => setSelectedReason(preset)}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: selectedReason === preset ? '2px solid var(--accent-rose)' : '1px solid #E2E8F0',
                  background: selectedReason === preset ? '#FFF1F2' : '#FFFFFF',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: selectedReason === preset ? 700 : 500,
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>{preset}</span>
                {selectedReason === preset && <CheckCircle2 size={16} style={{ color: 'var(--accent-rose)' }} />}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Other reason (optional):
            </label>
            <input
              type="text"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Provide details..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #E2E8F0',
                fontSize: '0.85rem'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: '#F1F5F9',
                color: 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.88rem'
              }}
            >
              Keep Job Open
            </button>

            <button
              type="submit"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: selectedReason.includes('Remove provider')
                  ? 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)'
                  : 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              {selectedReason.includes('Remove provider') ? <RefreshCw size={16} /> : <XCircle size={16} />}
              <span>{selectedReason.includes('Remove provider') ? 'Remove & Re-assign Pro' : 'Confirm Cancel Job'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
