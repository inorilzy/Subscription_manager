const MAX_MINOR_DIGITS = 15

export class MoneyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyError'
  }
}

export type CurrencyCode = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'INR' | 'TRY'

export const SUPPORTED_CURRENCIES: CurrencyCode[] = [
  'CNY',
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'INR',
  'TRY',
]

/** ISO-4217 minor-unit exponent. JPY has 0; most others use 2. */
export function currencyFractionDigits(currency: string): number {
  const code = currency.toUpperCase()
  if (code === 'JPY' || code === 'KRW' || code === 'VND') return 0
  return 2
}

export function isCurrencyCode(value: string): value is CurrencyCode {
  return (SUPPORTED_CURRENCIES as string[]).includes(value)
}

export function normalizeCurrency(value?: string | null, fallback: CurrencyCode = 'CNY'): CurrencyCode {
  const trimmed = value?.trim().toUpperCase()
  return trimmed && isCurrencyCode(trimmed) ? trimmed : fallback
}

export function currencyLabel(code: string, language: 'en' | 'zh-CN' = 'zh-CN'): string {
  switch (code) {
    case 'CNY':
      return language === 'zh-CN' ? 'CNY（¥ 人民币）' : 'CNY (¥)'
    case 'USD':
      return language === 'zh-CN' ? 'USD（$ 美元）' : 'USD ($)'
    case 'EUR':
      return language === 'zh-CN' ? 'EUR（€ 欧元）' : 'EUR (€)'
    case 'GBP':
      return language === 'zh-CN' ? 'GBP（£ 英镑）' : 'GBP (£)'
    case 'JPY':
      return language === 'zh-CN' ? 'JPY（¥ 日元）' : 'JPY (¥)'
    case 'INR':
      return language === 'zh-CN' ? 'INR（₹ 卢比）' : 'INR (₹)'
    case 'TRY':
      return language === 'zh-CN' ? 'TRY（₺ 里拉）' : 'TRY (₺)'
    default:
      return code
  }
}

/** Parse a user-entered decimal amount into integer minor units for the currency. */
export function parseAmountToMinor(input: string, currency = 'CNY'): number {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new MoneyError('Amount is required.')
  }

  const digitsAllowed = currencyFractionDigits(currency)
  const pattern =
    digitsAllowed === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${digitsAllowed}})?$`)

  if (!pattern.test(trimmed)) {
    throw new MoneyError(
      digitsAllowed === 0
        ? 'Enter a whole-number amount greater than zero.'
        : `Enter a valid amount greater than zero with up to ${digitsAllowed} decimal places.`,
    )
  }

  const [wholePart, fractionPart = ''] = trimmed.split('.')
  const paddedFraction = fractionPart.padEnd(digitsAllowed, '0')
  const digits = `${wholePart}${paddedFraction}`.replace(/^0+(?=\d)/, '')

  if (digits.length > MAX_MINOR_DIGITS) {
    throw new MoneyError('Amount is too large.')
  }

  const minor = Number(digits)
  if (!Number.isFinite(minor) || !Number.isInteger(minor) || minor <= 0) {
    throw new MoneyError('Amount must be greater than zero.')
  }

  return minor
}

export function minorToMajorNumber(minor: number, currency = 'CNY'): number {
  const digits = currencyFractionDigits(currency)
  const divisor = 10 ** digits
  return minor / divisor
}

export function majorInputFromMinor(minor: number, currency = 'CNY'): string {
  const digits = currencyFractionDigits(currency)
  return minorToMajorNumber(minor, currency).toFixed(digits)
}

/** Format integer minor units with the given currency and locale. */
export function formatMinorAmount(
  minor: number,
  currency = 'CNY',
  locale = 'zh-CN',
): string {
  const digits = currencyFractionDigits(currency)
  const major = minorToMajorNumber(minor, currency)
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(major)
  } catch {
    return `${currency} ${major.toFixed(digits)}`
  }
}
