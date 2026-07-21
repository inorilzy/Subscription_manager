import { beforeEach, describe, expect, it } from 'vitest'
import { addCategory, deleteCategory, listCategories } from '../application/categories'
import { createSubscription, listSubscriptions } from '../application/subscriptions'
import { resetDatabaseForTests } from '../database/client'
import { ValidationError } from '../domain/subscription'

describe('custom categories', () => {
  beforeEach(async () => {
    await resetDatabaseForTests()
  })

  it('starts with Default as the only category', async () => {
    await expect(listCategories()).resolves.toEqual(['Default'])
  })

  it('adds a custom category, persists it, and deduplicates case-insensitively', async () => {
    await expect(addCategory('Education')).resolves.toBe('Education')
    await expect(addCategory(' education ')).resolves.toBe('Education')
    await expect(listCategories()).resolves.toEqual(['Default', 'Education'])
  })

  it('exposes categories already used by subscriptions as manageable custom categories', async () => {
    await createSubscription({
      name: 'Legacy Service',
      amountInput: '9.00',
      currency: 'USD',
      nextBillingDate: '2030-06-15',
      category: 'Entertainment',
      accountLabel: 'legacy@example.com',
    })

    await expect(listCategories()).resolves.toEqual(['Default', 'Entertainment'])
  })

  it('deletes a custom category and atomically moves subscriptions to Default', async () => {
    await addCategory('Education')
    await createSubscription({
      name: 'Learning App',
      amountInput: '12.00',
      currency: 'USD',
      nextBillingDate: '2030-06-15',
      category: 'Education',
      accountLabel: 'learn@example.com',
    })

    await expect(deleteCategory(' education ')).resolves.toEqual({ reassignedCount: 1 })
    await expect(listCategories()).resolves.toEqual(['Default'])
    expect((await listSubscriptions())[0]?.category).toBe('Default')
  })

  it('normalizes the retired Other fallback to Default', async () => {
    await createSubscription({
      name: 'Mystery Box',
      amountInput: '5.00',
      currency: 'USD',
      nextBillingDate: '2030-06-15',
      category: 'Other',
      accountLabel: 'mystery@example.com',
    })

    expect((await listSubscriptions())[0]?.category).toBe('Default')
  })

  it('protects Default and rejects invalid category names', async () => {
    await expect(deleteCategory('default')).rejects.toThrow(ValidationError)
    await expect(addCategory(' ')).rejects.toThrow(ValidationError)
    await expect(addCategory('x'.repeat(25))).rejects.toThrow(ValidationError)
  })
})
