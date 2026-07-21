<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  exportBackup,
  importBackup,
  validateBackup,
} from '../application/backup'
import { deliverBackup } from '../application/backup-delivery'
import {
  getReminderSettings,
  reconcileNotifications,
  setReminderEnabled,
  setReminderLeadDays,
} from '../application/reminders'
import { listSubscriptions } from '../application/subscriptions'
import {
  DEFAULT_WEBDAV_SETTINGS,
  getWebDavSettings,
  restoreFromWebDav,
  saveWebDavSettings,
  testWebDavConnection,
  uploadBackupToWebDav,
  WebDavError,
  type WebDavSettings,
} from '../application/webdav'
import {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type LanguageCode,
  type ThemeMode,
} from '../i18n/messages'
import { getNotificationAdapter } from '../notifications/adapter'
import { usePreferencesStore } from '../stores/preferences'

const preferences = usePreferencesStore()
const pendingCurrency = ref<CurrencyCode | null>(null)
const showCurrencyWarning = ref(false)
const remindersEnabled = ref(false)
const reminderLeadDays = ref(3)
const permission = ref<'granted' | 'denied' | 'prompt'>('prompt')
const backupMessage = ref<string | null>(null)
const lastExportJson = ref('')
const showImportConfirm = ref(false)
const pendingImport = ref<unknown>(null)
const webdav = ref<WebDavSettings>({ ...DEFAULT_WEBDAV_SETTINGS })
const webdavBusy = ref(false)
const webdavMessage = ref<string | null>(null)
const showWebDavRestoreConfirm = ref(false)

async function reloadReminders() {
  const settings = await getReminderSettings()
  remindersEnabled.value = settings.enabled
  reminderLeadDays.value = settings.leadDays
  permission.value = await getNotificationAdapter().getPermission()
}

onMounted(async () => {
  await reloadReminders()
  webdav.value = await getWebDavSettings()
})

async function onThemeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as ThemeMode
  await preferences.setTheme(value)
}

async function onLanguageChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as LanguageCode
  await preferences.setLanguage(value)
  await reconcileNotifications(await listSubscriptions({ includeCancelled: true }))
}

async function onCurrencyChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as CurrencyCode
  if (value === preferences.currency) return

  const needsWarning = await preferences.requiresCurrencyWarning(value)
  if (needsWarning) {
    pendingCurrency.value = value
    showCurrencyWarning.value = true
    ;(event.target as HTMLSelectElement).value = preferences.currency
    return
  }

  await preferences.setCurrency(value)
  await reconcileNotifications(await listSubscriptions({ includeCancelled: true }))
}

async function confirmCurrencyChange() {
  if (!pendingCurrency.value) return
  await preferences.setCurrency(pendingCurrency.value)
  pendingCurrency.value = null
  showCurrencyWarning.value = false
  await reconcileNotifications(await listSubscriptions({ includeCancelled: true }))
}

function cancelCurrencyChange() {
  pendingCurrency.value = null
  showCurrencyWarning.value = false
}

function currencyLabel(code: CurrencyCode): string {
  if (code === 'USD') return 'USD ($)'
  if (code === 'CNY') return 'CNY (¥)'
  if (code === 'EUR') return 'EUR (€)'
  if (code === 'GBP') return 'GBP (£)'
  return 'JPY (¥)'
}

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

async function onExport() {
  const doc = await exportBackup()
  try {
    const result = await deliverBackup(doc)
    if (result.method === 'display') {
      lastExportJson.value = JSON.stringify(doc, null, 2)
    }
    backupMessage.value =
      preferences.language === 'zh-CN'
        ? `备份已生成（${result.fileName}）。文件包含敏感订阅信息，请安全保存。`
        : `Backup ready (${result.fileName}). It contains sensitive subscription data — store it securely.`
  } catch {
    lastExportJson.value = JSON.stringify(doc, null, 2)
    backupMessage.value =
      preferences.language === 'zh-CN'
        ? '分享未完成，已在下方显示备份内容。'
        : 'Share was not completed; backup shown below instead.'
  }
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  try {
    const text = await file.text()
    const raw = JSON.parse(text)
    validateBackup(raw)
    pendingImport.value = raw
    showImportConfirm.value = true
    backupMessage.value = null
  } catch (error) {
    backupMessage.value = error instanceof Error ? error.message : 'Import failed.'
    showImportConfirm.value = false
    pendingImport.value = null
  } finally {
    input.value = ''
  }
}

async function confirmImport() {
  try {
    await importBackup(pendingImport.value, true)
    await preferences.load()
    backupMessage.value =
      preferences.language === 'zh-CN' ? '恢复成功。' : 'Restore completed.'
  } catch (error) {
    backupMessage.value = error instanceof Error ? error.message : 'Import failed.'
  } finally {
    showImportConfirm.value = false
    pendingImport.value = null
  }
}

