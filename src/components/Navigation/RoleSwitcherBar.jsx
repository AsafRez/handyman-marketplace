import React from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { User, ShieldCheck, Lock } from 'lucide-react';

export const RoleSwitcherBar = () => {
  const {
    viewMode,
    setViewMode,
    currentUser,
    providersTable,
    currentCustomerJob
  } = useMarketplace();

  // Check if current user is an approved/verified provider
  const isVerifiedProvider = currentUser
    ? providersTable.some(p =>
        (p.user_id === currentUser.user_id || p.user_id?.toLowerCase() === currentUser.user_id?.toLowerCase()) &&
        p.verified === true
      )
    : false;

  if (!isVerifiedProvider) return null;

  const hasActiveCustomerJob = currentCustomerJob && ['open', 'claimed'].includes((currentCustomerJob.status || '').toLowerCase());

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(15, 23, 42, 0.95)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        padding: '8px 24px max(8px, env(safe-area-inset-bottom))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        zIndex: 90,
        color: '#FFFFFF',
        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.25)'
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(30, 41, 59, 0.8)',
        borderRadius: '16px',
        padding: '4px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        maxWidth: '360px',
        width: '100%',
        justifyContent: 'space-between'
      }}>
        {/* Customer Tab */}
        <button
          onClick={() => setViewMode('CUSTOMER')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '12px',
            border: 'none',
            background: viewMode === 'CUSTOMER' ? '#0D9488' : 'transparent',
            color: viewMode === 'CUSTOMER' ? '#FFFFFF' : '#94A3B8',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: viewMode === 'CUSTOMER' ? '0 2px 8px rgba(13, 148, 136, 0.4)' : 'none'
          }}
        >
          <User size={17} />
          <span>Customer</span>
        </button>

        {/* Provider Tab */}
        <button
          onClick={() => setViewMode('PROVIDER')}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '12px',
            border: 'none',
            background: viewMode === 'PROVIDER' ? '#6366F1' : 'transparent',
            color: viewMode === 'PROVIDER' ? '#FFFFFF' : '#94A3B8',
            fontSize: '0.82rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: viewMode === 'PROVIDER' ? '0 2px 8px rgba(99, 102, 241, 0.4)' : 'none'
          }}
        >
          <ShieldCheck size={17} />
          <span>Provider</span>
        </button>
      </div>
    </div>
  );
};
