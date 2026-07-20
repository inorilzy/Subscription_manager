export type BillingInterval = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'cancelled'
export type SubscriptionCategory =
  | 'Entertainment'
  | 'Music'
  | 'Productivity'
  | 'Utilities'
  | 'Health'
  | 'Other'

export const SUBSCRIPTION_CATEGORIES: SubscriptionCategory[] = [
  'Entertainment',
  'Music',
  'Productivity',
  'Utilities',
  'Health',
  'Other',
]

export interface Subscription {
  id: string
  name: string
  amountMinor: number
  currency: string
  billingInterval: BillingInterval
  billingAnchorDay: number
  nextBillingDate: string
  category: SubscriptionCategory
  planName: string | null
  paymentMethodLabel: string | null
  status: SubscriptionStatus
  reminderEnabled: boolean
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  version: number
}

export interface CreateSubscriptionInput {
  name: string
  amountInput: string
  nextBillingDate: string
  category?: string | null
  planName?: string | null
  paymentMethodLabel?: string | null
  currency?: string
  billingInterval?: BillingInterval
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/** Relative countdown label for a date-only ISO string (YYYY-MM-DD). */
export function relativeBillingLabel(
  nextBillingDate: string,
  today: Date = new Date(),
): string {
  const target = parseDateOnly(nextBillingDate)
  const start = startOfDay(today)
  const diffMs = target.getTime() - start.getTime()
  const days = Math.round(diffMs / 86_400_000)

  if (days === 0) return 'Today'
  if (days === 1) return 'In 1 day'
  if (days > 1) return `In ${days} days`
  if (days === -1) return '1 day ago'
  return `${Math.abs(days)} days ago`
}

export function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new ValidationError('Next billing date must be a valid date.')
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new ValidationError('Next billing date must be a valid date.')
  }
  return date
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
}

export function normalizeCategory(value?: string | null): SubscriptionCategory {
  if (!value) return 'Other'
  return (SUBSCRIPTION_CATEGORIES as string[]).includes(value)
    ? (value as SubscriptionCategory)
    : 'Other'
}

export function normalizeBillingInterval(value?: string | null): BillingInterval {
  return value === 'yearly' ? 'yearly' : 'monthly'
}

export function normalizeStatus(value?: string | null): SubscriptionStatus {
  return value === 'cancelled' ? 'cancelled' : 'active'
}

export function billingIntervalLabel(interval: BillingInterval): string {
  return interval === 'yearly' ? 'Yearly' : 'Monthly'
}