function cancelImport() {
  showImportConfirm.value = false
  pendingImport.value = null
}

function webdavErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof WebDavError || error instanceof Error) return error.message
  return fallback
}

async function onSaveWebDav() {
  webdavBusy.value = true
  webdavMessage.value = null
  try {
    await saveWebDavSettings(webdav.value)
    webdavMessage.value =
      preferences.language === 'zh-CN' ? 'WebDAV 设置已保存。' : 'WebDAV settings saved.'
  } catch (error) {
    webdavMessage.value = webdavErrorMessage(error, 'Save failed.')
  } finally {
    webdavBusy.value = false
  }
}

async function onTestWebDav() {
  webdavBusy.value = true
  webdavMessage.value = null
  try {
    await saveWebDavSettings(webdav.value)
    await testWebDavConnection(webdav.value)
    webdavMessage.value = preferences.t('settings.webdavTestOk')
  } catch (error) {
    webdavMessage.value = webdavErrorMessage(error, 'WebDAV test failed.')
  } finally {
    webdavBusy.value = false
  }
}

async function onUploadWebDav() {
  webdavBusy.value = true
  webdavMessage.value = null
  try {
    await saveWebDavSettings(webdav.value)
    await uploadBackupToWebDav(webdav.value)
    webdavMessage.value = preferences.t('settings.webdavUploadOk')
  } catch (error) {
    webdavMessage.value = webdavErrorMessage(error, 'WebDAV upload failed.')
  } finally {
    webdavBusy.value = false
  }
}

function onDownloadWebDavClick() {
  webdavMessage.value = null
  showWebDavRestoreConfirm.value = true
}

async function confirmWebDavRestore() {
  webdavBusy.value = true
  webdavMessage.value = null
  try {
    await saveWebDavSettings(webdav.value)
    await restoreFromWebDav(webdav.value, true)
    await preferences.load()
    await reloadReminders()
    webdav.value = await getWebDavSettings()
    webdavMessage.value =
      preferences.language === 'zh-CN' ? '已从 WebDAV 恢复。' : 'Restored from WebDAV.'
  } catch (error) {
    webdavMessage.value = webdavErrorMessage(error, 'WebDAV restore failed.')
  } finally {
    webdavBusy.value = false
    showWebDavRestoreConfirm.value = false
  }
}

function cancelWebDavRestore() {
  showWebDavRestoreConfirm.value = false
}
</script>

