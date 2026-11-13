import React, { useState } from 'react';
import { 
  ShieldCheck, 
  MapPin, 
  Truck, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  AlertCircle
} from 'lucide-react';
import { Equipment, Booking, DeliveryMethod, PaymentMethod, User } from '../types';
import { formatNaira, calculateBookingPricing, calculateDateDiffDays } from '../utils/formatters';
import { formatAndValidateNigerianPhone, sanitizeInput } from '../utils/security';
import { NIGERIAN_STATES } from '../utils/location';
import { ApiService } from '../services/api';
import { getEquipmentDisplayImage } from '../utils/equipmentImages';

interface BookingFlowProps {
  equipment: Equipment;
  currentUser?: User;
  onClose: () => void;
  onBookingConfirmed: (newBooking: Booking) => Promise<void>;
  onViewMyBookings: () => void;
}

export const BookingFlow: React.FC<BookingFlowProps> = ({
  equipment,
  currentUser,
  onClose,
  onBookingConfirmed,
  onViewMyBookings,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Dates
  const [startDate, setStartDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return date.toISOString().slice(0, 10);
  });

  // Step 2: Delivery & Farm Details
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('delivery');
  const [farmAddress, setFarmAddress] = useState<string>(currentUser?.location || 'Plot 14, Oluyole Agricultural Belt');
  const [selectedState, setSelectedState] = useState<string>(currentUser?.state || 'Oyo State');
  const [selectedLGA, setSelectedLGA] = useState<string>(currentUser?.lga || 'Oluyole');
  const [farmerPhone, setFarmerPhone] = useState<string>(currentUser?.phone || '0803 445 8821');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Step 3: Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('opay');
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Step 4: Confirmed Booking Details
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Calculated pricing
  const rentalDays = calculateDateDiffDays(startDate, endDate);
  const pricing = calculateBookingPricing(equipment.dailyRate, rentalDays, deliveryMethod);

  const handleDatesNext = () => {
    if (new Date(startDate) > new Date(endDate)) {
      alert("Start date must be before end date.");
      return;
    }
    setStep(2);
  };

  const handleDetailsNext = () => {
    const phoneVal = formatAndValidateNigerianPhone(farmerPhone);
    if (!phoneVal.isValid) {
      setPhoneError(phoneVal.error || 'Invalid phone format');
      return;
    }
    setPhoneError(null);
    setStep(3);
  };

  const handleConfirmAndPay = async () => {
    setIsProcessingPayment(true);
    setPaymentError(null);
    try {
      const newBooking = await ApiService.createBooking({
        equipmentId: equipment.id,
        startDate,
        endDate,
        farmAddress: sanitizeInput(farmAddress),
        state: selectedState,
        lga: selectedLGA,
        farmerPhone: formatAndValidateNigerianPhone(farmerPhone).formatted,
        deliveryMethod,
        paymentMethod,
      });
      setConfirmedBooking(newBooking);
      await onBookingConfirmed(newBooking);
      setStep(4);
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Booking could not be saved.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-[16px] max-w-4xl w-full border border-[#DCE9DE] agri-elevated-shadow my-auto overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Bar */}
        <div className="px-6 py-4 bg-[#103B2A] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-1 text-white/70 hover:text-white rounded"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-bold">Equipment Rental Booking</h2>
              <p className="text-xs text-[#DCE9DE]">{equipment.title}</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#E6A23C] font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>Demo booking</span>
          </div>
        </div>

        {/* 4-Step Progress Indicator */}
        <div className="bg-[#F7F8F4] px-6 py-3 border-b border-[#DCE9DE]">
          <div className="flex items-center justify-between max-w-xl mx-auto">
            {[
              { num: 1, label: 'Dates' },
              { num: 2, label: 'Farm Details' },
              { num: 3, label: 'Demo Payment' },
              { num: 4, label: 'Receipt' },
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-colors ${
                      step === s.num
                        ? 'bg-[#174D35] text-white'
                        : step > s.num
                        ? 'bg-green-700 text-white'
                        : 'bg-[#DCE9DE] text-[#103B2A]'
                    }`}
                  >
                    {step > s.num ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                  </div>
                  <span
                    className={`text-xs font-medium hidden sm:inline ${
                      step === s.num ? 'text-[#103B2A] font-bold' : 'text-[#202820]/60'
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
                {idx < 3 && <div className="flex-1 h-0.5 mx-2 bg-[#DCE9DE]" />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content Body: Split Left Form / Right Price Summary */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-12 gap-8">
          {/* Main Step Body */}
          <div className="md:col-span-7 space-y-5">
            {/* Step 1: Dates & Duration */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="border-b border-[#DCE9DE] pb-2">
                  <h3 className="text-base font-bold text-[#103B2A]">Step 1: Choose Rental Dates</h3>
                  <p className="text-xs text-[#202820]/70">
                    Select dates for a demo booking request. No equipment is reserved until an owner confirms it.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] focus:outline-none focus:border-[#174D35]"
                    />
                  </div>
                </div>

                <div className="p-3 bg-[#DCE9DE]/30 rounded-[10px] border border-[#DCE9DE] text-xs space-y-1">
                  <div className="flex justify-between font-bold text-[#103B2A]">
                    <span>Total Duration:</span>
                    <span className="font-mono">{rentalDays} Day(s)</span>
                  </div>
                  <p className="text-[11px] text-[#202820]/70">
                    Operator arrives on farm at 7:30 AM on {startDate}. Full working day shift included.
                  </p>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleDatesNext}
                    className="px-6 py-2.5 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-bold rounded-[8px] flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Continue to Details</span>
                    <ArrowRight className="w-4 h-4 text-[#E6A23C]" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Delivery & Farm Details */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="border-b border-[#DCE9DE] pb-2">
                  <h3 className="text-base font-bold text-[#103B2A]">Step 2: Delivery & Field Location</h3>
                  <p className="text-xs text-[#202820]/70">
                    Tell us where to transport the machinery.
                  </p>
                </div>

                {/* Delivery Method Selector */}
                <div>
                  <label className="block text-xs font-semibold text-[#103B2A] mb-2">
                    Transport Option
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('delivery')}
                      className={`p-3 rounded-[10px] border text-left transition-colors ${
                        deliveryMethod === 'delivery'
                          ? 'border-[#174D35] bg-[#DCE9DE]/30 text-[#103B2A]'
                          : 'border-[#DCE9DE] bg-white text-[#202820]'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <Truck className="w-4 h-4 text-[#174D35]" />
                        <span>Deliver to my farm</span>
                      </div>
                      <p className="text-[11px] text-[#202820]/70 mt-1">
                        Heavy flatbed transport &middot; +₦12,500
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryMethod('pickup')}
                      className={`p-3 rounded-[10px] border text-left transition-colors ${
                        deliveryMethod === 'pickup'
                          ? 'border-[#174D35] bg-[#DCE9DE]/30 text-[#103B2A]'
                          : 'border-[#DCE9DE] bg-white text-[#202820]'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-bold text-xs">
                        <MapPin className="w-4 h-4 text-[#174D35]" />
                        <span>Pickup at Depot</span>
                      </div>
                      <p className="text-[11px] text-[#202820]/70 mt-1">
                        Collect with your trailer &middot; Free (₦0)
                      </p>
                    </button>
                  </div>
                </div>

                {/* Farm Location Address */}
                {deliveryMethod === 'delivery' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#103B2A] mb-1">State</label>
                        <select
                          value={selectedState}
                          onChange={(e) => setSelectedState(e.target.value)}
                          className="w-full min-h-[44px] px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"
                        >
                          {NIGERIAN_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[#103B2A] mb-1">Local Govt Area (LGA)</label>
                        <input
                          type="text"
                          value={selectedLGA}
                          onChange={(e) => setSelectedLGA(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#103B2A] mb-1">Farm Plot Address / Landmark</label>
                      <input
                        type="text"
                        value={farmAddress}
                        onChange={(e) => setFarmAddress(e.target.value)}
                        placeholder="e.g. Plot 14, Near Oluyole Forest Belt gate"
                        className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px]"
                      />
                    </div>
                  </div>
                )}

                {/* Farmer Phone Validation in +234 Format */}
                <div>
                  <label className="block text-xs font-semibold text-[#103B2A] mb-1">
                    Contact Phone Number (Driver SMS / OTP Dispatch)
                  </label>
                  <input
                    type="text"
                    value={farmerPhone}
                    onChange={(e) => setFarmerPhone(e.target.value)}
                    placeholder="0803 123 4567 or +234..."
                    className="w-full px-3 py-2 text-xs bg-white border border-[#DCE9DE] rounded-[8px] font-mono"
                  />
                  {phoneError ? (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {phoneError}
                    </p>
                  ) : (
                    <p className="text-[10px] text-[#202820]/60 mt-0.5">
                      Formatted as Nigerian +234 MSISDN standard.
                    </p>
                  )}
                </div>

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs font-semibold text-[#202820]/70 hover:underline"
                  >
                    Back to Dates
                  </button>
                  <button
                    onClick={handleDetailsNext}
                    className="px-6 py-2.5 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-bold rounded-[8px] flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Continue to Demo Payment</span>
                    <ArrowRight className="w-4 h-4 text-[#E6A23C]" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment Method */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="border-b border-[#DCE9DE] pb-2">
                  <h3 className="text-base font-bold text-[#103B2A]">Step 3: Demo Payment Choice</h3>
                  <p className="text-xs text-[#202820]/70">
                    Estimated total: <strong className="text-[#174D35] font-mono">{formatNaira(pricing.total)}</strong>. No payment will be collected.
                  </p>
                </div>

                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
                  Showcase only: this selection records a booking request; it does not contact a payment provider or move money. Do not enter card or bank details.
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'opay', label: 'OPay (demo)', sub: 'No payment request' },
                    { id: 'verve', label: 'Verve (demo)', sub: 'No card details needed' },
                    { id: 'transfer', label: 'Transfer (demo)', sub: 'No bank details needed' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaymentMethod(p.id as PaymentMethod)}
                      className={`p-2.5 rounded-[8px] border text-left transition-colors ${
                        paymentMethod === p.id
                          ? 'border-[#174D35] bg-[#DCE9DE]/30 text-[#103B2A]'
                          : 'border-[#DCE9DE] bg-white text-[#202820]'
                      }`}
                    >
                      <p className="text-xs font-bold">{p.label}</p>
                      <p className="text-[10px] text-[#202820]/60">{p.sub}</p>
                    </button>
                  ))}
                </div>

                {paymentError && <p role="alert" className="text-xs text-red-700">{paymentError}</p>}

                <div className="pt-4 flex items-center justify-between">
                  <button
                    onClick={() => setStep(2)}
                    className="text-xs font-semibold text-[#202820]/70 hover:underline"
                  >
                    Back to Farm Details
                  </button>

                  <button
                    onClick={handleConfirmAndPay}
                    disabled={isProcessingPayment}
                    className="px-6 py-3 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-bold rounded-[8px] flex items-center gap-2 shadow-sm disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <span>Saving booking request…</span>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#E6A23C]" />
                        <span>Submit demo booking</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Booking confirmation */}
            {step === 4 && confirmedBooking && (
              <div className="space-y-4 py-2">
                <div className="w-14 h-14 rounded-full bg-green-100 text-green-700 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="text-center space-y-1">
                  <span className="text-xs font-bold text-[#174D35] uppercase tracking-wider">
                    Booking request saved
                  </span>
                  <h3 className="text-xl font-bold text-[#103B2A]">
                    Booking Confirmed!
                  </h3>
                  <p className="text-xs text-[#202820]/70 max-w-sm mx-auto">
                    Your request for {equipment.ownerName}'s equipment has been saved. No payment has been processed.
                  </p>
                </div>

                {/* Receipt Card */}
                <div className="p-4 bg-[#F7F8F4] rounded-[12px] border border-[#DCE9DE] text-xs space-y-2">
                  <div className="flex justify-between border-b border-[#DCE9DE] pb-2 font-mono">
                    <span className="text-[#202820]/70">Booking ID:</span>
                    <strong className="text-[#103B2A]">{confirmedBooking.id}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#DCE9DE] pb-2 font-mono">
                    <span className="text-[#202820]/70">Demo reference:</span>
                    <strong className="text-[#174D35]">{confirmedBooking.demoReference}</strong>
                  </div>
                  <div className="flex justify-between border-b border-[#DCE9DE] pb-2">
                    <span className="text-[#202820]/70">Dates:</span>
                    <span>{confirmedBooking.startDate} to {confirmedBooking.endDate} ({confirmedBooking.days} days)</span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-sm">
                    <span>Estimated total:</span>
                    <span className="font-mono text-[#174D35]">{formatNaira(confirmedBooking.totalAmount)}</span>
                  </div>
                </div>

                <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={onViewMyBookings}
                    className="px-6 py-2.5 bg-[#174D35] hover:bg-[#103B2A] text-white text-xs font-bold rounded-[8px] transition-colors shadow-sm text-center"
                  >
                    View in Farmer Dashboard
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 bg-white border border-[#DCE9DE] text-xs font-semibold text-[#103B2A] rounded-[8px] hover:bg-[#F7F8F4] transition-colors text-center"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Order Summary Sidebar */}
          <div className="md:col-span-5 bg-[#F7F8F4] p-5 rounded-[12px] border border-[#DCE9DE] flex flex-col justify-between">
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#103B2A] border-b border-[#DCE9DE] pb-2">
                Order Summary
              </h4>

              <div className="flex items-center gap-3">
                <img
                  src={getEquipmentDisplayImage(equipment)}
                  alt={equipment.title}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-[8px] object-cover border border-[#DCE9DE]"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#103B2A] truncate">{equipment.title}</p>
                  <p className="text-[11px] text-[#202820]/70">{equipment.locationLGA}, {equipment.locationState}</p>
                  <span className="text-[10px] text-[#174D35] font-semibold">{equipment.horsepower} HP &middot; {equipment.category}</span>
                </div>
              </div>

              {/* Price Itemization */}
              <div className="space-y-2 text-xs pt-3 border-t border-[#DCE9DE]">
                <div className="flex justify-between">
                  <span className="text-[#202820]/70">
                    Daily rate ({formatNaira(pricing.dailyRate)} &times; {rentalDays} days):
                  </span>
                  <span className="font-mono text-[#103B2A]">{formatNaira(pricing.subtotal)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#202820]/70">
                    {deliveryMethod === 'delivery' ? 'Flatbed field transport:' : 'Depot self-pickup:'}
                  </span>
                  <span className="font-mono text-[#103B2A]">
                    {deliveryMethod === 'delivery' ? formatNaira(pricing.deliveryFee) : 'Free'}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-[#202820]/70">
                    Service fee estimate (3.5%):
                  </span>
                  <span className="font-mono text-[#103B2A]">{formatNaira(pricing.serviceInsuranceFee)}</span>
                </div>

                {pricing.harvestDiscount > 0 && <div className="flex justify-between text-green-700 font-semibold">
                  <span>Harvest season discount:</span>
                  <span className="font-mono">-{formatNaira(pricing.harvestDiscount)}</span>
                </div>}
              </div>

              {/* Total Row */}
              <div className="pt-3 border-t border-[#DCE9DE] flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-bold text-[#103B2A] block">Estimated total</span>
                  <span className="text-[10px] text-[#202820]/60">No payment collected</span>
                </div>
                <span className="text-xl font-bold text-[#174D35] font-mono">
                  {formatNaira(pricing.total)}
                </span>
              </div>
            </div>

            <div className="mt-6 p-3 bg-white rounded-[8px] border border-[#DCE9DE] text-[11px] text-[#103B2A] space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-[#174D35]" />
                <span>Showcase demo</span>
              </div>
              <p className="text-[#202820]/70 text-[10px] leading-tight">
                Payment providers and escrow services are not connected in this demo.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
