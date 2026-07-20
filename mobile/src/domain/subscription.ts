import { todayDateOnly } from './clock'

export type BillingInterval = 'monthly' | 'yearly'
export type SubscriptionStatus = 'active' | 'cancelled'
/** Built-in categories ship fixed; users may add custom display categories. */
export type SubscriptionCategory = string

export const BUILTIN_CATEGORIES = [
  'Entertainment',
  'Music',
  'Productivity',
  'Utilities',
  'Health',
  'Other',
] as const

export const SUBSCRIPTION_CATEGORIES: SubscriptionCategory[] = [...BUILTIN_CATEGORIES]

const MAX_CATEGORY_LENGTH = 24

export function isValidCategoryName(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length > 0 && trimmed.length <= MAX_CATEGORY_LENGTH
}

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

export type RelativeLabelFn = (days: number) => string

/** Relative countdown label for a date-only ISO string (YYYY-MM-DD). */
export function relativeBillingLabel(
  nextBillingDate: string,
  options?: {
    todayDateOnly?: string
    format?: RelativeLabelFn
  },
): string {
  const today = options?.todayDateOnly ?? todayDateOnly()
  const target = parseDateOnly(nextBillingDate)
  const start = parseDateOnly(today)
  const diffMs = target.getTime() - start.getTime()
  const days = Math.round(diffMs / 86_400_000)

  if (options?.format) {
    return options.format(days)
  }

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

export function normalizeCategory(value?: string | null): SubscriptionCategory {
  const trimmed = value?.trim()
  if (!trimmed) return 'Other'
  return isValidCategoryName(trimmed) ? trimmed : 'Other'
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
