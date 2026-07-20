const MAX_MINOR_DIGITS = 15

export class MoneyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MoneyError'
  }
}

/** Parse a user-entered decimal amount into integer minor units (cents). */
export function parseAmountToMinor(input: string): number {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new MoneyError('Amount is required.')
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new MoneyError('Enter a valid amount greater than zero with up to two decimal places.')
  }

  const [wholePart, fractionPart = ''] = trimmed.split('.')
  const paddedFraction = fractionPart.padEnd(2, '0')
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

/** Format integer minor units with the app currency and locale. */
export function formatMinorAmount(
  minor: number,
  currency = 'USD',
  locale = 'en-US',
): string {
  const major = minor / 100
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(major)
  } catch {
    return `${currency} ${(minor / 100).toFixed(2)}`
  }
}