<template>
  <section class="space-y-4">
    <header>
      <h1 class="font-headline text-3xl font-extrabold text-primary">
        {{ preferences.t('settings.title') }}
      </h1>
    </header>

    <div v-if="preferences.loaded" class="tactile-card overflow-hidden">
      <div class="border-b-2 border-surface-container-highest p-4">
        <label class="font-bold text-on-surface" for="settings-theme">
          {{ preferences.t('settings.appearance') }}
        </label>
        <select
          id="settings-theme"
          data-testid="settings-theme"
          class="mt-2 w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
          :value="preferences.theme"
          @change="onThemeChange"
        >
          <option value="light">{{ preferences.t('settings.light') }}</option>
          <option value="dark">{{ preferences.t('settings.dark') }}</option>
        </select>
      </div>

      <div class="border-b-2 border-surface-container-highest p-4">
        <label class="font-bold text-on-surface" for="settings-currency">
          {{ preferences.t('settings.currency') }}
        </label>
        <select
          id="settings-currency"
          data-testid="settings-currency"
          class="mt-2 w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
          :value="preferences.currency"
          @change="onCurrencyChange"
        >
          <option v-for="code in SUPPORTED_CURRENCIES" :key="code" :value="code">
            {{ currencyLabel(code) }}
          </option>
        </select>
      </div>

      <div class="border-b-2 border-surface-container-highest p-4">
        <label class="font-bold text-on-surface" for="settings-language">
          {{ preferences.t('settings.language') }}
        </label>
        <select
          id="settings-language"
          data-testid="settings-language"
          class="mt-2 w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
          :value="preferences.language"
          @change="onLanguageChange"
        >
          <option value="en">{{ preferences.t('settings.english') }}</option>
          <option value="zh-CN">{{ preferences.t('settings.chinese') }}</option>
        </select>
      </div>

      <div class="border-b-2 border-surface-container-highest p-4 space-y-3">
        <p class="font-bold text-on-surface">
          {{ preferences.language === 'zh-CN' ? '扣费提醒' : 'Billing reminders' }}
        </p>
        <label class="flex items-center gap-3">
          <input
            data-testid="settings-reminders-enabled"
            type="checkbox"
            :checked="remindersEnabled"
            @change="onReminderToggle"
          />
          <span>{{ preferences.language === 'zh-CN' ? '启用本地提醒' : 'Enable local reminders' }}</span>
        </label>
        <label class="block">
          <span class="text-sm text-on-surface-variant">
            {{ preferences.language === 'zh-CN' ? '提前天数' : 'Days before billing' }}
          </span>
          <select
            data-testid="settings-reminder-lead-days"
            class="mt-2 w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
            :value="reminderLeadDays"
            @change="onLeadDaysChange"
          >
            <option :value="1">1</option>
            <option :value="3">3</option>
            <option :value="7">7</option>
          </select>
        </label>
        <p v-if="permission === 'denied'" class="text-sm text-error" data-testid="reminder-permission-denied">
          {{
            preferences.language === 'zh-CN'
              ? '通知权限被拒绝。请在系统设置中启用后重试。'
              : 'Notification permission denied. Enable it in system settings, then retry.'
          }}
        </p>
      </div>

      <div class="border-b-2 border-surface-container-highest p-4 space-y-3">
        <p class="font-bold text-on-surface">
          {{ preferences.language === 'zh-CN' ? '本地备份' : 'Local backup' }}
        </p>
        <p class="text-sm text-on-surface-variant">
          {{
            preferences.language === 'zh-CN'
              ? '导出文件包含敏感订阅信息，请安全保存和分享。'
              : 'Exported files contain sensitive subscription information. Store and share them carefully.'
          }}
        </p>
        <div class="flex flex-col gap-2">
          <button type="button" class="tactile-btn px-4 py-3" data-testid="settings-export" @click="onExport">
            {{ preferences.language === 'zh-CN' ? '导出备份' : 'Export backup' }}
          </button>
          <label class="tactile-btn cursor-pointer px-4 py-3 text-center">
            {{ preferences.language === 'zh-CN' ? '导入备份' : 'Import backup' }}
            <input
              data-testid="settings-import"
              type="file"
              accept="application/json,.json"
              class="hidden"
              @change="onImportFile"
            />
          </label>
        </div>
        <pre
          v-if="lastExportJson"
          data-testid="settings-export-json"
          class="max-h-40 overflow-auto rounded-xl bg-surface-container-low p-3 text-xs"
        >{{ lastExportJson }}</pre>
      </div>

      <div class="p-4 space-y-3" data-testid="settings-webdav">
        <p class="font-bold text-on-surface">{{ preferences.t('settings.webdav') }}</p>
        <p class="text-sm text-on-surface-variant">{{ preferences.t('settings.webdavHint') }}</p>

        <label class="block">
          <span class="text-sm font-bold text-on-surface">{{ preferences.t('settings.webdavUrl') }}</span>
          <input
            v-model="webdav.url"
            data-testid="webdav-url"
            type="url"
            autocomplete="off"
            class="mt-2 w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
            placeholder="https://dav.example.com/remote.php/dav/files/user"
          />
        </label>

        <label class="block">
          <span class="text-sm font-bold text-on-surface">{{ preferences.t('settings.webdavUsername') }}</span>
          <input
            v-model="webdav.username"
            data-testid="webdav-username"
            type="text"
            autocomplete="username"
            class="mt-2 w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
          />
        </label>

        <label class="block">
          <span class="text-sm font-bold text-on-surface">{{ preferences.t('settings.webdavPassword') }}</span>
          <input
            v-model="webdav.password"
            data-testid="webdav-password"
            type="password"
            autocomplete="current-password"
            class="mt-2 w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
          />
        </label>

        <label class="block">
          <span class="text-sm font-bold text-on-surface">{{ preferences.t('settings.webdavPath') }}</span>
          <input
            v-model="webdav.remotePath"
            data-testid="webdav-path"
            type="text"
            autocomplete="off"
            class="mt-2 w-full rounded-xl border-2 border-surface-container-highest bg-surface-container-lowest px-3 py-3"
            placeholder="/subscout/backup.json"
          />
        </label>

        <label class="flex items-center gap-3">
          <input
            v-model="webdav.enabled"
            data-testid="webdav-enabled"
            type="checkbox"
          />
          <span>{{ preferences.t('settings.webdavEnabled') }}</span>
        </label>

        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            class="tactile-btn px-4 py-3"
            data-testid="webdav-save"
            :disabled="webdavBusy"
            @click="onSaveWebDav"
          >
            {{ preferences.t('settings.webdavSave') }}
          </button>
          <button
            type="button"
            class="rounded-xl border-2 border-surface-container-highest px-4 py-3 font-bold"
            data-testid="webdav-test"
            :disabled="webdavBusy"
            @click="onTestWebDav"
          >
            {{ preferences.t('settings.webdavTest') }}
          </button>
          <button
            type="button"
            class="tactile-btn px-4 py-3"
            data-testid="webdav-upload"
            :disabled="webdavBusy"
            @click="onUploadWebDav"
          >
            {{ preferences.t('settings.webdavUpload') }}
          </button>
          <button
            type="button"
            class="rounded-xl border-2 border-surface-container-highest px-4 py-3 font-bold"
            data-testid="webdav-download"
            :disabled="webdavBusy"
            @click="onDownloadWebDavClick"
          >
            {{ preferences.t('settings.webdavDownload') }}
          </button>
        </div>

        <p
          v-if="webdavMessage"
          class="text-sm text-on-surface"
          data-testid="webdav-message"
          role="status"
        >
          {{ webdavMessage }}
        </p>
      </div>
    </div>

    <p class="text-sm text-on-surface-variant">{{ preferences.t('settings.footer') }}</p>
    <p v-if="backupMessage" class="text-sm text-on-surface" data-testid="backup-message" role="status">
      {{ backupMessage }}
    </p>

    <div
      v-if="showCurrencyWarning"
      class="tactile-card space-y-3 border-error/40 p-5"
      role="dialog"
      data-testid="currency-warning"
    >
      <h2 class="font-headline text-xl font-bold text-on-surface">
        {{ preferences.t('settings.currencyWarningTitle') }}
      </h2>
      <p class="text-on-surface-variant">{{ preferences.t('settings.currencyWarningBody') }}</p>
      <div class="flex gap-3">
        <button
          type="button"
          class="flex-1 rounded-xl border-2 border-surface-container-highest px-4 py-3 font-bold"
          data-testid="currency-warning-cancel"
          @click="cancelCurrencyChange"
        >
          {{ preferences.t('settings.currencyCancel') }}
        </button>
        <button
          type="button"
          class="tactile-btn flex-1 px-4 py-3"
          data-testid="currency-warning-confirm"
          @click="confirmCurrencyChange"
        >
          {{ preferences.t('settings.currencyConfirm') }}
        </button>
      </div>
    </div>

    <div
      v-if="showImportConfirm"
      class="tactile-card space-y-3 border-error/40 p-5"
      role="dialog"
      data-testid="import-confirm"
    >
      <h2 class="font-headline text-xl font-bold">
        {{ preferences.language === 'zh-CN' ? '替换现有数据？' : 'Replace current data?' }}
      </h2>
      <p class="text-on-surface-variant">
        {{
          preferences.language === 'zh-CN'
            ? '恢复将完整替换当前订阅和偏好设置。'
            : 'Restore replaces all current subscriptions and preferences.'
        }}
      </p>
      <div class="flex gap-3">
        <button
          type="button"
          class="flex-1 rounded-xl border-2 border-surface-container-highest px-4 py-3 font-bold"
          data-testid="import-confirm-cancel"
          @click="cancelImport"
        >
          {{ preferences.t('settings.currencyCancel') }}
        </button>
        <button
          type="button"
          class="tactile-btn flex-1 px-4 py-3"
          data-testid="import-confirm-yes"
          @click="confirmImport"
        >
          {{ preferences.language === 'zh-CN' ? '确认恢复' : 'Restore' }}
        </button>
      </div>
    </div>

    <div
      v-if="showWebDavRestoreConfirm"
      class="tactile-card space-y-3 border-error/40 p-5"
      role="dialog"
      data-testid="webdav-restore-confirm"
    >
      <h2 class="font-headline text-xl font-bold">
        {{ preferences.language === 'zh-CN' ? '从 WebDAV 恢复？' : 'Restore from WebDAV?' }}
      </h2>
      <p class="text-on-surface-variant">{{ preferences.t('settings.webdavDownloadConfirm') }}</p>
      <div class="flex gap-3">
        <button
          type="button"
          class="flex-1 rounded-xl border-2 border-surface-container-highest px-4 py-3 font-bold"
          data-testid="webdav-restore-cancel"
          @click="cancelWebDavRestore"
        >
          {{ preferences.t('settings.currencyCancel') }}
        </button>
        <button
          type="button"
          class="tactile-btn flex-1 px-4 py-3"
          data-testid="webdav-restore-yes"
          :disabled="webdavBusy"
          @click="confirmWebDavRestore"
        >
          {{ preferences.language === 'zh-CN' ? '确认恢复' : 'Restore' }}
        </button>
      </div>
    </div>
  </section>
</template>
