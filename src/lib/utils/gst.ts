// Australian GST (Goods and Services Tax) utilities
// GST rate is 10%

const GST_RATE = 0.1; // 10%

/**
 * Calculate GST from an amount that includes GST
 * @param amountIncGST Amount including GST (in cents)
 * @returns Object with GST amount and amount excluding GST (both in cents)
 */
export function calculateGSTFromInclusive(amountIncGST: number): {
  gst: number;
  amountExGST: number;
  amountIncGST: number;
} {
  // GST = Amount × (GST Rate / (1 + GST Rate))
  // For 10%: GST = Amount × (0.1 / 1.1) = Amount × (1/11)
  // Using integer-friendly division: amount / 11 (since 10% GST means 1/11th is GST)
  const gst = Math.round(amountIncGST / 11);
  const amountExGST = amountIncGST - gst;

  return {
    gst,
    amountExGST,
    amountIncGST,
  };
}

/**
 * Calculate GST from an amount that excludes GST
 * @param amountExGST Amount excluding GST (in cents)
 * @returns Object with GST amount and amount including GST (both in cents)
 */
export function calculateGSTFromExclusive(amountExGST: number): {
  gst: number;
  amountExGST: number;
  amountIncGST: number;
} {
  const gst = Math.round(amountExGST * GST_RATE);
  const amountIncGST = amountExGST + gst;

  return {
    gst,
    amountExGST,
    amountIncGST,
  };
}

/**
 * Add GST to an amount
 * @param amountExGST Amount excluding GST (in cents)
 * @returns Amount including GST (in cents)
 */
export function addGST(amountExGST: number): number {
  return Math.round(amountExGST * (1 + GST_RATE));
}

/**
 * Remove GST from an amount
 * @param amountIncGST Amount including GST (in cents)
 * @returns Amount excluding GST (in cents)
 */
export function removeGST(amountIncGST: number): number {
  // For 10% GST: exGST = incGST × (10/11) = incGST - (incGST/11)
  const gst = Math.round(amountIncGST / 11);
  return amountIncGST - gst;
}

/**
 * Get just the GST component from an inclusive amount
 * @param amountIncGST Amount including GST (in cents)
 * @returns GST amount (in cents)
 */
export function getGSTAmount(amountIncGST: number): number {
  // For 10% GST: GST = incGST / 11
  return Math.round(amountIncGST / 11);
}

/**
 * Format GST breakdown for display
 * @param amountIncGST Amount including GST (in cents)
 * @returns Formatted breakdown object
 */
export function formatGSTBreakdown(amountIncGST: number): {
  total: string;
  gst: string;
  subtotal: string;
} {
  const { gst, amountExGST } = calculateGSTFromInclusive(amountIncGST);

  const format = (cents: number) =>
    (cents / 100).toLocaleString('en-AU', {
      style: 'currency',
      currency: 'AUD',
    });

  return {
    total: format(amountIncGST),
    gst: format(gst),
    subtotal: format(amountExGST),
  };
}

/**
 * Check if an amount is GST-inclusive
 * This is a heuristic based on common Australian pricing patterns
 * @param amount Amount in cents
 * @returns True if likely GST-inclusive (amounts ending in .00 or .99)
 */
export function isLikelyGSTInclusive(amount: number): boolean {
  // Most Australian retail prices are GST-inclusive and end in .00 or .99
  // Use integer modulo to avoid float precision issues
  const centsRemainder = Math.abs(amount) % 100;
  return centsRemainder === 0 || centsRemainder === 99 || centsRemainder === 95;
}

/**
 * Get GST rate as percentage
 * @returns GST rate percentage (10)
 */
export function getGSTRate(): number {
  return GST_RATE * 100;
}

/**
 * Calculate claimable GST for BAS (Business Activity Statement)
 * Only applicable for registered businesses
 * @param transactions Array of transaction amounts (in cents, GST-inclusive)
 * @returns Total GST claimable (in cents)
 */
export function calculateClaimableGST(transactions: number[]): number {
  return transactions.reduce((total, amount) => {
    return total + getGSTAmount(amount);
  }, 0);
}
