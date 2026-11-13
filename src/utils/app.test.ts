import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNaira, calculateBookingPricing, calculateDateDiffDays, getTimeBasedGreeting } from './formatters';
import { 
  sanitizeInput, 
  formatAndValidateNigerianPhone, 
  calculatePasswordStrength 
} from './security';
import { calculateLocationProximityScore } from './location';

test('formatNaira formats positive numbers with Naira symbol and separators', () => {
  assert.equal(formatNaira(45000), '₦45,000');
  assert.equal(formatNaira(1280000), '₦1,280,000');
  assert.equal(formatNaira(0), '₦0');
});

test('calculateBookingPricing does not apply a harvest discount by default', () => {
  // ₦45,000/day for 4 days
  // Subtotal = 180,000
  // Delivery = 12,500
  // Insurance/Escrow (3.5%) = 6,300
  // No harvest discount is applied outside an explicitly enabled season.
  // Total = 180,000 + 12,500 + 6,300 = 198,800
  const result = calculateBookingPricing(45000, 4, 'delivery');
  assert.equal(result.subtotal, 180000);
  assert.equal(result.deliveryFee, 12500);
  assert.equal(result.serviceInsuranceFee, 6300);
  assert.equal(result.harvestDiscount, 0);
  assert.equal(result.total, 198800);

  // Pickup has ₦0 delivery fee
  const pickupResult = calculateBookingPricing(45000, 4, 'pickup');
  assert.equal(pickupResult.deliveryFee, 0);
  assert.equal(pickupResult.total, 186300);
});

test('calculateDateDiffDays computes inclusive rental duration', () => {
  const days = calculateDateDiffDays('2026-11-12', '2026-11-15');
  assert.equal(days, 4);
});

test('sanitizeInput strips dangerous HTML injection tags', () => {
  const dirty = '<script>alert("hack")</script>John Deere 5075E';
  const clean = sanitizeInput(dirty);
  assert.equal(clean, 'alert(hack)John Deere 5075E');
});

test('formatAndValidateNigerianPhone handles 080, 234, and +234 prefixes', () => {
  const res1 = formatAndValidateNigerianPhone('08031234567');
  assert.equal(res1.isValid, true);
  assert.equal(res1.formatted, '+234 803 123 4567');

  const res2 = formatAndValidateNigerianPhone('+2348123456789');
  assert.equal(res2.isValid, true);
  assert.equal(res2.formatted, '+234 812 345 6789');

  const resInvalid = formatAndValidateNigerianPhone('12345');
  assert.equal(resInvalid.isValid, false);
});

test('calculatePasswordStrength gives score and feedback', () => {
  const weak = calculatePasswordStrength('123');
  assert.equal(weak.label, 'Weak');

  const strong = calculatePasswordStrength('AgriSecret#2026Secure!');
  assert.equal(strong.label, 'Strong');
});

test('calculateLocationProximityScore prioritizes exact LGA, same State and agricultural Zone', () => {
  // Exact LGA match gets highest score
  const scoreLGA = calculateLocationProximityScore('Oyo State', 'Ibadan South-West', 'Ibadan South-West');
  assert.equal(scoreLGA, 100);

  // Same State gets 80
  const scoreState = calculateLocationProximityScore('Benue State', 'Makurdi Central', 'Benue');
  assert.equal(scoreState, 80);

  // Different state gets lower score
  const scoreFar = calculateLocationProximityScore('Kano State', 'Kura', 'Lagos');
  assert.ok(scoreFar < 80);
});

test('getTimeBasedGreeting returns appropriate greeting based on hour', () => {
  assert.equal(getTimeBasedGreeting(new Date('2026-11-11T00:00:00')), 'Good morning');
  assert.equal(getTimeBasedGreeting(new Date('2026-11-11T11:59:00')), 'Good morning');
  assert.equal(getTimeBasedGreeting(new Date('2026-11-11T12:00:00')), 'Good afternoon');
  assert.equal(getTimeBasedGreeting(new Date('2026-11-11T15:59:00')), 'Good afternoon');
  assert.equal(getTimeBasedGreeting(new Date('2026-11-11T16:00:00')), 'Good evening');
  assert.equal(getTimeBasedGreeting(new Date('2026-11-11T23:59:00')), 'Good evening');
});

test('email validation regex matches standard addresses', () => {
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  assert.equal(isValidEmail('adewale.okafor@agrirent.ng'), true);
  assert.equal(isValidEmail('mideben12@gmail.com'), true);
  assert.equal(isValidEmail('invalid-email'), false);
  assert.equal(isValidEmail('no-domain@'), false);
});

