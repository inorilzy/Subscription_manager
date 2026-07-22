import { currencyFractionDigits, SUPPORTED_CURRENCIES, type CurrencyCode } from './money'

/**
 * Manual, CNY-anchored exchange rates: `rate[X]` is how many CNY one major unit
 * of X is worth. They are user-editable estimates, never fetched, so conversion
 * stays fully offline and deterministic. Defaults reflect rough 2024-2025 levels
 * and are meant as an editable starting point, not live market data.
 */
export type ExchangeRates = Partial<Record<string, number>>

export const DEFAULT_EXCHANGE_RATES: Record<CurrencyCode, number> = {
  CNY: 1,
  USD: 7.2,
  EUR: 7.8,
  GBP: 9.1,
  JPY: 0.048,
  INR: 0.086,
  TRY: 0.21,
}

export function isValidRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/**
 * Convert an integer minor-unit amount in `currency` into CNY minor units
 * (fen), using the manual rate table. Returns null when the rate is missing or
 * invalid so callers can surface an explicit "unknown" instead of a wrong zero.
 */
export function convertToCnyMinor(
  amountMinor: number,
  currency: string,
  rates: ExchangeRates,
): number | null {
  const rate = currency === 'CNY' ? 1 : rates[currency]
  if (!isValidRate(rate)) return null

  const digits = currencyFractionDigits(currency)
  const major = amountMinor / 10 ** digits
  // CNY minor units always use 2 fraction digits.
  return Math.round(major * rate * 100)
}

/** Fold multi-currency amounts into one CNY total, tracking currencies we could not convert. */
export function totalInCnyMinor(
  amounts: Array<{ currency: string; amountMinor: number }>,
  rates: ExchangeRates,
): { cnyMinor: number; missing: string[] } {
  let cnyMinor = 0
  const missing: string[] = []
  for (const { currency, amountMinor } of amounts) {
    const converted = convertToCnyMinor(amountMinor, currency, rates)
    if (converted === null) {
      if (!missing.includes(currency)) missing.push(currency)
      continue
    }
    cnyMinor += converted
  }
  return { cnyMinor, missing }
}

/** Merge stored overrides onto the shipped defaults, ignoring invalid entries. */
export function resolveRates(overrides: ExchangeRates | null | undefined): Record<string, number> {
  const resolved: Record<string, number> = { ...DEFAULT_EXCHANGE_RATES }
  if (overrides) {
    for (const code of SUPPORTED_CURRENCIES) {
      const value = overrides[code]
      if (isValidRate(value)) resolved[code] = value
    }
  }
  resolved.CNY = 1
  return resolved
}

export function parseStoredRates(raw: string): ExchangeRates {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const result: ExchangeRates = {}
    for (const code of SUPPORTED_CURRENCIES) {
      const value = (parsed as Record<string, unknown>)[code]
      if (isValidRate(value)) result[code] = value
    }
    return result
  } catch {
    return {}
  }
}
