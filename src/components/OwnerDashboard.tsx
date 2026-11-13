import React, { useState, useMemo, useEffect } from 'react';
import { 
  Tractor, 
  CheckCircle2, 
  X, 
  Plus, 
  BarChart2, 
  MoreHorizontal, 
  ChevronRight, 
  Download, 
  FileText,
  Mail,
  Star,
  LogOut,
  LayoutGrid,
  Settings,
  CreditCard,
  Wallet,
  Menu,
  Check,
  TrendingUp,
  Printer
  ,Pencil
} from 'lucide-react';
import { Equipment, RentalRequest, User as UserType } from '../types';
import { formatNaira, getTimeBasedGreeting } from '../utils/formatters';

interface OwnerDashboardProps {
  currentUser: UserType;
  fleetList: Equipment[];
  rentalRequests: RentalRequest[];
  onAcceptRequest: (requestId: string) => Promise<void>;
  onDeclineRequest: (requestId: string) => Promise<void>;
  onToggleEquipmentStatus: (equipmentId: string) => Promise<void>;
  onOpenAddEquipmentModal: () => void;
  onEditEquipment: (equipment: Equipment) => void;
  onNavigateToFleetManagement?: () => void;
  onNavigateToAnalytics?: () => void;
  onNavigateToEarnings?: () => void;
  onNavigateToSettings?: () => void;
  onSwitchRole?: (role: 'farmer' | 'owner') => void;
  onLogout?: () => void;
}

