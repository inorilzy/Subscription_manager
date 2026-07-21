import { describe, expect, it } from 'vitest'
import {
  addBillingInterval,
  advanceNextBillingDate,
  cycleProgress,
  cycleProgressTone,
  dailyAmountMinor,
  previousBillingDate,
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

describe('cycle progress and daily amount', () => {
  it('computes previous billing date preserving anchors', () => {
    expect(previousBillingDate('2030-06-15', 'monthly', 15)).toBe('2030-05-15')
    expect(previousBillingDate('2030-03-31', 'monthly', 31)).toBe('2030-02-28')
    expect(previousBillingDate('2030-06-01', 'yearly', 1)).toBe('2029-06-01')
  })

  it('computes elapsed and remaining cycle progress between occurrences', () => {
    // Cycle 2030-05-15 -> 2030-06-15 = 31 days
    const halfway = cycleProgress('2030-06-15', 'monthly', 15, '2030-05-31')
    expect(halfway.cycleDays).toBe(31)
    expect(halfway.daysLeft).toBe(15)
    expect(halfway.fraction).toBeCloseTo(16 / 31, 5)
    expect(halfway.remainingFraction).toBeCloseTo(15 / 31, 5)

    const start = cycleProgress('2030-06-15', 'monthly', 15, '2030-05-15')
    expect(start.fraction).toBe(0)
    expect(start.remainingFraction).toBe(1)

    const due = cycleProgress('2030-06-15', 'monthly', 15, '2030-06-15')
    expect(due.fraction).toBe(1)
    expect(due.remainingFraction).toBe(0)
    expect(due.daysLeft).toBe(0)
  })

  it('turns orange at half remaining and red within seven days', () => {
    expect(cycleProgressTone({ remainingFraction: 0.51, daysLeft: 8 })).toBe('green')
    expect(cycleProgressTone({ remainingFraction: 0.5, daysLeft: 8 })).toBe('orange')
    expect(cycleProgressTone({ remainingFraction: 0.9, daysLeft: 7 })).toBe('red')
    expect(cycleProgressTone({ remainingFraction: 0, daysLeft: 0 })).toBe('red')
  })

  it('computes daily cost from the real cycle length', () => {
    // 31-day cycle
    expect(dailyAmountMinor(3100, '2030-06-15', 'monthly', 15)).toBeCloseTo(100, 5)
    // 365-day yearly cycle 2029-06-01 -> 2030-06-01
    expect(dailyAmountMinor(36500, '2030-06-01', 'yearly', 1)).toBeCloseTo(100, 5)
  })
})
