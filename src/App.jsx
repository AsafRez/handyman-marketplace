import React from 'react';
import { MarketplaceProvider, useMarketplace } from './context/MarketplaceContext';
import { Header } from './components/Header';
import { CategoryPicker } from './components/Customer/CategoryPicker';
import { JobRequestModal } from './components/Customer/JobRequestModal';
import { JobStatusTracker } from './components/Customer/JobStatusTracker';
import { ProviderDashboard } from './components/Provider/ProviderDashboard';

import { StartupLoginPage } from './components/Auth/StartupLoginPage';
import { ProviderPendingModal } from './components/Auth/ProviderPendingModal';
import { RoleSwitcherBar } from './components/Navigation/RoleSwitcherBar';

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
    currentUser,
    providersTable,
    pendingProviderUser,
    pendingProviderTrade,
    adminApproveProvider
  } = useMarketplace();

  const [selectedCategory, setSelectedCategory] = React.useState(null);

  const isVerifiedProvider = currentUser
    ? providersTable.some(p =>
        (p.user_id === currentUser.user_id || p.user_id?.toLowerCase() === currentUser.user_id?.toLowerCase()) &&
        p.verified === true
      )
    : false;

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
    <div style={{ minHeight: '100vh', background: 'var(--bg-app)', color: 'var(--text-main)', paddingBottom: isVerifiedProvider ? '4.5rem' : '1.5rem' }}>


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
      </main>

      {/* Role Switcher Bar (ONLY visible to verified providers) */}
      <RoleSwitcherBar />

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
