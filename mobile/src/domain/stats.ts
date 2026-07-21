import { parseDateOnly } from './subscription'
import type { Subscription } from './subscription'
import { todayDateOnly } from './clock'
import { addBillingInterval } from './billing'

export interface CurrencyAmount {
  currency: string
  amountMinor: number
}

export interface MonthStats {
  year: number
  monthIndex: number
  totalsByCurrency: CurrencyAmount[]
  previousTotalsByCurrency: CurrencyAmount[]
  categoriesByCurrency: Array<{
    currency: string
    categories: Array<{ category: string; amountMinor: number }>
  }>
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

  const monthStart = `${monthKey(year, monthIndex)}-01`
  const dim = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const monthEnd = `${monthKey(year, monthIndex)}-${String(dim).padStart(2, '0')}`

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

  while (true) {
    const prev = rewindOne(cursor, subscription)
    if (prev >= cursor) break
    if (prev < monthStart) break
    cursor = prev
  }

  let total = 0
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

function mapToSortedAmounts(map: Map<string, number>): CurrencyAmount[] {
  return [...map.entries()]
    .map(([currency, amountMinor]) => ({ currency, amountMinor }))
    .sort((a, b) => a.currency.localeCompare(b.currency))
}

export function computeMonthStats(
  subscriptions: Subscription[],
  referenceDateOnly: string = todayDateOnly(),
): MonthStats {
  const ref = parseDateOnly(referenceDateOnly)
  const year = ref.getUTCFullYear()
  const monthIndex = ref.getUTCMonth()
  const prev = previousMonth(year, monthIndex)

  const totalMap = new Map<string, number>()
  const previousMap = new Map<string, number>()
  const categoryMaps = new Map<string, Map<string, number>>()

  for (const item of subscriptions) {
    const currentCount = occurrencesInMonth(item, year, monthIndex)
    if (currentCount > 0) {
      const amount = item.amountMinor * currentCount
      totalMap.set(item.currency, (totalMap.get(item.currency) ?? 0) + amount)
      const catMap = categoryMaps.get(item.currency) ?? new Map<string, number>()
      catMap.set(item.category, (catMap.get(item.category) ?? 0) + amount)
      categoryMaps.set(item.currency, catMap)
    }
    const prevCount = occurrencesInMonth(item, prev.year, prev.monthIndex)
    if (prevCount > 0) {
      previousMap.set(
        item.currency,
        (previousMap.get(item.currency) ?? 0) + item.amountMinor * prevCount,
      )
    }
  }

  const categoriesByCurrency = [...categoryMaps.entries()]
    .map(([currency, catMap]) => ({
      currency,
      categories: [...catMap.entries()]
        .map(([category, amountMinor]) => ({ category, amountMinor }))
        .sort((a, b) => b.amountMinor - a.amountMinor || a.category.localeCompare(b.category)),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency))

  return {
    year,
    monthIndex,
    totalsByCurrency: mapToSortedAmounts(totalMap),
    previousTotalsByCurrency: mapToSortedAmounts(previousMap),
    categoriesByCurrency,
  }
}
