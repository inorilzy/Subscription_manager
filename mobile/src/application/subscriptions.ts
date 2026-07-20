import { getDatabase, getPreference } from '../database/client'
import { parseAmountToMinor } from '../domain/money'
import {
  type CreateSubscriptionInput,
  type Subscription,
  type SubscriptionCategory,
  ValidationError,
  normalizeBillingInterval,
  normalizeCategory,
  normalizeStatus,
  parseDateOnly,
} from '../domain/subscription'

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function mapRow(row: Record<string, unknown>): Subscription {
  return {
    id: String(row.id),
    name: String(row.name),
    amountMinor: Number(row.amount_minor),
    currency: String(row.currency),
    billingInterval: normalizeBillingInterval(String(row.billing_interval)),
    billingAnchorDay: Number(row.billing_anchor_day),
    nextBillingDate: String(row.next_billing_date),
    category: normalizeCategory(String(row.category)),
    planName: row.plan_name == null ? null : String(row.plan_name),
    paymentMethodLabel:
      row.payment_method_label == null ? null : String(row.payment_method_label),
    status: normalizeStatus(String(row.status)),
    reminderEnabled: Number(row.reminder_enabled) === 1,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    deletedAt: row.deleted_at == null ? null : String(row.deleted_at),
    version: Number(row.version ?? 1),
  }
}

function validateCreateInput(input: CreateSubscriptionInput): {
  name: string
  amountMinor: number
  nextBillingDate: string
  category: SubscriptionCategory
  planName: string | null
  paymentMethodLabel: string | null
  currency: string
  billingInterval: 'monthly' | 'yearly'
  billingAnchorDay: number
} {
  const name = input.name.trim()
  if (!name) {
    throw new ValidationError('Name is required.')
  }

  if (!input.nextBillingDate?.trim()) {
    throw new ValidationError('Next billing date is required.')
  }

  const nextBillingDate = input.nextBillingDate.trim()
  parseDateOnly(nextBillingDate)

  let amountMinor: number
  try {
    amountMinor = parseAmountToMinor(input.amountInput)
  } catch (error) {
    throw new ValidationError(
      error instanceof Error ? error.message : 'Enter a valid amount greater than zero.',
    )
  }

  const paymentMethodLabel = input.paymentMethodLabel?.trim() || null
  if (paymentMethodLabel && looksLikeSensitivePaymentData(paymentMethodLabel)) {
    throw new ValidationError(
      'Use a short label like “Visa ending 4242”. Do not enter full card numbers or CVV.',
    )
  }

  const planName = input.planName?.trim() || null
  const category = normalizeCategory(input.category)
  const currency = input.currency?.trim() || 'USD'
  const billingInterval = normalizeBillingInterval(input.billingInterval)
  const billingAnchorDay = Number(nextBillingDate.slice(8, 10))

  return {
    name,
    amountMinor,
    nextBillingDate,
    category,
    planName,
    paymentMethodLabel,
    currency,
    billingInterval,
    billingAnchorDay,
  }
}

function looksLikeSensitivePaymentData(label: string): boolean {
  const digits = label.replace(/\D/g, '')
  if (digits.length >= 12) return true
  if (/\bcvv\b/i.test(label)) return true
  return false
}

export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<Subscription> {
  const validated = validateCreateInput(input)
  const currency =
    validated.currency === 'USD'
      ? await getPreference('currency', 'USD')
      : validated.currency

  const now = new Date().toISOString()
  const subscription: Subscription = {
    id: createId(),
    name: validated.name,
    amountMinor: validated.amountMinor,
    currency,
    billingInterval: validated.billingInterval,
    billingAnchorDay: validated.billingAnchorDay,
    nextBillingDate: validated.nextBillingDate,
    category: validated.category,
    planName: validated.planName,
    paymentMethodLabel: validated.paymentMethodLabel,
    status: 'active',
    reminderEnabled: true,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    version: 1,
  }

  const db = await getDatabase()
  try {
    await db.execute(
      `INSERT INTO subscriptions (
        id, name, amount_minor, currency, billing_interval, billing_anchor_day,
        next_billing_date, category, plan_name, payment_method_label, status,
        reminder_enabled, created_at, updated_at, deleted_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        subscription.id,
        subscription.name,
        subscription.amountMinor,
        subscription.currency,
        subscription.billingInterval,
        subscription.billingAnchorDay,
        subscription.nextBillingDate,
        subscription.category,
        subscription.planName,
        subscription.paymentMethodLabel,
        subscription.status,
        subscription.reminderEnabled ? 1 : 0,
        subscription.createdAt,
        subscription.updatedAt,
        subscription.deletedAt,
        subscription.version,
      ],
    )
  } catch {
    throw new ValidationError('Could not save the subscription. Please try again.')
  }

  return subscription
}

export async function listSubscriptions(): Promise<Subscription[]> {
  const db = await getDatabase()
  const result = await db.query(
    `SELECT * FROM subscriptions
     WHERE deleted_at IS NULL
     ORDER BY next_billing_date ASC, name ASC`,
  )
  return (result.values ?? []).map(mapRow)
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  const db = await getDatabase()
  const result = await db.query(
    `SELECT * FROM subscriptions WHERE id = ? AND deleted_at IS NULL`,
    [id],
  )
  const row = result.values?.[0]
  return row ? mapRow(row) : null
}

export async function getOverviewSnapshot(): Promise<{
  activeCount: number
  monthlyRecurringMinor: number
  upcoming: Subscription[]
}> {
  const subscriptions = (await listSubscriptions()).filter((item) => item.status === 'active')
  const monthlyRecurringMinor = subscriptions.reduce((sum, item) => {
    if (item.billingInterval === 'yearly') {
      return sum + Math.round(item.amountMinor / 12)
    }
    return sum + item.amountMinor
  }, 0)

  return {
    activeCount: subscriptions.length,
    monthlyRecurringMinor,
    upcoming: subscriptions.slice(0, 5),
  }
}
