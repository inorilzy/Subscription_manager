import { getPreference, setPreference } from '../database/client'
import {
  BUILTIN_CATEGORIES,
  ValidationError,
  isValidCategoryName,
  type SubscriptionCategory,
} from '../domain/subscription'

const CUSTOM_CATEGORIES_KEY = 'custom_categories'

async function loadCustomCategories(): Promise<string[]> {
  const raw = await getPreference(CUSTOM_CATEGORIES_KEY, '[]')
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is string => typeof item === 'string' && isValidCategoryName(item),
    )
  } catch {
    return []
  }
}

/** Built-ins first (Other last), then custom categories alphabetically. */
export async function listCategories(): Promise<SubscriptionCategory[]> {
  const custom = await loadCustomCategories()
  const builtinsWithoutOther = BUILTIN_CATEGORIES.filter((item) => item !== 'Other')
  const sortedCustom = [...custom].sort((a, b) => a.localeCompare(b))
  return [...builtinsWithoutOther, ...sortedCustom, 'Other']
}

export async function addCategory(name: string): Promise<SubscriptionCategory> {
  const trimmed = name.trim()
  if (!isValidCategoryName(trimmed)) {
    throw new ValidationError('Category name must be 1-24 characters.')
  }

  const existing = await listCategories()
  const duplicate = existing.find((item) => item.toLowerCase() === trimmed.toLowerCase())
  if (duplicate) {
    return duplicate
  }

  const custom = await loadCustomCategories()
  custom.push(trimmed)
  await setPreference(CUSTOM_CATEGORIES_KEY, JSON.stringify(custom))
  return trimmed
}
