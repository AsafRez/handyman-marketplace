import React, { useState } from 'react';
import { useMarketplace } from '../context/MarketplaceContext';
import { Wrench, User, LogIn, LogOut, Volume2, VolumeX, RotateCcw, Sparkles, Activity, ShieldAlert, CheckCircle2, Settings, Database as DatabaseIcon } from 'lucide-react';
import { ProfileSettingsModal } from './Auth/ProfileSettingsModal';
import { DatabaseInspectorModal } from './Database/DatabaseInspectorModal';

export const Header = () => {
  const {
    currentUser,
    isAuthenticated,
    logoutUser,
    providersTable,
    adminApproveProvider,
    resetState,
    soundEnabled,
    setSoundEnabled
  } = useMarketplace();

  const [showSettings, setShowSettings] = useState(false);
  const [showDbInspector, setShowDbInspector] = useState(false);

  const pendingProvider = providersTable.find(p => !p.verified);

  return (
    <header style={{
      background: 'rgba(255, 255, 255, 0.96)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid #E2E8F0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: 'max(0.6rem, env(safe-area-inset-top)) 1rem 0.6rem 1rem',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{
        maxWidth: '1350px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        {/* Brand & Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #F59E0B 0%, #FF6B35 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
          }}>
            <Wrench size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <h1 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                Handy<span style={{ color: 'var(--primary-amber)' }}>Hub</span>
              </h1>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                background: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}>
                <Activity size={10} /> SSE Live
              </span>
            </div>
          </div>
        </div>

        {/* Action controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>


          {/* User Profile Badge */}
          {currentUser && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#F1F5F9',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid #E2E8F0'
            }}>
              <div 
                onClick={() => setShowSettings(true)}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer'
                }}
                title="Edit profile settings"
              >
                {currentUser.name.charAt(0)}
              </div>
              <span 
                onClick={() => setShowSettings(true)}
                style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                title="Edit profile settings"
              >
                {currentUser.name.split(' ')[0]}
                <Settings size={11} style={{ color: 'var(--text-muted)' }} />
              </span>
              <button
                onClick={logoutUser}
                title="Log Out to Startup Screen"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#F43F5E',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '2px',
                  cursor: 'pointer',
                  marginLeft: '2px'
                }}
              >
                <LogOut size={14} />
              </button>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute audio' : 'Enable audio'}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: soundEnabled ? '#ECFDF5' : '#F1F5F9',
              color: soundEnabled ? 'var(--accent-emerald)' : 'var(--text-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid #E2E8F0'
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>

          {/* DB Inspector Button */}
          <button
            onClick={() => setShowDbInspector(true)}
            title="Inspect relational database tables"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '10px',
              background: '#EEF2FF',
              color: '#4F46E5',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: '1px solid #C7D2FE',
              cursor: 'pointer'
            }}
          >
            <DatabaseIcon size={14} />
            <span>Inspector</span>
          </button>

          {/* Reset State Button */}
          <button
            onClick={resetState}
            title="Clear all job requests"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '6px 10px',
              borderRadius: '10px',
              background: '#F8FAFC',
              color: 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: 600,
              border: '1px solid #E2E8F0',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={14} />
            <span>Reset Jobs</span>
          </button>
        </div>
      </div>

      {showSettings && (
        <ProfileSettingsModal onClose={() => setShowSettings(false)} />
      )}

      {showDbInspector && (
        <DatabaseInspectorModal onClose={() => setShowDbInspector(false)} />
      )}
    </header>
  );
};
