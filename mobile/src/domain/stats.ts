import { parseDateOnly } from './subscription'
import type { Subscription } from './subscription'
import { todayDateOnly } from './clock'
import { addBillingInterval } from './billing'

export interface MonthStats {
  year: number
  monthIndex: number
  totalMinor: number
  previousTotalMinor: number
  deltaMinor: number
  categories: Array<{ category: string; amountMinor: number }>
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function previousMonth(year: number, monthIndex: number): { year: number; monthIndex: number } {
  if (monthIndex === 0) return { year: year - 1, monthIndex: 11 }
  return { year, monthIndex: monthIndex - 1 }
}

function occurrencesInMonth(
  subscription: Subscription,
  year: number,
  monthIndex: number,
): number {
  if (subscription.status !== 'active' || subscription.deletedAt) return 0

  // Walk from a date before the month until past the month end.
  // Use nextBillingDate and go backward by intervals until before month start,
  // then forward through the month.
  const monthStart = `${monthKey(year, monthIndex)}-01`
  const dim = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const monthEnd = `${monthKey(year, monthIndex)}-${String(dim).padStart(2, '0')}`

  // Start from nextBillingDate and rewind far enough for yearly/monthly.
  let cursor = subscription.nextBillingDate
  for (let i = 0; i < 24; i += 1) {
    const prev = rewindOne(cursor, subscription)
    if (prev >= cursor) break
    if (prev < monthStart && cursor >= monthStart) break
    if (prev < monthStart) {
      cursor = prev
      break
    }
    cursor = prev
  }

  // Ensure cursor is on/before month if possible
  while (true) {
    const prev = rewindOne(cursor, subscription)
    if (prev >= cursor) break
    if (prev < monthStart) break
    cursor = prev
  }

  let total = 0
  // Forward through month
  for (let i = 0; i < 24; i += 1) {
    if (cursor > monthEnd) break
    if (cursor >= monthStart && cursor <= monthEnd) {
      total += 1
    }
    const next = addBillingInterval(
      cursor,
      subscription.billingInterval,
      subscription.billingAnchorDay,
    )
    if (next <= cursor) break
    cursor = next
  }

  return total
}

function rewindOne(dateOnly: string, subscription: Subscription): string {
  const date = parseDateOnly(dateOnly)
  let year = date.getUTCFullYear()
  let month = date.getUTCMonth()
  if (subscription.billingInterval === 'yearly') {
    year -= 1
  } else {
    month -= 1
    if (month < 0) {
      month = 11
      year -= 1
    }
  }
  const dim = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const day = Math.min(subscription.billingAnchorDay, dim)
  const y = String(year)
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function computeMonthStats(
  subscriptions: Subscription[],
  referenceDateOnly: string = todayDateOnly(),
): MonthStats {
  const ref = parseDateOnly(referenceDateOnly)
  const year = ref.getUTCFullYear()
  const monthIndex = ref.getUTCMonth()
  const prev = previousMonth(year, monthIndex)

  const categoryMap = new Map<string, number>()
  let totalMinor = 0
  let previousTotalMinor = 0

  for (const item of subscriptions) {
    const currentCount = occurrencesInMonth(item, year, monthIndex)
    if (currentCount > 0) {
      const amount = item.amountMinor * currentCount
      totalMinor += amount
      categoryMap.set(item.category, (categoryMap.get(item.category) ?? 0) + amount)
    }
    const prevCount = occurrencesInMonth(item, prev.year, prev.monthIndex)
    if (prevCount > 0) {
      previousTotalMinor += item.amountMinor * prevCount
    }
  }

  const categories = [...categoryMap.entries()]
    .map(([category, amountMinor]) => ({ category, amountMinor }))
    .sort((a, b) => b.amountMinor - a.amountMinor || a.category.localeCompare(b.category))

  return {
    year,
    monthIndex,
    totalMinor,
    previousTotalMinor,
    deltaMinor: totalMinor - previousTotalMinor,
    categories,
  }
}
