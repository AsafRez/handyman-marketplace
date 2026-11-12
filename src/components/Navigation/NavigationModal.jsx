import React from 'react';
import { createPortal } from 'react-dom';
import { X, Navigation, MapPin, Compass, ExternalLink } from 'lucide-react';
import { openWaze, openGoogleMaps, openAppleMaps } from '../../utils/navigationHelper';
import { decodeHTML } from '../../utils/sanitizer';

export const NavigationModal = ({
  isOpen,
  onClose,
  targetJob = null,
  coords = null,
  address = ''
}) => {
  if (!isOpen) return null;

  const jobAddress = address || targetJob?.location || (targetJob?.customerCity ? `${targetJob.customerCity.name}` : 'Customer Location');
  const jobCoords = coords || targetJob?.coords || null;
  const jobTitle = targetJob?.problem || targetJob?.description || 'Job Navigation';

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 350,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="animate-slide-up"
        style={{
          background: '#FFFFFF',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '420px',
          overflow: 'hidden',
          boxShadow: '0 20px 45px rgba(0,0,0,0.2)',
          border: '1px solid #E2E8F0',
          color: '#1E293B'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
            padding: '1.2rem 1.5rem',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)'
              }}
            >
              <Navigation size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#60A5FA', letterSpacing: '0.05em' }}>
                START NAVIGATION
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Choose Navigation App
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Destination Info Box */}
        <div style={{ padding: '1.25rem 1.5rem 0.5rem 1.5rem' }}>
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: '12px',
              padding: '12px 14px',
              border: '1px solid #E2E8F0',
              marginBottom: '1.2rem'
            }}
          >
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: '4px', textTransform: 'uppercase' }}>
              DESTINATION ADDRESS
            </div>
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} style={{ color: '#EF4444', flexShrink: 0 }} />
              <span>{decodeHTML(jobAddress)}</span>
            </div>
            {jobTitle && (
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '4px', paddingLeft: '22px' }}>
                {decodeHTML(jobTitle)}
              </div>
            )}
          </div>

          {/* Navigation App Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.25rem' }}>
            {/* Waze Button */}
            <button
              onClick={() => {
                openWaze(jobCoords, jobAddress);
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '14px',
                background: 'linear-gradient(135deg, #33CCFF 0%, #0099FF 100%)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 153, 255, 0.35)',
                transition: 'transform 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>🚗</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>Navigate with Waze</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.9 }}>Live traffic, speed traps & quickest route</div>
                </div>
              </div>
              <ExternalLink size={18} />
            </button>

            {/* Google Maps Button */}
            <button
              onClick={() => {
                openGoogleMaps(jobCoords, jobAddress);
                onClose();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                borderRadius: '14px',
                background: '#FFFFFF',
                color: '#1E293B',
                border: '1.5px solid #E2E8F0',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                transition: 'transform 0.15s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>🗺️</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>Navigate with Google Maps</div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Turn-by-turn navigation & lane guidance</div>
                </div>
              </div>
              <ExternalLink size={18} style={{ color: '#64748B' }} />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '0 1.5rem 1.25rem 1.5rem', textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '10px',
              background: '#F1F5F9',
              border: 'none',
              color: '#64748B',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
