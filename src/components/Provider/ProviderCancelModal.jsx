import React, { useState } from 'react';
import { AlertTriangle, X, Send, ShieldAlert, CheckCircle2 } from 'lucide-react';

const REASON_PRESETS = [
  '🚗 Vehicle or transport trouble',
  '⏰ Unforeseen schedule conflict',
  '🛠️ Required tools or parts not available',
  '🚨 Personal emergency / illness'
];

export const ProviderCancelModal = ({ job, onConfirmCancel, onClose }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [keepNull, setKeepNull] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    let finalReason = null;

    if (!keepNull) {
      finalReason = customReason || selectedReason || null;
    }

    onConfirmCancel(job.id, finalReason);
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
          background: 'linear-gradient(135deg, #881337 0%, #9F1239 100%)',
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
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Cancel Job Assignment</h3>
              <p style={{ fontSize: '0.75rem', opacity: 0.85 }}>Re-open job for other nearby pros</p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
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
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Please select a reason for cancelling job <strong>#{job.id}</strong> (optional):
          </p>

          {/* Preset Reason Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
            {REASON_PRESETS.map((preset, idx) => (
              <div
                key={idx}
                onClick={() => {
                  setSelectedReason(preset);
                  setKeepNull(false);
                }}
                style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: (!keepNull && selectedReason === preset) ? '2px solid #F43F5E' : '1px solid #E2E8F0',
                  background: (!keepNull && selectedReason === preset) ? '#FFF1F2' : '#FFFFFF',
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
                {!keepNull && selectedReason === preset && <CheckCircle2 size={16} style={{ color: '#F43F5E' }} />}
              </div>
            ))}
          </div>

          {/* Custom Reason Text */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
              Or type custom reason:
            </label>
            <input
              type="text"
              disabled={keepNull}
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="e.g., Traffic delay or wrong location..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #E2E8F0',
                fontSize: '0.85rem',
                opacity: keepNull ? 0.5 : 1
              }}
            />
          </div>

          {/* Option to leave reason null */}
          <div
            onClick={() => setKeepNull(!keepNull)}
            style={{
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: keepNull ? '#F1F5F9' : '#FFFFFF',
              border: keepNull ? '2px solid #64748B' : '1px solid #E2E8F0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '1.5rem'
            }}
          >
            <input type="checkbox" checked={keepNull} onChange={() => {}} style={{ cursor: 'pointer' }} />
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Leave cancellation reason blank (save as null)
            </span>
          </div>

          {/* Action Buttons */}
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
              Back
            </button>

            <button
              type="submit"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <AlertTriangle size={16} />
              <span>Confirm Cancellation</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
