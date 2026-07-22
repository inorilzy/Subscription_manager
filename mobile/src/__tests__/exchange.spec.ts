import { describe, expect, it } from 'vitest'
import {
  DEFAULT_EXCHANGE_RATES,
  convertToCnyMinor,
  isValidRate,
  ratesFromCnyBaseResponse,
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

describe('parsing remote CNY-based exchange responses', () => {
  it('inverts per-CNY rates into CNY-per-unit for supported currencies', () => {
    const parsed = ratesFromCnyBaseResponse({
      result: 'success',
      base_code: 'CNY',
      rates: { CNY: 1, USD: 0.1389, JPY: 20, GBP: 0.11, ZZZ: 5 },
    })
    expect(parsed.USD).toBeCloseTo(7.199, 2)
    expect(parsed.JPY).toBeCloseTo(0.05, 5)
    expect(parsed.GBP).toBeCloseTo(9.0909, 3)
    expect(parsed.CNY).toBeUndefined()
    expect((parsed as Record<string, number>).ZZZ).toBeUndefined()
  })

  it('rejects non-success, wrong-base, or malformed payloads', () => {
    expect(
      ratesFromCnyBaseResponse({ result: 'error', base_code: 'CNY', rates: { USD: 0.14 } }),
    ).toEqual({})
    expect(
      ratesFromCnyBaseResponse({ result: 'success', base_code: 'USD', rates: { USD: 1 } }),
    ).toEqual({})
    expect(ratesFromCnyBaseResponse(null)).toEqual({})
    expect(ratesFromCnyBaseResponse({ result: 'success', base_code: 'CNY' })).toEqual({})
  })

  it('drops invalid individual rates without failing the whole payload', () => {
    const parsed = ratesFromCnyBaseResponse({
      result: 'success',
      base_code: 'CNY',
      rates: { USD: 0.1389, EUR: 0, JPY: -5, GBP: 'x' },
    })
    expect(parsed.USD).toBeCloseTo(7.199, 2)
    expect(parsed.EUR).toBeUndefined()
    expect(parsed.JPY).toBeUndefined()
    expect(parsed.GBP).toBeUndefined()
  })
})
