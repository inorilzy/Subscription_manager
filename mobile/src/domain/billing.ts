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

/** Rewind one billing interval, preserving the anchor day. */
export function previousBillingDate(
  dateOnly: string,
  interval: BillingInterval,
  anchorDay: number,
): string {
  const date = parseDateOnly(dateOnly)
  let year = date.getUTCFullYear()
  let month = date.getUTCMonth()

  if (interval === 'yearly') {
    year -= 1
  } else {
    month -= 1
    if (month < 0) {
      month = 11
      year -= 1
    }
  }

  return resolveBillingDate(year, month, anchorDay)
}

function diffDays(fromDateOnly: string, toDateOnly: string): number {
  const from = parseDateOnly(fromDateOnly)
  const to = parseDateOnly(toDateOnly)
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

/**
 * Elapsed fraction of the current billing cycle, clamped to 0..1.
 * Cycle runs from the previous occurrence to nextBillingDate.
 */
export function cycleProgress(
  nextBillingDate: string,
  interval: BillingInterval,
  anchorDay: number,
  todayDateOnly: string,
): { fraction: number; daysLeft: number; cycleDays: number } {
  const start = previousBillingDate(nextBillingDate, interval, anchorDay)
  const cycleDays = Math.max(1, diffDays(start, nextBillingDate))
  const elapsed = diffDays(start, todayDateOnly)
  const fraction = Math.min(1, Math.max(0, elapsed / cycleDays))
  const daysLeft = Math.max(0, diffDays(todayDateOnly, nextBillingDate))
  return { fraction, daysLeft, cycleDays }
}

/** Average cost per day in minor units for the current cycle. */
export function dailyAmountMinor(
  amountMinor: number,
  nextBillingDate: string,
  interval: BillingInterval,
  anchorDay: number,
): number {
  const start = previousBillingDate(nextBillingDate, interval, anchorDay)
  const cycleDays = Math.max(1, diffDays(start, nextBillingDate))
  return amountMinor / cycleDays
}
