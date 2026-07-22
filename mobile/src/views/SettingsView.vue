<script setup lang="ts">
import {
  BellRing,
  ChevronRight,
  CircleDollarSign,
  CloudCog,
  DatabaseBackup,
  Languages,
  Palette,
  Plus,
  ShieldCheck,
  Tag,
  Tags,
  Trash2,
  TriangleAlert,
} from '@lucide/vue'
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { exportBackup, importBackup, validateBackup } from '../application/backup'
import { deliverBackup } from '../application/backup-delivery'
import { addCategory, deleteCategory, listCategories } from '../application/categories'
import {
  getReminderSettings,
  reconcileNotifications,
  setReminderEnabled,
  setReminderLeadDays,
} from '../application/reminders'
import { listSubscriptions } from '../application/subscriptions'
import PageTopBar from '../components/PageTopBar.vue'
import {
  SUPPORTED_CURRENCIES,
  type CurrencyCode,
  type LanguageCode,
  type ThemeMode,
} from '../i18n/messages'
import { getNotificationAdapter } from '../notifications/adapter'
import { usePreferencesStore } from '../stores/preferences'

const preferences = usePreferencesStore()
const router = useRouter()
const remindersEnabled = ref(false)
const reminderLeadDays = ref(3)
const permission = ref<'granted' | 'denied' | 'prompt'>('prompt')
const backupMessage = ref<string | null>(null)
const lastExportJson = ref('')
const showImportConfirm = ref(false)
const pendingImport = ref<unknown>(null)

const categories = ref<string[]>([])
const categoriesLoading = ref(true)
const categoryBusy = ref(false)
const newCategoryName = ref('')
const categoryMessage = ref<string | null>(null)
const categoryMessageTone = ref<'status' | 'error'>('status')
const pendingCategoryDelete = ref<string | null>(null)
const categoryNameInput = ref<HTMLInputElement | null>(null)
let categoryDeleteCancelButton: HTMLButtonElement | null = null
let categoryDeleteTrigger: HTMLElement | null = null

const customCategories = computed(() =>
  categories.value.filter((category) => category.toLocaleLowerCase() !== 'default'),
)

function categoryCopy(english: string, chinese: string): string {
  return preferences.language === 'zh-CN' ? chinese : english
}

function setCategoryMessage(message: string, tone: 'status' | 'error' = 'status') {
  categoryMessage.value = message
  categoryMessageTone.value = tone
}

function setCategoryDeleteCancelButton(element: unknown) {
  categoryDeleteCancelButton = element instanceof HTMLButtonElement ? element : null
}
async function reloadCategories() {
  categoriesLoading.value = true
  try {
    categories.value = await listCategories()
  } catch {
    setCategoryMessage(
      categoryCopy('Could not load categories. Please try again.', '无法加载分类，请重试。'),
      'error',
    )
  } finally {
    categoriesLoading.value = false
  }
}

async function onAddCategory() {
  const name = newCategoryName.value.trim()
  categoryMessage.value = null

  if (name.length < 1 || name.length > 24) {
    setCategoryMessage(
      categoryCopy('Category name must be 1–24 characters.', '分类名称需为 1–24 个字符。'),
      'error',
    )
    return
  }

  const duplicate =
    name.toLocaleLowerCase() === 'default' ||
    categories.value.some((category) => category.toLocaleLowerCase() === name.toLocaleLowerCase())
  if (duplicate) {
    setCategoryMessage(categoryCopy('That category already exists.', '该分类已存在。'), 'error')
    return
  }

  categoryBusy.value = true
  try {
    const created = await addCategory(name)
    await reloadCategories()
    newCategoryName.value = ''
    setCategoryMessage(categoryCopy(`Added “${created}”.`, `已添加“${created}”。`))
  } catch {
    setCategoryMessage(
      categoryCopy('Could not add the category. Please try again.', '无法添加分类，请重试。'),
      'error',
    )
  } finally {
    categoryBusy.value = false
  }
}

async function requestCategoryDelete(category: string, event: MouseEvent) {
  pendingCategoryDelete.value = category
  categoryMessage.value = null
  categoryDeleteTrigger = event.currentTarget as HTMLElement
  await nextTick()
  categoryDeleteCancelButton?.focus()
}

function cancelCategoryDelete() {
  const trigger = categoryDeleteTrigger
  pendingCategoryDelete.value = null
  categoryDeleteTrigger = null
  void nextTick(() => trigger?.focus())
}

