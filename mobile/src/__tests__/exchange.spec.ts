import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EXCHANGE_RATES,
  convertToCnyMinor,
  isValidRate,
  totalInCnyMinor,
} from '../domain/exchange'

describe('exchange rate conversion', () => {
  const rates = { CNY: 1, USD: 7.2, EUR: 7.8, JPY: 0.048 }

  it('keeps CNY unchanged', () => {
    expect(convertToCnyMinor(4000, 'CNY', rates)).toBe(4000)
  })

  it('converts two-decimal currencies into CNY minor units', () => {
    // 15.99 USD * 7.2 = 115.128 CNY -> 11513 minor
    expect(convertToCnyMinor(1599, 'USD', rates)).toBe(11513)
    // 9.99 EUR * 7.8 = 77.922 CNY -> 7792 minor
    expect(convertToCnyMinor(999, 'EUR', rates)).toBe(7792)
  })

  it('converts zero-decimal JPY across the minor-unit boundary', () => {
    // 980 JPY * 0.048 = 47.04 CNY -> 4704 minor
    expect(convertToCnyMinor(980, 'JPY', rates)).toBe(4704)
  })

  it('returns null when a rate is missing or invalid', () => {
    expect(convertToCnyMinor(1000, 'GBP', rates)).toBeNull()
    expect(convertToCnyMinor(1000, 'USD', { USD: 0 })).toBeNull()
    expect(convertToCnyMinor(1000, 'USD', { USD: Number.NaN })).toBeNull()
  })

  it('sums multi-currency totals into one CNY total and reports missing rates', () => {
    const result = totalInCnyMinor(
      [
        { currency: 'CNY', amountMinor: 4000 },
        { currency: 'USD', amountMinor: 1599 },
        { currency: 'JPY', amountMinor: 980 },
        { currency: 'GBP', amountMinor: 1000 },
      ],
      rates,
    )
    expect(result.cnyMinor).toBe(4000 + 11513 + 4704)
    expect(result.missing).toEqual(['GBP'])
  })

  it('ships positive CNY-anchored defaults for every supported currency', () => {
    expect(DEFAULT_EXCHANGE_RATES.CNY).toBe(1)
    for (const rate of Object.values(DEFAULT_EXCHANGE_RATES)) {
      expect(isValidRate(rate)).toBe(true)
    }
  })
})
