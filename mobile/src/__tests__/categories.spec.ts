import { describe, expect, it, beforeEach } from 'vitest'
import { addCategory, listCategories } from '../application/categories'
import { resetDatabaseForTests } from '../database/client'
import { ValidationError } from '../domain/subscription'

describe('custom categories', () => {
  beforeEach(async () => {
    await resetDatabaseForTests()
  })

  it('lists built-ins with Other last by default', async () => {
    const categories = await listCategories()
    expect(categories[0]).toBe('Entertainment')
    expect(categories[categories.length - 1]).toBe('Other')
    expect(categories).toContain('Health')
  })

  it('adds a custom category and keeps it after reload', async () => {
    const created = await addCategory('Education')
    expect(created).toBe('Education')

    const categories = await listCategories()
    expect(categories).toContain('Education')
    expect(categories[categories.length - 1]).toBe('Other')
  })

  it('deduplicates case-insensitively', async () => {
    await addCategory('Education')
    const again = await addCategory('  education ')
    expect(again).toBe('Education')

    const categories = await listCategories()
    expect(categories.filter((c) => c.toLowerCase() === 'education')).toHaveLength(1)
  })

  it('rejects empty and over-long names', async () => {
    await expect(addCategory('   ')).rejects.toThrow(ValidationError)
    await expect(addCategory('x'.repeat(25))).rejects.toThrow(ValidationError)
  })
})
