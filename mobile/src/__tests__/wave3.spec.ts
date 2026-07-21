import { describe, expect, it, beforeEach } from 'vitest'
import { filterSubscriptions, DEFAULT_FILTERS } from '../domain/filters'
import { computeMonthStats } from '../domain/stats'
import { planNotifications } from '../application/reminders'
import { exportBackup, importBackup, validateBackup } from '../application/backup'
import { createSubscription, listSubscriptions } from '../application/subscriptions'
import { resetDatabaseForTests } from '../database/client'
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
      sample({ id: '1', name: 'Netflix', category: 'Entertainment', billingInterval: 'monthly' }),
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
    })

    const backup = await exportBackup()
    expect(backup.documentType).toBe('subscout-backup')
    expect(validateBackup(backup).subscriptions).toHaveLength(1)

    await resetDatabaseForTests()
    expect(await listSubscriptions({ includeCancelled: true })).toHaveLength(0)

    await importBackup(backup, true)
    const restored = await listSubscriptions({ includeCancelled: true })
    expect(restored).toHaveLength(1)
    expect(restored[0]?.name).toBe('Spotify')
  })

  it('rejects invalid backups before mutation', async () => {
    await createSubscription({
      name: 'Keep Me',
      amountInput: '5.00',
      nextBillingDate: '2030-08-01',
    })
    await expect(importBackup({ documentType: 'nope' }, true)).rejects.toThrow()
    expect(await listSubscriptions()).toHaveLength(1)
  })

  it('exposes scheduled notifications through the adapter spy', async () => {
    const adapter = getNotificationAdapter() as InMemoryNotificationAdapter
    adapter.permission = 'granted'
    await createSubscription({
      name: 'Disney',
      amountInput: '7.99',
      nextBillingDate: '2030-02-01',
      category: 'Entertainment',
    })
    // reminders disabled by default => empty
    expect(adapter.scheduled).toHaveLength(0)
  })
})
