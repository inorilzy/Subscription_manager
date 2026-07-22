export type ThemePreset = 'scout' | 'ocean' | 'coral' | 'graphite'

export const DEFAULT_THEME_PRESET: ThemePreset = 'scout'

export const THEME_PRESETS: readonly ThemePreset[] = [
  'scout',
  'ocean',
  'coral',
  'graphite',
] as const

const PRESET_SET: ReadonlySet<string> = new Set(THEME_PRESETS)

export interface ThemePresetMeta {
  id: ThemePreset
  nameEn: string
  nameZh: string
  swatches: readonly [string, string, string]
}

/** Display metadata for settings cards. CSS owns the live tokens. */
export const THEME_PRESET_META: readonly ThemePresetMeta[] = [
  {
    id: 'scout',
    nameEn: 'Scout Green',
    nameZh: 'Scout 绿',
    swatches: ['#58CC02', '#2FB8FF', '#F4BF00'],
  },
  {
    id: 'ocean',
    nameEn: 'Ocean Teal',
    nameZh: 'Ocean 青',
    swatches: ['#35C7C3', '#5AA7FF', '#F2A93B'],
  },
  {
    id: 'coral',
    nameEn: 'Coral Punch',
    nameZh: 'Coral 红',
    swatches: ['#FF5E7A', '#2DCDBD', '#F2B33D'],
  },
  {
    id: 'graphite',
    nameEn: 'Graphite Ink',
    nameZh: 'Graphite 灰',
    swatches: ['#535B66', '#45C4CA', '#E4AE3A'],
  },
]

export function isThemePreset(value: string): value is ThemePreset {
  return PRESET_SET.has(value)
}

export function normalizeThemePreset(value: string | null | undefined): ThemePreset {
  if (typeof value === 'string' && isThemePreset(value)) return value
  return DEFAULT_THEME_PRESET
}
