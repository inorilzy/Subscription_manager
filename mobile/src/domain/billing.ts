import { parseDateOnly } from './subscription'
import type { BillingInterval } from './subscription'

export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}

/** Resolve a billing occurrence for year/month using the user's anchor day. */
export function resolveBillingDate(year: number, monthIndex: number, anchorDay: number): string {
  const dim = daysInMonth(year, monthIndex)
  const day = Math.min(anchorDay, dim)
  return formatDateOnly(new Date(Date.UTC(year, monthIndex, day)))
}

export function addBillingInterval(
  dateOnly: string,
  interval: BillingInterval,
  anchorDay: number,
): string {
  const date = parseDateOnly(dateOnly)
  let year = date.getUTCFullYear()
  let month = date.getUTCMonth()

  if (interval === 'yearly') {
    year += 1
  } else {
    month += 1
    if (month > 11) {
      month = 0
      year += 1
    }
  }

  return resolveBillingDate(year, month, anchorDay)
}

/**
 * Advance nextBillingDate by full intervals until it is on/after todayDateOnly.
 * Preserves billing anchor day (and Feb 29 intent via anchorDay=29).
 */
export function advanceNextBillingDate(
  nextBillingDate: string,
  interval: BillingInterval,
  anchorDay: number,
  todayDateOnly: string,
): string {
  let current = nextBillingDate
  // Guard against infinite loops on bad data
  for (let i = 0; i < 1200; i += 1) {
    if (current >= todayDateOnly) return current
    current = addBillingInterval(current, interval, anchorDay)
  }
  return current
}

export function anchorDayFromDate(dateOnly: string): number {
  return Number(dateOnly.slice(8, 10))
}
