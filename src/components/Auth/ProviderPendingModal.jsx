import React from 'react';
import { Clock, ShieldAlert, UserCheck, CheckCircle2, ArrowRight, Sparkles, X } from 'lucide-react';

export const ProviderPendingModal = ({ user, trade, onClose, onAdminApprove }) => {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 500,
      padding: '1rem'
    }}>
      <div className="animate-slide-up" style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '500px',
        padding: '2rem',
        boxShadow: 'var(--shadow-lg)',
        border: '2px solid #FDE68A',
        textAlign: 'center',
        position: 'relative'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: '#F1F5F9',
            border: 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={16} />
        </button>

        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          background: '#FEF3C7',
          color: '#D97706',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem auto',
          boxShadow: '0 8px 20px rgba(245, 158, 11, 0.25)'
        }}>
          <Clock size={32} />
        </div>

        <span style={{
          fontSize: '0.72rem',
          fontWeight: 800,
          padding: '3px 10px',
          borderRadius: 'var(--radius-full)',
          background: '#FEF3C7',
          color: '#D97706',
          border: '1px solid #FDE68A'
        }}>
          APPLICATION UNDER REVIEW ⏳
        </span>

        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.75rem', marginBottom: '0.5rem' }}>
          Your Provider Information is Being Checked
        </h3>

        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
          Welcome, <strong>{user?.name}</strong>! Your application for <strong>{trade?.toUpperCase()} PRO</strong> status is currently being verified by HandyHub Trust & Safety.
        </p>

        <div style={{
          background: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          textAlign: 'left',
          marginBottom: '1.5rem',
          fontSize: '0.82rem',
          color: '#065F46'
        }}>
          <div style={{ fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={16} style={{ color: '#059669' }} />
            <span>Customer Privileges Active</span>
          </div>
          <div>
            While your provider credentials are being reviewed by our team, you can freely post job requests and hire local pros as a <strong>Customer</strong>!
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)'
            }}
          >
            <span>Continue in Customer Mode</span>
            <ArrowRight size={16} />
          </button>

          {/* Demo Admin 1-Click Approval */}
          <button
            onClick={onAdminApprove}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              background: '#EEF2FF',
              color: '#4F46E5',
              fontWeight: 800,
              fontSize: '0.82rem',
              border: '1px solid #C7D2FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Sparkles size={15} />
            <span>👑 Admin Demo: Click to Approve Provider Account Now</span>
          </button>
        </div>
      </div>
    </div>
  );
};
