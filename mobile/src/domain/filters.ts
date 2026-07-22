import { convertToCnyMinor, type ExchangeRates } from './exchange'
import type {
  BillingInterval,
  Subscription,
  SubscriptionCategory,
  SubscriptionStatus,
} from './subscription'

export interface SubscriptionFilters {
  query: string
  status: 'all' | SubscriptionStatus
  category: 'all' | SubscriptionCategory
  billingInterval: 'all' | BillingInterval
}

export const DEFAULT_FILTERS: SubscriptionFilters = {
  query: '',
  status: 'active',
  category: 'all',
  billingInterval: 'all',
}

export type SubscriptionSort =
  | 'next-asc'
  | 'next-desc'
  | 'price-desc'
  | 'price-asc'
  | 'name-asc'
  | 'name-desc'

export const DEFAULT_SORT: SubscriptionSort = 'next-asc'

export function filterSubscriptions(
  items: Subscription[],
  filters: SubscriptionFilters,
): Subscription[] {
  const q = filters.query.trim().toLowerCase()
  return items.filter((item) => {
    if (filters.status !== 'all' && item.status !== filters.status) return false
    if (filters.category !== 'all' && item.category !== filters.category) return false
    if (filters.billingInterval !== 'all' && item.billingInterval !== filters.billingInterval) {
      return false
    }
    if (
      q &&
      !item.name.toLowerCase().includes(q) &&
      !item.accountLabel?.toLowerCase().includes(q)
    ) {
      return false
    }
    return true
  })
}

export function hasActiveFilters(filters: SubscriptionFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.status !== 'active' ||
    filters.category !== 'all' ||
    filters.billingInterval !== 'all'
  )
}

/** Sort a filtered copy without changing repository order or the caller's array. */
export function sortSubscriptions(
  items: Subscription[],
  sort: SubscriptionSort,
  rates: ExchangeRates,
): Subscription[] {
  return [...items].sort((a, b) => {
    if (sort === 'next-asc' || sort === 'next-desc') {
      const dateOrder = a.nextBillingDate.localeCompare(b.nextBillingDate)
      const directed = sort === 'next-asc' ? dateOrder : -dateOrder
      return directed || a.name.localeCompare(b.name)
    }

    if (sort === 'name-asc' || sort === 'name-desc') {
      const nameOrder = a.name.localeCompare(b.name)
      return sort === 'name-asc' ? nameOrder : -nameOrder
    }

    const aPrice = convertToCnyMinor(a.amountMinor, a.currency, rates)
    const bPrice = convertToCnyMinor(b.amountMinor, b.currency, rates)
    if (aPrice === null && bPrice === null) return a.name.localeCompare(b.name)
    if (aPrice === null) return 1
    if (bPrice === null) return -1
    const priceOrder = aPrice - bPrice
    const directed = sort === 'price-asc' ? priceOrder : -priceOrder
    return directed || a.name.localeCompare(b.name)
  })
}
