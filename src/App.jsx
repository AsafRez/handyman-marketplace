import React from 'react';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { Header } from './components/Header';
import { CategoryPicker } from './components/Customer/CategoryPicker';
import { JobRequestModal } from './components/Customer/JobRequestModal';
import { JobStatusTracker } from './components/Customer/JobStatusTracker';
import { ProviderDashboard } from './components/Provider/ProviderDashboard';
import { SplitViewSimulator } from './components/DualView/SplitViewSimulator';
import { MobileBottomBar } from './components/Mobile/MobileBottomBar';
import { StartupLoginPage } from './components/Auth/StartupLoginPage';
import { ProviderPendingModal } from './components/Auth/ProviderPendingModal';

export function AppContent() {
  const {
    viewMode,
    currentCustomerJob,
    createJobRequest,
    cancelJobRequest,
    isAuthenticated,
    usersTable,
    handleUserAuthenticate,
    showPendingModal,
    setShowPendingModal,
    pendingProviderUser,
    pendingProviderTrade,
    adminApproveProvider
  } = useMarketplace();

  const [selectedCategory, setSelectedCategory] = React.useState(null);

  // Mandatory Full-Screen Startup Login Page if not authenticated
  if (!isAuthenticated) {
    return (
      <StartupLoginPage
        existingUsers={usersTable}
        onAuthenticate={handleUserAuthenticate}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-main)', paddingBottom: '5rem' }}>


      {/* Main Header */}
      <Header />

      {/* Main View Area */}
      <main style={{ maxWidth: '1350px', margin: '0 auto', padding: '1rem' }}>
        {/* MODE 1: CUSTOMER VIEW */}
        {viewMode === 'CUSTOMER' && (
          <div>
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
        )}

        {/* MODE 2: PROVIDER DISPATCH DASHBOARD */}
        {viewMode === 'PROVIDER' && (
          <ProviderDashboard />
        )}

        {/* MODE 3: DUAL SPLIT-SCREEN SIMULATOR */}
        {viewMode === 'DUAL_SPLIT' && (
          <SplitViewSimulator />
        )}
      </main>

      {/* Touch Mobile Bottom Bar */}
      <MobileBottomBar />

      {/* Provider Verification Pending Modal */}
      {showPendingModal && (
        <ProviderPendingModal
          user={pendingProviderUser}
          trade={pendingProviderTrade}
          onClose={() => setShowPendingModal(false)}
          onAdminApprove={() => adminApproveProvider()}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <MarketplaceProvider>
      <AppContent />
    </MarketplaceProvider>
  );
}
