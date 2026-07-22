import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME_PRESET,
  THEME_PRESETS,
  isThemePreset,
  normalizeThemePreset,
} from '../theme/presets'

describe('theme presets foundation', () => {
  it('exposes four named presets with scout as default', () => {
    expect(DEFAULT_THEME_PRESET).toBe('scout')
    expect(THEME_PRESETS).toEqual(['scout', 'ocean', 'coral', 'graphite'])
    expect(isThemePreset('scout')).toBe(true)
    expect(isThemePreset('ocean')).toBe(true)
    expect(isThemePreset('coral')).toBe(true)
    expect(isThemePreset('graphite')).toBe(true)
    expect(isThemePreset('neon')).toBe(false)
    expect(isThemePreset('')).toBe(false)
  })

  it('falls back to scout for missing or unknown values', () => {
    expect(normalizeThemePreset(undefined)).toBe('scout')
    expect(normalizeThemePreset(null)).toBe('scout')
    expect(normalizeThemePreset('')).toBe('scout')
    expect(normalizeThemePreset('not-a-real-theme')).toBe('scout')
    expect(normalizeThemePreset('ocean')).toBe('ocean')
    expect(normalizeThemePreset('scout')).toBe('scout')
  })
})
