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
}

let adapter: NotificationAdapter = new InMemoryNotificationAdapter()

export function setNotificationAdapter(next: NotificationAdapter) {
  adapter = next
}

export function getNotificationAdapter(): NotificationAdapter {
  return adapter
}

export function resetNotificationAdapterForTests() {
  adapter = new InMemoryNotificationAdapter()
}
