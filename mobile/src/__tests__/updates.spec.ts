import { describe, expect, it } from 'vitest'
import {
  compareVersionNames,
  isUpdateAvailable,
  normalizeVersionName,
  parseLatestRelease,
  parseVersionCode,
  checkForUpdates,
} from '../application/updates'

describe('update version helpers', () => {
  it('normalizes leading v from release tags', () => {
    expect(normalizeVersionName('v1.0.1')).toBe('1.0.1')
    expect(normalizeVersionName('1.0.1')).toBe('1.0.1')
  })

  it('compares dotted version names numerically', () => {
    expect(compareVersionNames('1.0.10', '1.0.9')).toBeGreaterThan(0)
    expect(compareVersionNames('1.0.0', 'v1.0.0')).toBe(0)
    expect(compareVersionNames('1.0.0', '1.0.1')).toBeLessThan(0)
  })

  it('prefers versionCode when deciding updates', () => {
    expect(
      isUpdateAvailable(
        { versionName: '1.0.0', versionCode: 1 },
        { versionName: '1.0.0', versionCode: 2 },
      ),
    ).toBe(true)
    expect(
      isUpdateAvailable(
        { versionName: '1.0.1', versionCode: 2 },
        { versionName: '1.0.0', versionCode: 2 },
      ),
    ).toBe(false)
  })

  it('falls back to versionName when versionCode is absent', () => {
    expect(
      isUpdateAvailable(
        { versionName: '1.0.0', versionCode: 1 },
        { versionName: 'v1.0.1', versionCode: null },
      ),
    ).toBe(true)
  })

  it('parses pure integer version codes only', () => {
    expect(parseVersionCode('build 12')).toBe(12)
    expect(parseVersionCode('1')).toBe(1)
    expect(parseVersionCode('v1.0.1')).toBeNull()
    expect(parseVersionCode('')).toBeNull()
  })
})

describe('GitHub latest release parsing', () => {
  it('extracts release metadata and apk asset', () => {
    const release = parseLatestRelease({
      tag_name: 'v1.0.1',
      name: 'v1.0.1',
      html_url: 'https://github.com/inorilzy/Subscription_manager/releases/tag/v1.0.1',
      body: 'Bug fixes',
      published_at: '2026-07-22T00:00:00Z',
      assets: [
        {
          name: 'notes.txt',
          browser_download_url: 'https://example.com/notes.txt',
          content_type: 'text/plain',
          size: 12,
        },
        {
          name: 'SubscriptionManager-1.0.1-debug.apk',
          browser_download_url:
            'https://github.com/inorilzy/Subscription_manager/releases/download/v1.0.1/SubscriptionManager-1.0.1-debug.apk',
          content_type: 'application/vnd.android.package-archive',
          size: 26463418,
        },
      ],
    })

    expect(release.versionName).toBe('1.0.1')
    expect(release.apkAsset?.name).toContain('.apk')
    expect(release.apkAsset?.downloadUrl).toContain('SubscriptionManager-1.0.1-debug.apk')
  })

  it('reports update available from mocked GitHub response', async () => {
    const result = await checkForUpdates({
      current: { versionName: '1.0.0', versionCode: 1 },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            tag_name: 'v1.0.1',
            name: 'v1.0.1',
            html_url: 'https://github.com/inorilzy/Subscription_manager/releases/tag/v1.0.1',
            body: 'Newer build',
            assets: [
              {
                name: 'SubscriptionManager-1.0.1-debug.apk',
                browser_download_url:
                  'https://github.com/inorilzy/Subscription_manager/releases/download/v1.0.1/app.apk',
              },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    })

    expect(result.status).toBe('updateAvailable')
    expect(result.downloadUrl).toContain('app.apk')
    expect(result.latest?.versionName).toBe('1.0.1')
  })

  it('reports up to date when remote is same version', async () => {
    const result = await checkForUpdates({
      current: { versionName: '1.0.0', versionCode: 1 },
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            tag_name: 'v1.0.0',
            name: 'v1.0.0',
            html_url: 'https://github.com/inorilzy/Subscription_manager/releases/tag/v1.0.0',
            body: 'Current',
            assets: [],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    })

    expect(result.status).toBe('upToDate')
    expect(result.messageKey).toBe('upToDate')
  })
})
