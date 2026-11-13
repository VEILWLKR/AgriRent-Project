import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Marketplace } from './components/Marketplace';
import { FarmerDashboard } from './components/FarmerDashboard';
import { OwnerDashboard } from './components/OwnerDashboard';
import { BookingFlow } from './components/BookingFlow';
import { AuthModal } from './components/AuthModal';
import { AddEquipmentModal } from './components/AddEquipmentModal';
import { SettingsView } from './components/SettingsView';
import { FarmManagement } from './components/FarmManagement';
import { FleetManagement } from './components/FleetManagement';
import { OwnerAnalytics } from './components/OwnerAnalytics';
import { OwnerEarnings } from './components/OwnerEarnings';
import { OnboardingDialog } from './components/OnboardingDialog';
import { AdminPortal } from './components/AdminPortal';
import { Equipment, Booking, RentalRequest, User, EquipmentCategory } from './types';
import { ApiService } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>(window.location.pathname.startsWith('/admin') ? 'admin' : 'landing');
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rentalRequests, setRentalRequests] = useState<RentalRequest[]>([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [appError, setAppError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    ApiService.load()
      .then(data => {
        if (!active) return;
        setCurrentUser(data.user);
        const isAdminPath = window.location.pathname.startsWith('/admin');
        setCurrentView(isAdminPath ? 'admin' : data.user ? (data.user.role === 'owner' ? 'owner-dashboard' : 'farmer-dashboard') : 'landing');
        setEquipmentList(data.equipment);
        setBookings(data.bookings);
        setRentalRequests(data.rentalRequests);
      })
      .catch(error => {
        if (active) setAppError(error instanceof Error ? error.message : 'Could not connect to the AgriRent API.');
      })
      .finally(() => {
        if (active) setIsBootstrapping(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Modals & Navigation state
  const [bookingEquipment, setBookingEquipment] = useState<Equipment | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalInitialRole, setAuthModalInitialRole] = useState<'farmer' | 'owner'>('farmer');
  const [addEquipmentModalOpen, setAddEquipmentModalOpen] = useState<boolean>(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [marketplaceInitialCategory, setMarketplaceInitialCategory] = useState<EquipmentCategory | undefined>(undefined);
  const [marketplaceInitialLocation, setMarketplaceInitialLocation] = useState<string | undefined>(undefined);
  const [marketplaceInitialQuery, setMarketplaceInitialQuery] = useState<string | undefined>(undefined);
  const [marketplaceShowSaved, setMarketplaceShowSaved] = useState<boolean>(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  // Guard against logged-in user visiting 'landing'
  const handleNavigate = (view: string) => {
    if (currentUser !== null && view === 'landing') {
      setCurrentView(currentUser.role === 'owner' ? 'owner-dashboard' : 'farmer-dashboard');
    } else {
      setCurrentView(view);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reportError = (error: unknown) => {
    setAppError(error instanceof Error ? error.message : 'The request could not be completed.');
  };

  const handleLogout = async () => {
    try {
      await ApiService.logout();
      setCurrentUser(null);
      setCurrentView('landing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      reportError(error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await ApiService.deleteAccount();
      setCurrentUser(null);
      setBookings([]);
      setCurrentView('landing');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      reportError(error);
    }
  };

  const handleToggleFavorite = async (equipmentId: string) => {
    if (!currentUser) {
      setAuthModalInitialRole('farmer');
      setAuthModalOpen(true);
      return;
    }

    const currentSaved = currentUser.savedEquipmentIds || [];
    const nextSaved = currentSaved.includes(equipmentId)
      ? currentSaved.filter(id => id !== equipmentId)
      : [...currentSaved, equipmentId];

    const updatedUser: User = {
      ...currentUser,
      savedEquipmentIds: nextSaved,
    };

    try {
      setCurrentUser(await ApiService.updateProfile(updatedUser));
    } catch (error) {
      reportError(error);
    }
  };

  const handleSwitchUserRole = async (role: 'farmer' | 'owner') => {
    if (!currentUser) return;
    const updatedUser: User = {
      ...currentUser,
      role,
    };
    try {
      setCurrentUser(await ApiService.updateProfile(updatedUser));
      setCurrentView(role === 'owner' ? 'owner-dashboard' : 'farmer-dashboard');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      reportError(error);
    }
  };

  const handleUpdateUser = async (updated: User) => {
    const saved = await ApiService.updateProfile(updated);
    setCurrentUser(saved);
    return saved;
  };

  const handleAuthSuccess = async (user: User, isNewAccount = false) => {
    try {
      const data = await ApiService.load();
      setEquipmentList(data.equipment);
      setBookings(data.bookings);
      setRentalRequests(data.rentalRequests);
      const authenticatedUser = data.user || user;
      setCurrentUser(authenticatedUser);
      setCurrentView((data.user || user).role === 'owner' ? 'owner-dashboard' : 'farmer-dashboard');
      setOnboardingOpen(isNewAccount && !authenticatedUser.onboardingCompleted);
      setAuthModalOpen(false);
    } catch (error) {
      reportError(error);
    }
  };

  // Category select from landing page
  const handleSelectCategory = (category: EquipmentCategory) => {
    setMarketplaceInitialCategory(category);
    setMarketplaceShowSaved(false);
    setMarketplaceInitialQuery(undefined);
    handleNavigate('marketplace');
  };

  // Direct Booking Trigger
  const handleSelectEquipmentForBooking = (equipment: Equipment) => {
    if (!currentUser) {
      setAuthModalInitialRole('farmer');
      setAuthModalOpen(true);
      return;
    }
    setBookingEquipment(equipment);
  };

  // Add Confirmed Booking into state
  const handleBookingConfirmed = async (newBooking: Booking) => {
    setBookings(prev => [newBooking, ...prev]);
    try {
      const data = await ApiService.load();
      setRentalRequests(data.rentalRequests);
    } catch (error) {
      reportError(error);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const updated = await ApiService.updateRequest(requestId, 'accepted');
      setRentalRequests(prev => prev.map(request => request.id === requestId ? updated : request));
      const data = await ApiService.load();
      setBookings(data.bookings);
    } catch (error) {
      reportError(error);
      throw error;
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const updated = await ApiService.updateRequest(requestId, 'declined');
      setRentalRequests(prev => prev.map(request => request.id === requestId ? updated : request));
      const data = await ApiService.load();
      setBookings(data.bookings);
    } catch (error) {
      reportError(error);
      throw error;
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      const updated = await ApiService.completeBooking(bookingId);
      setBookings(prev => prev.map(booking => booking.id === bookingId ? updated : booking));
    } catch (error) {
      reportError(error);
      throw error;
    }
  };

  const handleRateBooking = async (bookingId: string, rating: number, review: string) => {
    try {
      const result = await ApiService.rateBooking(bookingId, rating, review);
      setBookings(prev => prev.map(booking => booking.id === bookingId ? result.booking : booking));
      setEquipmentList(prev => prev.map(equipment => equipment.id === result.equipment.id ? result.equipment : equipment));
    } catch (error) {
      reportError(error);
      throw error;
    }
  };

  const handleToggleEquipmentStatus = async (equipmentId: string) => {
    const item = equipmentList.find(e => e.id === equipmentId);
    if (!item) return;
    const nextStatus = item.availability === 'Available' 
      ? 'Active rental' 
      : item.availability === 'Active rental' 
      ? 'Maintenance' 
      : 'Available';
    try {
      const updated = await ApiService.updateEquipmentStatus(equipmentId, nextStatus);
      setEquipmentList(prev => prev.map(equipment => equipment.id === equipmentId ? updated : equipment));
    } catch (error) {
      reportError(error);
      throw error;
    }
  };

  const handleAddNewEquipment = async (newEquip: Equipment) => {
    try {
      const created = await ApiService.createEquipment(newEquip);
      setEquipmentList(prev => [created, ...prev]);
    } catch (error) {
      reportError(error);
      throw error;
    }
  };

  const handleSaveEquipment = async (equipment: Equipment) => {
    if (editingEquipment) {
      const updated = await ApiService.updateEquipment(equipment);
      setEquipmentList(prev => prev.map(item => item.id === updated.id ? updated : item));
    } else {
      await handleAddNewEquipment(equipment);
    }
    setEditingEquipment(null);
    setAddEquipmentModalOpen(false);
  };

  if (isBootstrapping) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-[#174D35]">Connecting to AgriRent…</div>;
  }

  return (
    <div className="min-h-screen bg-[#F7F8F4] flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      {appError && (
        <div role="alert" className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] max-w-[90vw] rounded-lg bg-red-700 px-4 py-3 text-sm text-white shadow-lg">
          <div className="flex items-center gap-3">
            <span>{appError}</span>
            <button type="button" className="font-bold" onClick={() => setAppError(null)} aria-label="Dismiss error">×</button>
          </div>
        </div>
      )}
      {/* Top Bar Navigation: STRICTLY REMOVED AFTER SIGN-IN AS REQUESTED */}
      {!currentUser && currentView !== 'admin' && (
        <Navbar
          currentView={currentView}
          onNavigate={handleNavigate}
          currentUser={currentUser}
          onSwitchUserRole={handleSwitchUserRole}
          onOpenAuth={() => {
            setAuthModalInitialRole('farmer');
            setAuthModalOpen(true);
          }}
          onLogout={handleLogout}
          bookingCount={bookings.length}
        />
      )}

      {/* Screen Views */}
      <main className="flex-1">
        {currentView === 'admin' && <AdminPortal />}

        {/* Landing Page: ONLY visible when user is NOT logged in */}
        {currentView === 'landing' && currentUser === null && (
          <LandingPage
            equipmentList={equipmentList}
            onSelectCategory={handleSelectCategory}
            onSelectEquipmentForBooking={handleSelectEquipmentForBooking}
            onNavigateToMarketplace={(params) => {
              if (params?.category) {
                setMarketplaceInitialCategory(params.category as EquipmentCategory);
              }
              if (params?.location) {
                setMarketplaceInitialLocation(params.location);
              }
              setMarketplaceInitialQuery(params?.query || undefined);
              setMarketplaceShowSaved(false);
              handleNavigate('marketplace');
            }}
            onOpenAddEquipment={() => {
              setAuthModalInitialRole('owner');
              setAuthModalOpen(true);
            }}
          />
        )}

        {/* Marketplace: Accessible to all */}
        {currentView === 'marketplace' && (
          <Marketplace
            equipmentList={equipmentList}
            onSelectEquipmentForBooking={handleSelectEquipmentForBooking}
            initialCategory={marketplaceInitialCategory}
            initialQuery={marketplaceInitialQuery}
            currentUser={currentUser}
            userLocation={marketplaceInitialLocation || currentUser?.location || currentUser?.state || ''}
            savedEquipmentIds={currentUser?.savedEquipmentIds || []}
            onToggleFavorite={handleToggleFavorite}
            initialShowSaved={marketplaceShowSaved}
            onNavigateToDashboard={currentUser ? () => {
              handleNavigate(currentUser.role === 'owner' ? 'owner-dashboard' : 'farmer-dashboard');
            } : undefined}
          />
        )}

        {/* Farmer Dashboard: Accessible to logged-in user */}
        {currentView === 'farmer-dashboard' && currentUser !== null && (
          <FarmerDashboard
            currentUser={currentUser}
            bookings={bookings}
            equipmentList={equipmentList}
            onNavigateToMarketplace={(cat, showSaved, query) => {
              if (cat) {
                setMarketplaceInitialCategory(cat as EquipmentCategory);
              }
              setMarketplaceShowSaved(!!showSaved);
              setMarketplaceInitialQuery(query || undefined);
              handleNavigate('marketplace');
            }}
            onSelectEquipmentForBooking={handleSelectEquipmentForBooking}
            onNavigateToSettings={() => handleNavigate('settings')}
            onNavigateToFarmManagement={() => handleNavigate('farm-management')}
            onSwitchRole={handleSwitchUserRole}
            onLogout={handleLogout}
            savedEquipmentIds={currentUser.savedEquipmentIds || []}
            onToggleFavorite={handleToggleFavorite}
            onCompleteBooking={handleCompleteBooking}
            onRateBooking={handleRateBooking}
          />
        )}

        {/* Owner Dashboard: Accessible to logged-in user */}
        {currentView === 'owner-dashboard' && currentUser !== null && (
          <OwnerDashboard
            currentUser={currentUser}
            fleetList={equipmentList.filter(equipment => equipment.ownerName === currentUser.name)}
            rentalRequests={rentalRequests}
            onAcceptRequest={handleAcceptRequest}
            onDeclineRequest={handleDeclineRequest}
            onToggleEquipmentStatus={handleToggleEquipmentStatus}
            onOpenAddEquipmentModal={() => {
              setEditingEquipment(null);
              setAddEquipmentModalOpen(true);
            }}
            onEditEquipment={equipment => {
              setEditingEquipment(equipment);
              setAddEquipmentModalOpen(true);
            }}
            onNavigateToFleetManagement={() => handleNavigate('fleet-management')}
            onNavigateToAnalytics={() => handleNavigate('owner-analytics')}
            onNavigateToEarnings={() => handleNavigate('owner-earnings')}
            onNavigateToSettings={() => handleNavigate('settings')}
            onSwitchRole={handleSwitchUserRole}
            onLogout={handleLogout}
          />
        )}

        {currentView === 'farm-management' && currentUser !== null && currentUser.role === 'farmer' && (
          <FarmManagement
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onNavigateToDashboard={() => handleNavigate('farmer-dashboard')}
          />
        )}

        {currentView === 'fleet-management' && currentUser !== null && currentUser.role === 'owner' && (
          <FleetManagement
            currentUser={currentUser}
            fleetList={equipmentList.filter(equipment => equipment.ownerName === currentUser.name)}
            onOpenAddEquipmentModal={() => {
              setEditingEquipment(null);
              setAddEquipmentModalOpen(true);
            }}
            onEditEquipment={equipment => {
              setEditingEquipment(equipment);
              setAddEquipmentModalOpen(true);
            }}
            onToggleEquipmentStatus={handleToggleEquipmentStatus}
            onNavigateToDashboard={() => handleNavigate('owner-dashboard')}
          />
        )}

        {currentView === 'owner-analytics' && currentUser !== null && currentUser.role === 'owner' && (
          <OwnerAnalytics
            currentUser={currentUser}
            fleetList={equipmentList.filter(equipment => equipment.ownerName === currentUser.name)}
            rentalRequests={rentalRequests}
            onNavigateToDashboard={() => handleNavigate('owner-dashboard')}
          />
        )}

        {currentView === 'owner-earnings' && currentUser !== null && currentUser.role === 'owner' && (
          <OwnerEarnings
            currentUser={currentUser}
            fleetList={equipmentList.filter(equipment => equipment.ownerName === currentUser.name)}
            rentalRequests={rentalRequests}
            onNavigateToDashboard={() => handleNavigate('owner-dashboard')}
          />
        )}

        {/* Settings View: Accessible to logged-in user */}
        {currentView === 'settings' && currentUser !== null && (
          <SettingsView
            currentUser={currentUser}
            onUpdateUser={handleUpdateUser}
            onChangePassword={ApiService.changePassword}
            onLogout={handleLogout}
            onDeleteAccount={handleDeleteAccount}
            registeredFleetUnits={equipmentList.filter(equipment => equipment.ownerName === currentUser.name).reduce((total, equipment) => total + (equipment.quantityInStock || 1), 0)}
            onNavigateToDashboard={() => {
              handleNavigate(currentUser.role === 'owner' ? 'owner-dashboard' : 'farmer-dashboard');
            }}
          />
        )}
      </main>

      {/* Booking Checkout Flow Modal */}
      {bookingEquipment && (
        <BookingFlow
          equipment={bookingEquipment}
          currentUser={currentUser!}
          onClose={() => setBookingEquipment(null)}
          onBookingConfirmed={handleBookingConfirmed}
          onViewMyBookings={() => {
            setBookingEquipment(null);
            handleNavigate(currentUser?.role === 'owner' ? 'owner-dashboard' : 'farmer-dashboard');
          }}
        />
      )}

      {/* Auth Modal (Farmer / Owner Signup & Login) */}
      {authModalOpen && (
        <AuthModal
          onClose={() => setAuthModalOpen(false)}
          onLoginSuccess={(user, isNewAccount) => { void handleAuthSuccess(user, isNewAccount); }}
          initialRole={authModalInitialRole}
        />
      )}

      {onboardingOpen && currentUser && (
        <OnboardingDialog
          currentUser={currentUser}
          onComplete={async updatedUser => {
            await handleUpdateUser(updatedUser);
            setOnboardingOpen(false);
          }}
        />
      )}

      {/* Add Equipment Modal */}
      {addEquipmentModalOpen && (
        <AddEquipmentModal
          onClose={() => {
            setAddEquipmentModalOpen(false);
            setEditingEquipment(null);
          }}
          onAddEquipment={handleSaveEquipment}
          ownerName={currentUser?.name || ''}
          initialEquipment={editingEquipment}
        />
      )}
    </div>
  );
}
