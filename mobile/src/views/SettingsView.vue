<script setup lang="ts">
import {
  BellRing,
  ChevronRight,
  CircleDollarSign,
  CloudCog,
  DatabaseBackup,
  Languages,
  Palette,
  ShieldCheck,
  Tags,
} from '@lucide/vue'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { exportBackup, importBackup, validateBackup } from '../application/backup'
import { deliverBackup } from '../application/backup-delivery'
import { reconcileNotifications } from '../application/reminders'
import { listSubscriptions } from '../application/subscriptions'
import PageTopBar from '../components/PageTopBar.vue'
import { SUPPORTED_CURRENCIES, type CurrencyCode, type LanguageCode } from '../i18n/messages'
import { usePreferencesStore } from '../stores/preferences'

const preferences = usePreferencesStore()
const router = useRouter()
const backupMessage = ref<string | null>(null)
const lastExportJson = ref('')
const showImportConfirm = ref(false)
const pendingImport = ref<unknown>(null)

async function openCategories() {
  await router.push({ name: 'settings-categories' })
}

async function openNotifications() {
  await router.push({ name: 'settings-notifications' })
}

async function openExchangeRates() {
  await router.push({ name: 'settings-exchange-rates' })
}

async function openWebDav() {
  await router.push({ name: 'settings-webdav' })
}

async function openAppearance() {
  await router.push({ name: 'settings-appearance' })
}

async function onLanguageChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as LanguageCode
  await preferences.setLanguage(value)
  await reconcileNotifications(await listSubscriptions({ includeCancelled: true }))
}

async function onCurrencyChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as CurrencyCode
  if (value === preferences.currency) return
  await preferences.setCurrency(value)
}

