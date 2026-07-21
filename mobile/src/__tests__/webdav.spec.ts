import { describe, expect, it, beforeEach } from 'vitest'
import {
  buildAuthHeader,
  downloadBackupFromWebDav,
  joinWebDavUrl,
  restoreFromWebDav,
  saveWebDavSettings,
  setWebDavTransportForTests,
  testWebDavConnection,
  uploadBackupToWebDav,
  type WebDavTransport,
} from '../application/webdav'
import { createSubscription, listSubscriptions } from '../application/subscriptions'
import { resetDatabaseForTests } from '../database/client'
import { setNow } from '../domain/clock'
import type { BackupDocument } from '../application/backup'

function makeTransport(handlers: {
  onRequest: WebDavTransport['request']
}): WebDavTransport {
  return { request: handlers.onRequest }
}

const sampleBackup = (): BackupDocument => ({
  documentType: 'subscout-backup',
  schemaVersion: 1,
  exportedAt: '2030-01-15T00:00:00.000Z',
  preferences: {
    currency: 'USD',
    language: 'en',
    theme: 'light',
    reminders_enabled: '0',
    reminder_lead_days: '3',
  },
  subscriptions: [
    {
      id: 'sub-1',
      name: 'Netflix',
      amount_minor: 1599,
      currency: 'USD',
      billing_interval: 'monthly',
      billing_anchor_day: 15,
      next_billing_date: '2030-06-15',
      category: 'Entertainment',
      plan_name: null,
      payment_method_label: null,
      status: 'active',
      reminder_enabled: 1,
      created_at: '2030-01-01T00:00:00.000Z',
      updated_at: '2030-01-01T00:00:00.000Z',
      deleted_at: null,
      version: 1,
    },
  ],
})

describe('webdav helpers', () => {
  it('joins base url and remote path', () => {
    expect(joinWebDavUrl('https://dav.example.com/remote.php/dav/files/u/', 'subscout/backup.json')).toBe(
      'https://dav.example.com/remote.php/dav/files/u/subscout/backup.json',
    )
    expect(buildAuthHeader('alice', 's3cret')).toMatch(/^Basic /)
  })
})

describe('webdav sync operations', () => {
  beforeEach(async () => {
    setNow('2030-01-15T12:00:00')
    await resetDatabaseForTests()
    setWebDavTransportForTests(null)
  })

  it('tests connection treating 404 as success', async () => {
    const calls: string[] = []
    setWebDavTransportForTests(
      makeTransport({
        onRequest: async ({ method }) => {
          calls.push(method)
          return { status: 404, data: '' }
        },
      }),
    )

    await testWebDavConnection({
      url: 'https://dav.example.com/files/user',
      username: 'alice',
      password: 'secret',
      remotePath: '/subscout/backup.json',
      enabled: true,
    })
    expect(calls).toEqual(['PROPFIND'])
  })

  it('uploads backup with PUT after creating parent folders', async () => {
    const methods: string[] = []
    let putBody = ''
    setWebDavTransportForTests(
      makeTransport({
        onRequest: async ({ method, data }) => {
          methods.push(method)
          if (method === 'PUT') putBody = data ?? ''
          if (method === 'MKCOL') return { status: 201, data: '' }
          return { status: 201, data: '' }
        },
      }),
    )

    await createSubscription({
      name: 'Spotify',
      amountInput: '9.99',
      nextBillingDate: '2030-07-01',
      category: 'Music',
      accountLabel: 'spotify@example.com',
    })

    await uploadBackupToWebDav({
      url: 'https://dav.example.com/files/user',
      username: 'alice',
      password: 'secret',
      remotePath: '/subscout/backup.json',
      enabled: true,
    })

    expect(methods).toContain('MKCOL')
    expect(methods[methods.length - 1]).toBe('PUT')
    expect(putBody).toContain('Spotify')
    expect(putBody).toContain('subscout-backup')
  })

  it('downloads and restores a remote backup after confirmation', async () => {
    setWebDavTransportForTests(
      makeTransport({
        onRequest: async ({ method }) => {
          if (method === 'GET') {
            return { status: 200, data: JSON.stringify(sampleBackup()) }
          }
          return { status: 207, data: '' }
        },
      }),
    )

    expect(await listSubscriptions()).toHaveLength(0)
    await restoreFromWebDav(
      {
        url: 'https://dav.example.com/files/user',
        username: 'alice',
        password: 'secret',
        remotePath: '/subscout/backup.json',
        enabled: true,
      },
      true,
    )
    const rows = await listSubscriptions({ includeCancelled: true })
    expect(rows).toHaveLength(1)
    expect(rows[0]?.name).toBe('Netflix')
  })

  it('rejects restore without confirmation', async () => {
    await expect(
      restoreFromWebDav(
        {
          url: 'https://dav.example.com/files/user',
          username: 'alice',
          password: 'secret',
          remotePath: '/subscout/backup.json',
          enabled: true,
        },
        false,
      ),
    ).rejects.toThrow(/cancelled/i)
  })

  it('maps auth failures to a clear error', async () => {
    setWebDavTransportForTests(
      makeTransport({
        onRequest: async () => ({ status: 401, data: 'nope' }),
      }),
    )
    await expect(
      downloadBackupFromWebDav({
        url: 'https://dav.example.com/files/user',
        username: 'alice',
        password: 'bad',
        remotePath: '/subscout/backup.json',
        enabled: true,
      }),
    ).rejects.toThrow(/authentication/i)
  })

  it('persists webdav settings locally', async () => {
    await saveWebDavSettings({
      url: 'https://dav.example.com/files/user',
      username: 'alice',
      password: 'secret',
      remotePath: 'subscout/backup.json',
      enabled: true,
    })
    const { getWebDavSettings } = await import('../application/webdav')
    const loaded = await getWebDavSettings()
    expect(loaded.url).toBe('https://dav.example.com/files/user')
    expect(loaded.username).toBe('alice')
    expect(loaded.password).toBe('secret')
    expect(loaded.remotePath).toBe('/subscout/backup.json')
    expect(loaded.enabled).toBe(true)
  })
})
