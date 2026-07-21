import { getDatabase, getPreference } from '../database/client'
import { reconcileNotifications } from './reminders'
import { advanceNextBillingDate, anchorDayFromDate } from '../domain/billing'
import { todayDateOnly } from '../domain/clock'
import { MoneyError, normalizeCurrency, parseAmountToMinor } from '../domain/money'
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

export interface UpdateSubscriptionInput extends CreateSubscriptionInput {
  id: string
}

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

function mapMoneyError(error: unknown): ValidationError {
  if (error instanceof MoneyError) {
    return new ValidationError(error.message)
  }
  return new ValidationError('Enter a valid amount greater than zero.')
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

  const currency = normalizeCurrency(input.currency, 'CNY')

  let amountMinor: number
  try {
    amountMinor = parseAmountToMinor(input.amountInput, currency)
  } catch (error) {
    throw mapMoneyError(error)
  }

  const paymentMethodLabel = input.paymentMethodLabel?.trim() || null
  if (paymentMethodLabel && looksLikeSensitivePaymentData(paymentMethodLabel)) {
    throw new ValidationError(
      'Use a short label like “Visa ending 4242”. Do not enter full card numbers or CVV.',
    )
  }

  const planName = input.planName?.trim() || null
  const category = normalizeCategory(input.category)
  const billingInterval = normalizeBillingInterval(input.billingInterval)
  const billingAnchorDay = anchorDayFromDate(nextBillingDate)

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

async function advanceIfNeeded(subscription: Subscription): Promise<Subscription> {
  if (subscription.status !== 'active' || subscription.deletedAt) {
    return subscription
  }

  const today = todayDateOnly()
  const advanced = advanceNextBillingDate(
    subscription.nextBillingDate,
    subscription.billingInterval,
    subscription.billingAnchorDay,
    today,
  )

  if (advanced === subscription.nextBillingDate) {
    return subscription
  }

  const now = new Date().toISOString()
  const db = await getDatabase()
  await db.execute(
    `UPDATE subscriptions
     SET next_billing_date = ?, updated_at = ?, version = version + 1
     WHERE id = ? AND deleted_at IS NULL`,
    [advanced, now, subscription.id],
  )

  return {
    ...subscription,
    nextBillingDate: advanced,
    updatedAt: now,
    version: subscription.version + 1,
  }
}

export async function createSubscription(
  input: CreateSubscriptionInput,
): Promise<Subscription> {
  const validated = validateCreateInput(input)
  const currency = validated.currency

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

  const created = await advanceIfNeeded(subscription)
  await reconcileNotifications(await listSubscriptions({ includeCancelled: true }))
  return created
}
export async function listSubscriptions(options?: {
  includeCancelled?: boolean
}): Promise<Subscription[]> {
  const db = await getDatabase()
  const result = await db.query(
    `SELECT * FROM subscriptions
     WHERE deleted_at IS NULL
     ORDER BY next_billing_date ASC, name ASC`,
  )
  const rows = (result.values ?? []).map(mapRow)
  const advanced = await Promise.all(rows.map((row) => advanceIfNeeded(row)))
  const filtered = options?.includeCancelled
    ? advanced
    : advanced.filter((item) => item.status === 'active')
  return filtered.sort((a, b) => {
    const dateCmp = a.nextBillingDate.localeCompare(b.nextBillingDate)
    if (dateCmp !== 0) return dateCmp
    return a.name.localeCompare(b.name)
  })
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  const db = await getDatabase()
  const result = await db.query(
    `SELECT * FROM subscriptions WHERE id = ? AND deleted_at IS NULL`,
    [id],
  )
  const row = result.values?.[0]
  if (!row) return null
  return advanceIfNeeded(mapRow(row))
}

export async function getOverviewSnapshot(): Promise<{
  activeCount: number
  monthlyByCurrency: Array<{ currency: string; amountMinor: number }>
  upcoming: Subscription[]
}> {
  const subscriptions = await listSubscriptions()
  const totals = new Map<string, number>()
  for (const item of subscriptions) {
    const amount =
      item.billingInterval === 'yearly'
        ? Math.round(item.amountMinor / 12)
        : item.amountMinor
    totals.set(item.currency, (totals.get(item.currency) ?? 0) + amount)
  }
  const monthlyByCurrency = [...totals.entries()]
    .map(([currency, amountMinor]) => ({ currency, amountMinor }))
    .sort((a, b) => a.currency.localeCompare(b.currency))

  return {
    activeCount: subscriptions.length,
    monthlyByCurrency,
    upcoming: subscriptions.slice(0, 5),
  }
}

export async function updateSubscription(
  input: UpdateSubscriptionInput,
): Promise<Subscription> {
  const existing = await getSubscription(input.id)
  if (!existing) {
    throw new ValidationError('Subscription not found.')
  }

  const validated = validateCreateInput(input)
  const now = new Date().toISOString()
  const nextVersion = existing.version + 1
  const updated: Subscription = {
    ...existing,
    name: validated.name,
    amountMinor: validated.amountMinor,
    currency: validated.currency,
    billingInterval: validated.billingInterval,
    billingAnchorDay: validated.billingAnchorDay,
    nextBillingDate: validated.nextBillingDate,
    category: validated.category,
    planName: validated.planName,
    paymentMethodLabel: validated.paymentMethodLabel,
    updatedAt: now,
    version: nextVersion,
  }

  const db = await getDatabase()
  try {
    await db.execute(
      `UPDATE subscriptions SET
        name = ?, amount_minor = ?, currency = ?, billing_interval = ?, billing_anchor_day = ?,
        next_billing_date = ?, category = ?, plan_name = ?, payment_method_label = ?,
        updated_at = ?, version = ?
       WHERE id = ? AND deleted_at IS NULL`,
      [
        updated.name,
        updated.amountMinor,
        updated.currency,
        updated.billingInterval,
        updated.billingAnchorDay,
        updated.nextBillingDate,
        updated.category,
        updated.planName,
        updated.paymentMethodLabel,
        updated.updatedAt,
        updated.version,
        updated.id,
      ],
    )
  } catch {
    throw new ValidationError('Could not save the subscription. Please try again.')
  }

  const result = await advanceIfNeeded(updated)
  await reconcileNotifications(await listSubscriptions({ includeCancelled: true }))
  return result
}

export async function cancelSubscription(id: string): Promise<Subscription> {
  const existing = await getSubscription(id)
  if (!existing) {
    throw new ValidationError('Subscription not found.')
  }
  if (existing.status === 'cancelled') return existing

  const now = new Date().toISOString()
  const db = await getDatabase()
  await db.execute(
    `UPDATE subscriptions SET status = ?, updated_at = ?, version = version + 1
     WHERE id = ? AND deleted_at IS NULL`,
    ['cancelled', now, id],
  )

  const cancelled = {
    ...existing,
    status: 'cancelled' as const,
    updatedAt: now,
    version: existing.version + 1,
  }
  await reconcileNotifications(await listSubscriptions({ includeCancelled: true }))
  return cancelled
}

export async function reactivateSubscription(id: string): Promise<Subscription> {
  const existing = await getSubscription(id)
  if (!existing) {
    throw new ValidationError('Subscription not found.')
  }

  const now = new Date().toISOString()
  const today = todayDateOnly()
  const nextBillingDate = advanceNextBillingDate(
    existing.nextBillingDate,
    existing.billingInterval,
    existing.billingAnchorDay,
    today,
  )

  const db = await getDatabase()
  await db.execute(
    `UPDATE subscriptions SET status = ?, next_billing_date = ?, updated_at = ?, version = version + 1
     WHERE id = ? AND deleted_at IS NULL`,
    ['active', nextBillingDate, now, id],
  )

  const reactivated = {
    ...existing,
    status: 'active' as const,
    nextBillingDate,
    updatedAt: now,
    version: existing.version + 1,
  }
  await reconcileNotifications(await listSubscriptions({ includeCancelled: true }))
  return reactivated
}

export async function deleteSubscription(id: string): Promise<void> {
  const existing = await getSubscription(id)
  if (!existing) {
    throw new ValidationError('Subscription not found.')
  }

  const now = new Date().toISOString()
  const db = await getDatabase()
  await db.execute(
    `UPDATE subscriptions SET deleted_at = ?, updated_at = ?, version = version + 1
     WHERE id = ?`,
    [now, now, id],
  )
  await reconcileNotifications(await listSubscriptions({ includeCancelled: true }))
}
