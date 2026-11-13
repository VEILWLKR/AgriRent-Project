/**
 * Utility functions for currency, dates, and pricing calculations in AgriRent
 */

export function formatNaira(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₦0';
  }
  const formatted = Math.round(amount).toLocaleString('en-US');
  return `₦${formatted}`;
}

export interface PricingBreakdown {
  dailyRate: number;
  days: number;
  subtotal: number;
  deliveryFee: number;
  serviceInsuranceFee: number;
  harvestDiscount: number;
  total: number;
}

export function calculateBookingPricing(
  dailyRate: number,
  days: number,
  deliveryMethod: 'delivery' | 'pickup' = 'delivery',
  discountPercentage: number = 0 // discounts must be explicitly enabled for an eligible season
): PricingBreakdown {
  const safeDays = Math.max(1, Math.round(days || 1));
  const safeRate = Math.max(0, dailyRate || 0);
  const subtotal = safeRate * safeDays;
  
  // Standard agricultural transport flat rate in Nigeria based on depot radius
  const deliveryFee = deliveryMethod === 'delivery' ? 12500 : 0;
  
  // 3.5% Escrow safety guarantee & third-party machinery breakdown insurance
  const serviceInsuranceFee = Math.round(subtotal * 0.035);
  
  // Seasonal discounts are opt-in; harvest timing varies by crop and location.
  const harvestDiscount = Math.round(subtotal * (discountPercentage / 100));
  
  const total = Math.max(0, subtotal + deliveryFee + serviceInsuranceFee - harvestDiscount);

  return {
    dailyRate: safeRate,
    days: safeDays,
    subtotal,
    deliveryFee,
    serviceInsuranceFee,
    harvestDiscount,
    total,
  };
}

export function calculateDateDiffDays(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 1;
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1); // inclusive rental days
}

/**
 * Returns dynamic, appropriate greeting based on local device time
 */
export function getTimeBasedGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) {
    return 'Good morning';
  } else if (hour < 16) {
    return 'Good afternoon';
  } else {
    return 'Good evening';
  }
}

