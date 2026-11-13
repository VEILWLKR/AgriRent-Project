import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Check, 
  CheckCircle2, 
  AlertCircle,
  LogOut,
  Trash2,
  Tractor,
  RefreshCw
} from 'lucide-react';
import { User as UserType, UserSettings } from '../types';
import { 
  formatAndValidateNigerianPhone, 
  calculatePasswordStrength, 
  sanitizeInput 
} from '../utils/security';
import { NIGERIAN_STATES } from '../utils/location';


interface SettingsViewProps {
  currentUser: UserType;
  onUpdateUser: (updatedUser: UserType) => Promise<UserType>;
  onChangePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onNavigateToDashboard?: () => void;
  registeredFleetUnits?: number;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onUpdateUser,
  onChangePassword,
  onLogout,
  onDeleteAccount,
  onNavigateToDashboard,
  registeredFleetUnits = 0,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'roles' | 'notifications' | 'payout' | 'security'>('profile');
  const [hasDualRole, setHasDualRole] = useState<boolean>(currentUser.hasDualRole ?? false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false);
  
  // Profile state
  const [name, setName] = useState<string>(currentUser.name);
  const [phone, setPhone] = useState<string>(currentUser.phone);
  const [email, setEmail] = useState<string>(currentUser.email);
  const [state, setState] = useState<string>(currentUser.state || '');
  const [lga, setLga] = useState<string>(currentUser.lga || '');
  const [farmAddress, setFarmAddress] = useState<string>(currentUser.location || '');
  const [farmSizeHectares, setFarmSizeHectares] = useState<number>(currentUser.farmSizeHectares || 0);
  const fleetCount = registeredFleetUnits || currentUser.fleetCount || 0;

  // Settings & Preferences
  const [smsAlerts, setSmsAlerts] = useState<boolean>(currentUser.settings?.smsAlerts ?? true);
  const [whatsAppAlerts, setWhatsAppAlerts] = useState<boolean>(currentUser.settings?.whatsAppAlerts ?? true);
  const [emailReceipts, setEmailReceipts] = useState<boolean>(currentUser.settings?.emailReceipts ?? true);
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(currentUser.settings?.searchRadiusKm ?? 35);
  const [payoutBank, setPayoutBank] = useState<string>(currentUser.settings?.payoutBank ?? '');
  const [payoutAccount, setPayoutAccount] = useState<string>(currentUser.settings?.payoutAccount ?? '');
  const [twoFactorAuth, setTwoFactorAuth] = useState<boolean>(currentUser.settings?.twoFactorAuth ?? false);

  // Security password state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');

  // Status feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordStrength = calculatePasswordStrength(newPassword);

  const showSuccess = (msg: string) => {
    setToastMessage(msg);
    setErrorMessage(null);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Full name is required');
      return;
    }

    const phoneVal = formatAndValidateNigerianPhone(phone);
    if (!phoneVal.isValid) {
      setErrorMessage(phoneVal.error || 'Please enter a valid Nigerian phone number');
      return;
    }

    const updatedSettings: UserSettings = {
      smsAlerts,
      whatsAppAlerts,
      emailReceipts,
      searchRadiusKm,
      payoutBank,
      payoutAccount,
      twoFactorAuth,
    };

    const updatedUser: UserType = {
      ...currentUser,
      name: sanitizeInput(name),
      phone: phoneVal.formatted,
      email: sanitizeInput(email),
      state,
      lga: sanitizeInput(lga),
      location: [sanitizeInput(farmAddress), sanitizeInput(lga), state].filter(Boolean).join(', '),
      farmSizeHectares: currentUser.role === 'farmer' || hasDualRole ? Number(farmSizeHectares) || undefined : currentUser.farmSizeHectares,
      fleetCount: currentUser.role === 'owner' || hasDualRole ? Number(registeredFleetUnits || fleetCount) || undefined : currentUser.fleetCount,
      settings: updatedSettings,
    };

    try {
      await onUpdateUser(updatedUser);
      showSuccess('Account settings and farm profile successfully saved.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save your profile.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New passwords do not match');
      return;
    }

