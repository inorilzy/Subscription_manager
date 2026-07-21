import { describe, expect, it, beforeEach } from 'vitest'
import { filterSubscriptions, DEFAULT_FILTERS } from '../domain/filters'
import { computeMonthStats } from '../domain/stats'
import { planNotifications } from '../application/reminders'
import { exportBackup, importBackup, validateBackup } from '../application/backup'
import { createSubscription, listSubscriptions } from '../application/subscriptions'
import { migrate, resetDatabaseForTests, type DatabaseClient } from '../database/client'
import { setNow } from '../domain/clock'
import {
  getNotificationAdapter,
  resetNotificationAdapterForTests,
  type InMemoryNotificationAdapter,
} from '../notifications/adapter'
import type { Subscription } from '../domain/subscription'

function sample(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: '1',
    name: 'Netflix',
    amountMinor: 1599,
    currency: 'USD',
    billingInterval: 'monthly',
    billingAnchorDay: 15,
    nextBillingDate: '2030-06-15',
    category: 'Entertainment',
    planName: null,
    paymentMethodLabel: null,
    iconKey: 'auto',
    accountLabel: null,
    status: 'active',
    reminderEnabled: true,
    createdAt: '2030-01-01T00:00:00.000Z',
    updatedAt: '2030-01-01T00:00:00.000Z',
    deletedAt: null,
    version: 1,
    ...overrides,
  }
}

describe('search and filter domain', () => {
  it('filters by name, status, category and interval', () => {
    const items = [
      sample({
        id: '1',
        name: 'Netflix',
        category: 'Entertainment',
        billingInterval: 'monthly',
        accountLabel: 'home@example.com',
      }),
      sample({
        id: '2',
        name: 'Adobe',
        category: 'Productivity',
        billingInterval: 'yearly',
        amountMinor: 12000,
      }),
      sample({ id: '3', name: 'Old Gym', status: 'cancelled', category: 'Health' }),
    ]

    expect(
      filterSubscriptions(items, { ...DEFAULT_FILTERS, query: 'net' }).map((i) => i.name),
    ).toEqual(['Netflix'])
    expect(
      filterSubscriptions(items, { ...DEFAULT_FILTERS, query: 'home@example.com' }).map(
        (i) => i.name,
      ),
    ).toEqual(['Netflix'])
    expect(
      filterSubscriptions(items, { ...DEFAULT_FILTERS, status: 'cancelled' }).map((i) => i.name),
    ).toEqual(['Old Gym'])
    expect(
      filterSubscriptions(items, {
        ...DEFAULT_FILTERS,
        status: 'all',
        category: 'Productivity',
      }).map((i) => i.name),
    ).toEqual(['Adobe'])
    expect(
      filterSubscriptions(items, {
        ...DEFAULT_FILTERS,
        status: 'all',
        billingInterval: 'yearly',
      }).map((i) => i.name),
    ).toEqual(['Adobe'])
  })
})

describe('month stats domain', () => {
  it('counts monthly and yearly occurrences only in charge months', () => {
    setNow('2030-06-10T12:00:00')
    const items = [
      sample({
        id: 'm',
        name: 'Monthly',
        amountMinor: 1000,
        nextBillingDate: '2030-06-15',
        billingInterval: 'monthly',
        billingAnchorDay: 15,
      }),
      sample({
        id: 'y',
        name: 'Yearly',
        amountMinor: 12000,
        nextBillingDate: '2030-06-01',
        billingInterval: 'yearly',
        billingAnchorDay: 1,
        category: 'Productivity',
      }),
      sample({
        id: 'c',
        name: 'Cancelled',
        amountMinor: 5000,
        status: 'cancelled',
        nextBillingDate: '2030-06-20',
      }),
    ]

    const stats = computeMonthStats(items, '2030-06-10')
    expect(stats.totalsByCurrency).toEqual([{ currency: 'USD', amountMinor: 1000 + 12000 }])
    const cats = stats.categoriesByCurrency[0]?.categories ?? []
    expect(cats.map((c) => c.category).sort()).toEqual(['Entertainment', 'Productivity'])
    expect(cats.reduce((sum, c) => sum + c.amountMinor, 0)).toBe(1000 + 12000)
    setNow(null)
  })

  it('groups stats by subscription currency without FX conversion', () => {
    setNow('2030-06-10T12:00:00')
    const items = [
      sample({
        id: 'usd',
        name: 'Netflix',
        amountMinor: 1599,
        currency: 'USD',
        nextBillingDate: '2030-06-15',
      }),
      sample({
        id: 'cny',
        name: 'iQIYI',
        amountMinor: 2500,
        currency: 'CNY',
        nextBillingDate: '2030-06-20',
        category: 'Entertainment',
      }),
    ]
    const stats = computeMonthStats(items, '2030-06-10')
    expect(stats.totalsByCurrency).toEqual([
      { currency: 'CNY', amountMinor: 2500 },
      { currency: 'USD', amountMinor: 1599 },
    ])
    setNow(null)
  })
})

