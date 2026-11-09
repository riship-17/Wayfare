export interface RatesSnapshot {
  base: 'AED';
  rates: Record<string, number>;
  fetchedAt: string;
  nextUpdateAt?: string | null;
  provider: string;
}

/** Currencies offered in set up and Me. Every one is returned by open.er-api.com. */
export const SUPPORTED_CURRENCIES = [
  'INR', 'PKR', 'BDT', 'LKR', 'NPR', 'NGN', 'KES', 'EGP', 'JOD', 'SAR', 'OMR', 'KWD', 'BHD', 'QAR',
  'IRR', 'TRY', 'KZT', 'UZS', 'CNY', 'PHP', 'IDR', 'MYR', 'GBP', 'EUR', 'USD', 'CAD', 'AUD', 'RUB', 'ZAR',
] as const;

export const COUNTRY_CURRENCY: Record<string, string> = {
  India: 'INR', Pakistan: 'PKR', Bangladesh: 'BDT', 'Sri Lanka': 'LKR', Nepal: 'NPR', Nigeria: 'NGN',
  Kenya: 'KES', Egypt: 'EGP', Jordan: 'JOD', 'Saudi Arabia': 'SAR', Oman: 'OMR', Kuwait: 'KWD',
  Bahrain: 'BHD', Qatar: 'QAR', Iran: 'IRR', Turkey: 'TRY', Kazakhstan: 'KZT', Uzbekistan: 'UZS',
  China: 'CNY', Philippines: 'PHP', Indonesia: 'IDR', Malaysia: 'MYR', 'United Kingdom': 'GBP',
  Germany: 'EUR', France: 'EUR', Italy: 'EUR', Spain: 'EUR', 'United States': 'USD', Canada: 'CAD',
  Australia: 'AUD', Russia: 'RUB', 'South Africa': 'ZAR',
};

/** AED amount into another currency using AED based rates. Returns null when the rate is unknown. */
export function convertFromAed(amountAed: number, currency: string, rates: Record<string, number> | null | undefined): number | null {
  if (currency === 'AED') return amountAed;
  const r = rates?.[currency];
  if (!r || !Number.isFinite(r)) return null;
  return amountAed * r;
}

/** Home currency amount into AED. */
export function convertToAed(amount: number, currency: string, rates: Record<string, number> | null | undefined): number | null {
  if (currency === 'AED') return amount;
  const r = rates?.[currency];
  if (!r || !Number.isFinite(r)) return null;
  return amount / r;
}

export function formatMoney(amount: number, currency: string): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-GB';
  const digits = Math.abs(amount) < 100 && !Number.isInteger(amount) ? 2 : 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: currency === 'AED' ? 'code' : 'narrowSymbol',
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
      .format(amount)
      .replace(/ /g, ' ');
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString('en-GB')}`;
  }
}

/** "AED 3,250" */
export function formatAed(amount: number): string {
  const digits = Number.isInteger(amount) ? 0 : 2;
  return `AED ${amount.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}