async function confirmCategoryDelete() {
  const category = pendingCategoryDelete.value
  if (!category) return

  categoryBusy.value = true
  try {
    const { reassignedCount } = await deleteCategory(category)
    await reloadCategories()
    pendingCategoryDelete.value = null
    categoryDeleteTrigger = null
    setCategoryMessage(
      categoryCopy(
        `Deleted “${category}”. ${reassignedCount} ${reassignedCount === 1 ? 'subscription was' : 'subscriptions were'} moved to Default.`,
        `已删除“${category}”。${reassignedCount} 个订阅已移至默认分类。`,
      ),
    )
    categoryBusy.value = false
    await nextTick()
    categoryNameInput.value?.focus()
  } catch {
    setCategoryMessage(
      categoryCopy('Could not delete the category. Please try again.', '无法删除分类，请重试。'),
      'error',
    )
  } finally {
    categoryBusy.value = false
  }
}
async function reloadReminders() {
  const settings = await getReminderSettings()
  remindersEnabled.value = settings.enabled
  reminderLeadDays.value = settings.leadDays
  permission.value = await getNotificationAdapter().getPermission()
}

onMounted(async () => {
  await Promise.all([reloadReminders(), reloadCategories()])
})

async function openExchangeRates() {
  await router.push({ name: 'settings-exchange-rates' })
}