function currencyLabel(code: CurrencyCode): string {
  if (code === 'USD') return 'USD ($)'
  if (code === 'CNY') return 'CNY (¥)'
  if (code === 'EUR') return 'EUR (€)'
  if (code === 'GBP') return 'GBP (£)'
  if (code === 'JPY') return 'JPY (¥)'
  if (code === 'INR') return 'INR (₹)'
  if (code === 'TRY') return 'TRY (₺)'
  return code
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
    backupMessage.value = preferences.language === 'zh-CN' ? '恢复成功。' : 'Restore completed.'
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
</script>

<template>
  <section class="page">
    <PageTopBar :title="preferences.t('settings.title')" />

    <div v-if="preferences.loaded" class="page-content page-content-settings !gap-6">
      <section class="space-y-3" aria-labelledby="settings-preferences-heading">
        <h2 id="settings-preferences-heading" class="section-label">
          {{ preferences.language === 'zh-CN' ? '偏好设置' : 'Preferences' }}
        </h2>

        <div class="settings-group min-w-0">
          <button
            type="button"
            class="settings-row min-w-0 w-full gap-3 text-left"
            data-testid="open-appearance-settings"
            @click="openAppearance"
          >
            <span class="icon-house icon-house-primary" aria-hidden="true">
              <Palette :size="25" :stroke-width="2.4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block font-headline font-bold text-on-surface">
                {{ preferences.language === 'zh-CN' ? '外观与主题' : 'Appearance' }}
              </span>
              <span class="mt-1 block text-sm leading-5 text-on-surface-variant">
                {{
                  preferences.language === 'zh-CN'
                    ? '主题预设与浅色 / 深色显示模式。'
                    : 'Theme presets and light / dark display mode.'
                }}
              </span>
            </span>
            <ChevronRight
              :size="24"
              :stroke-width="2.5"
              class="shrink-0 text-on-surface-variant"
              aria-hidden="true"
            />
          </button>

          <div class="settings-row min-w-0 gap-3">
            <span class="icon-house icon-house-tertiary" aria-hidden="true">
              <CircleDollarSign :size="25" :stroke-width="2.4" />
            </span>
            <label
              class="min-w-0 flex-1 font-headline font-bold text-on-surface"
              for="settings-currency"
            >
              {{ preferences.t('settings.currency') }}
            </label>
            <select
              id="settings-currency"
              data-testid="settings-currency"
              class="settings-row-control h-11 w-[7.25rem] max-w-[42%] rounded-xl border-2 border-outline-variant bg-surface-container-low px-2 text-sm font-bold text-on-surface"
              :value="preferences.currency"
              @change="onCurrencyChange"
            >
              <option v-for="code in SUPPORTED_CURRENCIES" :key="code" :value="code">
                {{ currencyLabel(code) }}
              </option>
            </select>
          </div>

          <button
            type="button"
            class="settings-row min-w-0 w-full gap-3 text-left"
            data-testid="open-exchange-rates-settings"
            @click="openExchangeRates"
          >
            <span class="icon-house icon-house-tertiary" aria-hidden="true">
              <CircleDollarSign :size="25" :stroke-width="2.4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block font-headline font-bold text-on-surface">
                {{ preferences.language === 'zh-CN' ? '汇率设置' : 'Exchange rates' }}
              </span>
              <span class="mt-1 block text-sm leading-5 text-on-surface-variant">
                {{
                  preferences.language === 'zh-CN'
                    ? '设置所有支持币种的人民币折算汇率。'
                    : 'Set CNY conversion rates for every supported currency.'
                }}
              </span>
            </span>
            <ChevronRight
              :size="24"
              :stroke-width="2.5"
              class="shrink-0 text-on-surface-variant"
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            class="settings-row min-w-0 w-full gap-3 text-left"
            data-testid="open-categories-settings"
            @click="openCategories"
          >
            <span class="icon-house icon-house-primary" aria-hidden="true">
              <Tags :size="25" :stroke-width="2.4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block font-headline font-bold text-on-surface">
                {{ preferences.language === 'zh-CN' ? '分类管理' : 'Categories' }}
              </span>
              <span class="mt-1 block text-sm leading-5 text-on-surface-variant">
                {{
                  preferences.language === 'zh-CN'
                    ? '新建、查看和删除自定义分类。'
                    : 'Create, view, and delete custom categories.'
                }}
              </span>
            </span>
            <ChevronRight
              :size="24"
              :stroke-width="2.5"
              class="shrink-0 text-on-surface-variant"
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            class="settings-row min-w-0 w-full gap-3 text-left"
            data-testid="open-notification-settings"
            @click="openNotifications"
          >
            <span class="icon-house icon-house-secondary" aria-hidden="true">
              <BellRing :size="25" :stroke-width="2.4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block font-headline font-bold text-on-surface">
                {{ preferences.language === 'zh-CN' ? '通知设置' : 'Notifications' }}
              </span>
              <span class="mt-1 block text-sm leading-5 text-on-surface-variant">
                {{
                  preferences.language === 'zh-CN'
                    ? '管理扣费提醒和提前通知时间。'
                    : 'Manage billing reminders and notification timing.'
                }}
              </span>
            </span>
            <ChevronRight
              :size="24"
              :stroke-width="2.5"
              class="shrink-0 text-on-surface-variant"
              aria-hidden="true"
            />
          </button>

          <div class="settings-row min-w-0 gap-3">
            <span class="icon-house icon-house-secondary" aria-hidden="true">
              <Languages :size="25" :stroke-width="2.4" />
            </span>
            <label
              class="min-w-0 flex-1 font-headline font-bold text-on-surface"
              for="settings-language"
            >
              {{ preferences.t('settings.language') }}
            </label>
            <select
              id="settings-language"
              data-testid="settings-language"
              class="settings-row-control h-11 w-[7.25rem] max-w-[42%] rounded-xl border-2 border-outline-variant bg-surface-container-low px-2 text-sm font-bold text-on-surface"
              :value="preferences.language"
              @change="onLanguageChange"
            >
              <option value="en">{{ preferences.t('settings.english') }}</option>
              <option value="zh-CN">{{ preferences.t('settings.chinese') }}</option>
            </select>
          </div>
        </div>
      </section>

      <section class="space-y-3" aria-labelledby="settings-data-heading">
        <h2 id="settings-data-heading" class="section-label">
          {{ preferences.language === 'zh-CN' ? '数据与同步' : 'Data & sync' }}
        </h2>

        <div class="settings-group min-w-0">
          <div class="settings-row min-w-0 items-start gap-3">
            <span class="icon-house icon-house-primary" aria-hidden="true">
              <DatabaseBackup :size="25" :stroke-width="2.4" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="font-headline font-bold text-on-surface">
                {{ preferences.language === 'zh-CN' ? '本地备份' : 'Local backup' }}
              </p>
              <p class="mt-1 text-sm leading-5 text-on-surface-variant">
                {{
                  preferences.language === 'zh-CN'
                    ? '导出文件包含敏感订阅信息，请安全保存和分享。'
                    : 'Exported files contain sensitive subscription information. Store and share them carefully.'
                }}
              </p>

              <div class="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-2">
                <button
                  type="button"
                  class="tactile-btn-secondary min-w-0 px-2 py-2 text-sm leading-4"
                  data-testid="settings-export"
                  @click="onExport"
                >
                  {{ preferences.language === 'zh-CN' ? '导出备份' : 'Export backup' }}
                </button>
                <label
                  class="tactile-btn-secondary min-w-0 cursor-pointer px-2 py-2 text-center text-sm leading-4"
                >
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

              <p
                v-if="backupMessage"
                class="mt-3 rounded-xl bg-surface-container-low p-3 text-sm text-on-surface"
                data-testid="backup-message"
                role="status"
              >
                {{ backupMessage }}
              </p>

              <pre
                v-if="lastExportJson"
                data-testid="settings-export-json"
                class="mt-3 max-h-40 max-w-full overflow-auto whitespace-pre-wrap break-all rounded-xl bg-surface-container-low p-3 text-xs text-on-surface"
                >{{ lastExportJson }}</pre
              >
            </div>
          </div>

          <button
            type="button"
            class="settings-row min-w-0 w-full gap-3 text-left"
            data-testid="open-webdav-settings"
            @click="openWebDav"
          >
            <span class="icon-house icon-house-tertiary" aria-hidden="true">
              <CloudCog :size="25" :stroke-width="2.4" />
            </span>
            <span class="min-w-0 flex-1">
              <span class="block font-headline font-bold text-on-surface">
                {{ preferences.t('settings.webdav') }}
              </span>
              <span class="mt-1 block text-sm leading-5 text-on-surface-variant">
                {{ preferences.t('settings.webdavHint') }}
              </span>
            </span>
            <ChevronRight
              :size="24"
              :stroke-width="2.5"
              class="shrink-0 text-on-surface-variant"
              aria-hidden="true"
            />
          </button>
        </div>
      </section>

      <div class="flex items-start gap-2 px-2 text-sm leading-5 text-on-surface-variant">
        <ShieldCheck
          :size="19"
          :stroke-width="2.4"
          class="mt-0.5 shrink-0 text-primary"
          aria-hidden="true"
        />
        <p>{{ preferences.t('settings.footer') }}</p>
      </div>

      <div
        v-if="showImportConfirm"
        class="tactile-card space-y-4 border-error/40 p-5"
        role="dialog"
        data-testid="import-confirm"
      >
        <div class="flex items-start gap-3">
          <span
            class="icon-house border-error bg-error-container text-on-error-container"
            aria-hidden="true"
          >
            <DatabaseBackup :size="24" :stroke-width="2.5" />
          </span>
          <div class="min-w-0">
            <h2 class="font-headline text-xl font-bold text-on-surface">
              {{ preferences.language === 'zh-CN' ? '替换现有数据？' : 'Replace current data?' }}
            </h2>
            <p class="mt-1 text-sm text-on-surface-variant">
              {{
                preferences.language === 'zh-CN'
                  ? '恢复将完整替换当前订阅和偏好设置。'
                  : 'Restore replaces all current subscriptions and preferences.'
              }}
            </p>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button
            type="button"
            class="tactile-btn-secondary min-w-0 px-2 py-3"
            data-testid="import-confirm-cancel"
            @click="cancelImport"
          >
            {{ preferences.t('settings.currencyCancel') }}
          </button>
          <button
            type="button"
            class="tactile-btn min-w-0 px-2 py-3"
            data-testid="import-confirm-yes"
            @click="confirmImport"
          >
            {{ preferences.language === 'zh-CN' ? '确认恢复' : 'Restore' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
