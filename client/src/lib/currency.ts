import { convertFromAed, formatAed, formatMoney } from '@wayfare/shared';

export { convertFromAed, formatAed, formatMoney };

/** "≈ ₹74,425" or null when the rate is unknown. */
export function approxHome(amountAed: number, currency: string, rates?: Record<string, number> | null): string | null {
  if (currency === 'AED') return null;
  const v = convertFromAed(amountAed, currency, rates);
  return v === null ? null : `≈ ${formatMoney(v, currency)}`;
}
