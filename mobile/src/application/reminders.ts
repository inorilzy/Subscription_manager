import { addBillingInterval } from '../domain/billing'
import { todayDateOnly } from '../domain/clock'
import type { Subscription } from '../domain/subscription'
import { getPreference, setPreference } from '../database/client'
import {
  getNotificationAdapter,
  type PlannedNotification,
} from '../notifications/adapter'
import { type LanguageCode, isLanguageCode } from '../i18n/messages'

const DEFAULT_LEAD_DAYS = 3

export async function getReminderSettings(): Promise<{
  enabled: boolean
  leadDays: number
}> {
  const enabled = (await getPreference('reminders_enabled', '0')) === '1'
  const leadDays = Number(await getPreference('reminder_lead_days', String(DEFAULT_LEAD_DAYS)))
  return {
    enabled,
    leadDays: Number.isFinite(leadDays) && leadDays > 0 ? leadDays : DEFAULT_LEAD_DAYS,
  }
}

export async function setReminderEnabled(
  enabled: boolean,
): Promise<'granted' | 'denied' | 'prompt'> {
  if (enabled) {
    const permission = await getNotificationAdapter().requestPermission()
    if (permission !== 'granted') {
      await setPreference('reminders_enabled', '0')
      return permission
    }
  }
  await setPreference('reminders_enabled', enabled ? '1' : '0')
  if (!enabled) {
    await getNotificationAdapter().cancelAll()
  }
  return getNotificationAdapter().getPermission()
}

export async function setReminderLeadDays(days: number): Promise<void> {
  await setPreference('reminder_lead_days', String(days))
}

function subtractDays(dateOnly: string, days: number): string {
  const parts = dateOnly.split('-').map(Number)
  const y = parts[0] ?? 1970
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() - days)
  const yy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function planNotifications(
  subscriptions: Subscription[],
  options: {
    leadDays: number
    language: LanguageCode
    horizonMonths?: number
  },
): PlannedNotification[] {
  const horizon = options.horizonMonths ?? 12
  const today = todayDateOnly()
  const planned: PlannedNotification[] = []
  const todayParts = today.split('-').map(Number)
  const ty = todayParts[0] ?? 1970
  const tm = todayParts[1] ?? 1

  for (const item of subscriptions) {
    if (item.status !== 'active' || item.deletedAt) continue
    let cursor = item.nextBillingDate
    for (let i = 0; i < horizon + 2; i += 1) {
      const cursorParts = cursor.split('-').map(Number)
      const cy = cursorParts[0] ?? 1970
      const cm = cursorParts[1] ?? 1
      const monthDiff = (cy - ty) * 12 + (cm - tm)
      if (monthDiff > horizon) break

      const fireDate = subtractDays(cursor, options.leadDays)
      if (fireDate >= today) {
        planned.push({
          subscriptionId: item.id,
          subscriptionName: item.name,
          billingDate: cursor,
          fireAtLocal: `${fireDate}T09:00:00`,
          title:
            options.language === 'zh-CN'
              ? `即将扣费：${item.name}`
              : `Upcoming charge: ${item.name}`,
          body:
            options.language === 'zh-CN'
              ? `${item.name} 将于 ${cursor} 扣费`
              : `${item.name} bills on ${cursor}`,
        })
      }

      cursor = addBillingInterval(cursor, item.billingInterval, item.billingAnchorDay)
    }
  }

  return planned.sort((a, b) => a.fireAtLocal.localeCompare(b.fireAtLocal))
}

export async function reconcileNotifications(subscriptions: Subscription[]): Promise<void> {
  const settings = await getReminderSettings()
  const adapter = getNotificationAdapter()
  if (!settings.enabled) {
    await adapter.cancelAll()
    return
  }
  const permission = await adapter.getPermission()
  if (permission !== 'granted') {
    await adapter.cancelAll()
    return
  }
  const languageRaw = await getPreference('language', 'zh-CN')
  const language = isLanguageCode(languageRaw) ? languageRaw : 'zh-CN'
  const planned = planNotifications(subscriptions, {
    leadDays: settings.leadDays,
    language,
  })
  await adapter.schedule(planned)
}
