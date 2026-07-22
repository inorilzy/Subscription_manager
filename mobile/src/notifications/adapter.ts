import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

export interface PlannedNotification {
  subscriptionId: string
  subscriptionName: string
  billingDate: string
  fireAtLocal: string
  title: string
  body: string
}

export interface NotificationAdapter {
  requestPermission(): Promise<'granted' | 'denied' | 'prompt'>
  getPermission(): Promise<'granted' | 'denied' | 'prompt'>
  schedule(notifications: PlannedNotification[]): Promise<void>
  cancelAll(): Promise<void>
  /** Temporary debug helper: fire one near-immediate notification without wiping schedules. */
  fireTest?(title: string, body: string): Promise<void>
}

export class InMemoryNotificationAdapter implements NotificationAdapter {
  permission: 'granted' | 'denied' | 'prompt' = 'prompt'
  scheduled: PlannedNotification[] = []

  async requestPermission() {
    if (this.permission === 'prompt') this.permission = 'granted'
    return this.permission
  }

  async getPermission() {
    return this.permission
  }

  async schedule(notifications: PlannedNotification[]) {
    this.scheduled = [...notifications]
  }

  async cancelAll() {
    this.scheduled = []
  }

  async fireTest(title: string, body: string) {
    this.scheduled = [
      ...this.scheduled,
      {
        subscriptionId: 'test',
        subscriptionName: 'Test',
        billingDate: '2099-01-01',
        fireAtLocal: new Date().toISOString(),
        title,
        body,
      },
    ]
  }
}

/** Real device adapter backed by @capacitor/local-notifications. */
export class CapacitorNotificationAdapter implements NotificationAdapter {
  private mapPermission(state: string): 'granted' | 'denied' | 'prompt' {
    if (state === 'granted') return 'granted'
    if (state === 'denied') return 'denied'
    return 'prompt'
  }

  private async ensureChannel() {
    await LocalNotifications.createChannel({
      id: 'subscout-reminders',
      name: 'Billing reminders',
      description: 'Subscription billing reminders',
      importance: 5,
      visibility: 1,
    })
  }

  async requestPermission() {
    const result = await LocalNotifications.requestPermissions()
    return this.mapPermission(result.display)
  }

  async getPermission() {
    const result = await LocalNotifications.checkPermissions()
    return this.mapPermission(result.display)
  }

  async schedule(notifications: PlannedNotification[]) {
    await this.cancelAll()
    if (notifications.length === 0) return

    await this.ensureChannel()

    // Platform limits: Android caps pending alarms (~500); keep a safe margin.
    const limited = notifications.slice(0, 64)
    await LocalNotifications.schedule({
      notifications: limited.map((item, index) => ({
        id: index + 1,
        title: item.title,
        body: item.body,
        schedule: { at: new Date(item.fireAtLocal), allowWhileIdle: true },
        channelId: 'subscout-reminders',
        extra: {
          subscriptionId: item.subscriptionId,
          billingDate: item.billingDate,
        },
      })),
    })
  }

  async cancelAll() {
    const pending = await LocalNotifications.getPending()
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map((item) => ({ id: item.id })),
      })
    }
  }

  async fireTest(title: string, body: string) {
    const permission = await this.requestPermission()
    if (permission !== 'granted') {
      throw new Error('Notification permission denied')
    }

    await this.ensureChannel()

    const fireAt = new Date(Date.now() + 2000)
    await LocalNotifications.schedule({
      notifications: [
        {
          id: 900001,
          title,
          body,
          schedule: { at: fireAt, allowWhileIdle: true },
          channelId: 'subscout-reminders',
          extra: { kind: 'manual-test' },
        },
      ],
    })
  }
}

function createDefaultAdapter(): NotificationAdapter {
  // Tests and plain browser use the in-memory spy; native uses Capacitor.
  const useNative = import.meta.env.MODE !== 'test' && Capacitor.isNativePlatform()
  return useNative ? new CapacitorNotificationAdapter() : new InMemoryNotificationAdapter()
}

let adapter: NotificationAdapter = createDefaultAdapter()

export function setNotificationAdapter(next: NotificationAdapter) {
  adapter = next
}

export function getNotificationAdapter(): NotificationAdapter {
  return adapter
}

export function resetNotificationAdapterForTests() {
  adapter = new InMemoryNotificationAdapter()
}
