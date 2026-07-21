import { getDatabase, getPreference, setPreference } from '../database/client'
import { now } from '../domain/clock'
import {
  DEFAULT_CATEGORY,
  ValidationError,
  isValidCategoryName,
  normalizeCategory,
  type SubscriptionCategory,
} from '../domain/subscription'

export const CUSTOM_CATEGORIES_KEY = 'custom_categories'

function uniqueCategories(items: string[]): string[] {
  const unique = new Map<string, string>()
  for (const item of items) {
    const normalized = normalizeCategory(item)
    if (normalized === DEFAULT_CATEGORY) continue
    const key = normalized.toLocaleLowerCase()
    if (!unique.has(key)) unique.set(key, normalized)
  }
  return [...unique.values()]
}

async function loadCustomCategories(): Promise<string[]> {
  const raw = await getPreference(CUSTOM_CATEGORIES_KEY, '[]')
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return uniqueCategories(
      parsed.filter(
        (item): item is string => typeof item === 'string' && isValidCategoryName(item),
      ),
    )
  } catch {
    return []
  }
}

async function loadUsedCategories(): Promise<string[]> {
  const db = await getDatabase()
  const result = await db.query('SELECT category FROM subscriptions WHERE deleted_at IS NULL')
  return uniqueCategories(
    (result.values ?? [])
      .map((row) => row.category)
      .filter((category): category is string => typeof category === 'string'),
  )
}

/** Default stays first; every other persisted or in-use category is user-managed. */
export async function listCategories(): Promise<SubscriptionCategory[]> {
  const [custom, used] = await Promise.all([loadCustomCategories(), loadUsedCategories()])
  const sorted = uniqueCategories([...custom, ...used]).sort((a, b) => a.localeCompare(b))
  return [DEFAULT_CATEGORY, ...sorted]
}

export async function addCategory(name: string): Promise<SubscriptionCategory> {
  const trimmed = name.trim()
  if (!isValidCategoryName(trimmed)) {
    throw new ValidationError('Category name must be 1-24 characters.')
  }

  const normalized = normalizeCategory(trimmed)
  const existing = await listCategories()
  const duplicate = existing.find(
    (item) => item.toLocaleLowerCase() === normalized.toLocaleLowerCase(),
  )
  if (duplicate) return duplicate

  const custom = await loadCustomCategories()
  custom.push(normalized)
  await setPreference(CUSTOM_CATEGORIES_KEY, JSON.stringify(uniqueCategories(custom)))
  return normalized
}

export async function deleteCategory(name: string): Promise<{ reassignedCount: number }> {
  const trimmed = name.trim()
  if (!isValidCategoryName(trimmed)) {
    throw new ValidationError('Category name must be 1-24 characters.')
  }
  if (normalizeCategory(trimmed) === DEFAULT_CATEGORY) {
    throw new ValidationError('Default category cannot be deleted.')
  }

  const categories = await listCategories()
  const target =
    categories.find((item) => item.toLocaleLowerCase() === trimmed.toLocaleLowerCase()) ?? trimmed
  const custom = await loadCustomCategories()
  const remaining = custom.filter((item) => item.toLocaleLowerCase() !== target.toLocaleLowerCase())

  const db = await getDatabase()
  const used = await db.query(
    `SELECT id FROM subscriptions
     WHERE deleted_at IS NULL AND LOWER(category) = LOWER(?)`,
    [target],
  )
  const reassignedCount = used.values?.length ?? 0

  await db.transaction(async () => {
    await db.execute(
      `UPDATE subscriptions
       SET category = ?, updated_at = ?, version = version + 1
       WHERE deleted_at IS NULL AND LOWER(category) = LOWER(?)`,
      [DEFAULT_CATEGORY, now().toISOString(), target],
    )
    await db.execute('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)', [
      CUSTOM_CATEGORIES_KEY,
      JSON.stringify(remaining),
    ])
  })

  return { reassignedCount }
}