    try {
      await onChangePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      showSuccess('Password updated.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update your password.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8F4] py-6 sm:py-8 overflow-x-hidden w-full">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#103B2A] text-white px-4 py-3 rounded-[10px] shadow-lg flex items-center gap-2 text-xs border border-[#DCE9DE]">
          <CheckCircle2 className="w-4 h-4 text-[#E6A23C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div>
          {onNavigateToDashboard && (
            <button
              type="button"
              onClick={onNavigateToDashboard}
              className="mb-2 text-xs font-semibold text-[#174D35] hover:text-[#103B2A] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>&larr; Return to {currentUser.role === 'owner' ? 'Owner Dashboard' : 'Farmer Dashboard'}</span>
            </button>
          )}
          <span className="text-xs font-semibold uppercase tracking-wider text-[#174D35]">
            Account Management &middot; {hasDualRole ? 'Farmer & Machinery Owner' : currentUser.role === 'farmer' ? 'Farmer Profile' : 'Machinery Owner Fleet'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#103B2A] tracking-tight mt-1">
            Platform Settings & Controls
          </h1>

          <p className="text-xs sm:text-sm text-[#202820]/70 mt-1">
            Configure your farm coordinates, dispatch notifications, payment accounts, and security preferences.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-[#DCE9DE] gap-2 overflow-x-auto pb-1">
          {[
            { id: 'profile', label: hasDualRole ? 'Farm, Depot & Profile Details' : currentUser.role === 'farmer' ? 'Farm & Profile Details' : 'Depot & Fleet Details' },
            { id: 'roles', label: 'Role Capabilities (Farmer/Owner)' },
            { id: 'notifications', label: 'Dispatch Alerts & SMS' },
            { id: 'payout', label: 'Payout details' },
            { id: 'security', label: 'Security & Session' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setErrorMessage(null);
              }}
              className={`min-h-[44px] flex items-center px-4 py-2 text-xs font-semibold rounded-t-[8px] whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-[#174D35] border-t-2 border-[#174D35] shadow-xs'
                  : 'text-[#202820]/70 hover:text-[#103B2A] hover:bg-white/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>


        {/* Error Callout */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[8px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Tab 1: Profile & Farm Location Controls */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="bg-white rounded-[16px] p-6 border border-[#DCE9DE] agri-card-shadow space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#103B2A]">
                {currentUser.role === 'farmer' ? 'Farmer & Farm Location Details' : 'Machinery Owner & Depot Hub'}
              </h2>
              <p className="text-xs text-[#202820]/70 mt-0.5">
                This location is used for GPS flatbed haulier routing and local machinery discovery.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                  Full Name / Legal Entity
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                  Primary Mobile Number (+234 format)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] font-mono focus:outline-none focus:border-[#174D35]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
                />
              </div>

              {(currentUser.role === 'farmer' || hasDualRole) && (
                <div>
                  <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                    Cultivated Farm Size (Hectares)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={farmSizeHectares}
                    onChange={(e) => setFarmSizeHectares(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] font-mono focus:outline-none focus:border-[#174D35]"
                  />
                </div>
              )}
              {(currentUser.role === 'owner' || hasDualRole) && (
                <div>
                  <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                    Registered Machinery Fleet Units
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    value={registeredFleetUnits || fleetCount}
                    readOnly
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] font-mono focus:outline-none focus:border-[#174D35]"
                  />
                  <p className="text-[10px] text-[#202820]/55 mt-1">Calculated from your equipment listings.</p>
                </div>
              )}
            </div>

            {/* Farm Location Sub-Section */}
            <div className="pt-4 border-t border-[#DCE9DE] space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#103B2A]">
                {currentUser.role === 'farmer' ? 'Farm Plot Coordinates & Address' : 'Equipment Depot / Workshop Location'}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                    State
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full min-h-[44px] px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
                  >
                    <option value="">Select state</option>
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                    Local Government Area (LGA)
                  </label>
                  <input
                    type="text"
                    value={lga}
                    onChange={(e) => setLga(e.target.value)}
                    placeholder="e.g. Oluyole, Ido, Saki, Abeokuta North"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                  {currentUser.role === 'farmer' ? 'Farm Plot Address / Access Landmark' : 'Depot / Workshop Address / Access Landmark'}
                </label>
                <input
                  type="text"
                  value={farmAddress}
                  onChange={(e) => setFarmAddress(e.target.value)}
                  placeholder="e.g. Km 14, Old Lagos-Ibadan Road, Near Agricultural Belt Junction"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
                />
              </div>

              {/* Machinery Search Radius Slider */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-[#103B2A]">
                    Preferred Machinery Dispatch Radius
                  </label>
                  <span className="text-xs font-bold font-mono text-[#174D35]">
                    {searchRadiusKm} km
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={searchRadiusKm}
                  onChange={(e) => setSearchRadiusKm(Number(e.target.value))}
                  className="w-full accent-[#174D35] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#202820]/60 mt-1 font-mono">
                  <span>10 km (Immediate LGA)</span>
                  <span>50 km (Inter-State)</span>
                  <span>100 km (Regional Hub)</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#DCE9DE] flex justify-end">
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-bold rounded-[8px] shadow-sm transition-colors flex items-center gap-1.5"
              >
                <Check className="w-4 h-4 text-[#E6A23C]" />
                <span>Save Profile Changes</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Notification & Dispatch Preferences */}
        {/* Tab: Role Capabilities & Switcher (Farmer / Owner) */}
        {activeTab === 'roles' && (
          <div className="bg-white rounded-[16px] p-6 border border-[#DCE9DE] agri-card-shadow space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#103B2A]">
                Account Role Capabilities &amp; Dual-Role Access
              </h2>
              <p className="text-xs text-[#202820]/70 mt-0.5">
                Enable or disable dual capabilities to rent machinery for your farm acreage as a Farmer and list machinery fleet as an Owner.
              </p>
            </div>

            {/* Current Active Role Card */}
            <div className="p-4 bg-[#F7F8F4] rounded-xl border border-[#DCE9DE] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#174D35]">
                  Active Role
                </span>
                <h3 className="text-sm font-bold text-[#103B2A] mt-0.5 capitalize">
                  {currentUser.role === 'farmer' ? 'Farmer account' : 'Machinery owner account'}
                </h3>
                <p className="text-xs text-[#202820]/70 mt-0.5">
                  {currentUser.role === 'farmer' 
                    ? 'Currently registered to book equipment for farm acreage in Nigeria.' 
                    : 'Currently registered to list and manage machinery.'}
                </p>
              </div>

              {hasDualRole && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newRole = currentUser.role === 'farmer' ? 'owner' : 'farmer';
                      onUpdateUser({ ...currentUser, role: newRole });
                      showSuccess(`Switched active view to ${newRole === 'farmer' ? 'Farmer' : 'Owner Fleet'}!`);
                    }}
                    className="min-h-[44px] px-4 py-2 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Switch to {currentUser.role === 'farmer' ? 'Owner Fleet' : 'Farmer'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Dual-Role Capabilities Activation Switch */}
            <div className="p-5 border border-[#DCE9DE] rounded-xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Tractor className="w-5 h-5 text-[#174D35]" />
                    <h4 className="text-sm font-bold text-[#103B2A]">
                      {currentUser.role === 'farmer' 
                        ? 'Activate Machinery Owner Capabilities' 
                        : 'Activate Farmer Equipment Renter Capabilities'}
                    </h4>
                  </div>
                  <p className="text-xs text-[#202820]/75 leading-relaxed max-w-xl">
                    {currentUser.role === 'farmer'
                      ? 'Own machinery? Turn this on to become an Owner as well. You will be able to list tractors and implements, manage incoming rental bookings, and unlock the segmented [ Farmer | Owner ] toggle in your dashboard.'
                      : 'Operate farmland? Turn this on to become a Farmer as well. You will be able to search machinery and submit booking requests.'}
                  </p>
                </div>

                {/* Toggle Switch */}
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !hasDualRole;
                    setHasDualRole(nextVal);
                    onUpdateUser({ ...currentUser, hasDualRole: nextVal });
                    if (nextVal) {
                      showSuccess('Dual-Role enabled! The [ Farmer | Owner ] toggle is now unlocked in your dashboard sidebar.');
                    } else {
                      showSuccess(`Dual-Role disabled. Your account is now strictly set to ${currentUser.role}.`);
                    }
                  }}
                  className={`w-14 h-8 rounded-full transition-colors relative flex items-center px-1 shrink-0 ${
                    hasDualRole ? 'bg-[#174D35]' : 'bg-gray-300'
                  }`}
                  aria-label="Toggle dual role access"
                >
                  <span
                    className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform transform ${
                      hasDualRole ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Status Notice */}
              <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                hasDualRole ? 'bg-[#E3ECE5] text-[#103B2A] font-medium' : 'bg-[#F7F8F4] text-[#202820]/70'
              }`}>
                <CheckCircle2 className={`w-4 h-4 ${hasDualRole ? 'text-[#174D35]' : 'text-gray-400'}`} />
                <span>
                  {hasDualRole 
                    ? 'Dual-role active: The [ Farmer | Owner ] toggle is visible at the top of your sidebar.'
                    : 'Single-role mode: The toggle is hidden on your dashboard until you enable this feature.'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Notifications */}
        {activeTab === 'notifications' && (
          <div className="bg-white rounded-[16px] p-6 border border-[#DCE9DE] agri-card-shadow space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#103B2A]">
                Dispatch Alerts & Messaging Controls
              </h2>
              <p className="text-xs text-[#202820]/70 mt-0.5">
                Notification preferences are saved, but SMS, WhatsApp, and email delivery are not connected in this showcase.
              </p>
            </div>

            <div className="space-y-4 divide-y divide-[#DCE9DE]">
              <div className="pt-2 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#103B2A]">SMS Dispatch Alerts</h4>
                  <p className="text-[11px] text-[#202820]/70">
                    Receive direct text messages when a haulier is dispatched, arrives at your farm gate, or completes work.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSmsAlerts(!smsAlerts)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                    smsAlerts ? 'bg-[#174D35]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                      smsAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#103B2A]">WhatsApp Booking Updates</h4>
                  <p className="text-[11px] text-[#202820]/70">
                    WhatsApp notifications are not sent by this showcase.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setWhatsAppAlerts(!whatsAppAlerts)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                    whatsAppAlerts ? 'bg-[#174D35]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                      whatsAppAlerts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[#103B2A]">Email receipts</h4>
                  <p className="text-[11px] text-[#202820]/70">
                    Email receipts and insurance documents are not sent; no payment is processed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmailReceipts(!emailReceipts)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                    emailReceipts ? 'bg-[#174D35]' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                      emailReceipts ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-[#DCE9DE] flex justify-end">
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-6 py-2.5 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-bold rounded-[8px] shadow-sm transition-colors"
              >
                Save Notification Settings
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Payout details */}
        {activeTab === 'payout' && (
          <div className="bg-white rounded-[16px] p-6 border border-[#DCE9DE] agri-card-shadow space-y-6">
            <div>
              <h2 className="text-base font-bold text-[#103B2A]">
                Banking & Automated Settlement
              </h2>
              <p className="text-xs text-[#202820]/70 mt-0.5">
                {currentUser.role === 'owner'
                  ? 'Save a preferred Nigerian bank or wallet for future settlement workflows.'
                  : 'Save a preferred account for future refunds and deposit releases.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                  Settlement Institution
                </label>
                <select
                  value={payoutBank}
                  onChange={(e) => setPayoutBank(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
                >
                  <option value="">Select institution</option>
                  <option>OPay (PayCom)</option>
                  <option>Kuda Bank</option>
                  <option>Guaranty Trust Bank (GTBank)</option>
                  <option>Zenith Bank</option>
                  <option>First Bank of Nigeria</option>
                  <option>Access Bank</option>
                  <option>United Bank for Africa (UBA)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                  10-Digit NUBAN Account / OPay Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={payoutAccount}
                  onChange={(e) => setPayoutAccount(e.target.value)}
                  placeholder="e.g. 9023319904"
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] font-mono focus:outline-none focus:border-[#174D35]"
                />
              </div>
            </div>

            <div className="p-3 bg-[#DCE9DE]/30 rounded-[10px] border border-[#DCE9DE] text-xs text-[#103B2A] flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-[#174D35] shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                <strong>Showcase only:</strong> payout details are stored in your profile but are not verified or used to make payments.
              </p>
            </div>

            <div className="pt-4 border-t border-[#DCE9DE] flex justify-end">
              <button
                type="button"
                onClick={handleSaveProfile}
                className="px-6 py-2.5 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-bold rounded-[8px] shadow-sm transition-colors"
              >
                Update Banking Details
              </button>
            </div>
          </div>
        )}

        {/* Tab 4: Security & Password Update */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <form onSubmit={handleChangePassword} className="bg-white rounded-[16px] p-6 border border-[#DCE9DE] agri-card-shadow space-y-4">
              <div>
                <h2 className="text-base font-bold text-[#103B2A]">
                  Password & Cryptographic Credentials
                </h2>
                <p className="text-xs text-[#202820]/70 mt-0.5">
                  Passwords are stored on the server as salted scrypt hashes; the original password is not saved.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] font-mono focus:outline-none focus:border-[#174D35]"
                  />
                  {newPassword && (
                    <p className="text-[10px] mt-1 font-semibold" style={{ color: passwordStrength.color }}>
                      Strength: {passwordStrength.label}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] font-mono focus:outline-none focus:border-[#174D35]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-bold rounded-[8px] shadow-sm transition-colors"
                >
                  Update Password
                </button>
              </div>
            </form>

            {/* Two-Factor Authentication Card */}
            <div className="bg-white rounded-[16px] p-6 border border-[#DCE9DE] agri-card-shadow flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-[#103B2A]">Two-Factor Authorization (2FA)</h3>
                <p className="text-[11px] text-[#202820]/70 mt-0.5">
                  Require an SMS OTP on {currentUser.phone} before authorizing high-value equipment rental payouts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTwoFactorAuth(!twoFactorAuth);
                  showSuccess(`Two-factor authentication ${!twoFactorAuth ? 'enabled' : 'disabled'}.`);
                }}
                className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                  twoFactorAuth ? 'bg-[#174D35]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                    twoFactorAuth ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Active Session Termination */}
            <div className="bg-white rounded-[16px] p-6 border border-[#DCE9DE] agri-card-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-[#103B2A]">Terminate Active Session</h3>
                <p className="text-[11px] text-[#202820]/70 mt-0.5">
                  Sign out of your AgriRent account on this device. You will return to the public marketplace.
                </p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="min-h-[44px] px-5 py-2 border border-[#DCE9DE] hover:border-red-400 bg-white hover:bg-red-50 text-[#202820] hover:text-red-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors self-start sm:self-auto shrink-0"
              >
                <LogOut className="w-4 h-4 text-red-600" />
                <span>Log Out of Session</span>
              </button>
            </div>

            {/* Danger Zone: Account Deletion */}
            <div className="bg-red-50/40 rounded-[16px] p-6 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-xs font-bold text-red-900">Danger Zone: Delete AgriRent Account</h3>
                <p className="text-[11px] text-red-700/80 mt-0.5 max-w-lg">
                  Permanently erase your account, farm coordinates, saved equipment wishlist, and active machinery listings. This operation is non-reversible.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="min-h-[44px] px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors self-start sm:self-auto shrink-0 shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        )}

      </div>


      {/* Delete Account Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-red-200 space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-[#103B2A]">
                Permanently Delete Account?
              </h3>
              <p className="text-xs text-[#202820]/75 mt-1 leading-relaxed">
                Are you sure you want to delete the account for <span className="font-semibold text-black">{currentUser.name}</span> ({currentUser.email})? All your farm acreage records, saved machinery wishlist, and listings will be permanently wiped.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 min-h-[44px] border border-[#DCE9DE] bg-white hover:bg-[#F7F8F4] text-[#202820] text-xs font-semibold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  onDeleteAccount();
                }}
                className="flex-1 min-h-[44px] bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
