import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Phone, 
  ArrowRight, 
  Bell, 
  Settings, 
  LayoutGrid, 
  Search,
  MapPin,
  ChevronRight,
  CreditCard,
  Sprout,
  LogOut,
  Tractor,
  Heart,
  CloudSun,
  X,
  Menu,
  MessageSquare,
  CheckSquare
} from 'lucide-react';
import { Booking, Equipment, User as UserType } from '../types';
import { formatNaira, getTimeBasedGreeting } from '../utils/formatters';
import { getRealtimeFarmWeather, WeatherData } from '../services/weather';
import { ApiService } from '../services/api';
import { distanceBetweenCoordinates, geocodeNigeriaLocation, getDashboardOriginCoordinates } from '../utils/location';
import { getBookingDisplayImage, getEquipmentDisplayImage } from '../utils/equipmentImages';

interface FarmerDashboardProps {
  currentUser: UserType;
  bookings: Booking[];
  equipmentList: Equipment[];
  onNavigateToMarketplace: (category?: string, showSaved?: boolean, query?: string) => void;
  onSelectEquipmentForBooking: (equipment: Equipment) => void;
  onNavigateToSettings?: () => void;
  onNavigateToFarmManagement?: () => void;
  onSwitchRole?: (role: 'farmer' | 'owner') => void;
  onLogout?: () => void;
  savedEquipmentIds?: string[];
  onToggleFavorite?: (equipmentId: string) => void;
  onCompleteBooking: (bookingId: string) => Promise<void>;
  onRateBooking: (bookingId: string, rating: number, review: string) => Promise<void>;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  currentUser,
  bookings,
  equipmentList,
  onNavigateToMarketplace,
  onSelectEquipmentForBooking,
  onNavigateToSettings,
  onNavigateToFarmManagement,
  onSwitchRole,
  onLogout,
  savedEquipmentIds = [],
  onToggleFavorite,
  onCompleteBooking,
  onRateBooking,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'bookings' | 'saved' | 'notifications' | 'profile'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Interactive Modals
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistItems, setChecklistItems] = useState({
    ptoShaft: true,
    threePointHitch: true,
    hydraulicLines: true,
    engineOilLevel: true,
    fuelTankFilled: true,
    operatorSafetyGuard: false,
  });
  const [contactOwnerOpen, setContactOwnerOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeRentalDetailsOpen, setActiveRentalDetailsOpen] = useState(false);
  const [financialDetailsOpen, setFinancialDetailsOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingReview, setRatingReview] = useState('');
  const [bookingActionLoading, setBookingActionLoading] = useState(false);
  const [equipmentDistances, setEquipmentDistances] = useState<Record<string, number | null>>({});

  // Real-time Weather
  const [weather, setWeather] = useState<WeatherData>({
    temperature: 29,
    condition: 'Sunny',
    fieldAdvice: 'Good to plough',
    windSpeedKmH: 12,
    locationName: currentUser.location || 'Oyo State',
    isRealTime: false,
  });

  // Dynamic greeting from user device local time
  const greeting = useMemo(() => getTimeBasedGreeting(), []);

  const farmLocationSentenceCase = useMemo(() => {
    const location = currentUser.location?.trim() || 'location not provided';
    return location.charAt(0).toUpperCase() + location.slice(1).toLowerCase();
  }, [currentUser.location]);

  const today = new Date().toISOString().slice(0, 10);
  const canCompleteBooking = selectedBooking?.status === 'Accepted' && selectedBooking.endDate <= today;
  const upcomingBookings = bookings.filter(booking => booking.startDate >= today && booking.status !== 'Declined' && booking.status !== 'Cancelled');
  const activeBookings = bookings.filter(booking => booking.status === 'Accepted' && booking.startDate <= today && booking.endDate >= today);
  const seasonSpend = bookings
    .filter(booking => booking.status !== 'Declined' && booking.status !== 'Cancelled')
    .reduce((total, booking) => total + booking.totalAmount, 0);
  const availableSavedMachines = equipmentList.filter(equipment => savedEquipmentIds.includes(equipment.id) && equipment.availability === 'Available').length;
  const farmTasks = currentUser.farmManagement?.tasks || [];
  const overdueTask = farmTasks
    .filter(task => task.status !== 'completed' && task.dueDate < today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const nextTask = overdueTask || farmTasks
    .filter(task => task.status === 'upcoming' && task.dueDate >= today)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
  const pendingBooking = bookings.find(booking => booking.status === 'Pending Approval');
  const actionBooking = activeBookings[0] || pendingBooking || upcomingBookings[0];

  // Fetch real-time weather at the farmer's registered location
  useEffect(() => {
    let isMounted = true;
    getRealtimeFarmWeather(currentUser.state, currentUser.lga, currentUser.location).then(data => {
      if (isMounted) {
        setWeather(data);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [currentUser.state, currentUser.lga, currentUser.location]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const origin = await getDashboardOriginCoordinates(currentUser);
      if (!origin) return;
      const entries = await Promise.all(equipmentList.map(async equipment => {
        const target = await geocodeNigeriaLocation(`${equipment.locationLGA}, ${equipment.locationState}`);
        return [equipment.id, target ? Number(distanceBetweenCoordinates(origin, target).toFixed(1)) : null] as const;
      }));
      if (!cancelled) setEquipmentDistances(Object.fromEntries(entries));
    })();
    return () => { cancelled = true; };
  }, [currentUser.location, currentUser.lga, currentUser.state, equipmentList]);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleFavoriteWithLog = async (item: Equipment) => {
    if (onToggleFavorite) {
      onToggleFavorite(item.id);
      const isSaved = savedEquipmentIds.includes(item.id);
      const action = isSaved ? 'Removed from Wishlist' : 'Saved to Wishlist';
      try {
        await ApiService.logActivity({
          userId: currentUser.id,
          action,
          category: 'wishlist',
          details: `${item.title} (${item.category}) in ${item.locationState}`,
          status: 'completed',
        });
        showNotification(isSaved ? `Removed ${item.title} from saved` : `Saved ${item.title} to wishlist`);
      } catch (error) {
        showNotification(error instanceof Error ? error.message : 'Could not save this activity.');
      }
    }
  };

  const handleSignOffChecklist = async () => {
    setChecklistOpen(false);
    try {
      await ApiService.logActivity({
        userId: currentUser.id,
        action: 'Field Intake Checklist Verified',
        category: 'rental',
        details: 'All 6 mechanical & hydraulic checkpoints signed off for MF 385 4WD',
        status: 'completed',
      });
      showNotification('Field intake checklist verified & signed off!');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Could not save the checklist activity.');
    }
  };

  // Top 3 featured recommendations matching 04FarmerDashboard
  const recommendedCards = useMemo(() => {
    const card1 = equipmentList.find(e => e.id === 'eq-1') || equipmentList[0];
    const card2 = equipmentList.find(e => e.id === 'eq-6') || equipmentList[1];
    const card3 = equipmentList.find(e => e.id === 'eq-11') || equipmentList[2];
    return [
      {
        ...card1,
        displayTitle: 'New Holland TT4.75',
        displayCategory: 'Tractor • 75 HP',
        displayLoc: 'Akinyele • 9.1 km',
        displayRate: 48500,
        displayTag: '• Available',
      },
      {
        ...card2,
        displayTitle: 'Honda Irrigation Pump',
        displayCategory: 'Irrigation • 5.5 HP',
        displayLoc: 'Abeokuta • 22 km',
        displayRate: 12500,
        displayTag: '• Available',
      },
      {
        ...card3,
        displayTitle: 'Farmforce Disc Plough',
        displayCategory: 'Tillage • Implement',
        displayLoc: 'Ogbomoso • 31 km',
        displayRate: 18000,
        displayTag: '• Matches your dates',
      },
    ];
  }, [equipmentList]);

  return (
    <div className="relative min-h-screen bg-[#F7F8F4] flex flex-col lg:flex-row overflow-x-hidden w-full font-sans pt-9">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-[#103B2A] text-white px-4 py-3 rounded-[10px] shadow-lg flex items-center gap-2 text-xs border border-[#DCE9DE]">
          <CheckCircle2 className="w-4 h-4 text-[#E6A23C]" />
          <span>{toastMessage}</span>
        </div>
      )}
      <div className="absolute left-0 top-0 w-full bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-[11px] text-amber-950">
        Showcase account: sample bookings, dispatch details, and amounts are illustrative. No payment or delivery is processed.
      </div>

      {/* MOBILE TOP HEADER (< lg): Clean, modern mobile branding bar */}
      <div className="lg:hidden bg-white border-b border-[#DCE9DE] px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#103B2A] rounded-lg hover:bg-[#F7F8F4]"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#174D35] flex items-center justify-center text-white">
              <Tractor className="w-4 h-4 text-[#E6A23C]" />
            </div>
            <div>
              <span className="text-base font-bold text-[#103B2A] leading-tight block">AgriRent</span>
              <span className="text-[10px] text-[#202820]/60 block">{currentUser.location || 'Farmer'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Real-time Weather badge on mobile header */}
          <div className="flex items-center gap-1.5 bg-[#E3ECE5] px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-[#103B2A]">
            <CloudSun className="w-3.5 h-3.5 text-[#174D35]" />
            <span>{weather.temperature}°C</span>
          </div>

          <button
            onClick={() => setNotificationsOpen(true)}
            className="min-h-[44px] min-w-[44px] relative flex items-center justify-center text-[#103B2A] rounded-lg hover:bg-[#F7F8F4]"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MOBILE SLIDE-OUT DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex lg:hidden">
          <div className="w-72 bg-white h-full p-5 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-[#174D35] flex items-center justify-center text-white">
                    <Tractor className="w-5 h-5 text-[#E6A23C]" />
                  </div>
                  <span className="text-lg font-bold text-[#103B2A]">AgriRent</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#202820]/70"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {currentUser.hasDualRole && (
                <div className="bg-[#E5ECE7] p-1 rounded-xl flex items-center">
                  <button
                    onClick={() => {
                      onSwitchRole?.('farmer');
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-white text-[#103B2A] shadow-xs"
                  >
                    Farmer
                  </button>
                  <button
                    onClick={() => {
                      onSwitchRole?.('owner');
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-[#202820]/60"
                  >
                    Owner
                  </button>
                </div>
              )}

              <nav className="space-y-1.5 text-xs font-medium">
                <button
                  onClick={() => {
                    setActiveTab('overview');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#103B2A] text-white font-semibold"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Overview</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigateToMarketplace();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4]"
                >
                  <Search className="w-4 h-4" />
                  <span>Marketplace</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigateToFarmManagement?.();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4]"
                >
                  <Sprout className="w-4 h-4" />
                  <span>Farm Management</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setActiveRentalDetailsOpen(true);
                  }}
                  className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4]"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4" />
                    <span>My Bookings</span>
                  </div>
                  {bookings.length > 0 && <span className="w-5 h-5 rounded-full bg-[#E6A23C] text-[#103B2A] text-[11px] font-bold flex items-center justify-center">{bookings.length}</span>}
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigateToMarketplace(undefined, true);
                  }}
                  className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4]"
                >
                  <div className="flex items-center gap-3">
                    <Heart className="w-4 h-4 text-red-500" />
                    <span>Saved Wishlist</span>
                  </div>
                  {savedEquipmentIds.length > 0 && <span className="w-5 h-5 rounded-full bg-[#DCE9DE] text-[#174D35] text-[11px] font-bold flex items-center justify-center">{savedEquipmentIds.length}</span>}
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigateToSettings?.();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4]"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </button>
              </nav>
            </div>

            <div className="pt-4 border-t border-[#DCE9DE]">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onLogout?.();
                }}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 text-xs font-semibold text-red-600 bg-red-50 rounded-xl"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP LEFT SIDEBAR (Matching 04FarmerDashboard.png) */}
      <aside className="w-64 bg-white border-r border-[#DCE9DE] p-5 hidden lg:flex flex-col justify-between shrink-0 min-h-screen sticky top-0 h-auto self-start overflow-visible">
        <div className="space-y-6">
          {/* Logo Header */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[10px] bg-[#174D35] flex items-center justify-center text-white shadow-xs">
              <Tractor className="w-5 h-5 text-[#E6A23C]" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#103B2A]">
              AgriRent
            </span>
          </div>

          {/* Role Toggle [ Farmer | Owner ] - ONLY visible if user has dual-role activated in Settings */}
          {currentUser.hasDualRole && (
            <div className="bg-[#E5ECE7] p-1 rounded-xl flex items-center">
              <button
                onClick={() => onSwitchRole?.('farmer')}
                className={`flex-1 min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  currentUser.role === 'farmer'
                    ? 'bg-white text-[#103B2A] shadow-xs'
                    : 'text-[#202820]/60 hover:text-[#103B2A]'
                }`}
              >
                Farmer
              </button>
              <button
                onClick={() => onSwitchRole?.('owner')}
                className={`flex-1 min-h-[36px] py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  currentUser.role === 'owner'
                    ? 'bg-white text-[#103B2A] shadow-xs'
                    : 'text-[#202820]/60 hover:text-[#103B2A]'
                }`}
              >
                Owner
              </button>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5 text-xs font-medium">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#103B2A] text-white font-semibold shadow-xs'
                  : 'text-[#202820]/80 hover:bg-[#F7F8F4]'
              }`}
            >
              <LayoutGrid className="w-4 h-4 stroke-[2]" />
              <span>Overview</span>
            </button>

            <button
              onClick={() => onNavigateToMarketplace()}
              className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4] transition-all"
            >
              <Search className="w-4 h-4 stroke-[2]" />
              <span>Marketplace</span>
            </button>

            <button
              onClick={() => onNavigateToFarmManagement?.()}
              className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4] transition-all"
            >
              <Sprout className="w-4 h-4 stroke-[2]" />
              <span>Farm Management</span>
            </button>

            <button
              onClick={() => setActiveRentalDetailsOpen(true)}
              className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4] transition-all"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 stroke-[2]" />
                <span>My Bookings</span>
              </div>
              {bookings.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#E6A23C] text-[#103B2A] text-[11px] font-bold flex items-center justify-center">
                  {bookings.length}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigateToMarketplace(undefined, true)}
              className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4] transition-all"
            >
              <div className="flex items-center gap-3">
                <Heart className={`w-4 h-4 stroke-[2] ${savedEquipmentIds.length > 0 ? 'text-[#E6A23C]' : ''}`} />
                <span>Saved</span>
              </div>
              {savedEquipmentIds.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#DCE9DE] text-[#174D35] text-[11px] font-bold flex items-center justify-center">
                  {savedEquipmentIds.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setNotificationsOpen(true)}
              className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4] transition-all"
            >
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 stroke-[2]" />
                <span>Notifications</span>
              </div>
            </button>

            <button
              onClick={() => onNavigateToSettings?.()}
              className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4] transition-all"
            >
              <Settings className="w-4 h-4 stroke-[2]" />
              <span>Settings</span>
            </button>
          </nav>
        </div>

        {/* Sidebar Bottom (Logout + User Profile Card) */}
        <div className="space-y-4 pt-6 border-t border-[#DCE9DE]/60">
          <button
            onClick={onLogout}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 text-xs font-semibold text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateToSettings?.()}
            className="w-full flex items-center gap-2.5 min-w-0 text-left rounded-xl p-1 hover:bg-[#F7F8F4] transition-colors"
            aria-label="Open farmer profile"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#174D35] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#103B2A] truncate">{currentUser.name}</p>
                <p className="text-[11px] text-[#202820]/60 truncate">
                  {currentUser.state || currentUser.location || 'Location not set'}
                </p>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* TOP SEARCH & WEATHER BAR (Desktop) */}
        <header className="h-20 bg-white border-b border-[#DCE9DE] px-4 sm:px-8 hidden lg:flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="relative flex-1 max-w-xl">
            <Search className="w-4 h-4 text-[#202820]/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onNavigateToMarketplace(undefined, false, searchQuery.trim());
                }
              }}
              placeholder="Search tractors, harvesters, locations..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#F7F8F4] border border-[#DCE9DE] rounded-xl text-xs sm:text-sm text-[#103B2A] placeholder:text-[#202820]/45 focus:outline-none focus:bg-white focus:border-[#174D35] transition-all"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Real-time Weather Badge */}
            <div 
              className="flex items-center gap-2 bg-[#E3ECE5] border border-[#DCE9DE] rounded-xl px-3 py-2 text-xs font-semibold text-[#103B2A] cursor-pointer"
              title={`Live weather at registered farm location: ${weather.locationName}`}
              onClick={() => showNotification(`Registered Farmland: ${weather.locationName} • ${weather.temperature}°C, ${weather.condition}. Wind: ${weather.windSpeedKmH} km/h`)}
            >
              <CloudSun className="w-4 h-4 text-[#174D35]" />
              <span>{weather.temperature}°C &bull; {weather.fieldAdvice}</span>
            </div>

            {/* Bell button with notifications */}
            <button
              onClick={() => setNotificationsOpen(true)}
              className="min-h-[44px] min-w-[44px] relative rounded-xl border border-[#DCE9DE] bg-white flex items-center justify-center text-[#202820]/80 hover:bg-[#F7F8F4] transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
            </button>

            {/* Wishlist Heart Button */}
            <button
              onClick={() => onNavigateToMarketplace(undefined, true)}
              className="min-h-[44px] min-w-[44px] relative rounded-xl border border-[#DCE9DE] bg-white flex items-center justify-center text-[#202820]/80 hover:bg-[#F7F8F4] transition-colors"
              aria-label="Saved machines wishlist"
            >
              <Heart className={`w-4 h-4 ${savedEquipmentIds.length > 0 ? 'fill-red-500 text-red-500' : ''}`} />
              {savedEquipmentIds.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#174D35] text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {savedEquipmentIds.length}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Dashboard Inner Content */}
        <main className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Greeting Section (DYNAMIC LOCAL DEVICE TIME) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#103B2A]">
                {greeting}, {currentUser.name.split(' ')[0]}
              </h1>
              <p className="text-xs sm:text-sm text-[#202820]/70 mt-1">Farm Registered at {farmLocationSentenceCase}</p>
            </div>

            <button
              onClick={() => onNavigateToMarketplace()}
              className="min-h-[44px] px-5 py-2.5 bg-[#174D35] hover:bg-[#103B2A] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
            >
              <span>+ New booking</span>
            </button>
          </div>

          {/* 4 Stat Metric Cards (Exact match to 04FarmerDashboard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Upcoming rentals */}
            <div 
              onClick={() => setActiveRentalDetailsOpen(true)}
              className="bg-white rounded-2xl p-5 border border-[#DCE9DE] agri-card-shadow flex flex-col justify-between cursor-pointer hover:border-[#174D35] transition-all"
            >
              <div className="flex items-center gap-2 text-xs text-[#202820]/70 font-medium">
                <div className="w-8 h-8 rounded-lg bg-[#E3ECE5] flex items-center justify-center text-[#174D35]">
                  <Calendar className="w-4 h-4" />
                </div>
                <span>Upcoming rentals</span>
              </div>
              <div className="mt-4">
              <div className="text-3xl font-bold text-[#103B2A] tracking-tight">{upcomingBookings.length}</div>
                <p className="text-xs text-[#202820]/60 mt-1">{upcomingBookings[0] ? `Next: ${upcomingBookings[0].startDate}` : 'No upcoming rentals'}</p>
              </div>
            </div>

            {/* Card 2: Active now */}
            <div 
              onClick={() => setActiveRentalDetailsOpen(true)}
              className="bg-white rounded-2xl p-5 border border-[#DCE9DE] agri-card-shadow flex flex-col justify-between cursor-pointer hover:border-[#174D35] transition-all"
            >
              <div className="flex items-center gap-2 text-xs text-[#202820]/70 font-medium">
                <div className="w-8 h-8 rounded-lg bg-[#E3ECE5] flex items-center justify-center text-[#174D35]">
                  <Tractor className="w-4 h-4" />
                </div>
                <span>Active now</span>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-[#103B2A] tracking-tight">{activeBookings.length}</div>
                <p className="text-xs text-[#202820]/60 mt-1">{activeBookings[0]?.equipmentTitle || 'No active rental'}</p>
              </div>
            </div>

            {/* Card 3: Spent this season */}
            <div 
              onClick={() => setFinancialDetailsOpen(true)}
              className="bg-white rounded-2xl p-5 border border-[#DCE9DE] agri-card-shadow flex flex-col justify-between cursor-pointer hover:border-[#174D35] transition-all"
            >
              <div className="flex items-center gap-2 text-xs text-[#202820]/70 font-medium">
                <div className="w-8 h-8 rounded-lg bg-[#E3ECE5] flex items-center justify-center text-[#174D35]">
                  <CreditCard className="w-4 h-4" />
                </div>
                <span>Spent this season</span>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-[#103B2A] tracking-tight">{formatNaira(seasonSpend)}</div>
                <p className="text-xs text-[#202820]/60 mt-1">{bookings.filter(booking => booking.status !== 'Declined' && booking.status !== 'Cancelled').length} recorded rentals</p>
              </div>
            </div>

            {/* Card 4: Saved machines */}
            <div 
              onClick={() => onNavigateToMarketplace(undefined, true)}
              className="bg-white rounded-2xl p-5 border border-[#DCE9DE] agri-card-shadow flex flex-col justify-between cursor-pointer hover:border-[#174D35] transition-all group"
            >
              <div className="flex items-center gap-2 text-xs text-[#202820]/70 font-medium">
                <div className="w-8 h-8 rounded-lg bg-[#E3ECE5] flex items-center justify-center text-[#174D35] group-hover:bg-[#174D35] group-hover:text-white transition-colors">
                  <Heart className="w-4 h-4 fill-current" />
                </div>
                <span>Saved machines</span>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold text-[#103B2A] tracking-tight">
                  {savedEquipmentIds.length}
                </div>
                <p className="text-xs text-[#174D35] font-medium mt-1 flex items-center gap-1">
                  <span>{availableSavedMachines} available now</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </p>
              </div>
            </div>
          </div>

          {/* MID SECTION: Dynamic next action + farm management */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Dark Forest Green next-action card */}
            <div className="lg:col-span-8 bg-[#103B2A] rounded-2xl p-6 sm:p-7 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
              <div className="space-y-3 flex-1 z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E6A23C] text-[#103B2A]">
                  {actionBooking ? (activeBookings.length > 0 ? 'Active rental' : actionBooking.status === 'Pending Approval' ? 'Awaiting approval' : 'Upcoming rental') : nextTask ? (overdueTask ? 'Needs attention' : 'Next on your farm') : 'Farm planning'}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {actionBooking ? actionBooking.equipmentTitle : nextTask ? nextTask.title : 'Plan your next field operation'}
                </h2>
                {/*
                  {actionBooking ? (
                  Owner confirmed. Delivery driver: Seyi &bull; 0803 555 0119. Balance ₦45,000 due on pickup.
                </p>
                  ) : nextTask ? `${nextTask.dueDate}${nextTask.time ? ` at ${nextTask.time}` : ''} · ${nextTask.notes || 'Keep this farm task on schedule.'}` : 'Set up your plots, crops, tasks, and costs so your season has a clear next step.'}
                </p>
                */}
                <p className="text-xs sm:text-sm text-[#DCE9DE] leading-relaxed max-w-md">
                  {actionBooking
                    ? `${actionBooking.startDate} to ${actionBooking.endDate} · ${actionBooking.days} day(s) · ${actionBooking.lga}, ${actionBooking.state}`
                    : nextTask
                      ? `${nextTask.dueDate}${nextTask.time ? ` at ${nextTask.time}` : ''} · ${nextTask.notes || 'Keep this farm task on schedule.'}`
                      : 'Set up your plots, crops, tasks, and costs so your season has a clear next step.'}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => actionBooking ? setActiveRentalDetailsOpen(true) : onNavigateToFarmManagement?.()}
                    className="min-h-[44px] px-4 py-2 bg-white text-[#103B2A] rounded-lg text-xs font-semibold hover:bg-[#F7F8F4] transition-colors"
                  >
                    {actionBooking ? 'View booking details' : nextTask ? 'Open farm task' : 'Open farm tools'}
                  </button>
                  <button
                    onClick={() => onNavigateToMarketplace()}
                    className="min-h-[44px] px-4 py-2 border border-white/60 text-white rounded-lg text-xs font-semibold hover:bg-white/10 transition-colors"
                  >
                    {actionBooking ? 'Find another machine' : 'Browse equipment'}
                  </button>
                </div>
              </div>

              {/* Right Image */}
              <div className="w-full md:w-60 h-40 rounded-xl overflow-hidden shadow-md shrink-0 bg-[#174D35]">
                <img
                  src={getBookingDisplayImage(actionBooking?.equipmentImage)}
                  alt={actionBooking?.equipmentTitle || 'Farm planning'}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Right 4 Cols: Farm management shortcut */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#DCE9DE] agri-card-shadow flex flex-col justify-between">
              <h3 className="text-base font-bold text-[#103B2A]">Farm management</h3>
              <p className="text-xs text-[#202820]/70 mt-3">Plan tasks, plots, crops, and costs for your active season.</p>
              <button onClick={() => onNavigateToFarmManagement?.()} className="mt-6 w-full min-h-[44px] py-2.5 border border-[#DCE9DE] hover:border-[#174D35] rounded-xl text-xs font-semibold text-[#103B2A] transition-colors flex items-center justify-center gap-1.5">
                <span>Open farm tools</span><ChevronRight className="w-4 h-4 text-[#174D35]" />
              </button>
            </div>
          </div>

          {/* LOWER SECTION: Recommended Equipment (3 Cards matching 04FarmerDashboard) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold text-[#103B2A] tracking-tight">
                Recommended for your {currentUser.farmSizeHectares || 8}-hectare maize farm
              </h2>
              <button
                onClick={() => onNavigateToMarketplace()}
                className="text-xs sm:text-sm font-semibold text-[#174D35] hover:underline flex items-center gap-1 min-h-[44px] py-1 px-1"
              >
                <span>View catalog</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommendedCards.map((card) => {
                const isSaved = savedEquipmentIds.includes(card.id);
                return (
                  <div
                    key={card.id}
                    className="bg-white rounded-2xl border border-[#DCE9DE] overflow-hidden agri-card-shadow flex flex-col justify-between hover:border-[#174D35] transition-all"
                  >
                    <div>
                      {/* Image Header with Badge and Heart */}
                      <div className="relative h-44 bg-gray-100 overflow-hidden">
                        <img
                          src={getEquipmentDisplayImage(card)}
                          alt={card.title}
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-3 left-3 bg-[#174D35] text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                          {card.availability}
                        </span>
                        <button
                          onClick={() => handleToggleFavoriteWithLog(card)}
                          className={`min-h-[44px] min-w-[44px] absolute top-2 right-2 rounded-full flex items-center justify-center shadow-xs transition-colors ${
                            isSaved ? 'bg-red-50 text-red-500' : 'bg-white/90 text-[#202820]/70 hover:text-red-500'
                          }`}
                          aria-label={isSaved ? 'Remove from saved' : 'Save machine'}
                        >
                          <Heart className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                        </button>
                        <span className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-md">
                          {equipmentDistances[card.id] !== undefined && equipmentDistances[card.id] !== null
                            ? `${equipmentDistances[card.id]} km away`
                            : 'Distance unavailable'}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="p-4 space-y-2">
                        <p className="text-[11px] text-[#202820]/60 font-semibold uppercase tracking-wider">
                          {card.category} · {card.horsepower} HP
                        </p>
                        <h3 className="text-base font-bold text-[#103B2A] tracking-tight">
                          {card.title}
                        </h3>
                        <p className="text-xs text-[#202820]/70 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[#174D35]" />
                          <span>{card.locationLGA}, {card.locationState}</span>
                        </p>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="p-4 pt-0 border-t border-[#DCE9DE]/40 flex items-center justify-between mt-3">
                      <div>
                        <span className="text-base font-bold text-[#103B2A]">
                          {formatNaira(card.dailyRate)}
                        </span>
                        <span className="text-xs text-[#202820]/60">/day</span>
                      </div>
                      <button
                        onClick={() => onSelectEquipmentForBooking(card)}
                        className="min-h-[44px] px-4 py-2 bg-[#174D35] hover:bg-[#103B2A] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                      >
                        Rent now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      {/* CHECKLIST MODAL */}
      {checklistOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DCE9DE] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE9DE]">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-[#174D35]" />
                <h3 className="text-base font-bold text-[#103B2A]">Pre-Delivery Intake Checklist</h3>
              </div>
              <button onClick={() => setChecklistOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[#202820]/70">
              Verify these mechanical checkpoints before signing off on tractor release.
            </p>
            <div className="space-y-2.5 text-xs">
              {Object.entries({
                ptoShaft: 'PTO 540 RPM Spline Shaft & Safety Shield',
                threePointHitch: 'Category 2 Three-Point Linkage Pins & Top Link',
                hydraulicLines: 'Dual Rear Auxiliary Hydraulic Remotes & Quick Couplers',
                engineOilLevel: 'Engine Oil Level & Dipstick Clarity Checked',
                fuelTankFilled: 'Clean Commercial Diesel Fuel Tank Filled',
                operatorSafetyGuard: 'ROPS (Roll-Over Protective Structure) & Seatbelt Inspected',
              }).map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 p-2.5 bg-[#F7F8F4] rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklistItems[key as keyof typeof checklistItems]}
                    onChange={(e) => setChecklistItems({ ...checklistItems, [key]: e.target.checked })}
                    className="w-4 h-4 text-[#174D35] rounded-sm focus:ring-[#174D35]"
                  />
                  <span className="font-medium text-[#103B2A]">{label}</span>
                </label>
              ))}
            </div>
            <div className="pt-2 flex gap-2">
              <button
                onClick={handleSignOffChecklist}
                className="flex-1 py-3 bg-[#174D35] hover:bg-[#103B2A] text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                Sign Off & Accept Intake
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTACT OWNER MODAL */}
      {contactOwnerOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DCE9DE] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE9DE]">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#174D35]" />
                <h3 className="text-base font-bold text-[#103B2A]">Contact Machinery Owner & Haulier</h3>
              </div>
              <button onClick={() => setContactOwnerOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-[#E3ECE5] rounded-xl text-xs text-[#103B2A] space-y-1">
              <p className="font-bold">Tunde B. Kasali (Depot Owner)</p>
              <p className="text-[11px] text-[#202820]/70">Flatbed Haulage Driver: Seyi &bull; 0803 555 0119</p>
            </div>
            <div className="space-y-2">
              <a
                href="tel:08035550119"
                className="w-full min-h-[44px] py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>Call Seyi (0803 555 0119)</span>
              </a>
              <a
                href="https://wa.me/2348035550119?text=Hello%20AgriRent%20Driver,%20checking%20on%20MF%20385%20delivery"
                target="_blank"
                rel="noreferrer"
                className="w-full min-h-[44px] py-2.5 border border-[#DCE9DE] hover:bg-[#F7F8F4] text-[#103B2A] rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-green-600" />
                <span>Chat via WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICATIONS MODAL */}
      {notificationsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DCE9DE] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE9DE]">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#174D35]" />
                <h3 className="text-base font-bold text-[#103B2A]">Field Notifications</h3>
              </div>
              <button onClick={() => setNotificationsOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#F7F8F4] rounded-xl border border-[#DCE9DE]">
                <p className="font-bold text-[#103B2A]">MF 385 Tractor En Route</p>
                <p className="text-[11px] text-[#202820]/70 mt-0.5">Flatbed driver Seyi confirmed departure from Akinyele depot.</p>
                <span className="text-[10px] text-green-700 font-semibold mt-1 block">Expected arrival: tomorrow 7:00 AM</span>
              </div>
              <div className="p-3 bg-[#F7F8F4] rounded-xl border border-[#DCE9DE]">
                <p className="font-bold text-[#103B2A]">Planting Season Rate Lock</p>
                <p className="text-[11px] text-[#202820]/70 mt-0.5">Heavy rotavator demand rising in Ogun & Oyo state belts.</p>
              </div>
              <div className="p-3 bg-[#F7F8F4] rounded-xl border border-[#DCE9DE]">
                <p className="font-bold text-[#103B2A]">Showcase booking status</p>
                <p className="text-[11px] text-[#202820]/70 mt-0.5">Payments and escrow are not connected; amounts shown are sample data.</p>
              </div>
            </div>
            <button
              onClick={() => {
                setNotificationsOpen(false);
                showNotification('All notifications marked as read');
              }}
              className="w-full py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold"
            >
              Mark All as Read
            </button>
          </div>
        </div>
      )}

      {/* BOOKING HISTORY MODAL */}
      {activeRentalDetailsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#DCE9DE] shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE9DE]">
              <div className="flex items-center gap-2">
                <Tractor className="w-5 h-5 text-[#174D35]" />
                <h3 className="text-base font-bold text-[#103B2A]">My Booking History</h3>
              </div>
              <button onClick={() => setActiveRentalDetailsOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            {bookings.length === 0 ? (
              <div className="p-8 text-center bg-[#F7F8F4] rounded-xl border border-[#DCE9DE] text-xs text-[#202820]/70">
                No booking requests yet. Browse machinery to start a request.
              </div>
            ) : bookings.map(booking => (
              <button type="button" key={booking.id} onClick={() => { setSelectedBooking(booking); setRatingValue(booking.farmerRating || 0); setRatingReview(booking.farmerReview || ''); }} className="w-full text-left p-4 bg-[#F7F8F4] rounded-xl border border-[#DCE9DE] space-y-2 hover:border-[#174D35] transition-colors">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <p className="text-xs font-bold text-[#103B2A]">{booking.equipmentTitle}</p>
                    <p className="text-[11px] text-[#202820]/70">{booking.startDate} to {booking.endDate} · {booking.days} day(s)</p>
                  </div>
                  <span className="px-2 py-0.5 bg-white border border-[#DCE9DE] text-[#174D35] text-[10px] font-bold rounded-md">
                    {booking.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>Location: {booking.lga}, {booking.state}</div>
                  <div>Total: {formatNaira(booking.totalAmount)}</div>
                  <div>Request ID: {booking.id}</div>
                  <div>Payment: Demo only</div>
                </div>
              </button>
            ))}
            <button
              onClick={() => setActiveRentalDetailsOpen(false)}
              className="w-full py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DCE9DE] shadow-xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE9DE]">
              <div><p className="text-[10px] uppercase tracking-wider font-bold text-[#174D35]">Booking details</p><h3 className="text-base font-bold text-[#103B2A]">{selectedBooking.equipmentTitle}</h3></div>
              <button onClick={() => setSelectedBooking(null)} className="text-gray-400 hover:text-black" aria-label="Close booking details"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-[#202820]/75">
              <p><strong>Status:</strong> {selectedBooking.status}</p><p><strong>Category:</strong> {selectedBooking.category}</p>
              <p><strong>Dates:</strong> {selectedBooking.startDate} to {selectedBooking.endDate}</p><p><strong>Duration:</strong> {selectedBooking.days} day(s)</p>
              <p><strong>Farm location:</strong> {selectedBooking.lga}, {selectedBooking.state}</p><p><strong>Delivery:</strong> {selectedBooking.deliveryMethod}</p>
              <p><strong>Daily rate:</strong> {formatNaira(selectedBooking.dailyRate)}</p><p><strong>Total:</strong> {formatNaira(selectedBooking.totalAmount)}</p>
              <p><strong>Payment:</strong> {selectedBooking.paymentMethod}</p><p><strong>Created:</strong> {new Date(selectedBooking.createdAt).toLocaleString()}</p>
            </div>
            <p className="text-[11px] text-[#202820]/60 break-all">Booking reference: {selectedBooking.id} · {selectedBooking.demoReference}</p>
            {selectedBooking.status === 'Accepted' && (
              <div className="p-3 rounded-xl border border-[#DCE9DE] bg-[#F7F8F4] space-y-2">
                <p className="text-xs font-semibold text-[#103B2A]">Finished using and returned the machinery?</p>
                {canCompleteBooking ? (
                  <button type="button" disabled={bookingActionLoading} onClick={async () => {
                    setBookingActionLoading(true);
                    try {
                      await onCompleteBooking(selectedBooking.id);
                      setSelectedBooking({ ...selectedBooking, status: 'Completed', completedAt: new Date().toISOString() });
                    } finally {
                      setBookingActionLoading(false);
                    }
                  }} className="w-full py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold disabled:opacity-60">
                    {bookingActionLoading ? 'Saving…' : 'Mark rental successful & returned'}
                  </button>
                ) : <p className="text-[11px] text-[#202820]/65">You can mark this rental returned after {selectedBooking.endDate}.</p>}
              </div>
            )}

            {selectedBooking.status === 'Completed' && !selectedBooking.farmerRating && (
              <div className="p-3 rounded-xl border border-[#DCE9DE] bg-[#F7F8F4] space-y-3">
                <p className="text-xs font-semibold text-[#103B2A]">Rate this machinery after use</p>
                <div className="flex gap-1" aria-label="Choose a rating from 1 to 5">
                  {[1, 2, 3, 4, 5].map(value => <button key={value} type="button" onClick={() => setRatingValue(value)} className={`w-9 h-9 rounded-lg border text-sm ${ratingValue >= value ? 'bg-[#E6A23C] border-[#E6A23C] text-[#103B2A]' : 'bg-white border-[#DCE9DE] text-[#202820]/50'}`} aria-label={`${value} star${value === 1 ? '' : 's'}`}>★</button>)}
                </div>
                <textarea value={ratingReview} onChange={event => setRatingReview(event.target.value)} rows={3} maxLength={1000} placeholder="What was your experience? (optional)" className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-lg resize-none" />
                <button type="button" disabled={ratingValue < 1 || bookingActionLoading} onClick={async () => {
                  setBookingActionLoading(true);
                  try {
                    await onRateBooking(selectedBooking.id, ratingValue, ratingReview);
                    setSelectedBooking({ ...selectedBooking, farmerRating: ratingValue, farmerReview: ratingReview });
                  } finally {
                    setBookingActionLoading(false);
                  }
                }} className="w-full py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold disabled:opacity-50">
                  {bookingActionLoading ? 'Saving…' : 'Submit rating'}
                </button>
              </div>
            )}

            {selectedBooking.farmerRating && (
              <div className="p-3 rounded-xl border border-[#DCE9DE] bg-[#F7F8F4] text-xs text-[#103B2A]">
                <p className="font-semibold">Your rating: {'★'.repeat(selectedBooking.farmerRating)}{'☆'.repeat(5 - selectedBooking.farmerRating)}</p>
                {selectedBooking.farmerReview && <p className="mt-1 text-[#202820]/70">{selectedBooking.farmerReview}</p>}
              </div>
            )}

            <button onClick={() => setSelectedBooking(null)} className="w-full py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold">Close</button>
          </div>
        </div>
      )}

      {/* FINANCIAL DETAILS MODAL */}
      {financialDetailsOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DCE9DE] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE9DE]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#174D35]" />
                <h3 className="text-base font-bold text-[#103B2A]">Season Rental Expenditure</h3>
              </div>
              <button onClick={() => setFinancialDetailsOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="text-center py-2">
              <span className="text-3xl font-bold text-[#103B2A]">{formatNaira(seasonSpend)}</span>
              <p className="text-xs text-green-700 font-semibold mt-1">{bookings.filter(booking => booking.status !== 'Declined' && booking.status !== 'Cancelled').length} recorded rentals &bull; demo payments not collected</p>
            </div>
            <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
              {bookings.filter(booking => booking.status !== 'Declined' && booking.status !== 'Cancelled').length === 0 ? (
                <p className="p-4 bg-[#F7F8F4] rounded-lg text-center text-[#202820]/60">No rental expenditure recorded yet.</p>
              ) : bookings.filter(booking => booking.status !== 'Declined' && booking.status !== 'Cancelled').map(booking => (
                <div key={booking.id} className="flex justify-between gap-3 py-1.5 border-b border-[#DCE9DE]/60">
                  <span>{booking.equipmentTitle} ({booking.days} days)</span>
                  <span className="font-bold shrink-0">{formatNaira(booking.totalAmount)}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setFinancialDetailsOpen(false)}
              className="w-full py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
