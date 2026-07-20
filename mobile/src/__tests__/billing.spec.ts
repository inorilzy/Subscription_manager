import { describe, expect, it } from 'vitest'
import {
  addBillingInterval,
  advanceNextBillingDate,
  resolveBillingDate,
} from '../domain/billing'

describe('billing recurrence', () => {
  it('handles ordinary monthly and yearly advances', () => {
    expect(addBillingInterval('2030-01-15', 'monthly', 15)).toBe('2030-02-15')
    expect(addBillingInterval('2030-01-15', 'yearly', 15)).toBe('2031-01-15')
  })

  it('clamps month-end anchors in short months and restores later', () => {
    expect(resolveBillingDate(2030, 1, 31)).toBe('2030-02-28') // Feb 2030
    expect(resolveBillingDate(2030, 2, 31)).toBe('2030-03-31')
    expect(addBillingInterval('2030-01-31', 'monthly', 31)).toBe('2030-02-28')
    expect(addBillingInterval('2030-02-28', 'monthly', 31)).toBe('2030-03-31')
  })

  it('handles Feb 29 yearly renewals across leap and non-leap years', () => {
    expect(addBillingInterval('2024-02-29', 'yearly', 29)).toBe('2025-02-28')
    expect(addBillingInterval('2025-02-28', 'yearly', 29)).toBe('2026-02-28')
    expect(addBillingInterval('2027-02-28', 'yearly', 29)).toBe('2028-02-29')
  })

  it('advances overdue dates by full cycles until current or future', () => {
    expect(advanceNextBillingDate('2029-01-31', 'monthly', 31, '2030-03-15')).toBe('2030-03-31')
    expect(advanceNextBillingDate('2028-02-29', 'yearly', 29, '2030-01-01')).toBe('2030-02-28')
    expect(advanceNextBillingDate('2030-06-01', 'monthly', 1, '2030-01-01')).toBe('2030-06-01')
  })

  it('crosses year boundaries for monthly renewals', () => {
    expect(addBillingInterval('2030-12-10', 'monthly', 10)).toBe('2031-01-10')
  })
})