export const OwnerDashboard: React.FC<OwnerDashboardProps> = ({
  currentUser,
  fleetList,
  rentalRequests,
  onAcceptRequest,
  onDeclineRequest,
  onToggleEquipmentStatus,
  onOpenAddEquipmentModal,
  onEditEquipment,
  onNavigateToFleetManagement,
  onNavigateToAnalytics,
  onNavigateToEarnings,
  onNavigateToSettings,
  onSwitchRole,
  onLogout,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'equipment' | 'requests' | 'rentals' | 'earnings' | 'analytics'>('overview');
  const [chartTimeframe, setChartTimeframe] = useState<'weekly' | 'monthly' | 'season'>('weekly');
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [earningsModalOpen, setEarningsModalOpen] = useState(false);
  const [requestsModalOpen, setRequestsModalOpen] = useState(false);
  const [reviewsModalOpen, setReviewsModalOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [manageFleetModalOpen, setManageFleetModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);

  // Live activities

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const greeting = useMemo(() => getTimeBasedGreeting(), []);

  // Functional chart data sets
  const chartDatasets = useMemo(() => {
    if (!currentUser.isDemo) {
      const accepted = rentalRequests.filter(request => request.status === 'accepted');
      const actual = [{ label: 'Current', period: 'Recorded account activity', earnings: accepted.reduce((sum, request) => sum + request.totalPayout, 0), hours: 0, rentals: accepted.length }];
      return { weekly: actual, monthly: actual, season: actual };
    }
    return {
      weekly: [
        { label: 'W1', period: 'Aug 4 - Aug 10', earnings: 185000, hours: 32, rentals: 2 },
        { label: 'W2', period: 'Aug 11 - Aug 17', earnings: 240000, hours: 44, rentals: 3 },
        { label: 'W3', period: 'Aug 18 - Aug 24', earnings: 210000, hours: 38, rentals: 2 },
        { label: 'W4', period: 'Aug 25 - Aug 31', earnings: 320000, hours: 56, rentals: 4 },
        { label: 'W5', period: 'Sep 1 - Sep 7', earnings: 290000, hours: 50, rentals: 3 },
        { label: 'W6', period: 'Sep 8 - Sep 14', earnings: 380000, hours: 64, rentals: 4 },
        { label: 'W7', period: 'Sep 15 - Sep 21', earnings: 345000, hours: 58, rentals: 4 },
        { label: 'W8', period: 'Sep 22 - Sep 28', earnings: 420000, hours: 70, rentals: 5 },
        { label: 'W9', period: 'Sep 29 - Oct 5', earnings: 480000, hours: 78, rentals: 5 },
        { label: 'W10', period: 'Oct 6 - Oct 12', earnings: 510000, hours: 82, rentals: 6 },
        { label: 'W11', period: 'Oct 13 - Oct 19', earnings: 620000, hours: 94, rentals: 6 },
        { label: 'W12', period: 'Oct 20 - Oct 26', earnings: 740000, hours: 106, rentals: 7 },
      ],
      monthly: [
        { label: 'Jun', period: 'June 2026', earnings: 780000, hours: 140, rentals: 12 },
        { label: 'Jul', period: 'July 2026', earnings: 890000, hours: 165, rentals: 14 },
        { label: 'Aug', period: 'August 2026', earnings: 955000, hours: 170, rentals: 16 },
        { label: 'Sep', period: 'September 2026', earnings: 1140000, hours: 210, rentals: 19 },
        { label: 'Oct', period: 'October 2026', earnings: 1280000, hours: 242, rentals: 22 },
        { label: 'Nov', period: 'November 2026 (Projected)', earnings: 1450000, hours: 270, rentals: 25 },
      ],
      season: [
        { label: 'Q1', period: 'Early Planting (Jan-Mar)', earnings: 1950000, hours: 380, rentals: 34 },
        { label: 'Q2', period: 'Main Rains Tillage (Apr-Jun)', earnings: 2650000, hours: 510, rentals: 48 },
        { label: 'Q3', period: 'Grain Harvest Peak (Jul-Sep)', earnings: 3450000, hours: 640, rentals: 62 },
        { label: 'Q4', period: 'Dry Season Irrigation (Oct-Dec)', earnings: 4200000, hours: 790, rentals: 74 },
      ],
    };
  }, [currentUser.isDemo, rentalRequests]);

  const activeBars = chartDatasets[chartTimeframe];
  const maxEarnings = Math.max(...activeBars.map(b => b.earnings));
  const selectedBar = selectedBarIndex === null ? null : activeBars[selectedBarIndex];
  useEffect(() => {
    if (selectedBarIndex !== null && selectedBarIndex >= activeBars.length) setSelectedBarIndex(null);
  }, [activeBars.length, selectedBarIndex]);

  const fleetEarnings = fleetList.reduce((total, machine) => total + (machine.novemberEarnings || 0), 0);
  const activeFleetCount = fleetList.filter(machine => machine.availability === 'Active rental').length;
  const fleetUtilisation = fleetList.length > 0 ? Math.round((activeFleetCount / fleetList.length) * 100) : 0;
  const pendingRequestCount = rentalRequests.filter(request => request.status === 'pending').length;
  const ratedMachines = fleetList.filter(machine => machine.ownerRating > 0);
  const ownerRating = ratedMachines.length > 0
    ? (ratedMachines.reduce((total, machine) => total + machine.ownerRating, 0) / ratedMachines.length).toFixed(1)
    : '—';
  const reviewCount = fleetList.reduce((total, machine) => total + machine.ownerReviewCount, 0);

  const handleApproveWithLog = async (req: RentalRequest) => {
    try {
      await onAcceptRequest(req.id);
      showNotification(`Booking approved for ${req.farmerName}.`);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Could not approve this request.');
    }
  };

  const handleDeclineWithLog = async (req: RentalRequest) => {
    try {
      await onDeclineRequest(req.id);
      showNotification(`Request declined for ${req.farmerName}`);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Could not decline this request.');
    }
  };

  const handleToggleStatusWithLog = async (machineId: string, machineTitle: string) => {
    try {
      await onToggleEquipmentStatus(machineId);
      showNotification(`Toggled status for ${machineTitle}`);
    } catch (error) {
      showNotification(error instanceof Error ? error.message : 'Could not update equipment availability.');
    }
  };

  // Fleet status table items
  const fleetTableRows = useMemo(() => {
    return fleetList.map(machine => ({
      id: machine.id,
      machine: machine.title,
      status: machine.availability,
      statusColor: machine.availability === 'Maintenance'
        ? 'bg-[#FEF4E5] text-[#E6A23C]'
        : 'bg-[#E3ECE5] text-[#174D35]',
      nextBooking: machine.nextBookingSchedule || 'No bookings',
      novEarnings: formatNaira(machine.novemberEarnings || 0),
      health: machine.healthNotes || 'No maintenance notes',
    }));
  }, [fleetList]);

  const reportDate = new Date().toISOString().slice(0, 10);
  const reportHeaders = ['Equipment', 'Category', 'Location', 'Status', 'Daily rate', 'Reported earnings', 'Health notes'];
  const downloadFleetReport = () => {
    const rows = fleetList.map(machine => [machine.title, machine.category, `${machine.locationLGA}, ${machine.locationState}`, machine.availability, machine.dailyRate, machine.novemberEarnings || 0, machine.healthNotes || '']);
    const requestRows = rentalRequests.map(request => [request.farmerName, request.equipmentTitle, request.farmerLocation, request.startDate, request.endDate, request.status, request.totalPayout]);
    const csv = [
      ['AgriRent Fleet Report', currentUser.name, reportDate],
      [],
      ['Fleet size', fleetList.length, 'Active rentals', activeFleetCount, 'Utilisation', `${fleetUtilisation}%`],
      ['Rental requests', rentalRequests.length, 'Pending requests', pendingRequestCount, 'Recorded earnings', fleetEarnings],
      [],
      reportHeaders,
      ...rows,
      [],
      ['Rental requests'],
      ['Farmer', 'Equipment', 'Farm location', 'Start', 'End', 'Status', 'Payout'],
      ...requestRows,
    ].map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `agrirent_fleet_report_${reportDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showNotification('Fleet report downloaded.');
  };

  const printFleetReport = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      showNotification('Allow pop-ups to print the fleet report.');
      return;
    }
    const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character] || character));
    const rows = fleetList.map(machine => `<tr><td>${escapeHtml(machine.title)}</td><td>${escapeHtml(machine.category)}</td><td>${escapeHtml(`${machine.locationLGA}, ${machine.locationState}`)}</td><td>${escapeHtml(machine.availability)}</td><td>${escapeHtml(formatNaira(machine.dailyRate))}</td><td>${escapeHtml(formatNaira(machine.novemberEarnings || 0))}</td><td>${escapeHtml(machine.healthNotes || '—')}</td></tr>`).join('');
    const requestRows = rentalRequests.map(request => `<tr><td>${escapeHtml(request.farmerName)}</td><td>${escapeHtml(request.equipmentTitle)}</td><td>${escapeHtml(request.farmerLocation)}</td><td>${escapeHtml(request.startDate)}</td><td>${escapeHtml(request.endDate)}</td><td>${escapeHtml(request.status)}</td><td>${escapeHtml(formatNaira(request.totalPayout))}</td></tr>`).join('');
    printWindow.document.write(`<!doctype html><html><head><title>AgriRent Fleet Report</title><style>body{font-family:Arial,sans-serif;color:#103B2A;padding:32px}h1{margin:0 0 4px}p{color:#52665a;font-size:12px}.summary{display:flex;gap:28px;margin:24px 0}.summary strong{display:block;font-size:20px;color:#103B2A}table{border-collapse:collapse;width:100%;font-size:11px;margin-bottom:24px}th,td{border:1px solid #dce9de;padding:8px;text-align:left}th{background:#e3ece5}@media print{body{padding:0}}</style></head><body><h1>AgriRent Fleet Report</h1><p>Owner: ${escapeHtml(currentUser.name)} · Generated: ${escapeHtml(reportDate)}</p><div class="summary"><div><strong>${fleetList.length}</strong>Fleet units</div><div><strong>${activeFleetCount}</strong>Active rentals</div><div><strong>${fleetUtilisation}%</strong>Utilisation</div><div><strong>${escapeHtml(formatNaira(fleetEarnings))}</strong>Recorded earnings</div></div><h2>Equipment inventory</h2><table><thead><tr>${reportHeaders.map(header => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows || '<tr><td colspan="7">No equipment recorded.</td></tr>'}</tbody></table><h2>Rental requests</h2><table><thead><tr><th>Farmer</th><th>Equipment</th><th>Farm location</th><th>Start</th><th>End</th><th>Status</th><th>Payout</th></tr></thead><tbody>${requestRows || '<tr><td colspan="7">No rental requests recorded.</td></tr>'}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

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
        Showcase account: sample earnings, listings, and requests are illustrative. Payouts and verification are not active.
      </div>

      {/* MOBILE TOP HEADER (< lg) */}
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
              <span className="text-base font-bold text-[#103B2A] leading-tight block">{greeting}, {currentUser.name.split(' ')[0]}</span>
              <span className="text-[10px] text-[#202820]/60 block">Owner dashboard · {currentUser.location || 'Depot Hub'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddEquipmentModal}
            className="min-h-[44px] px-3 py-1.5 bg-[#174D35] text-white rounded-lg text-xs font-semibold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
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
                  <span className="text-lg font-bold text-[#103B2A]">AgriRent Owner</span>
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
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold text-[#202820]/60"
                  >
                    Farmer
                  </button>
                  <button
                    onClick={() => {
                      onSwitchRole?.('owner');
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-white text-[#103B2A] shadow-xs"
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
                    onNavigateToFleetManagement?.();
                  }}
                  className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4]"
                >
                  <div className="flex items-center gap-3">
                    <Tractor className="w-4 h-4" />
                    <span>My Equipment</span>
                  </div>
                  {fleetList.length > 0 && <span className="w-5 h-5 rounded-full bg-[#E6A23C] text-[#103B2A] text-[11px] font-bold flex items-center justify-center">{fleetList.length}</span>}
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setRequestsModalOpen(true);
                  }}
                  className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4]"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="w-4 h-4" />
                    <span>Requests</span>
                  </div>
                  {pendingRequestCount > 0 && <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold flex items-center justify-center">{pendingRequestCount}</span>}
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigateToEarnings?.();
                  }}
                  className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4]"
                >
                  <Wallet className="w-4 h-4 text-[#174D35]" />
                  <span>Earnings</span>
                </button>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigateToAnalytics?.();
                  }}
                  className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4]"
                >
                  <div className="flex items-center gap-3">
                    <BarChart2 className="w-4 h-4 text-[#174D35]" />
                    <span>Analytics</span>
                  </div>
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

      {/* DESKTOP LEFT SIDEBAR (Matching 05OwnerDashboard.png) */}
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

          {/* Role Toggle [ Farmer | Owner ] - ONLY visible if dual-role activated */}
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
              onClick={() => onNavigateToFleetManagement?.()}
              className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4] transition-all"
            >
              <div className="flex items-center gap-3">
                <Tractor className="w-4 h-4 stroke-[2]" />
                <span>My Equipment</span>
              </div>
              {fleetList.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-[#E6A23C] text-[#103B2A] text-[11px] font-bold flex items-center justify-center">
                  {fleetList.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setRequestsModalOpen(true)}
              className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4] transition-all"
            >
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 stroke-[2]" />
                <span>Requests</span>
              </div>
              {pendingRequestCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-red-100 text-red-700 text-[11px] font-bold flex items-center justify-center">
                  {pendingRequestCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavigateToEarnings?.()}
              className="w-full min-h-[44px] flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4] transition-all"
            >
              <Wallet className="w-4 h-4 stroke-[2]" />
              <span>Earnings</span>
            </button>

            {/* Analytics */}
            <button
              onClick={() => onNavigateToAnalytics?.()}
              className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[#202820]/80 hover:bg-[#F7F8F4] transition-all group"
            >
              <div className="flex items-center gap-3">
                <BarChart2 className="w-4 h-4 stroke-[2] text-[#174D35] group-hover:scale-110 transition-transform" />
                <span className="font-semibold text-[#103B2A]">Analytics</span>
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

        {/* Sidebar Bottom (Logout + Owner Profile Card) */}
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
            aria-label="Open owner profile"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#174D35] text-white flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#103B2A] truncate">
                  {currentUser.name}
                </p>
                <p className="text-[11px] text-[#202820]/60 truncate">
                  {fleetList.length} machine{fleetList.length === 1 ? '' : 's'} listed
                </p>
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* TOP OVERVIEW BAR (Desktop) */}
        <header className="h-20 bg-white border-b border-[#DCE9DE] px-4 sm:px-8 hidden lg:flex items-center justify-between gap-4 sticky top-0 z-20">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#103B2A]">
              {greeting}, {currentUser.name.split(' ')[0]}
            </h1>
            <p className="text-xs text-[#202820]/60 mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setReportModalOpen(true)}
              className="min-h-[44px] px-4 py-2 border border-[#DCE9DE] bg-white hover:bg-[#F7F8F4] text-[#103B2A] rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-[#174D35]" />
              <span>Report</span>
            </button>

            <button
              onClick={onOpenAddEquipmentModal}
              className="min-h-[44px] px-4 py-2 bg-[#174D35] hover:bg-[#103B2A] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add equipment</span>
            </button>
          </div>
        </header>

        {/* Dashboard Inner Content */}
        <main className="p-4 sm:p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* 4 Stat Metric Cards (Exact match to 05OwnerDashboard) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: October earnings */}
            <div 
              onClick={() => onNavigateToEarnings?.()}
              className="bg-white rounded-2xl p-5 border border-[#DCE9DE] agri-card-shadow flex flex-col justify-between cursor-pointer hover:border-[#174D35] transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#E3ECE5] flex items-center justify-center text-[#174D35]">
                  <Wallet className="w-4 h-4" />
                </div>
                <button className="text-[#202820]/40 hover:text-black min-h-[32px] min-w-[32px] flex items-center justify-center">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4">
                <p className="text-xs text-[#202820]/70 font-medium">Fleet earnings</p>
                <div className="text-3xl font-bold text-[#103B2A] tracking-tight mt-1">{formatNaira(fleetEarnings)}</div>
                <p className="text-xs text-[#202820]/60 mt-1">Reported by listed equipment</p>
              </div>
            </div>

            {/* Card 2: Fleet utilisation */}
            <div 
              onClick={() => onNavigateToFleetManagement?.()}
              className="bg-white rounded-2xl p-5 border border-[#DCE9DE] agri-card-shadow flex flex-col justify-between cursor-pointer hover:border-[#174D35] transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#FEF4E5] flex items-center justify-center text-[#E6A23C]">
                  <Tractor className="w-4 h-4" />
                </div>
                <button className="text-[#202820]/40 hover:text-black min-h-[32px] min-w-[32px] flex items-center justify-center">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4">
                <p className="text-xs text-[#202820]/70 font-medium">Fleet utilisation</p>
                <div className="text-3xl font-bold text-[#103B2A] tracking-tight mt-1">{fleetUtilisation}%</div>
                <p className="text-xs text-[#202820]/60 mt-1">{activeFleetCount} of {fleetList.length} machines rented</p>
              </div>
            </div>

            {/* Card 3: Pending requests */}
            <div 
              onClick={() => setRequestsModalOpen(true)}
              className="bg-white rounded-2xl p-5 border border-[#DCE9DE] agri-card-shadow flex flex-col justify-between cursor-pointer hover:border-[#174D35] transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#FEECEC] flex items-center justify-center text-red-500">
                  <Mail className="w-4 h-4" />
                </div>
                <button className="text-[#202820]/40 hover:text-black min-h-[32px] min-w-[32px] flex items-center justify-center">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4">
                <p className="text-xs text-[#202820]/70 font-medium">Pending requests</p>
                <div className="text-3xl font-bold text-[#103B2A] tracking-tight mt-1">
                  {pendingRequestCount}
                </div>
                <p className="text-xs text-[#202820]/60 mt-1">Requests awaiting your response</p>
              </div>
            </div>

            {/* Card 4: Owner rating */}
            <div 
              onClick={() => setReviewsModalOpen(true)}
              className="bg-white rounded-2xl p-5 border border-[#DCE9DE] agri-card-shadow flex flex-col justify-between cursor-pointer hover:border-[#174D35] transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#FEF4E5] flex items-center justify-center text-[#E6A23C]">
                  <Star className="w-4 h-4 fill-current" />
                </div>
                <button className="text-[#202820]/40 hover:text-black min-h-[32px] min-w-[32px] flex items-center justify-center">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4">
                <p className="text-xs text-[#202820]/70 font-medium">Owner rating</p>
                <div className="text-3xl font-bold text-[#103B2A] tracking-tight mt-1">{ownerRating}</div>
                <p className="text-xs text-[#202820]/60 mt-1">{reviewCount} listed reviews</p>
              </div>
            </div>
          </div>

          {/* MID SECTION: FUNCTIONAL REVENUE CHART + REQUESTS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 8 Cols: Fully Functional Revenue Bar Chart */}
            <div className="lg:col-span-8 bg-white rounded-2xl p-6 border border-[#DCE9DE] agri-card-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-[#103B2A]">
                      Revenue &mdash; {chartTimeframe === 'weekly' ? 'last 12 weeks' : chartTimeframe === 'monthly' ? 'last 6 months' : 'season breakdown'}
                    </h3>
                    <p className="text-xs text-[#202820]/60 mt-0.5">
                      Payouts land every Friday &bull; OPay &bull;&bull; 4421 &bull; {selectedBar ? `${selectedBar.period}:` : 'Select a period'} {selectedBar && <strong className="text-[#103B2A]">{formatNaira(selectedBar.earnings)}</strong>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select 
                      value={chartTimeframe}
                      onChange={(e) => {
                        setChartTimeframe(e.target.value as any);
                        setSelectedBarIndex(null);
                      }}
                      className="min-h-[36px] bg-[#F7F8F4] border border-[#DCE9DE] rounded-lg text-xs font-semibold text-[#103B2A] px-2.5 py-1 focus:outline-none"
                    >
                      <option value="weekly">Weekly (12W)</option>
                      <option value="monthly">Monthly (6M)</option>
                      <option value="season">Season (Q1-Q4)</option>
                    </select>
                  </div>
                </div>

                {/* Interactive Bar Chart Container */}
                <div className="mt-6 pt-4 h-48 flex items-end justify-between gap-2 border-b border-[#DCE9DE]/60 pb-3">
                  {activeBars.map((bar, i) => {
                    const heightPercent = Math.max(14, Math.round((bar.earnings / maxEarnings) * 100));
                    const isSelected = i === selectedBarIndex;
                    return (
                      <div 
                        key={i} 
                        onClick={() => setSelectedBarIndex(i)}
                        className="flex-1 h-full flex flex-col items-center justify-end gap-1 group relative cursor-pointer"
                        title={`${bar.period}: ${formatNaira(bar.earnings)} (${bar.hours} hrs)`}
                      >
                        {/* Hover/Selection Tooltip */}
                        <div className={`absolute -top-12 z-20 bg-[#103B2A] text-white text-[10px] py-1 px-2 rounded-md shadow-md whitespace-nowrap transition-opacity pointer-events-none ${
                          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          <div className="font-bold">{formatNaira(bar.earnings)}</div>
                          <div className="text-[9px] text-[#DCE9DE]">{bar.hours} hrs &bull; {bar.rentals} rentals</div>
                        </div>

                        {/* Bar Pillar */}
                        <div 
                          className={`w-full rounded-t-sm transition-all duration-300 ${
                            isSelected 
                              ? 'bg-[#E6A23C] shadow-sm' 
                              : i >= activeBars.length - 3 
                              ? 'bg-[#174D35] hover:bg-[#103B2A]' 
                              : 'bg-[#DCE9DE] hover:bg-[#b8d4bb]'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Axis Labels */}
                <div className="flex justify-between text-xs text-[#202820]/60 pt-2 px-1 font-medium">
                  {chartTimeframe === 'weekly' ? (
                    <>
                      <span>Aug (W1-W4)</span>
                      <span>Sep (W5-W8)</span>
                      <span>Oct (W9-W11)</span>
                      <span className="font-bold text-[#103B2A]">Nov (W12)</span>
                    </>
                  ) : (
                    activeBars.map(b => (
                      <span key={b.label} className={selectedBar && b.label === selectedBar.label ? 'font-bold text-[#103B2A]' : ''}>
                        {b.label}
                      </span>
                    ))
                  )}
                </div>

                {/* Selected Bar Information Pill */}
                <div className="mt-3 p-2.5 bg-[#F7F8F4] rounded-xl border border-[#DCE9DE] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#174D35]" />
                    <span className="font-semibold text-[#103B2A]">{selectedBar ? selectedBar.period : 'Select a period'}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {selectedBar ? <><span className="text-[#202820]/70">{selectedBar.hours} hours logged</span><span className="text-[#202820]/70">&bull;</span><span className="font-bold text-[#103B2A]">{formatNaira(selectedBar.earnings)}</span></> : <span className="text-[#202820]/70">Click a bar to inspect its details</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Right 4 Cols: Requests Needing You */}
            <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-[#DCE9DE] agri-card-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-[#103B2A]">
                    Requests needing you
                  </h3>
                  <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    &bull; {rentalRequests.length} new
                  </span>
                </div>

                <div className="space-y-4">
                  {rentalRequests.slice(0, 3).map((req) => (
                    <div 
                      key={req.id} 
                      className="p-3 bg-[#F7F8F4] rounded-xl border border-[#DCE9DE] space-y-2 hover:border-[#174D35]/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold text-[#103B2A]">
                            {req.farmerName} &bull; {req.equipmentTitle}
                          </p>
                          <p className="text-[11px] text-[#202820]/70 mt-0.5">
                            {req.days} days &bull; <strong className="text-[#103B2A]">{formatNaira(req.totalPayout)}</strong>
                          </p>
                          <p className="text-[10px] text-[#202820]/50 mt-0.5">{req.cropType}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleApproveWithLog(req)}
                          className="flex-1 min-h-[36px] py-1.5 bg-[#174D35] hover:bg-[#103B2A] text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleDeclineWithLog(req)}
                          className="flex-1 min-h-[36px] py-1.5 border border-[#DCE9DE] hover:bg-white text-[#202820]/80 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setRequestsModalOpen(true)}
                className="mt-4 w-full min-h-[44px] py-2.5 border border-[#DCE9DE] hover:border-[#174D35] rounded-xl text-xs font-semibold text-[#103B2A] transition-colors flex items-center justify-center gap-1.5"
              >
                <span>View all {rentalRequests.length} requests</span>
                <ChevronRight className="w-4 h-4 text-[#174D35]" />
              </button>
            </div>
          </div>

          {/* LOWER SECTION: Fleet Status Table (Exact match to 05OwnerDashboard) */}
          <div className="bg-white rounded-2xl p-6 border border-[#DCE9DE] agri-card-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#103B2A] tracking-tight">
                Fleet status
              </h2>
              <button
                onClick={() => onNavigateToFleetManagement?.()}
                className="text-xs font-semibold text-[#174D35] hover:underline flex items-center gap-1 min-h-[44px] py-1 px-1"
              >
                <span>Manage fleet</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#DCE9DE] text-[11px] font-bold text-[#202820]/60 uppercase tracking-wider">
                    <th className="py-3 px-4">MACHINE</th>
                    <th className="py-3 px-4">STATUS</th>
                    <th className="py-3 px-4">NEXT BOOKING</th>
                    <th className="py-3 px-4">NOV EARNINGS</th>
                    <th className="py-3 px-4">HEALTH</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE9DE]/60">
                  {fleetTableRows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F7F8F4] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#103B2A]">
                        <div className="flex items-center gap-2">
                          <span>{row.machine}</span>
                          <button
                            type="button"
                            onClick={() => onEditEquipment(fleetList.find(machine => machine.id === row.id)!)}
                            className="text-[#174D35] hover:text-[#103B2A]"
                            aria-label={`Edit ${row.machine}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatusWithLog(row.id, row.machine)}
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${row.statusColor}`}
                          title="Click to toggle status"
                        >
                          {row.status}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-[#202820]/80">{row.nextBooking}</td>
                      <td className="py-3.5 px-4 font-bold text-[#103B2A]">{row.novEarnings}</td>
                      <td className="py-3.5 px-4 text-[#202820]/70 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                        <span>{row.health}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* SHOWCASE FLEET REPORT */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#DCE9DE] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE9DE]">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#174D35]" />
                <h3 className="text-base font-bold text-[#103B2A]">Fleet Report</h3>
              </div>
              <button onClick={() => setReportModalOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-[#F7F8F4] rounded-xl text-xs space-y-2 border border-[#DCE9DE]">
              <div className="flex justify-between">
                <span>Fleet Size:</span>
                <span className="font-bold">{fleetList.length} listed units ({activeFleetCount} deployed)</span>
              </div>
              <div className="flex justify-between">
                <span>October Gross Payouts:</span>
                <span className="font-bold">{formatNaira(fleetEarnings)}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment status:</span>
                <span className="font-bold text-amber-700">Not connected (demo)</span>
              </div>
              <div className="flex justify-between">
                <span>Average Utilisation:</span>
                <span className="font-bold">{fleetUtilisation}%</span>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  printFleetReport();
                }}
                className="flex-1 py-2.5 bg-white border border-[#DCE9DE] hover:bg-[#F7F8F4] text-[#103B2A] rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Report</span>
              </button>
              <button
                onClick={() => {
                  downloadFleetReport();
                }}
                className="flex-1 py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download CSV report</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EARNINGS MODAL */}
      {earningsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DCE9DE] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE9DE]">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#174D35]" />
                <h3 className="text-base font-bold text-[#103B2A]">Fleet Earnings</h3>
              </div>
              <button onClick={() => setEarningsModalOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-[#E3ECE5] rounded-xl text-center">
              <span className="text-3xl font-bold text-[#103B2A]">{formatNaira(fleetEarnings)}</span>
              <p className="text-xs text-[#174D35] font-semibold mt-1">Reported earnings from listed equipment; payouts are not connected</p>
            </div>
            <div className="space-y-2 text-xs max-h-60 overflow-y-auto">
              {fleetList.length === 0 ? (
                <p className="p-4 bg-[#F7F8F4] rounded-lg text-center text-[#202820]/60">No equipment earnings recorded yet.</p>
              ) : fleetList.map(machine => (
                <div key={machine.id} className="flex justify-between gap-3 py-1.5 border-b border-[#DCE9DE]">
                  <span>{machine.title}</span>
                  <span className="font-bold">{formatNaira(machine.novemberEarnings || 0)}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setEarningsModalOpen(false)}
              className="w-full py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* REQUESTS MODAL */}
      {requestsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#DCE9DE] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE9DE]">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-[#174D35]" />
                <h3 className="text-base font-bold text-[#103B2A]">All Rental Requests ({rentalRequests.length})</h3>
              </div>
              <button onClick={() => setRequestsModalOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {rentalRequests.map((req) => (
                <button type="button" key={req.id} onClick={() => setSelectedRequest(req)} className="w-full text-left p-3 bg-[#F7F8F4] rounded-xl border border-[#DCE9DE] flex items-center justify-between gap-3 hover:border-[#174D35] transition-colors">
                  <div>
                    <p className="text-xs font-bold text-[#103B2A]">{req.farmerName} &bull; {req.equipmentTitle}</p>
                    <p className="text-[11px] text-[#202820]/70">{req.farmerLocation} &bull; {req.days} days ({formatNaira(req.totalPayout)})</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(event) => { event.stopPropagation(); void handleApproveWithLog(req); }}
                      className="px-3 py-1.5 bg-[#174D35] text-white rounded-lg text-xs font-semibold"
                    >
                      Approve
                    </button>
                    <button
                      onClick={(event) => { event.stopPropagation(); void handleDeclineWithLog(req); }}
                      className="px-3 py-1.5 border border-[#DCE9DE] text-[#202820]/80 rounded-lg text-xs font-semibold"
                    >
                      Decline
                    </button>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setRequestsModalOpen(false)}
              className="w-full py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {selectedRequest && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DCE9DE] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE9DE]"><div><p className="text-[10px] uppercase tracking-wider font-bold text-[#174D35]">Rental request</p><h3 className="text-base font-bold text-[#103B2A]">{selectedRequest.equipmentTitle}</h3></div><button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-black" aria-label="Close request details"><X className="w-5 h-5" /></button></div>
            <div className="grid grid-cols-2 gap-3 text-xs text-[#202820]/75">
              <p><strong>Farmer:</strong> {selectedRequest.farmerName}</p><p><strong>Status:</strong> {selectedRequest.status}</p>
              <p><strong>Farm location:</strong> {selectedRequest.farmerLocation}</p><p><strong>Farm size:</strong> {selectedRequest.farmSizeHectares} ha</p>
              <p><strong>Crop:</strong> {selectedRequest.cropType}</p><p><strong>Duration:</strong> {selectedRequest.days} day(s)</p>
              <p><strong>Start:</strong> {selectedRequest.startDate}</p><p><strong>End:</strong> {selectedRequest.endDate}</p>
              <p><strong>Payout:</strong> {formatNaira(selectedRequest.totalPayout)}</p><p><strong>Requested:</strong> {new Date(selectedRequest.requestTimestamp).toLocaleString()}</p>
            </div>
            <p className="text-[11px] text-[#202820]/60 break-all">Request reference: {selectedRequest.id}{selectedRequest.bookingId ? ` · Booking ${selectedRequest.bookingId}` : ''}</p>
            <button onClick={() => setSelectedRequest(null)} className="w-full py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold">Close</button>
          </div>
        </div>
      )}

      {/* VERIFIED REVIEWS MODAL */}
      {reviewsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#DCE9DE] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE9DE]">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-[#E6A23C] fill-current" />
                <h3 className="text-base font-bold text-[#103B2A]">Owner Verified Reviews</h3>
              </div>
              <button onClick={() => setReviewsModalOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-[#FEF4E5] rounded-xl text-center">
              <span className="text-3xl font-bold text-[#103B2A]">{ownerRating === '—' ? 'Not rated' : `${ownerRating} / 5.0`}</span>
              <p className="text-xs text-[#202820]/70 mt-1">{reviewCount} reviews recorded on listed equipment</p>
            </div>
            <div className="space-y-3 text-xs">
              {reviewCount === 0 ? (
                <p className="p-4 bg-[#F7F8F4] rounded-lg border border-[#DCE9DE] text-[#202820]/60 text-center">No reviews have been recorded yet.</p>
              ) : fleetList.filter(machine => machine.ownerReviewCount > 0).map(machine => (
                <div key={machine.id} className="p-2.5 bg-[#F7F8F4] rounded-lg border border-[#DCE9DE] flex justify-between gap-3">
                  <span className="font-bold text-[#103B2A]">{machine.title}</span>
                  <span className="text-[#202820]/70 shrink-0">{machine.ownerRating.toFixed(1)} · {machine.ownerReviewCount} reviews</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setReviewsModalOpen(false)}
              className="w-full py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* MANAGE FLEET MODAL */}
      {manageFleetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-[#DCE9DE] shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#DCE9DE]">
              <div className="flex items-center gap-2">
                <Tractor className="w-5 h-5 text-[#174D35]" />
                <h3 className="text-base font-bold text-[#103B2A]">Fleet Management</h3>
              </div>
              <button onClick={() => setManageFleetModalOpen(false)} className="text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {fleetTableRows.map((item) => (
                <div key={item.id} className="p-3 bg-[#F7F8F4] rounded-xl border border-[#DCE9DE] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#103B2A]">{item.machine}</p>
                    <p className="text-[11px] text-[#202820]/60">{item.nextBooking}</p>
                  </div>
                  <button
                    onClick={() => handleToggleStatusWithLog(item.id, item.machine)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${item.statusColor}`}
                  >
                    {item.status} (Toggle)
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setManageFleetModalOpen(false);
                  onOpenAddEquipmentModal();
                }}
                className="flex-1 py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold"
              >
                + Add New Machine
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
