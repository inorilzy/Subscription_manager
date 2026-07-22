import { parseDateOnly } from './subscription'
import { convertToCnyMinor, type ExchangeRates } from './exchange'
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

export type CategoryAmountGroup = MonthStats['categoriesByCurrency'][number]

export type CategoryDonutScope = 'cny' | string

export type CategoryDonutColorToken =
  | 'chart-1'
  | 'chart-2'
  | 'chart-3'
  | 'chart-4'
  | 'chart-5'
  | 'chart-other'

export interface CategoryDonutSlice {
  category: string
  amountMinor: number
  percent: number
  colorToken: CategoryDonutColorToken
}

export interface CategoryDonutModel {
  scope: CategoryDonutScope
  displayCurrency: string
  totalMinor: number
  missingRates: string[]
  slices: CategoryDonutSlice[]
}

const CHART_TOKENS: CategoryDonutColorToken[] = [
  'chart-1',
  'chart-2',
  'chart-3',
  'chart-4',
  'chart-5',
]

function rankCategories(
  amounts: Map<string, number>,
  otherLabel: string,
): Array<{ category: string; amountMinor: number; isOther: boolean }> {
  const ranked = [...amounts.entries()]
    .filter(([, amountMinor]) => amountMinor > 0)
    .map(([category, amountMinor]) => ({ category, amountMinor, isOther: false }))
    .sort((a, b) => b.amountMinor - a.amountMinor || a.category.localeCompare(b.category))

  if (ranked.length <= 5) return ranked

  const head = ranked.slice(0, 5)
  const rest = ranked.slice(5)
  const otherAmount = rest.reduce((sum, item) => sum + item.amountMinor, 0)
  if (otherAmount > 0) {
    head.push({ category: otherLabel, amountMinor: otherAmount, isOther: true })
  }
  return head
}

function toSlices(
  ranked: Array<{ category: string; amountMinor: number; isOther: boolean }>,
): CategoryDonutSlice[] {
  const totalMinor = ranked.reduce((sum, item) => sum + item.amountMinor, 0)
  if (totalMinor <= 0) return []

  return ranked.map((item, index) => ({
    category: item.category,
    amountMinor: item.amountMinor,
    percent: (item.amountMinor / totalMinor) * 100,
    colorToken: item.isOther
      ? 'chart-other'
      : CHART_TOKENS[Math.min(index, CHART_TOKENS.length - 1)]!,
  }))
}

export function listCategoryDonutScopes(groups: CategoryAmountGroup[]): string[] {
  return [...new Set(groups.map((group) => group.currency))].sort((a, b) => a.localeCompare(b))
}

export function canBuildCombinedCnyDonut(
  groups: CategoryAmountGroup[],
  rates: ExchangeRates,
): { ok: boolean; missing: string[] } {
  const missing: string[] = []
  for (const group of groups) {
    if (group.currency === 'CNY') continue
    const sample = group.categories[0]?.amountMinor ?? 0
    if (convertToCnyMinor(sample > 0 ? sample : 1, group.currency, rates) === null) {
      if (!missing.includes(group.currency)) missing.push(group.currency)
    }
  }
  missing.sort((a, b) => a.localeCompare(b))
  return { ok: missing.length === 0, missing }
}

export function resolveDefaultCategoryDonutScope(
  groups: CategoryAmountGroup[],
  rates: ExchangeRates,
): CategoryDonutScope {
  const scopes = listCategoryDonutScopes(groups)
  if (scopes.length <= 1) return scopes[0] ?? 'CNY'
  const combined = canBuildCombinedCnyDonut(groups, rates)
  if (combined.ok) return 'cny'
  return scopes[0]!
}

export function buildCategoryDonut(
  groups: CategoryAmountGroup[],
  options: {
    scope: CategoryDonutScope
    rates: ExchangeRates
    otherLabel?: string
  },
): CategoryDonutModel {
  const otherLabel = options.otherLabel ?? 'Other'
  const amounts = new Map<string, number>()
  const missingRates: string[] = []

  if (options.scope === 'cny') {
    for (const group of groups) {
      for (const item of group.categories) {
        const converted = convertToCnyMinor(item.amountMinor, group.currency, options.rates)
        if (converted === null) {
          if (!missingRates.includes(group.currency)) missingRates.push(group.currency)
          continue
        }
        amounts.set(item.category, (amounts.get(item.category) ?? 0) + converted)
      }
    }
    missingRates.sort((a, b) => a.localeCompare(b))
    const ranked = missingRates.length > 0 ? [] : rankCategories(amounts, otherLabel)
    const slices = toSlices(ranked)
    return {
      scope: 'cny',
      displayCurrency: 'CNY',
      totalMinor: slices.reduce((sum, item) => sum + item.amountMinor, 0),
      missingRates,
      slices,
    }
  }

  const group = groups.find((row) => row.currency === options.scope)
  for (const item of group?.categories ?? []) {
    amounts.set(item.category, (amounts.get(item.category) ?? 0) + item.amountMinor)
  }
  const ranked = rankCategories(amounts, otherLabel)
  const slices = toSlices(ranked)
  return {
    scope: options.scope,
    displayCurrency: options.scope,
    totalMinor: slices.reduce((sum, item) => sum + item.amountMinor, 0),
    missingRates: [],
    slices,
  }
}

function monthKey(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function previousMonth(year: number, monthIndex: number): { year: number; monthIndex: number } {
  if (monthIndex === 0) return { year: year - 1, monthIndex: 11 }
  return { year, monthIndex: monthIndex - 1 }
}

function occurrencesInMonth(subscription: Subscription, year: number, monthIndex: number): number {
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
