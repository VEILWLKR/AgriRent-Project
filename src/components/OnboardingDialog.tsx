import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, MapPin, Tractor, Wallet, X } from 'lucide-react';
import { User, UserSettings } from '../types';

interface OnboardingDialogProps {
  currentUser: User;
  onComplete: (updatedUser: User) => Promise<void>;
  onNavigateToSettings?: () => void;
}

const institutions = [
  'OPay (PayCom)',
  'Kuda Bank',
  'Guaranty Trust Bank (GTBank)',
  'Zenith Bank',
  'First Bank of Nigeria',
  'Access Bank',
  'United Bank for Africa (UBA)',
];

export const OnboardingDialog: React.FC<OnboardingDialogProps> = ({ currentUser, onComplete, onNavigateToSettings }) => {
  const [step, setStep] = useState(0);
  const [payoutBank, setPayoutBank] = useState(currentUser.settings?.payoutBank || '');
  const [payoutAccount, setPayoutAccount] = useState(currentUser.settings?.payoutAccount || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isOwner = currentUser.role === 'owner' || currentUser.hasDualRole;
  const finish = async (savePayout = false) => {
    setSaving(true);
    setError(null);
    try {
      const settings: UserSettings = {
        smsAlerts: currentUser.settings?.smsAlerts ?? true,
        whatsAppAlerts: currentUser.settings?.whatsAppAlerts ?? true,
        emailReceipts: currentUser.settings?.emailReceipts ?? true,
        searchRadiusKm: currentUser.settings?.searchRadiusKm ?? 35,
        twoFactorAuth: currentUser.settings?.twoFactorAuth ?? false,
        payoutBank: savePayout ? payoutBank : currentUser.settings?.payoutBank,
        payoutAccount: savePayout ? payoutAccount.replace(/\D/g, '') : currentUser.settings?.payoutAccount,
      };
      await onComplete({ ...currentUser, settings, onboardingCompleted: true });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Onboarding could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const continueToFinish = () => {
    if (!payoutBank || !/^\d{10,11}$/.test(payoutAccount.replace(/\D/g, ''))) {
      setError('Add a valid bank or wallet and account number, or choose “Skip for now”.');
      return;
    }
    void finish(true);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <section className="bg-white rounded-2xl max-w-md w-full border border-[#DCE9DE] shadow-2xl max-h-[92vh] overflow-y-auto">
        <header className="p-5 bg-[#103B2A] text-white flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-[#E6A23C]">Welcome to AgriRent</p>
            <h2 className="text-lg font-bold mt-1">Let’s get you ready</h2>
            <p className="text-xs text-[#DCE9DE] mt-1">A quick setup for your {isOwner ? 'machinery owner' : 'farmer'} account.</p>
          </div>
          <button type="button" onClick={() => void finish(false)} disabled={saving} className="min-w-[44px] min-h-[44px] flex items-center justify-center text-white/80 hover:text-white" aria-label="Skip onboarding">
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="p-5 sm:p-6 space-y-5">
          <div className="flex items-center gap-2" aria-label={`Onboarding step ${step + 1} of 2`}>
            {[0, 1].map(item => <span key={item} className={`h-1.5 flex-1 rounded-full ${item <= step ? 'bg-[#174D35]' : 'bg-[#DCE9DE]'}`} />)}
          </div>

          {step === 0 ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F7F8F4] border border-[#DCE9DE]">
                {isOwner ? <Tractor className="w-5 h-5 text-[#174D35] shrink-0" /> : <MapPin className="w-5 h-5 text-[#174D35] shrink-0" />}
                <div>
                  <h3 className="text-sm font-bold text-[#103B2A]">{isOwner ? 'List and earn from your machinery' : 'Find machinery near your farm'}</h3>
                  <p className="text-xs text-[#202820]/70 mt-1 leading-relaxed">
                    {isOwner ? 'Add equipment, receive rental requests, and keep your payout preference ready for future settlement.' : 'Your registered farm location helps us show closer equipment and relevant rental options. A payout preference also helps with future refunds.'}
                  </p>
                </div>
              </div>
              <div className="space-y-2 text-xs text-[#202820]/75">
                <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#174D35]" />Complete your profile details</p>
                <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#174D35]" />Use the dashboard tools when you are ready</p>
              </div>
              <button type="button" onClick={() => setStep(1)} className="w-full min-h-[44px] py-2.5 bg-[#174D35] hover:bg-[#103B2A] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {isOwner ? (
                <>
                  <div>
                    <div className="flex items-center gap-2"><Wallet className="w-5 h-5 text-[#174D35]" /><h3 className="text-sm font-bold text-[#103B2A]">Add payout details</h3></div>
                    <p className="text-xs text-[#202820]/70 mt-2">This saves your preferred account for future owner settlement workflows. You can change it later in Settings.</p>
                  </div>
                  <label className="block text-xs font-semibold text-[#103B2A]">Settlement institution
                    <select value={payoutBank} onChange={event => setPayoutBank(event.target.value)} className="mt-1 w-full min-h-[44px] px-3 py-2 bg-white border border-[#DCE9DE] rounded-lg font-normal">
                      <option value="">Select institution</option>{institutions.map(institution => <option key={institution}>{institution}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-[#103B2A]">NUBAN / wallet number
                    <input inputMode="numeric" maxLength={11} value={payoutAccount} onChange={event => setPayoutAccount(event.target.value.replace(/\D/g, ''))} placeholder="10 or 11 digits" className="mt-1 w-full min-h-[44px] px-3 py-2 bg-white border border-[#DCE9DE] rounded-lg font-mono font-normal" />
                  </label>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2"><MapPin className="w-5 h-5 text-[#174D35]" /><h3 className="text-sm font-bold text-[#103B2A]">Your farm is ready to go</h3></div>
                  <p className="text-xs text-[#202820]/70 leading-relaxed">Your farm location is saved for distance-based recommendations. Add a preferred account for future refunds, then explore the marketplace or open Farm Management.</p>
                  <div className="p-3 rounded-xl bg-[#F7F8F4] border border-[#DCE9DE] text-xs text-[#103B2A]">Farm location: <strong>{currentUser.location || 'Not provided yet'}</strong></div>
                  <label className="block text-xs font-semibold text-[#103B2A]">Settlement / refund institution
                    <select value={payoutBank} onChange={event => setPayoutBank(event.target.value)} className="mt-1 w-full min-h-[44px] px-3 py-2 bg-white border border-[#DCE9DE] rounded-lg font-normal">
                      <option value="">Select institution</option>{institutions.map(institution => <option key={institution}>{institution}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-[#103B2A]">NUBAN / wallet number
                    <input inputMode="numeric" maxLength={11} value={payoutAccount} onChange={event => setPayoutAccount(event.target.value.replace(/\D/g, ''))} placeholder="10 or 11 digits" className="mt-1 w-full min-h-[44px] px-3 py-2 bg-white border border-[#DCE9DE] rounded-lg font-mono font-normal" />
                  </label>
                </>
              )}
              {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button type="button" onClick={() => void finish(false)} disabled={saving} className="min-h-[44px] py-2.5 border border-[#DCE9DE] text-[#103B2A] rounded-xl text-xs font-bold disabled:opacity-50">Skip for now</button>
                <button type="button" onClick={continueToFinish} disabled={saving} className="min-h-[44px] py-2.5 bg-[#174D35] text-white rounded-xl text-xs font-bold disabled:opacity-50">{saving ? 'Saving…' : isOwner ? 'Save & finish' : 'Finish setup'}</button>
              </div>
              {onNavigateToSettings && <button type="button" onClick={() => { void finish(false); onNavigateToSettings(); }} className="w-full text-[11px] text-[#174D35] font-semibold hover:underline">Open full settings instead</button>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
