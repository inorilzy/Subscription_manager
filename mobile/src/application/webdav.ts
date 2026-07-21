import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { getPreference, setPreference } from '../database/client'
import {
  BACKUP_DOCUMENT_TYPE,
  exportBackup,
  importBackup,
  validateBackup,
  type BackupDocument,
} from './backup'

export interface WebDavSettings {
  url: string
  username: string
  password: string
  remotePath: string
  enabled: boolean
}

export const DEFAULT_WEBDAV_SETTINGS: WebDavSettings = {
  url: '',
  username: '',
  password: '',
  remotePath: '/subscout/backup.json',
  enabled: false,
}

const KEYS = {
  url: 'webdav_url',
  username: 'webdav_username',
  password: 'webdav_password',
  remotePath: 'webdav_remote_path',
  enabled: 'webdav_enabled',
} as const

export class WebDavError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'WebDavError'
  }
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

export function normalizeRemotePath(path: string): string {
  const trimmed = path.trim() || DEFAULT_WEBDAV_SETTINGS.remotePath
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

export function joinWebDavUrl(baseUrl: string, remotePath: string): string {
  const base = normalizeBaseUrl(baseUrl)
  const path = normalizeRemotePath(remotePath)
  if (!base) throw new WebDavError('WebDAV URL is required.')
  return `${base}${path}`
}

export function buildAuthHeader(username: string, password: string): string {
  const raw = `${username}:${password}`
  const chars = Array.from(raw, (ch) => ch.charCodeAt(0))
  let binary = ''
  for (const code of chars) binary += String.fromCharCode(code)
  return `Basic ${btoa(binary)}`
}

export async function getWebDavSettings(): Promise<WebDavSettings> {
  const [url, username, password, remotePath, enabled] = await Promise.all([
    getPreference(KEYS.url, ''),
    getPreference(KEYS.username, ''),
    getPreference(KEYS.password, ''),
    getPreference(KEYS.remotePath, DEFAULT_WEBDAV_SETTINGS.remotePath),
    getPreference(KEYS.enabled, '0'),
  ])
  return {
    url,
    username,
    password,
    remotePath: remotePath || DEFAULT_WEBDAV_SETTINGS.remotePath,
    enabled: enabled === '1',
  }
}

export async function saveWebDavSettings(settings: WebDavSettings): Promise<void> {
  await Promise.all([
    setPreference(KEYS.url, settings.url.trim()),
    setPreference(KEYS.username, settings.username.trim()),
    setPreference(KEYS.password, settings.password),
    setPreference(KEYS.remotePath, normalizeRemotePath(settings.remotePath)),
    setPreference(KEYS.enabled, settings.enabled ? '1' : '0'),
  ])
}

export interface WebDavTransport {
  request(options: {
    url: string
    method: string
    headers?: Record<string, string>
    data?: string
  }): Promise<{ status: number; data: string }>
}

/** Browser/native transport. CapacitorHttp avoids WebView CORS on device. */
export const defaultWebDavTransport: WebDavTransport = {
  async request({ url, method, headers, data }) {
    if (Capacitor.isNativePlatform()) {
      const response = await CapacitorHttp.request({
        url,
        method,
        headers,
        data,
        responseType: 'text',
      })
      const body =
        typeof response.data === 'string'
          ? response.data
          : response.data == null
            ? ''
            : JSON.stringify(response.data)
      return { status: response.status, data: body }
    }

    const response = await fetch(url, {
      method,
      headers,
      body: data,
    })
    const text = await response.text()
    return { status: response.status, data: text }
  },
}

let transport: WebDavTransport = defaultWebDavTransport

export function setWebDavTransportForTests(next: WebDavTransport | null) {
  transport = next ?? defaultWebDavTransport
}

function requireConfigured(settings: WebDavSettings): {
  url: string
  auth: string
} {
  if (!settings.url.trim()) throw new WebDavError('WebDAV URL is required.')
  if (!settings.username.trim()) throw new WebDavError('WebDAV username is required.')
  return {
    url: joinWebDavUrl(settings.url, settings.remotePath),
    auth: buildAuthHeader(settings.username, settings.password),
  }
}

function mapStatusError(status: number, action: string): WebDavError {
  if (status === 401 || status === 403) {
    return new WebDavError('WebDAV authentication failed. Check username and password.')
  }
  if (status === 404) {
    return new WebDavError('Remote backup file was not found.')
  }
  if (status === 0) {
    return new WebDavError('Could not reach the WebDAV server. Check the URL and network.')
  }
  return new WebDavError(`WebDAV ${action} failed (HTTP ${status}).`)
}

/** Ensure parent collection exists via MKCOL (ignore already-exists). */
async function ensureParentCollections(settings: WebDavSettings): Promise<void> {
  const base = normalizeBaseUrl(settings.url)
  const path = normalizeRemotePath(settings.remotePath)
  const parts = path.split('/').filter(Boolean)
  parts.pop()
  if (parts.length === 0) return

  const auth = buildAuthHeader(settings.username, settings.password)
  let current = ''
  for (const part of parts) {
    current += `/${part}`
    const response = await transport.request({
      url: `${base}${current}`,
      method: 'MKCOL',
      headers: { Authorization: auth },
    })
    if (![201, 405, 409, 301, 302].includes(response.status)) {
      if (response.status === 401 || response.status === 403) {
        throw mapStatusError(response.status, 'folder create')
      }
    }
  }
}

export async function testWebDavConnection(settings?: WebDavSettings): Promise<void> {
  const cfg = settings ?? (await getWebDavSettings())
  const { url, auth } = requireConfigured(cfg)
  const response = await transport.request({
    url,
    method: 'PROPFIND',
    headers: {
      Authorization: auth,
      Depth: '0',
      'Content-Type': 'application/xml; charset=utf-8',
    },
    data: `<?xml version="1.0" encoding="utf-8" ?>
<d:propfind xmlns:d="DAV:">
  <d:prop><d:resourcetype/></d:prop>
</d:propfind>`,
  })

  if ([200, 207, 404].includes(response.status)) return
  throw mapStatusError(response.status, 'test')
}

export async function uploadBackupToWebDav(
  settings?: WebDavSettings,
  document?: BackupDocument,
): Promise<void> {
  const cfg = settings ?? (await getWebDavSettings())
  const { url, auth } = requireConfigured(cfg)
  await ensureParentCollections(cfg)
  const doc = document ?? (await exportBackup())
  const body = JSON.stringify(doc, null, 2)
  const response = await transport.request({
    url,
    method: 'PUT',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json; charset=utf-8',
    },
    data: body,
  })
  if (![200, 201, 204].includes(response.status)) {
    throw mapStatusError(response.status, 'upload')
  }
}

export async function downloadBackupFromWebDav(
  settings?: WebDavSettings,
): Promise<BackupDocument> {
  const cfg = settings ?? (await getWebDavSettings())
  const { url, auth } = requireConfigured(cfg)
  const response = await transport.request({
    url,
    method: 'GET',
    headers: { Authorization: auth },
  })
  if (response.status !== 200) {
    throw mapStatusError(response.status, 'download')
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(response.data)
  } catch {
    throw new WebDavError('Remote file is not valid JSON.')
  }
  try {
    return validateBackup(parsed)
  } catch (error) {
    throw new WebDavError(
      error instanceof Error ? error.message : 'Remote backup failed validation.',
    )
  }
}

export async function restoreFromWebDav(
  settings?: WebDavSettings,
  confirmed = false,
): Promise<void> {
  if (!confirmed) throw new WebDavError('Restore cancelled.')
  const cfg = settings ?? (await getWebDavSettings())
  const doc = await downloadBackupFromWebDav(cfg)
  if (doc.documentType !== BACKUP_DOCUMENT_TYPE) {
    throw new WebDavError('Remote file is not a SubScout backup.')
  }
  await importBackup(doc, true)
}
