import React, { useState } from 'react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { CategoryPicker } from '../Customer/CategoryPicker';
import { JobRequestModal } from '../Customer/JobRequestModal';
import { JobStatusTracker } from '../Customer/JobStatusTracker';
import { ProviderDashboard } from '../Provider/ProviderDashboard';
import { User, ShieldCheck, Zap, Sparkles, RefreshCw } from 'lucide-react';

export const SplitViewSimulator = () => {
  const {
    currentCustomerJob,
    createJobRequest,
    cancelJobRequest,
    activeProvider
  } = useMarketplace();

  const [selectedCategory, setSelectedCategory] = useState(null);

  return (
    <div>
      {/* Top Simulator Banner info */}
      <div style={{
        background: '#FEF3C7',
        border: '1px solid #FDE68A',
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem 1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Sparkles size={16} style={{ color: '#D97706' }} />
          <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#92400E' }}>
            DUAL SPLIT-SCREEN SIMULATOR: Test real-time broadcast & atomic job claiming live!
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', color: '#B45309', fontWeight: 600 }}>
          💡 Create a job on the Customer side → Watch it trigger on the Provider side!
        </span>
      </div>

      {/* Split Grid Container (Responsive: stacks vertically on small screens) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem',
        alignItems: 'start'
      }}>
        {/* LEFT COLUMN: CUSTOMER APP VIEW */}
        <div style={{
          background: '#F8FAFC',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid #E2E8F0',
          padding: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Panel Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '0.75rem',
            borderBottom: '2px solid #E2E8F0',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#0D9488',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <User size={15} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                CUSTOMER VIEW
              </h3>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#CCFBF1', color: '#0F766E', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              CUSTOMER PERSPECTIVE
            </span>
          </div>

          {/* Customer Content view */}
          {currentCustomerJob ? (
            <JobStatusTracker
              job={currentCustomerJob}
              onCancel={cancelJobRequest}
            />
          ) : (
            <CategoryPicker
              onSelectCategory={(cat) => setSelectedCategory(cat)}
            />
          )}

          {/* Job Request Modal */}
          {selectedCategory && (
            <JobRequestModal
              category={selectedCategory}
              onClose={() => setSelectedCategory(null)}
              onSubmit={(jobData) => {
                createJobRequest(jobData);
                setSelectedCategory(null);
              }}
            />
          )}
        </div>

        {/* RIGHT COLUMN: PROVIDER APP VIEW */}
        <div style={{
          background: '#F8FAFC',
          borderRadius: 'var(--radius-lg)',
          border: '2px solid #E2E8F0',
          padding: '1rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          {/* Panel Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '0.75rem',
            borderBottom: '2px solid #E2E8F0',
            marginBottom: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#6366F1',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldCheck size={15} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                PROVIDER VIEW ({activeProvider.name})
              </h3>
            </div>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, background: '#E0E7FF', color: '#4338CA', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
              PRO DISPATCHER
            </span>
          </div>

          {/* Provider Content */}
          <ProviderDashboard />
        </div>
      </div>
    </div>
  );
};
