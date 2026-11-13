/**
 * Security and Data Validation Utilities for AgriRent
 * Includes input sanitization and +234 phone validation.
 */

/**
 * Strips script tags, HTML tags, and harmful characters to prevent XSS and injection
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/[<>'"]/g, '') // strip potential injection chars
    .trim();
}

/**
 * Validates and formats Nigerian telephone numbers into +234 format
 * Valid prefixes: 070, 080, 081, 090, 091 (11 digits local or 13 digits international)
 */
export function formatAndValidateNigerianPhone(rawPhone: string): {
  isValid: boolean;
  formatted: string;
  error?: string;
} {
  const cleaned = rawPhone.replace(/[\s\-\(\)]/g, '');
  
  // Empty check
  if (!cleaned) {
    return { isValid: false, formatted: '', error: 'Phone number is required' };
  }

  let normalized = cleaned;
  if (normalized.startsWith('+234')) {
    normalized = normalized.slice(4);
  } else if (normalized.startsWith('234')) {
    normalized = normalized.slice(3);
  } else if (normalized.startsWith('0')) {
    normalized = normalized.slice(1);
  }

  // Must now be exactly 10 digits
  const digitRegex = /^\d{10}$/;
  if (!digitRegex.test(normalized)) {
    return {
      isValid: false,
      formatted: rawPhone,
      error: 'Enter a valid 10 or 11 digit Nigerian mobile number (e.g., 0803 123 4567)',
    };
  }

  // Valid first digit after country code in Nigeria is 7, 8, or 9
  const firstDigit = normalized[0];
  if (!['7', '8', '9'].includes(firstDigit)) {
    return {
      isValid: false,
      formatted: rawPhone,
      error: 'Nigerian mobile numbers begin with 070, 080, 081, 090, or 091',
    };
  }

  // Format as +234 XXX XXX XXXX
  const part1 = normalized.slice(0, 3);
  const part2 = normalized.slice(3, 6);
  const part3 = normalized.slice(6);
  const formatted = `+234 ${part1} ${part2} ${part3}`;

  return {
    isValid: true,
    formatted,
  };
}

/**
 * Evaluates password strength (0 to 100)
 */
export function calculatePasswordStrength(password: string): {
  score: number;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
} {
  if (!password) return { score: 0, label: 'Weak', color: '#9CA3AF' };
  
  let score = 0;
  if (password.length >= 8) score += 30;
  if (password.length >= 12) score += 20;
  if (/[A-Z]/.test(password)) score += 15;
  if (/[a-z]/.test(password)) score += 10;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 10;

  if (score < 40) return { score, label: 'Weak', color: '#DC2626' };
  if (score < 70) return { score, label: 'Fair', color: '#E6A23C' };
  if (score < 85) return { score, label: 'Good', color: '#16A34A' };
  return { score: 100, label: 'Strong', color: '#174D35' };
}