async function openWebDav() {
  await router.push({ name: 'settings-webdav' })
}

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
    await reloadCategories()
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
          <div class="settings-row min-w-0 gap-3">
            <span class="icon-house icon-house-primary" aria-hidden="true">
              <Palette :size="25" :stroke-width="2.4" />
            </span>
            <label
              class="min-w-0 flex-1 font-headline font-bold text-on-surface"
              for="settings-theme"
            >
              {{ preferences.t('settings.appearance') }}
            </label>
            <select
              id="settings-theme"
              data-testid="settings-theme"
              class="settings-row-control h-11 w-[7.25rem] max-w-[42%] rounded-xl border-2 border-outline-variant bg-surface-container-low px-2 text-sm font-bold text-on-surface"
              :value="preferences.theme"
              @change="onThemeChange"
            >
              <option value="system">{{ preferences.t('settings.system') }}</option>
              <option value="light">{{ preferences.t('settings.light') }}</option>
              <option value="dark">{{ preferences.t('settings.dark') }}</option>
            </select>
          </div>

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

      <section class="space-y-3" aria-labelledby="settings-categories-heading">
        <h2 id="settings-categories-heading" class="section-label">
          {{ preferences.language === 'zh-CN' ? '分类' : 'Categories' }}
        </h2>

        <div class="settings-group min-w-0">
          <div class="settings-row min-w-0 items-start gap-3">
            <span class="icon-house icon-house-primary" aria-hidden="true">
              <Tags :size="25" :stroke-width="2.4" />
            </span>
            <div class="min-w-0 flex-1">
              <label class="font-headline font-bold text-on-surface" for="settings-category-name">
                {{ preferences.language === 'zh-CN' ? '新建分类' : 'New category' }}
              </label>
              <p class="mt-1 text-sm leading-5 text-on-surface-variant">
                {{
                  preferences.language === 'zh-CN'
                    ? '添加用于整理订阅的自定义分类。'
                    : 'Add a custom category to organize subscriptions.'
                }}
              </p>

              <form
                class="mt-4 flex min-w-0 flex-col gap-2 min-[400px]:flex-row"
                @submit.prevent="onAddCategory"
              >
                <input
                  id="settings-category-name"
                  ref="categoryNameInput"
                  v-model="newCategoryName"
                  data-testid="settings-category-name"
                  class="field-recessed min-w-0 flex-1"
                  type="text"
                  maxlength="24"
                  autocomplete="off"
                  :placeholder="preferences.language === 'zh-CN' ? '例如：教育' : 'e.g. Education'"
                  :aria-invalid="categoryMessageTone === 'error'"
                  :aria-describedby="categoryMessage ? 'settings-category-message' : undefined"
                  :disabled="categoryBusy"
                />
                <button
                  type="submit"
                  class="tactile-btn min-h-[52px] w-full shrink-0 px-4 py-2 min-[400px]:w-auto"
                  data-testid="settings-category-add"
                  :disabled="categoryBusy"
                >
                  <Plus :size="20" :stroke-width="2.7" aria-hidden="true" />
                  {{ preferences.language === 'zh-CN' ? '添加' : 'Add' }}
                </button>
              </form>

              <p
                v-if="categoryMessage"
                id="settings-category-message"
                class="mt-3 rounded-xl p-3 text-sm font-bold"
                :class="
                  categoryMessageTone === 'error'
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-primary-container/20 text-on-surface'
                "
                data-testid="settings-category-message"
                :role="categoryMessageTone === 'error' ? 'alert' : 'status'"
              >
                {{ categoryMessage }}
              </p>
            </div>
          </div>

          <div
            class="settings-row min-w-0 gap-3"
            data-testid="settings-category-item"
            data-category="Default"
          >
            <span class="icon-house icon-house-neutral" aria-hidden="true">
              <Tag :size="23" :stroke-width="2.4" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-headline font-bold text-on-surface">
                {{ preferences.language === 'zh-CN' ? '默认' : 'Default' }}
              </p>
              <p class="mt-1 text-sm leading-5 text-on-surface-variant">
                {{
                  preferences.language === 'zh-CN'
                    ? '未分类订阅的受保护分类'
                    : 'Protected category for uncategorized subscriptions'
                }}
              </p>
            </div>
            <span
              class="chip-pill shrink-0 border-outline-variant bg-surface-container text-on-surface-variant"
            >
              {{ preferences.language === 'zh-CN' ? '受保护' : 'Protected' }}
            </span>
          </div>

          <template v-for="category in customCategories" :key="category">
            <div
              class="settings-row min-w-0 gap-3"
              data-testid="settings-category-item"
              :data-category="category"
            >
              <span class="icon-house icon-house-tertiary" aria-hidden="true">
                <Tag :size="23" :stroke-width="2.4" />
              </span>
              <p class="min-w-0 flex-1 break-words font-headline font-bold text-on-surface">
                {{ category }}
              </p>
              <button
                type="button"
                class="icon-button text-error"
                data-testid="settings-category-delete"
                :data-category="category"
                :disabled="categoryBusy"
                :aria-label="
                  preferences.language === 'zh-CN'
                    ? `删除分类“${category}”`
                    : `Delete ${category} category`
                "
                @click="requestCategoryDelete(category, $event)"
              >
                <Trash2 :size="21" :stroke-width="2.5" aria-hidden="true" />
              </button>
            </div>

            <div
              v-if="pendingCategoryDelete === category"
              class="border-b-2 border-surface-container-highest bg-error-container/30 p-4"
              role="alertdialog"
              aria-labelledby="settings-category-delete-title"
              aria-describedby="settings-category-delete-description"
              data-testid="settings-category-delete-confirm"
              :data-category="category"
              @keydown.esc.stop.prevent="cancelCategoryDelete"
            >
              <div class="flex items-start gap-3">
                <TriangleAlert
                  :size="24"
                  :stroke-width="2.5"
                  class="mt-0.5 shrink-0 text-error"
                  aria-hidden="true"
                />
                <div class="min-w-0">
                  <h3
                    id="settings-category-delete-title"
                    class="font-headline font-bold text-on-surface"
                  >
                    {{
                      preferences.language === 'zh-CN'
                        ? `删除“${category}”？`
                        : `Delete “${category}”?`
                    }}
                  </h3>
                  <p
                    id="settings-category-delete-description"
                    class="mt-1 text-sm leading-5 text-on-surface-variant"
                  >
                    {{
                      preferences.language === 'zh-CN'
                        ? '使用此分类的订阅将移至默认分类。此操作无法撤销。'
                        : 'Subscriptions using this category will move to Default. This cannot be undone.'
                    }}
                  </p>
                </div>
              </div>
              <div class="mt-4 grid grid-cols-2 gap-3">
                <button
                  :ref="setCategoryDeleteCancelButton"
                  type="button"
                  class="tactile-btn-secondary min-w-0 px-2 py-2"
                  data-testid="settings-category-delete-cancel"
                  :disabled="categoryBusy"
                  @click="cancelCategoryDelete"
                >
                  {{ preferences.language === 'zh-CN' ? '取消' : 'Cancel' }}
                </button>
                <button
                  type="button"
                  class="tactile-btn-danger min-w-0 px-2 py-2"
                  data-testid="settings-category-delete-yes"
                  :disabled="categoryBusy"
                  @click="confirmCategoryDelete"
                >
                  {{ preferences.language === 'zh-CN' ? '确认删除' : 'Delete' }}
                </button>
              </div>
            </div>
          </template>

          <p
            v-if="categoriesLoading"
            class="px-4 py-3 text-sm text-on-surface-variant"
            role="status"
          >
            {{ preferences.language === 'zh-CN' ? '正在加载分类…' : 'Loading categories…' }}
          </p>
        </div>
      </section>

      <section class="space-y-3" aria-labelledby="settings-reminders-heading">
        <h2 id="settings-reminders-heading" class="section-label">
          {{ preferences.language === 'zh-CN' ? '通知' : 'Notifications' }}
        </h2>

        <div class="settings-group min-w-0">
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
                      preferences.language === 'zh-CN' ? '启用本地提醒' : 'Enable local reminders'
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

              <p
                v-if="permission === 'denied'"
                class="mt-3 rounded-xl bg-error-container p-3 text-sm font-bold text-on-error-container"
                data-testid="reminder-permission-denied"
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
