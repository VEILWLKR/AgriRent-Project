import React, { useState } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  User as UserIcon, 
  ChevronDown, 
  Menu, 
  X, 
  PlusCircle, 
  CheckCircle2,
  LogOut,
  Tractor,
  Settings,
} from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  currentUser: User | null;
  onSwitchUserRole?: (role: 'farmer' | 'owner') => void;
  onOpenAuth: () => void;
  onLogout?: () => void;
  bookingCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  onSwitchUserRole,
  onOpenAuth,
  onLogout,
  bookingCount,
}) => {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLoggedIn = currentUser !== null;

  const handleBrandClick = () => {
    if (!isLoggedIn) {
      onNavigate('landing');
    } else {
      onNavigate(currentUser.role === 'owner' ? 'owner-dashboard' : 'farmer-dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#DCE9DE] agri-card-shadow">
      {/* Showcase information */}
      <div className="bg-[#103B2A] text-white text-[11px] py-1.5 px-3 sm:px-8 flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-2 truncate">
          <ShieldCheck className="w-3.5 h-3.5 text-[#E6A23C] shrink-0" />
          <span className="font-medium tracking-wide truncate">
            Showcase app &middot; Payments and escrow are not connected
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-4 shrink-0">
          <div className="flex items-center gap-1 text-[#DCE9DE]">
            <MapPin className="w-3.5 h-3.5 text-[#E6A23C]" />
            <span>Serving Nigeria Nationwide &middot; 36 States &amp; FCT</span>
          </div>
          {isLoggedIn && (
            <div className="flex items-center gap-2 border-l border-white/20 pl-3">
              <span className="text-white/70">Role:</span>
              <span className="font-semibold text-white capitalize">{currentUser.role}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4 md:gap-8">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={handleBrandClick}
            className="min-h-[44px] flex items-center gap-2 text-left group focus:outline-none"
            aria-label="AgriRent Home"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[10px] bg-[#174D35] flex items-center justify-center text-white shadow-sm group-hover:bg-[#103B2A] transition-colors shrink-0">
              <Tractor className="w-5 h-5 text-[#E6A23C]" />
            </div>
            <div>
              <span className="text-lg sm:text-xl font-bold tracking-tight text-[#103B2A] block leading-tight">
                AgriRent
              </span>
              <span className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold text-[#174D35]/80 block">
                Nigeria Machinery Rental
              </span>
            </div>
          </button>
        </div>

        {/* Navigation Links (NO Home link when user is logged in!) */}
        <nav className="hidden lg:flex items-center gap-5 text-sm font-medium text-[#202820]/80">
          {!isLoggedIn ? (
            <>
              <button
                onClick={() => onNavigate('landing')}
                className={`whitespace-nowrap transition-colors hover:text-[#174D35] ${
                  currentView === 'landing' ? 'text-[#174D35] font-semibold border-b-2 border-[#174D35] pb-1' : ''
                }`}
              >
                Home
              </button>
              <button
                onClick={() => onNavigate('marketplace')}
                className={`whitespace-nowrap transition-colors hover:text-[#174D35] ${
                  currentView === 'marketplace' ? 'text-[#174D35] font-semibold border-b-2 border-[#174D35] pb-1' : ''
                }`}
              >
                Equipment Marketplace
              </button>
            </>
          ) : (
            <>
              {/* Logged in views: strictly NO Home link! */}
              {currentUser.role === 'farmer' ? (
                <>
                  <button
                    onClick={() => onNavigate('farmer-dashboard')}
                    className={`whitespace-nowrap transition-colors hover:text-[#174D35] flex items-center gap-1.5 ${
                      currentView === 'farmer-dashboard' ? 'text-[#174D35] font-semibold border-b-2 border-[#174D35] pb-1' : ''
                    }`}
                  >
                    <span>Dashboard</span>
                  </button>

                  <button
                    onClick={() => onNavigate('marketplace')}
                    className={`whitespace-nowrap transition-colors hover:text-[#174D35] ${
                      currentView === 'marketplace' ? 'text-[#174D35] font-semibold border-b-2 border-[#174D35] pb-1' : ''
                    }`}
                  >
                    Marketplace
                  </button>

                  <button
                    onClick={() => onNavigate('farmer-dashboard')}
                    className="whitespace-nowrap transition-colors hover:text-[#174D35] flex items-center gap-1.5"
                  >
                    <span>My Bookings</span>
                    {bookingCount > 0 && (
                      <span className="text-[11px] font-mono px-1.5 py-0.2 bg-[#DCE9DE] text-[#103B2A] rounded-full font-bold">
                        {bookingCount}
                      </span>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => onNavigate('owner-dashboard')}
                    className={`whitespace-nowrap transition-colors hover:text-[#174D35] flex items-center gap-1.5 ${
                      currentView === 'owner-dashboard' ? 'text-[#174D35] font-semibold border-b-2 border-[#174D35] pb-1' : ''
                    }`}
                  >
                    <span>Owner Dashboard</span>
                  </button>

                  <button
                    onClick={() => onNavigate('owner-dashboard')}
                    className="whitespace-nowrap transition-colors hover:text-[#174D35]"
                  >
                    Fleet &amp; Equipment
                  </button>

                  <button
                    onClick={() => onNavigate('marketplace')}
                    className="whitespace-nowrap transition-colors hover:text-[#174D35]"
                  >
                    Marketplace Rates
                  </button>
                </>
              )}

              <button
                onClick={() => onNavigate('settings')}
                className={`whitespace-nowrap transition-colors hover:text-[#174D35] flex items-center gap-1.5 ${
                  currentView === 'settings' ? 'text-[#174D35] font-semibold border-b-2 border-[#174D35] pb-1' : ''
                }`}
              >
                Settings
              </button>
            </>
          )}
        </nav>

        {/* Primary Action & Profile Switcher / Sign In */}
        <div className="flex items-center gap-3 shrink-0">
          {!isLoggedIn ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAuth}
                className="min-h-[44px] px-4 py-2 border border-[#DCE9DE] hover:border-[#174D35] text-[#103B2A] text-xs font-semibold rounded-[8px] transition-colors"
              >
                Sign In
              </button>

              <button
                onClick={onOpenAuth}
                className="min-h-[44px] px-4 py-2 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-semibold rounded-[8px] transition-colors flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-4 h-4 text-[#E6A23C]" />
                <span>List Machinery</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                  className="min-h-[44px] flex items-center gap-2 px-3 py-1.5 rounded-[10px] border border-[#DCE9DE] bg-[#F7F8F4] text-xs font-medium text-[#202820] hover:bg-white transition-colors"
                  aria-label="User Profile"
                >
                  <div className="w-7 h-7 rounded-full bg-[#174D35] text-white text-[11px] flex items-center justify-center font-bold">
                    {currentUser.name[0]}
                  </div>
                  <span className="hidden sm:inline font-medium text-[#103B2A]">
                    {currentUser.name.split(' ')[0]} ({currentUser.role})
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#174D35]" />
                </button>

                {roleDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-[12px] border border-[#DCE9DE] agri-elevated-shadow py-2 z-50">
                    <div className="px-4 py-2 border-b border-[#DCE9DE]/60">
                      <p className="text-xs font-semibold text-[#103B2A]">Active Session</p>
                      <p className="text-xs text-[#202820]/70 truncate">{currentUser.email}</p>
                    </div>

                    {/* Role toggle if dual role is enabled */}
                    {currentUser.hasDualRole && onSwitchUserRole && (
                      <div className="py-1">
                        <button
                          onClick={() => {
                            onSwitchUserRole(currentUser.role === 'farmer' ? 'owner' : 'farmer');
                            onNavigate(currentUser.role === 'farmer' ? 'owner-dashboard' : 'farmer-dashboard');
                            setRoleDropdownOpen(false);
                          }}
                          className="w-full min-h-[44px] px-4 py-2 text-left text-xs text-[#174D35] font-semibold hover:bg-[#F7F8F4] flex items-center justify-between"
                        >
                          <span>Switch to {currentUser.role === 'farmer' ? 'Owner Fleet' : 'Farmer Dashboard'}</span>
                          <CheckCircle2 className="w-4 h-4 text-[#174D35]" />
                        </button>
                      </div>
                    )}

                    <div className="border-t border-[#DCE9DE]/60 pt-1 space-y-1">
                      <button
                        onClick={() => {
                          onNavigate('settings');
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full min-h-[44px] px-4 py-2 text-left text-xs text-[#103B2A] font-semibold hover:bg-[#F7F8F4] flex items-center justify-between"
                      >
                        <span>Account &amp; Farm Settings</span>
                        <Settings className="w-4 h-4 text-[#174D35]" />
                      </button>

                      {/* Explicit Logout Option */}
                      <button
                        onClick={() => {
                          setRoleDropdownOpen(false);
                          onLogout?.();
                        }}
                        className="w-full min-h-[44px] px-4 py-2 text-left text-xs text-red-600 font-semibold hover:bg-red-50 flex items-center justify-between"
                      >
                        <span>Log Out / Terminate Session</span>
                        <LogOut className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Logout Button */}
              <button
                onClick={onLogout}
                className="hidden sm:flex min-h-[44px] px-3 py-1.5 border border-[#DCE9DE] hover:border-red-300 text-[#202820]/80 hover:text-red-600 text-xs font-semibold rounded-[8px] transition-colors items-center gap-1.5"
                title="Log out"
              >
                <LogOut className="w-3.5 h-3.5 text-red-500" />
                <span>Log out</span>
              </button>
            </div>
          )}

          {/* Mobile menu toggle button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[8px] text-[#202820] hover:bg-[#F7F8F4] focus:outline-none"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-[#DCE9DE] px-4 pt-3 pb-5 space-y-1.5">
          {!isLoggedIn ? (
            <>
              <button
                onClick={() => {
                  onNavigate('landing');
                  setMobileMenuOpen(false);
                }}
                className={`w-full min-h-[44px] text-left px-3 py-2.5 rounded-[8px] text-sm font-medium ${
                  currentView === 'landing' ? 'bg-[#DCE9DE] text-[#103B2A] font-semibold' : 'text-[#202820]'
                }`}
              >
                Home
              </button>
              <button
                onClick={() => {
                  onNavigate('marketplace');
                  setMobileMenuOpen(false);
                }}
                className={`w-full min-h-[44px] text-left px-3 py-2.5 rounded-[8px] text-sm font-medium ${
                  currentView === 'marketplace' ? 'bg-[#DCE9DE] text-[#103B2A] font-semibold' : 'text-[#202820]'
                }`}
              >
                Equipment Marketplace
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-[8px] text-sm font-semibold bg-[#174D35] text-white flex items-center gap-2"
              >
                <UserIcon className="w-4 h-4" />
                <span>Sign In / Create Account</span>
              </button>
            </>
          ) : (
            <>
              {/* Logged in mobile menu: strictly NO Home link! */}
              <button
                onClick={() => {
                  onNavigate(currentUser.role === 'owner' ? 'owner-dashboard' : 'farmer-dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-[8px] text-sm font-semibold bg-[#DCE9DE] text-[#103B2A]"
              >
                My Dashboard ({currentUser.role})
              </button>
              <button
                onClick={() => {
                  onNavigate('marketplace');
                  setMobileMenuOpen(false);
                }}
                className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-[8px] text-sm font-medium text-[#202820]"
              >
                Equipment Marketplace
              </button>
              <button
                onClick={() => {
                  onNavigate('settings');
                  setMobileMenuOpen(false);
                }}
                className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-[8px] text-sm font-medium text-[#202820]"
              >
                Settings &amp; Role Capabilities
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout?.();
                }}
                className="w-full min-h-[44px] text-left px-3 py-2.5 rounded-[8px] text-sm font-semibold text-red-600 flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Session</span>
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
};
