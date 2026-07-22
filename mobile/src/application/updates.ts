import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

export const GITHUB_OWNER = 'inorilzy'
export const GITHUB_REPO = 'Subscription_manager'
export const GITHUB_LATEST_RELEASE_API = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
export const GITHUB_LATEST_RELEASE_PAGE = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`

const REQUEST_TIMEOUT_MS = 10_000
const FALLBACK_VERSION_NAME = '1.0.0'
const FALLBACK_VERSION_CODE = 1

export interface AppVersionInfo {
  versionName: string
  versionCode: number
}

export interface ReleaseAsset {
  name: string
  downloadUrl: string
  contentType: string | null
  size: number | null
}

export interface LatestReleaseInfo {
  tagName: string
  name: string
  htmlUrl: string
  body: string
  publishedAt: string | null
  versionName: string
  versionCode: number | null
  apkAsset: ReleaseAsset | null
}

export type UpdateCheckStatus = 'upToDate' | 'updateAvailable' | 'unknown'

export interface UpdateCheckResult {
  status: UpdateCheckStatus
  current: AppVersionInfo
  latest: LatestReleaseInfo | null
  releasePageUrl: string
  downloadUrl: string | null
  messageKey: 'upToDate' | 'updateAvailable' | 'unavailable'
}

export class UpdateCheckError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UpdateCheckError'
  }
}

export function normalizeVersionName(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return FALLBACK_VERSION_NAME
  return trimmed.startsWith('v') || trimmed.startsWith('V') ? trimmed.slice(1) : trimmed
}

export function parseVersionCode(raw: string | number | null | undefined): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return Math.floor(raw)
  }
  if (typeof raw !== 'string') return null

  const trimmed = raw.trim()
  // Accept pure integers or "build 12" style values only.
  // Never treat semver tags like "v1.0.1" as versionCode=1.
  const pure = trimmed.match(/^(?:build[\s_-]*)?(\d+)$/i)
  if (!pure) return null
  const value = Number(pure[1])
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Compare dotted version names. Returns positive when left is newer. */
export function compareVersionNames(leftRaw: string, rightRaw: string): number {
  const left = normalizeVersionName(leftRaw)
    .split(/[.+_-]/)
    .map((part) => Number.parseInt(part.replace(/\D/g, ''), 10))
    .map((n) => (Number.isFinite(n) ? n : 0))
  const right = normalizeVersionName(rightRaw)
    .split(/[.+_-]/)
    .map((part) => Number.parseInt(part.replace(/\D/g, ''), 10))
    .map((n) => (Number.isFinite(n) ? n : 0))

  const length = Math.max(left.length, right.length)
  for (let i = 0; i < length; i += 1) {
    const a = left[i] ?? 0
    const b = right[i] ?? 0
    if (a !== b) return a - b
  }
  return 0
}

export function isUpdateAvailable(
  current: AppVersionInfo,
  latest: Pick<LatestReleaseInfo, 'versionName' | 'versionCode'>,
): boolean {
  if (latest.versionCode != null) {
    return latest.versionCode > current.versionCode
  }
  return compareVersionNames(latest.versionName, current.versionName) > 0
}

function readStringField(value: object, key: string): string | null {
  if (!(key in value)) return null
  const field: unknown = Reflect.get(value, key)
  return typeof field === 'string' && field.trim() ? field : null
}

function readNumberField(value: object, key: string): number | null {
  if (!(key in value)) return null
  const field: unknown = Reflect.get(value, key)
  return typeof field === 'number' && Number.isFinite(field) ? field : null
}

function parseReleaseAsset(value: unknown): ReleaseAsset | null {
  if (!value || typeof value !== 'object') return null
  const name = readStringField(value, 'name')
  const downloadUrl =
    readStringField(value, 'browser_download_url') ?? readStringField(value, 'url')
  if (!name || !downloadUrl) return null
  return {
    name,
    downloadUrl,
    contentType: readStringField(value, 'content_type'),
    size: readNumberField(value, 'size'),
  }
}

function pickApkAsset(assets: unknown): ReleaseAsset | null {
  if (!Array.isArray(assets)) return null
  const parsed = assets
    .map((item) => parseReleaseAsset(item))
    .filter((item): item is ReleaseAsset => item != null)

  const preferred =
    parsed.find((asset) => /\.apk$/i.test(asset.name) && /SubscriptionManager/i.test(asset.name)) ??
    parsed.find((asset) => /\.apk$/i.test(asset.name)) ??
    parsed.find((asset) => (asset.contentType ?? '').includes('android.package-archive'))

  return preferred ?? null
}

export function parseLatestRelease(payload: unknown): LatestReleaseInfo {
  if (!payload || typeof payload !== 'object') {
    throw new UpdateCheckError('GitHub release payload is invalid.')
  }

  const tagName = readStringField(payload, 'tag_name')
  const htmlUrl = readStringField(payload, 'html_url') ?? GITHUB_LATEST_RELEASE_PAGE
  if (!tagName) {
    throw new UpdateCheckError('GitHub release is missing a tag name.')
  }

  const name = readStringField(payload, 'name') ?? tagName
  const body = readStringField(payload, 'body') ?? ''
  const publishedAt = readStringField(payload, 'published_at')
  const versionName = normalizeVersionName(tagName)
  // Release tags are usually semver ("v1.0.1"). Prefer name comparison unless
  // the tag/name is a pure build number.
  const versionCode = parseVersionCode(tagName) ?? parseVersionCode(name)
  const assetsField: unknown = Reflect.get(payload, 'assets')
  const apkAsset = pickApkAsset(assetsField)

  return {
    tagName,
    name,
    htmlUrl,
    body,
    publishedAt,
    versionName,
    versionCode,
    apkAsset,
  }
}

export async function getCurrentAppVersion(): Promise<AppVersionInfo> {
  if (Capacitor.isNativePlatform()) {
    try {
      const info = await CapacitorApp.getInfo()
      const versionName = normalizeVersionName(info.version || FALLBACK_VERSION_NAME)
      const versionCode = parseVersionCode(info.build) ?? FALLBACK_VERSION_CODE
      return { versionName, versionCode }
    } catch {
      // Fall through to package defaults for tests / misconfigured shells.
    }
  }

  return {
    versionName: FALLBACK_VERSION_NAME,
    versionCode: FALLBACK_VERSION_CODE,
  }
}

export async function fetchLatestRelease(
  fetchImpl: typeof fetch = fetch,
): Promise<LatestReleaseInfo> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let payload: unknown
  try {
    const response = await fetchImpl(GITHUB_LATEST_RELEASE_API, {
      headers: {
        accept: 'application/vnd.github+json',
        'x-github-api-version': '2022-11-28',
      },
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new UpdateCheckError(`GitHub returned ${response.status}.`)
    }
    payload = await response.json()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new UpdateCheckError('Update check timed out.')
    }
    if (error instanceof UpdateCheckError) throw error
    throw new UpdateCheckError(error instanceof Error ? error.message : 'Update check failed.')
  } finally {
    clearTimeout(timer)
  }

  return parseLatestRelease(payload)
}

export async function checkForUpdates(options?: {
  fetchImpl?: typeof fetch
  current?: AppVersionInfo
}): Promise<UpdateCheckResult> {
  const current = options?.current ?? (await getCurrentAppVersion())
  const latest = await fetchLatestRelease(options?.fetchImpl)
  const available = isUpdateAvailable(current, latest)
  const downloadUrl = latest.apkAsset?.downloadUrl ?? latest.htmlUrl

  return {
    status: available ? 'updateAvailable' : 'upToDate',
    current,
    latest,
    releasePageUrl: latest.htmlUrl || GITHUB_LATEST_RELEASE_PAGE,
    downloadUrl,
    messageKey: available ? 'updateAvailable' : 'upToDate',
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    window.open(url, '_blank', 'noopener,noreferrer')
    return
  }
  throw new UpdateCheckError('Unable to open the release page on this platform.')
}
