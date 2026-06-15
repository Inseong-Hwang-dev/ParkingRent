import type { PricingType } from '@/types/database'

export type PriceDisplay = { amount: number; label: string }

export const PRICE_SUFFIX: Record<PricingType, string> = {
  daily: '/day',
  weekly: '/wk',
  monthly: '/mo',
}

export const PRICE_PREFERENCE_LABELS: Record<PricingType, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

export const PRICE_PREFERENCE_ORDER: PricingType[] = ['daily', 'weekly', 'monthly']

export function formatPriceAmount(amount: number): string {
  return amount.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

export function getAllPrices(
  daily: number | null,
  weekly: number | null,
  monthly: number | null
): PriceDisplay[] {
  const prices: PriceDisplay[] = []
  if (daily !== null) prices.push({ amount: daily, label: PRICE_SUFFIX.daily })
  if (weekly !== null) prices.push({ amount: weekly, label: PRICE_SUFFIX.weekly })
  if (monthly !== null) prices.push({ amount: monthly, label: PRICE_SUFFIX.monthly })
  return prices
}

/** Returns the preferred price, or the first available fallback if missing. */
export function getPriceForPreference(
  daily: number | null,
  weekly: number | null,
  monthly: number | null,
  preference: PricingType
): PriceDisplay | null {
  const priceMap: Record<PricingType, number | null> = {
    daily,
    weekly,
    monthly,
  }

  const preferred = priceMap[preference]
  if (preferred !== null) {
    return { amount: preferred, label: PRICE_SUFFIX[preference] }
  }

  for (const type of PRICE_PREFERENCE_ORDER) {
    const amount = priceMap[type]
    if (amount !== null) {
      return { amount, label: PRICE_SUFFIX[type] }
    }
  }

  return null
}
