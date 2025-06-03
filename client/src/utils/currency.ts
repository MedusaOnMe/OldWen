// SOL to USD conversion rate (approximate)
export const SOL_TO_USD_RATE = 156;

/**
 * Format currency amount for display
 * Shows full dollar amounts until $1000, then shows as $X.XK format
 */
export function formatCurrency(amount: number): string {
  if (amount === 0) return '$0';
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

/**
 * Format precise currency amount with 2 decimal places
 */
export function formatCurrencyPrecise(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

/**
 * Convert SOL amount to USD equivalent
 */
export function solToUsd(solAmount: number): number {
  return solAmount * SOL_TO_USD_RATE;
}

/**
 * Format SOL amount for display
 */
export function formatSol(amount: number): string {
  return `${amount.toFixed(3)} SOL`;
}

/**
 * Format contribution display showing both USD equivalent and original currency
 */
export function formatContribution(amount: number, currency: 'SOL' | 'USDC'): {
  primary: string;
  secondary: string;
} {
  if (currency === 'SOL') {
    return {
      primary: formatCurrencyPrecise(solToUsd(amount)),
      secondary: formatSol(amount),
    };
  } else {
    return {
      primary: formatCurrencyPrecise(amount),
      secondary: `${amount.toFixed(2)} USDC`,
    };
  }
}