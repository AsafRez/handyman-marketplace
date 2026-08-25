import React from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { User, ShieldCheck, LayoutGrid, RotateCcw } from 'lucide-react';

export const MobileBottomBar = () => {
  const { viewMode, setViewMode, resetState, currentUser, providersTable } = useMarketplace();

  // Check if current logged in user has an active/approved provider account
  const isProvider = currentUser
    ? providersTable.some(p => p.user_id === currentUser.user_id && p.verified === true)
    : false;

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(16px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)',
      padding: '8px 12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      zIndex: 90,
      color: '#FFFFFF',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.2)'
    }}>
      {/* Customer Tab (Visible to all users) */}
      <button
        onClick={() => setViewMode('CUSTOMER')}
        style={{
          background: 'none',
          border: 'none',
          color: viewMode === 'CUSTOMER' ? '#0D9488' : '#94A3B8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          fontSize: '0.7rem',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        <User size={18} />
        <span>Customer</span>
      </button>

      {/* Provider Tab (ONLY visible if logged-in user is a registered Provider) */}
      {isProvider && (
        <button
          onClick={() => setViewMode('PROVIDER')}
          style={{
            background: 'none',
            border: 'none',
            color: viewMode === 'PROVIDER' ? '#6366F1' : '#94A3B8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '0.7rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <ShieldCheck size={18} />
          <span>Provider</span>
        </button>
      )}

      {/* Dual View Simulator (ONLY visible for providers or unauthenticated demo testing) */}
      {(isProvider || !currentUser) && (
        <button
          onClick={() => setViewMode('DUAL_SPLIT')}
          style={{
            background: 'none',
            border: 'none',
            color: viewMode === 'DUAL_SPLIT' ? '#F59E0B' : '#94A3B8',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '2px',
            fontSize: '0.7rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <LayoutGrid size={18} />
          <span>Dual View</span>
        </button>
      )}

      {/* Reset Demo State */}
      <button
        onClick={resetState}
        style={{
          background: 'none',
          border: 'none',
          color: '#94A3B8',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          fontSize: '0.7rem',
          fontWeight: 700,
          cursor: 'pointer'
        }}
      >
        <RotateCcw size={18} />
        <span>Reset</span>
      </button>
    </div>
  );
};
