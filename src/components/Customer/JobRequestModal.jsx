import React, { useState } from 'react';
import { X, MapPin, Phone, AlertTriangle, Zap, CheckCircle2, Upload, Sparkles, Send } from 'lucide-react';
import { sanitizeText, formatPhoneNumber } from '../../utils/sanitizer';
import { useMarketplace } from '../../context/MarketplaceContext';

export const JobRequestModal = ({ category, onClose, onSubmit }) => {
  const { onlineProsByTrade, currentUser } = useMarketplace();
  const [problem, setProblem] = useState(category.popularProblems[0] || '');
  const [customDescription, setCustomDescription] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '+1 (555) 389-4920');
  
  const defaultLoc = currentUser?.city
    ? `${currentUser.city.name}, Israel`
    : '742 Evergreen Terrace, Sector 4';
  const [location, setLocation] = useState(defaultLoc);
  const [urgency, setUrgency] = useState('HIGH');
  const [hasPhoto, setHasPhoto] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Sanitize all text fields to prevent XSS / SQL injection
    const cleanProblem = sanitizeText(problem);
    const cleanCustomDesc = sanitizeText(customDescription);
    const cleanLocation = sanitizeText(location);
    const cleanPhone = formatPhoneNumber(phone) || '+1 (555) 000-0000';

    const finalProblem = cleanCustomDesc ? `${cleanProblem} - ${cleanCustomDesc}` : cleanProblem;

    onSubmit({
      category: category.id,
      problem: finalProblem,
      phone: cleanPhone,
      location: cleanLocation,
      urgency,
      estimatedPayout: urgency === 'URGENT' ? '$160 - $220' : '$120 - $160'
    });
  };

  const handlePhoneChange = (e) => {
    const rawVal = e.target.value;
    setPhone(formatPhoneNumber(rawVal));
  };

  const handleQuickLocate = () => {
    setLocation(`104 Maple Street, Apt 3B, ${currentUser?.city?.name || 'Downtown'}`);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '1rem'
    }}>
      <div className="animate-slide-up" style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid #E2E8F0'
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: category.gradient
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: category.badgeColor,
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Zap size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Request {category.title}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {onlineProsByTrade?.[category.id] || 0} verified pros available in your area
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Preset Problem Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Select Frequent Issue:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {category.popularProblems.map((prob, idx) => (
                <div
                  key={idx}
                  onClick={() => setProblem(prob)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: problem === prob ? `2px solid ${category.badgeColor}` : '1px solid #E2E8F0',
                    background: problem === prob ? '#FEF3C722' : '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: problem === prob ? 700 : 500,
                    color: problem === prob ? 'var(--text-main)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{prob}</span>
                  {problem === prob && <CheckCircle2 size={16} style={{ color: category.badgeColor }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Additional details */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Additional Details (Optional):
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Describe specifics (e.g., brand of lock, panel location)..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #E2E8F0',
                fontSize: '0.85rem',
                color: 'var(--text-main)',
                resize: 'none'
              }}
            />
          </div>

          {/* Location & Phone grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Service Address:
                </label>
                <button
                  type="button"
                  onClick={handleQuickLocate}
                  style={{ fontSize: '0.72rem', color: 'var(--accent-teal)', background: 'none', textDecoration: 'underline', fontWeight: 600 }}
                >
                  GPS Detect
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                <MapPin size={16} style={{ color: 'var(--primary-amber)', marginRight: '6px' }} />
                <input
                  type="text"
                  required
                  maxLength={250}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '0.82rem', fontWeight: 600 }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Callback Phone:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                <Phone size={16} style={{ color: 'var(--accent-emerald)', marginRight: '6px' }} />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="Digits only (e.g. +1 555-0123)"
                  style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '0.82rem', fontWeight: 600 }}
                />
              </div>
            </div>
          </div>

          {/* Urgency Radio Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Urgency Level:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { id: 'URGENT', label: '🚨 Immediate', sub: 'Pro arrives in 15-30m' },
                { id: 'HIGH', label: '⚡ Today', sub: 'Within 2-4 hours' },
                { id: 'FLEXIBLE', label: '📅 Scheduled', sub: 'Flexible timeline' }
              ].map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUrgency(u.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: urgency === u.id ? '2px solid var(--primary-amber)' : '1px solid #E2E8F0',
                    background: urgency === u.id ? '#FEF3C7' : '#F8FAFC',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>{u.label}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{u.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Photo Attachment Demo */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              onClick={() => setHasPhoto(!hasPhoto)}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px dashed #CBD5E1',
                background: hasPhoto ? '#ECFDF5' : '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: hasPhoto ? 'var(--accent-emerald)' : 'var(--text-muted)'
              }}
            >
              <Upload size={16} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                {hasPhoto ? 'Photo Attached (panel_breaker_damaged.jpg)' : 'Click to attach photo of the issue (Demo)'}
              </span>
            </div>
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
                fontSize: '0.9rem'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #F59E0B 0%, #FF6B35 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              <Send size={18} />
              <span>Broadcast Request Now</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
