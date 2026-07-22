export type ThemePreset = 'scout'

export const DEFAULT_THEME_PRESET: ThemePreset = 'scout'

const PRESETS: ReadonlySet<string> = new Set<ThemePreset>(['scout'])

export function isThemePreset(value: string): value is ThemePreset {
  return PRESETS.has(value)
}

export function normalizeThemePreset(value: string | null | undefined): ThemePreset {
  if (typeof value === 'string' && isThemePreset(value)) return value
  return DEFAULT_THEME_PRESET
}
