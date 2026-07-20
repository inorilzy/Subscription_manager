import { getDatabase, getPreference } from '../database/client'
import type { Subscription } from '../domain/subscription'
import { listSubscriptions } from './subscriptions'
import { reconcileNotifications } from './reminders'

export const BACKUP_DOCUMENT_TYPE = 'subscout-backup'
export const BACKUP_SCHEMA_VERSION = 1

export interface BackupDocument {
  documentType: typeof BACKUP_DOCUMENT_TYPE
  schemaVersion: number
  exportedAt: string
  preferences: Record<string, string>
  subscriptions: Array<Record<string, unknown>>
}

function toRow(item: Subscription): Record<string, unknown> {
  return {
    id: item.id,
    name: item.name,
    amount_minor: item.amountMinor,
    currency: item.currency,
    billing_interval: item.billingInterval,
    billing_anchor_day: item.billingAnchorDay,
    next_billing_date: item.nextBillingDate,
    category: item.category,
    plan_name: item.planName,
    payment_method_label: item.paymentMethodLabel,
    status: item.status,
    reminder_enabled: item.reminderEnabled ? 1 : 0,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    deleted_at: item.deletedAt,
    version: item.version,
  }
}

export async function exportBackup(): Promise<BackupDocument> {
  const subscriptions = await listSubscriptions({ includeCancelled: true })
  // also include soft-deleted? MVP export active+cancelled non-deleted only is fine
  const keys = ['currency', 'language', 'theme', 'reminders_enabled', 'reminder_lead_days']
  const preferences: Record<string, string> = {}
  for (const key of keys) {
    preferences[key] = await getPreference(key, key === 'reminders_enabled' ? '0' : key === 'reminder_lead_days' ? '3' : key === 'currency' ? 'USD' : key === 'language' ? 'en' : 'light')
  }

  return {
    documentType: BACKUP_DOCUMENT_TYPE,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    preferences,
    subscriptions: subscriptions.map(toRow),
  }
}

export function validateBackup(input: unknown): BackupDocument {
  if (!input || typeof input !== 'object') {
    throw new Error('Backup file is not valid JSON.')
  }
  const doc = input as Partial<BackupDocument>
  if (doc.documentType !== BACKUP_DOCUMENT_TYPE) {
    throw new Error('This file is not a SubScout backup.')
  }
  if (doc.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error('Unsupported backup version.')
  }
  if (!Array.isArray(doc.subscriptions) || !doc.preferences || typeof doc.preferences !== 'object') {
    throw new Error('Backup is missing required fields.')
  }
  for (const row of doc.subscriptions) {
    if (!row || typeof row !== 'object') throw new Error('Backup contains an invalid subscription.')
    const r = row as Record<string, unknown>
    if (typeof r.id !== 'string' || typeof r.name !== 'string') {
      throw new Error('Backup contains an invalid subscription.')
    }
    if (typeof r.amount_minor !== 'number' || !Number.isInteger(r.amount_minor) || r.amount_minor <= 0) {
      throw new Error('Backup contains an invalid amount.')
    }
    if (r.billing_interval !== 'monthly' && r.billing_interval !== 'yearly') {
      throw new Error('Backup contains an invalid billing cycle.')
    }
    if (typeof r.next_billing_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.next_billing_date)) {
      throw new Error('Backup contains an invalid billing date.')
    }
  }
  return doc as BackupDocument
}

export async function importBackup(raw: unknown, confirmed: boolean): Promise<void> {
  if (!confirmed) {
    throw new Error('Import cancelled.')
  }
  const doc = validateBackup(raw)
  const db = await getDatabase()

  // Replace semantics: clear then insert. Memory + SQLite both support DELETE FROM.
  await db.execute('DELETE FROM subscriptions')
  await db.execute('DELETE FROM preferences')

  for (const [key, value] of Object.entries(doc.preferences)) {
    await db.execute('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)', [key, value])
  }

  for (const row of doc.subscriptions) {
    await db.execute(
      `INSERT INTO subscriptions (
        id, name, amount_minor, currency, billing_interval, billing_anchor_day,
        next_billing_date, category, plan_name, payment_method_label, status,
        reminder_enabled, created_at, updated_at, deleted_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        String(row.id),
        String(row.name),
        Number(row.amount_minor),
        String(row.currency ?? 'USD'),
        String(row.billing_interval),
        Number(row.billing_anchor_day ?? 1),
        String(row.next_billing_date),
        String(row.category ?? 'Other'),
        row.plan_name == null ? null : String(row.plan_name),
        row.payment_method_label == null ? null : String(row.payment_method_label),
        String(row.status ?? 'active'),
        Number(row.reminder_enabled ?? 1),
        String(row.created_at ?? new Date().toISOString()),
        String(row.updated_at ?? new Date().toISOString()),
        row.deleted_at == null ? null : String(row.deleted_at),
        Number(row.version ?? 1),
      ],
    )
  }

  const restored = await listSubscriptions({ includeCancelled: true })
  await reconcileNotifications(restored)
}
