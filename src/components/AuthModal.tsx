import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Lock, 
  Phone, 
  Mail, 
  User as UserIcon, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  MapPin,
  Building2
} from 'lucide-react';
import { User } from '../types';
import { 
  formatAndValidateNigerianPhone, 
  calculatePasswordStrength, 
  sanitizeInput 
} from '../utils/security';
import { NIGERIAN_STATES } from '../utils/location';
import { ApiService } from '../services/api';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: User, isNewAccount?: boolean) => void;
  initialRole?: 'farmer' | 'owner';
  initialIsSignUp?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  onClose,
  onLoginSuccess,
  initialRole = 'farmer',
  initialIsSignUp = false,
}) => {
  const [isSignUp, setIsSignUp] = useState<boolean>(initialIsSignUp);
  const [role, setRole] = useState<'farmer' | 'owner'>(initialRole);
  
  // Registration specific fields
  const [fullName, setFullName] = useState<string>('');
  const [rawPhone, setRawPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Farmer specific inputs: Farm Location & Scale
  const [farmState, setFarmState] = useState<string>('');
  const [farmLGA, setFarmLGA] = useState<string>('');
  const [farmPlotAddress, setFarmPlotAddress] = useState<string>('');
  const [farmSizeHectares, setFarmSizeHectares] = useState<number | ''>('');

  // Owner specific inputs: Depot Hub Location
  const [depotState, setDepotState] = useState<string>('');
  const [depotLGA, setDepotLGA] = useState<string>('');
  const [fleetCount, setFleetCount] = useState<number | ''>('');

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Password Strength
  const strength = calculatePasswordStrength(password);

  // Phone Validation
  const phoneValidation = formatAndValidateNigerianPhone(rawPhone);

  const validateEmail = (mail: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.trim());
  };

  const handleSignInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      setErrorMessage('Please enter a valid email address (e.g. name@domain.com)');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password');
      return;
    }

    try {
      const user = await ApiService.login(cleanEmail, password);
      onLoginSuccess(user);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Sign in failed. Please try again.');
    }
  };

  const handleSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!fullName.trim()) {
      setErrorMessage('Full name or entity name is required');
      return;
    }

    if (!email.trim() || !validateEmail(email)) {
      setErrorMessage('A valid email address is required during account creation');
      return;
    }

    if (!phoneValidation.isValid) {
      setErrorMessage(phoneValidation.error || 'Please enter a valid Nigerian mobile number (+234)');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return;
    }

    if (role === 'farmer' && (!farmLGA.trim() || !farmPlotAddress.trim())) {
      setErrorMessage('Please provide your farm LGA and plot address so operators can locate your field');
      return;
    }

    if (role === 'farmer' && !farmState) {
      setErrorMessage('Please select your farm state');
      return;
    }

    if (role === 'owner' && (!depotState || !depotLGA.trim())) {
      setErrorMessage('Please provide your depot state and LGA');
      return;
    }

    const locationString = role === 'farmer'
      ? `${sanitizeInput(farmPlotAddress)}, ${sanitizeInput(farmLGA)}, ${farmState}`
      : `${sanitizeInput(depotLGA)}, ${depotState}`;

    try {
      const loggedUser = await ApiService.register({
      name: sanitizeInput(fullName),
      phone: phoneValidation.formatted,
      email: email.trim().toLowerCase(),
      password,
      role,
      location: locationString,
      state: role === 'farmer' ? farmState : depotState,
      lga: role === 'farmer' ? sanitizeInput(farmLGA) : sanitizeInput(depotLGA),
      farmSizeHectares: role === 'farmer' && farmSizeHectares !== '' ? Number(farmSizeHectares) : undefined,
      fleetCount: role === 'owner' && fleetCount !== '' ? Number(fleetCount) : undefined,
      });
      onLoginSuccess(loggedUser, true);
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Account creation failed. Please try again.');
    }
  };

  const handleOAuthSignIn = (provider: 'Google' | 'SSO') => {
    setErrorMessage(`${provider} sign-in is not configured. Use an email and password for this showcase.`);
  };

  const handleQuickDemoFill = (targetRole: 'farmer' | 'owner') => {
    if (targetRole === 'farmer') {
      setRole('farmer');
      setFullName('Adewale Okafor');
      setEmail('adewale.okafor@agrirent.ng');
      setRawPhone('0803 445 8821');
      setPassword('AgriRent2026!');
      setFarmState('Oyo State');
      setFarmLGA('Akinyele');
      setFarmPlotAddress('Plot 14, Akinyele Agricultural Corridor');
      setFarmSizeHectares(8);
    } else {
      setRole('owner');
      setFullName('Tunde B. Kasali');
      setEmail('tunde.farms@agrirent.ng');
      setRawPhone('0802 331 9904');
      setPassword('FleetMaster#2026');
      setDepotState('Oyo State');
      setDepotLGA('Ibadan South-West');
      setFleetCount(8);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-[16px] max-w-lg w-full border border-[#DCE9DE] agri-elevated-shadow my-auto overflow-hidden relative max-h-[94vh] flex flex-col">
        {/* Header */}
        <div className="p-5 bg-[#103B2A] text-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-bold">
              {isSignUp ? 'Create an AgriRent Account' : 'Sign In to AgriRent'}
            </h3>
            <p className="text-xs text-[#DCE9DE]">
              {isSignUp ? 'Collect equipment rentals & verified machinery in Nigeria' : 'Enter your registered email and password to access your dashboard'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-white/80 hover:text-white rounded-[6px]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Quick Demo Fill Buttons */}
          <div className="p-2.5 bg-[#F7F8F4] rounded-[8px] border border-[#DCE9DE] flex items-center justify-between text-xs">
            <span className="text-[11px] text-[#202820]/70 font-medium">Demo Quick-Fill:</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoFill('farmer')}
                className="min-h-[44px] px-3 bg-[#DCE9DE] text-[#103B2A] rounded-[6px] text-xs font-semibold hover:bg-[#c2dcce] flex items-center justify-center"
              >
                Farmer
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoFill('owner')}
                className="min-h-[44px] px-3 bg-[#174D35] text-white rounded-[6px] text-xs font-semibold hover:bg-[#103B2A] flex items-center justify-center"
              >
                Machinery Owner
              </button>
            </div>
          </div>

          {/* Account Role Selector */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-[#103B2A] mb-1.5">
              Account Role
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('farmer')}
                className={`min-h-[44px] px-3 rounded-[8px] text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                  role === 'farmer'
                    ? 'border-[#174D35] bg-[#DCE9DE]/40 text-[#103B2A]'
                    : 'border-[#DCE9DE] bg-white text-[#202820]/70'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5 text-[#174D35]" />
                <span>Farmer</span>
              </button>

              <button
                type="button"
                onClick={() => setRole('owner')}
                className={`min-h-[44px] px-3 rounded-[8px] text-xs font-semibold border transition-colors flex items-center justify-center gap-1.5 ${
                  role === 'owner'
                    ? 'border-[#174D35] bg-[#DCE9DE]/40 text-[#103B2A]'
                    : 'border-[#DCE9DE] bg-white text-[#202820]/70'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-[#174D35]" />
                <span>Equipment Owner</span>
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-[8px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ======================================================== */}
          {/* SIGN IN FORM: REQUIRES JUST EMAIL ADDRESS AND PASSWORD    */}
          {/* ======================================================== */}
          {!isSignUp ? (
            <form onSubmit={handleSignInSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#174D35]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. adewale.okafor@agrirent.ng"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#103B2A]">Password</label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#174D35]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-9 pr-9 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] font-mono focus:outline-none focus:border-[#174D35]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 min-h-[44px] min-w-[32px] flex items-center justify-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-bold rounded-[8px] transition-colors shadow-sm mt-3 flex items-center justify-center gap-1.5"
              >
                <span>Sign In with Email</span>
                <ArrowRight className="w-4 h-4 text-[#E6A23C]" />
              </button>

              {/* Divider for OAuth & SSO */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-[#DCE9DE]"></div>
                <span className="flex-shrink mx-3 text-[11px] text-[#202820]/50 font-medium">or continue with</span>
                <div className="flex-grow border-t border-[#DCE9DE]"></div>
              </div>

              {/* OAuth and SSO Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('Google')}
                  className="min-h-[44px] px-3 py-2 border border-[#DCE9DE] hover:border-[#174D35] bg-white rounded-[8px] text-xs font-semibold text-[#103B2A] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('SSO')}
                  className="min-h-[44px] px-3 py-2 border border-[#DCE9DE] hover:border-[#174D35] bg-white rounded-[8px] text-xs font-semibold text-[#103B2A] flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <Building2 className="w-4 h-4 text-[#174D35]" />
                  <span>Co-op SSO</span>
                </button>
              </div>
            </form>
          ) : (
            /* ======================================================== */
            /* REGISTRATION FORM: COLLECTS USER EMAIL AS WELL           */
            /* ======================================================== */
            <form onSubmit={handleSignUpSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                  Full Name / Entity Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Adewale Adeleke"
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
                />
              </div>

              {/* User Email collected during registration */}
              <div>
                <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                  User Email Address (Required for account access)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#174D35]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. adewale@adelekefarms.ng"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                  Phone Number (Nigerian +234 format)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#174D35]/60 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rawPhone}
                    onChange={(e) => setRawPhone(e.target.value)}
                    placeholder="0803 123 4567"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] font-mono focus:outline-none focus:border-[#174D35]"
                  />
                </div>
                {phoneValidation.isValid ? (
                  <p className="text-[10px] text-green-700 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Validated: {phoneValidation.formatted}
                  </p>
                ) : (
                  <p className="text-[10px] text-[#202820]/60 mt-0.5">
                    Format: 070, 080, 081, 090, 091 (11 digits)
                  </p>
                )}
              </div>

              {/* Farm Location Input for Farmers */}
              {role === 'farmer' && (
                <div className="p-3 bg-[#F7F8F4] rounded-[10px] border border-[#DCE9DE] space-y-2.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#103B2A]">
                    <MapPin className="w-3.5 h-3.5 text-[#174D35]" />
                    <span>Farm Location (Input Your Farmland Coordinates)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#103B2A] mb-0.5">
                        State
                      </label>
                      <select
                        value={farmState}
                        onChange={(e) => setFarmState(e.target.value)}
                        className="w-full min-h-[44px] px-2.5 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"
                      >
                        <option value="">Select a state</option>
                        {NIGERIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-[#103B2A] mb-0.5">
                        LGA / Town
                      </label>
                      <input
                        type="text"
                        value={farmLGA}
                        onChange={(e) => setFarmLGA(e.target.value)}
                        placeholder="e.g. Oluyole, Saki, Ido"
                        className="w-full min-h-[44px] px-2.5 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#103B2A] mb-0.5">
                      Farm Plot Address / Landmark
                    </label>
                    <input
                      type="text"
                      value={farmPlotAddress}
                      onChange={(e) => setFarmPlotAddress(e.target.value)}
                      placeholder="e.g. Plot 14, Agricultural Belt gate"
                      className="w-full min-h-[44px] px-2.5 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#103B2A] mb-0.5">
                        Farm Size (Hectares)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={farmSizeHectares}
                        onChange={(e) => setFarmSizeHectares(Number(e.target.value))}
                        className="w-full min-h-[44px] px-2.5 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Owner Depot Location */}
              {role === 'owner' && (
                <div className="p-3 bg-[#F7F8F4] rounded-[10px] border border-[#DCE9DE] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#103B2A]">
                    <MapPin className="w-3.5 h-3.5 text-[#174D35]" />
                    <span>Depot / Workshop Location</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-[#103B2A] mb-0.5">State</label>
                      <select
                        value={depotState}
                        onChange={(e) => setDepotState(e.target.value)}
                        className="w-full min-h-[44px] px-2.5 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"
                      >
                        <option value="">Select a state</option>
                        {NIGERIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-[#103B2A] mb-0.5">Depot LGA</label>
                      <input
                        type="text"
                        value={depotLGA}
                        onChange={(e) => setDepotLGA(e.target.value)}
                        className="w-full min-h-[44px] px-2.5 py-1.5 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-[#103B2A]">Create Password</label>
                  <span 
                    className="text-[10px] font-bold uppercase"
                    style={{ color: strength.color }}
                  >
                    {strength.label}
                  </span>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] font-mono pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 min-h-[44px] min-w-[32px] flex items-center justify-center"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-bold rounded-[8px] transition-colors shadow-sm mt-3 flex items-center justify-center gap-1.5"
              >
                <span>Complete Registration</span>
                <ArrowRight className="w-4 h-4 text-[#E6A23C]" />
              </button>
            </form>
          )}

          {/* Toggle Login / Register */}
          <div className="text-center text-xs text-[#202820]/70 pt-2 border-t border-[#DCE9DE]">
            {isSignUp ? (
              <span>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setErrorMessage(null);
                  }}
                  className="font-bold text-[#174D35] hover:underline min-h-[44px] py-1 px-1"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                New to AgriRent?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setErrorMessage(null);
                  }}
                  className="font-bold text-[#174D35] hover:underline min-h-[44px] py-1 px-1"
                >
                  Create Account
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
