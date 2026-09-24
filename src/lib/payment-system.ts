import pool from './db';

export interface PaymentMethod {
  id: string;
  type: 'UPI' | 'CARD' | 'PAYPAL';
  provider: 'RAZORPAY' | 'PAYPAL';
  displayName: string;
  icon: string;
  description: string;
}

export interface PricingTier {
  id: number;
  tierName: string;
  minCredits: number;
  maxCredits: number;
  unitPriceUsd: number; // in cents
  unitPriceInr: number; // in paise
}

export interface CreatePaymentRequest {
  creditsRequested: number;
  paymentMethod: PaymentMethod;
  userId: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  paymentMethod: PaymentMethod;
  creditsRequested: number;
  amountUsd: number;
  amountInr: number;
  currency: string;
  unitPriceUsd: number;
  unitPriceInr: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  createdAt: Date;
  completedAt?: Date;
}

export const CREDIT_PRICING_TIERS = [
  { id: 1, tierName: 'Standard', minCredits: 1, maxCredits: 500, unitPriceUsd: 15, unitPriceInr: 1245 },
  { id: 2, tierName: 'Volume', minCredits: 501, maxCredits: 5000, unitPriceUsd: 10, unitPriceInr: 830 },
  { id: 3, tierName: 'High volume', minCredits: 5001, maxCredits: 999999, unitPriceUsd: 5, unitPriceInr: 415 },
] as const;

// The canonical pricing is code-owned. Do not require a database table for
// these fixed business rules; this also prevents duplicate migration rows.
export async function getPricingTiers(): Promise<PricingTier[]> {
  return CREDIT_PRICING_TIERS.map((tier) => ({ ...tier }));
}

// Calculate total price for requested credits using tiered pricing
export function calculateCreditPrice(credits: number): { totalUsd: number; totalInr: number; breakdown: any[] } {
  const tiers = [
    { min: 1, max: 500, rateUsd: 15, rateInr: 1245 }, // $0.15, ₹12.45
    { min: 501, max: 5000, rateUsd: 10, rateInr: 830 }, // $0.10, ₹8.30
    { min: 5001, max: 999999, rateUsd: 5, rateInr: 415 } // $0.05, ₹4.15
  ];
  
  let remainingCredits = credits;
  let totalUsd = 0;
  let totalInr = 0;
  const breakdown = [];
  
  for (const tier of tiers) {
    if (remainingCredits <= 0) break;
    
    const creditsInTier = Math.min(remainingCredits, tier.max - tier.min + 1);
    const tierUsd = creditsInTier * tier.rateUsd;
    const tierInr = creditsInTier * tier.rateInr;
    
    if (creditsInTier > 0) {
      breakdown.push({
        tier: tier.min,
        max: tier.max,
        rateUsd: tier.rateUsd,
        rateInr: tier.rateInr,
        credits: creditsInTier,
        amountUsd: tierUsd,
        amountInr: tierInr
      });
      
      totalUsd += tierUsd;
      totalInr += tierInr;
      remainingCredits -= creditsInTier;
    }
  }
  
  return {
    totalUsd,
    totalInr,
    breakdown
  };
}

// Get user's country and determine if they're Indian
export async function getUserLocation(userId: string): Promise<{ isIndian: boolean; countryCode?: string }> {
  const rows = await pool.query(
    'SELECT country_code FROM users WHERE id = $1',
    [userId]
  );
  
  const countryCode = rows[0]?.country_code;
  const isIndian = countryCode === 'IN' || !countryCode; // Default to Indian if no country code
  
  return { isIndian, countryCode };
}

// Get available payment methods based on user location
// ids match what UI sends: 'paypal' and 'razorpay'.
export function getAvailablePaymentMethods(isIndianUser: boolean): PaymentMethod[] {
  if (isIndianUser) {
    return [
      {
        id: 'razorpay',
        type: 'CARD',
        provider: 'RAZORPAY',
        displayName: 'Razorpay',
        icon: '💳',
        description: 'UPI and cards'
      }
    ];
  }
  return [
    {
      id: 'razorpay',
      type: 'CARD',
      provider: 'RAZORPAY',
      displayName: 'Razorpay',
      icon: '💳',
      description: 'UPI and cards'
    }
  ];
}

// Resolve the currently supported payment provider. PayPal is intentionally
// not accepted while Razorpay-only checkout is enabled.
export function resolvePaymentMethod(paymentMethodId: string, isIndianUser: boolean): PaymentMethod | undefined {
  void isIndianUser;
  const normalized = (paymentMethodId || '').toLowerCase().trim();
  if (normalized !== 'razorpay' && normalized !== 'upi' && normalized !== 'card') {
    return undefined;
  }

  return {
    id: 'razorpay',
    type: 'CARD',
    provider: 'RAZORPAY',
    displayName: 'Razorpay',
    icon: '💳',
    description: 'UPI and cards',
  };
}