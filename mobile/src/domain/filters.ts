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
