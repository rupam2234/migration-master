export const TIERED_PRICING = {
  tier1Limit: 500,
  tier1Rate: 0.10,
  tier2Limit: 5000,
  tier2Rate: 0.035,
  tier3Rate: 0.0266,
};

/**
 * Calculate total price using non‑linear tiered rates.
 * Returns the numeric total (no formatting).
 */
export function calculateTieredPrice(count: number): number {
  if (count <= TIERED_PRICING.tier1Limit) {
    return count * TIERED_PRICING.tier1Rate;
  }
  if (count <= TIERED_PRICING.tier2Limit) {
    return (
      TIERED_PRICING.tier1Limit * TIERED_PRICING.tier1Rate +
      (count - TIERED_PRICING.tier1Limit) * TIERED_PRICING.tier2Rate
    );
  }
  return (
    TIERED_PRICING.tier1Limit * TIERED_PRICING.tier1Rate +
    (TIERED_PRICING.tier2Limit - TIERED_PRICING.tier1Limit) * TIERED_PRICING.tier2Rate +
    (count - TIERED_PRICING.tier2Limit) * TIERED_PRICING.tier3Rate
  );
}
