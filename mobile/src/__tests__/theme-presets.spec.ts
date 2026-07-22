import { describe, expect, it } from 'vitest'
import { DEFAULT_THEME_PRESET, isThemePreset, normalizeThemePreset } from '../theme/presets'

describe('theme presets foundation', () => {
  it('treats scout as the only known preset for now', () => {
    expect(DEFAULT_THEME_PRESET).toBe('scout')
    expect(isThemePreset('scout')).toBe(true)
    expect(isThemePreset('ocean')).toBe(false)
    expect(isThemePreset('')).toBe(false)
  })

  it('falls back to scout for missing or unknown values', () => {
    expect(normalizeThemePreset(undefined)).toBe('scout')
    expect(normalizeThemePreset(null)).toBe('scout')
    expect(normalizeThemePreset('')).toBe('scout')
    expect(normalizeThemePreset('not-a-real-theme')).toBe('scout')
    expect(normalizeThemePreset('scout')).toBe('scout')
  })
})