describe('subscription metadata migration', () => {
  it('adds icon and account columns atomically after schema v1', async () => {
    const versions = new Set([1])
    const executed: string[] = []
    const client: DatabaseClient = {
      async execute(statement, params = []) {
        const sql = statement.trim()
        executed.push(sql)
        if (sql.startsWith('INSERT INTO schema_migrations')) {
          versions.add(Number(params[0]))
        }
      },
      async query(statement, params = []) {
        if (statement.includes('FROM schema_migrations')) {
          const version = Number(params[0])
          return { values: versions.has(version) ? [{ version }] : [] }
        }
        return { values: [] }
      },
      async transaction<T>(work: () => Promise<T>): Promise<T> {
        executed.push('-- begin migration')
        const result = await work()
        executed.push('-- commit migration')
        return result
      },
      async close() {},
    }

    await migrate(client)

    const begin = executed.indexOf('-- begin migration')
    const iconColumn = executed.indexOf(
      "ALTER TABLE subscriptions ADD COLUMN icon_key TEXT NOT NULL DEFAULT 'auto'",
    )
    const accountColumn = executed.indexOf(
      'ALTER TABLE subscriptions ADD COLUMN account_label TEXT',
    )
    const commit = executed.indexOf('-- commit migration')
    expect(begin).toBeGreaterThanOrEqual(0)
    expect(iconColumn).toBeGreaterThan(begin)
    expect(accountColumn).toBeGreaterThan(iconColumn)
    expect(commit).toBeGreaterThan(accountColumn)
    expect(executed).toContain('PRAGMA user_version = 2')
    expect(versions.has(2)).toBe(true)
  })
})

describe('reminders and backup', () => {
  beforeEach(async () => {
    setNow('2030-01-15T12:00:00')
    resetNotificationAdapterForTests()
    await resetDatabaseForTests()
  })

  it('plans lead-day notifications for active subscriptions only', () => {
    const planned = planNotifications(
      [
        sample({ id: 'a', name: 'Active', nextBillingDate: '2030-01-20' }),
        sample({ id: 'c', name: 'Cancelled', status: 'cancelled', nextBillingDate: '2030-01-20' }),
      ],
      { leadDays: 3, language: 'en', horizonMonths: 2 },
    )
    expect(planned.some((p) => p.subscriptionId === 'a')).toBe(true)
    expect(planned.every((p) => p.subscriptionId !== 'c')).toBe(true)
    expect(planned[0]?.fireAtLocal).toContain('T09:00:00')
  })

  it('round-trips export and import with replace semantics', async () => {
    await createSubscription({
      name: 'Spotify',
      amountInput: '9.99',
      nextBillingDate: '2030-07-01',
      category: 'Music',
      iconKey: 'spotify',
      accountLabel: '+86 138 0013 8000',
    })

    const backup = await exportBackup()
    expect(backup.documentType).toBe('subscout-backup')
    expect(validateBackup(backup).subscriptions).toHaveLength(1)
    expect(backup.subscriptions[0]?.icon_key).toBe('spotify')
    expect(backup.subscriptions[0]?.account_label).toBe('+86 138 0013 8000')

    await resetDatabaseForTests()
    expect(await listSubscriptions({ includeCancelled: true })).toHaveLength(0)

    await importBackup(backup, true)
    const restored = await listSubscriptions({ includeCancelled: true })
    expect(restored).toHaveLength(1)
    expect(restored[0]?.name).toBe('Spotify')
    expect(restored[0]?.iconKey).toBe('spotify')
    expect(restored[0]?.accountLabel).toBe('+86 138 0013 8000')
  })

  it('imports legacy backups with automatic icons and no account', async () => {
    await importBackup(
      {
        documentType: 'subscout-backup',
        schemaVersion: 1,
        exportedAt: '2030-01-01T00:00:00.000Z',
        preferences: {},
        subscriptions: [
          {
            id: 'legacy-1',
            name: 'Legacy Service',
            amount_minor: 999,
            billing_interval: 'monthly',
            next_billing_date: '2030-08-01',
          },
        ],
      },
      true,
    )

    const restored = await listSubscriptions({ includeCancelled: true })
    expect(restored).toHaveLength(1)
    expect(restored[0]?.iconKey).toBe('auto')
    expect(restored[0]?.accountLabel).toBeNull()
  })

  it('rejects invalid backups before mutation', async () => {
    await createSubscription({
      name: 'Keep Me',
      amountInput: '5.00',
      nextBillingDate: '2030-08-01',
      accountLabel: 'keep@example.com',
    })
    await expect(importBackup({ documentType: 'nope' }, true)).rejects.toThrow(
      'This file is not a SubScout backup.',
    )
    expect(await listSubscriptions()).toHaveLength(1)
  })

  it('rolls back a failed backup replacement', async () => {
    await createSubscription({
      name: 'Keep After Failure',
      amountInput: '5.00',
      nextBillingDate: '2030-08-01',
      accountLabel: 'keep@example.com',
    })
    const backup = await exportBackup()
    const duplicate = backup.subscriptions[0]!
    backup.subscriptions = [duplicate, { ...duplicate }]

    await expect(importBackup(backup, true)).rejects.toThrow(/UNIQUE constraint failed/)

    const remaining = await listSubscriptions({ includeCancelled: true })
    expect(remaining).toHaveLength(1)
    expect(remaining[0]?.name).toBe('Keep After Failure')
  })

  it('exposes scheduled notifications through the adapter spy', async () => {
    const adapter = getNotificationAdapter() as InMemoryNotificationAdapter
    adapter.permission = 'granted'
    await createSubscription({
      name: 'Disney',
      amountInput: '7.99',
      nextBillingDate: '2030-02-01',
      category: 'Entertainment',
      accountLabel: 'disney@example.com',
    })
    // reminders disabled by default => empty
    expect(adapter.scheduled).toHaveLength(0)
  })
})
