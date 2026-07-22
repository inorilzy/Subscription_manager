<script setup lang="ts">
import { BellRing } from '@lucide/vue'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  getReminderSettings,
  reconcileNotifications,
  setReminderEnabled,
  setReminderLeadDays,
} from '../application/reminders'
import { listSubscriptions } from '../application/subscriptions'
import PageTopBar from '../components/PageTopBar.vue'
import { getNotificationAdapter } from '../notifications/adapter'
import { usePreferencesStore } from '../stores/preferences'

const router = useRouter()
const preferences = usePreferencesStore()
const remindersEnabled = ref(false)
const reminderLeadDays = ref(3)
const permission = ref<'granted' | 'denied' | 'prompt'>('prompt')

async function reloadReminders() {
  const settings = await getReminderSettings()
  remindersEnabled.value = settings.enabled
  reminderLeadDays.value = settings.leadDays
  permission.value = await getNotificationAdapter().getPermission()
}

onMounted(reloadReminders)

async function onReminderToggle(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked
  const result = await setReminderEnabled(enabled)
  permission.value = result
  remindersEnabled.value = enabled && result === 'granted'
  if (remindersEnabled.value) {
    await reconcileNotifications(await listSubscriptions({ includeCancelled: true }))
  }
  await reloadReminders()
}

async function onLeadDaysChange(event: Event) {
  const days = Number((event.target as HTMLSelectElement).value)
  await setReminderLeadDays(days)
  reminderLeadDays.value = days
  if (remindersEnabled.value) {
    await reconcileNotifications(await listSubscriptions({ includeCancelled: true }))
  }
}

async function goBack() {
  if (router.options.history.state.back) {
    router.back()
    return
  }
  await router.push({ name: 'settings' })
}
</script>

<template>
  <section class="focused-page">
    <PageTopBar
      :title="preferences.language === 'zh-CN' ? '通知设置' : 'Notifications'"
      back
      :back-label="preferences.t('detail.back')"
      back-test-id="notifications-back"
      @back="goBack"
    />

    <div class="page-content page-content-form">
      <h1 class="sr-only">
        {{ preferences.language === 'zh-CN' ? '通知设置' : 'Notifications' }}
      </h1>

      <div class="settings-group min-w-0" data-testid="settings-notifications">
        <div class="settings-row min-w-0 items-start gap-3">
          <span class="icon-house icon-house-secondary" aria-hidden="true">
            <BellRing :size="25" :stroke-width="2.4" />
          </span>
          <div class="min-w-0 flex-1">
            <label class="flex min-h-11 min-w-0 items-center justify-between gap-3">
              <span class="min-w-0">
                <span class="block font-headline font-bold text-on-surface">
                  {{ preferences.language === 'zh-CN' ? '扣费提醒' : 'Billing reminders' }}
                </span>
                <span class="mt-1 block text-sm leading-5 text-on-surface-variant">
                  {{
                    preferences.language === 'zh-CN'
                      ? '在扣费前通过设备本地通知提醒。'
                      : 'Receive an on-device notification before billing.'
                  }}
                </span>
              </span>
              <span class="relative inline-flex h-8 w-14 shrink-0">
                <input
                  data-testid="settings-reminders-enabled"
                  type="checkbox"
                  role="switch"
                  class="peer sr-only"
                  :checked="remindersEnabled"
                  @change="onReminderToggle"
                />
                <span
                  class="pointer-events-none absolute inset-0 rounded-full border-2 border-b-4 border-outline-variant bg-surface-container-high transition-colors peer-checked:border-primary peer-checked:bg-primary-container peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"
                  aria-hidden="true"
                ></span>
                <span
                  class="pointer-events-none absolute top-1 left-1 size-5 rounded-full transition-all"
                  :class="
                    remindersEnabled
                      ? 'translate-x-6 bg-on-primary-container'
                      : 'translate-x-0 bg-surface-container-lowest'
                  "
                  aria-hidden="true"
                ></span>
              </span>
            </label>

            <label
              class="mt-4 flex min-w-0 items-center gap-3 rounded-xl border-2 border-surface-container-highest bg-surface-container-low p-3"
            >
              <span class="min-w-0 flex-1 text-sm font-bold text-on-surface-variant">
                {{ preferences.language === 'zh-CN' ? '提前天数' : 'Days before billing' }}
              </span>
              <select
                data-testid="settings-reminder-lead-days"
                class="h-10 w-[4.5rem] shrink-0 rounded-xl border-2 border-outline-variant bg-surface-container-lowest px-2 text-sm font-bold text-on-surface"
                :value="reminderLeadDays"
                @change="onLeadDaysChange"
              >
                <option :value="1">1</option>
                <option :value="3">3</option>
                <option :value="7">7</option>
              </select>
            </label>

            <p class="mt-3 text-sm leading-5 text-on-surface-variant">
              {{
                preferences.language === 'zh-CN'
                  ? '提醒仅在本设备调度，不会上传订阅数据。'
                  : 'Reminders are scheduled only on this device; subscription data is not uploaded.'
              }}
            </p>

            <p
              v-if="permission === 'denied'"
              class="mt-3 rounded-xl bg-error-container p-3 text-sm font-bold text-on-error-container"
              data-testid="reminder-permission-denied"
              role="alert"
            >
              {{
                preferences.language === 'zh-CN'
                  ? '通知权限被拒绝。请在系统设置中启用后重试。'
                  : 'Notification permission denied. Enable it in system settings, then retry.'
              }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
