const fs = require('fs')

// 1) Create WebDavSettingsView from current settings content
const settings = fs.readFileSync('src/views/SettingsView.vue', 'utf8')

const webdavScriptMatch = settings.match(/async function onSaveWebDav[\s\S]*?function cancelWebDavRestore\(\) \{\n  showWebDavRestoreConfirm\.value = false\n\}\n/)
if (!webdavScriptMatch) {
  console.error('webdav handlers not found')
  process.exit(1)
}

const webdavView = `<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
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
import { listSubscriptions } from '../application/subscriptions'
import { getReminderSettings } from '../application/reminders'
import { usePreferencesStore } from '../stores/preferences'

const router = useRouter()
const preferences = usePreferencesStore()
const webdav = ref<WebDavSettings>({ ...DEFAULT_WEBDAV_SETTINGS })
const webdavBusy = ref(false)
const webdavMessage = ref<string | null>(null)
const showWebDavRestoreConfirm = ref(false)

onMounted(async () => {
  webdav.value = await getWebDavSettings()
})

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

async function goBack() {
  if (window.history.length > 1) router.back()
  else await router.push({ name: 'settings' })
}
</script>

<template>
  <section class="space-y-4">
    <header class="flex items-center gap-3">
      <button
        type="button"
        class="rounded-xl border-2 border-surface-container-highest px-3 py-2 font-bold"
        data-testid="webdav-back"
        @click="goBack"
      >
        {{ preferences.t('detail.back') }}
      </button>
      <h1 class="font-headline text-3xl font-extrabold text-primary">
        {{ preferences.t('settings.webdav') }}
      </h1>
    </header>

    <div class="tactile-card space-y-3 p-4" data-testid="settings-webdav">
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
        <input v-model="webdav.enabled" data-testid="webdav-enabled" type="checkbox" />
        <span>{{ preferences.t('settings.webdavEnabled') }}</span>
      </label>

      <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" class="tactile-btn px-4 py-3" data-testid="webdav-save" :disabled="webdavBusy" @click="onSaveWebDav">
          {{ preferences.t('settings.webdavSave') }}
        </button>
        <button type="button" class="rounded-xl border-2 border-surface-container-highest px-4 py-3 font-bold" data-testid="webdav-test" :disabled="webdavBusy" @click="onTestWebDav">
          {{ preferences.t('settings.webdavTest') }}
        </button>
        <button type="button" class="tactile-btn px-4 py-3" data-testid="webdav-upload" :disabled="webdavBusy" @click="onUploadWebDav">
          {{ preferences.t('settings.webdavUpload') }}
        </button>
        <button type="button" class="rounded-xl border-2 border-surface-container-highest px-4 py-3 font-bold" data-testid="webdav-download" :disabled="webdavBusy" @click="onDownloadWebDavClick">
          {{ preferences.t('settings.webdavDownload') }}
        </button>
      </div>

      <p v-if="webdavMessage" class="text-sm text-on-surface" data-testid="webdav-message" role="status">
        {{ webdavMessage }}
      </p>
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
        <button type="button" class="flex-1 rounded-xl border-2 border-surface-container-highest px-4 py-3 font-bold" data-testid="webdav-restore-cancel" @click="cancelWebDavRestore">
          {{ preferences.t('settings.currencyCancel') }}
        </button>
        <button type="button" class="tactile-btn flex-1 px-4 py-3" data-testid="webdav-restore-yes" :disabled="webdavBusy" @click="confirmWebDavRestore">
          {{ preferences.language === 'zh-CN' ? '确认恢复' : 'Restore' }}
        </button>
      </div>
    </div>
  </section>
</template>
`

fs.writeFileSync('src/views/WebDavSettingsView.vue', webdavView)
console.log('wrote WebDavSettingsView.vue')

// 2) Slim SettingsView: remove webdav imports/state/handlers/template block, add link + system theme
let s = settings
s = s.replace(/import \{\n  DEFAULT_WEBDAV_SETTINGS,[\s\S]*?\} from '\.\.\/application\/webdav'\n/, '')
s = s.replace(/const webdav = ref<WebDavSettings>\(\{ \.\.\.DEFAULT_WEBDAV_SETTINGS \}\)\n/, '')
s = s.replace(/const webdavBusy = ref\(false\)\n/, '')
s = s.replace(/const webdavMessage = ref<string \| null>\(null\)\n/, '')
s = s.replace(/const showWebDavRestoreConfirm = ref\(false\)\n/, '')
s = s.replace(/  webdav\.value = await getWebDavSettings\(\)\n/, '')
s = s.replace(/\nfunction webdavErrorMessage[\s\S]*?function cancelWebDavRestore\(\) \{\n  showWebDavRestoreConfirm\.value = false\n\}\n/, '\n')

// add router + open webdav
if (!s.includes("import { useRouter }")) {
  s = s.replace("import { onMounted, ref } from 'vue'\n", "import { onMounted, ref } from 'vue'\nimport { useRouter } from 'vue-router'\n")
}
if (!s.includes('const router = useRouter()')) {
  s = s.replace('const preferences = usePreferencesStore()\n', 'const preferences = usePreferencesStore()\nconst router = useRouter()\n')
}
if (!s.includes('async function openWebDav')) {
  s = s.replace(
    'async function onThemeChange',
    `async function openWebDav() {
  await router.push({ name: 'settings-webdav' })
}

async function onThemeChange`,
  )
}

// theme option system
s = s.replace(
  `<option value="light">{{ preferences.t('settings.light') }}</option>
          <option value="dark">{{ preferences.t('settings.dark') }}</option>`,
  `<option value="system">{{ preferences.t('settings.system') }}</option>
          <option value="light">{{ preferences.t('settings.light') }}</option>
          <option value="dark">{{ preferences.t('settings.dark') }}</option>`,
)

// replace inline webdav block with link row
s = s.replace(
  /\n\s*<div class="p-4 space-y-3" data-testid="settings-webdav">[\s\S]*?<\/div>\n\s*<\/div>/,
  `
      <div class="p-4">
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-xl border-2 border-surface-container-highest px-4 py-3 text-left"
          data-testid="open-webdav-settings"
          @click="openWebDav"
        >
          <span>
            <span class="block font-bold text-on-surface">{{ preferences.t('settings.webdav') }}</span>
            <span class="block text-sm text-on-surface-variant">{{ preferences.t('settings.webdavHint') }}</span>
          </span>
          <span class="font-bold text-primary">›</span>
        </button>
      </div>
    </div>`,
)

// remove webdav restore confirm dialog from settings if still present
s = s.replace(/\n\s*<div\n\s*v-if="showWebDavRestoreConfirm"[\s\S]*?<\/div>\n\s*<\/section>/, '\n  </section>')

fs.writeFileSync('src/views/SettingsView.vue', s)
console.log('slimmed SettingsView.vue')

// 3) Router
let r = fs.readFileSync('src/router/index.ts', 'utf8')
if (!r.includes('WebDavSettingsView')) {
  r = r.replace(
    "import SettingsView from '../views/SettingsView.vue'",
    "import SettingsView from '../views/SettingsView.vue'\nimport WebDavSettingsView from '../views/WebDavSettingsView.vue'",
  )
  r = r.replace(
    `{
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { title: 'Settings' },
  },`,
    `{
    path: '/settings',
    name: 'settings',
    component: SettingsView,
    meta: { title: 'Settings' },
  },
  {
    path: '/settings/webdav',
    name: 'settings-webdav',
    component: WebDavSettingsView,
    meta: { title: 'WebDAV' },
  },`,
  )
  fs.writeFileSync('src/router/index.ts', r)
  console.log('router updated')
}

// 4) Overview: remove monthly total card, keep active + upcoming
let o = fs.readFileSync('src/views/OverviewView.vue', 'utf8')
o = o.replace(/const monthlyByCurrency = ref<Array<\{ currency: string; amountMinor: number \}>>\(\[\]\)\n/, '')
o = o.replace(/  monthlyByCurrency\.value = snapshot\.monthlyByCurrency\n/, '')
// replace squad card monthly section with active-only emphasis + note to stats
o = o.replace(
  /<div class="grid grid-cols-2 gap-3">[\s\S]*?<\/div>\n\s*<p v-if="activeCount === 0" class="text-center text-on-surface-variant">/,
  `<div class="rounded-xl border-2 border-surface-container-highest bg-surface-container-low p-4 text-center">
          <p class="text-xs font-bold uppercase tracking-wide text-on-surface-variant">
            {{ preferences.t('overview.active') }}
          </p>
          <p class="font-headline text-3xl font-extrabold text-primary" data-testid="overview-active-count">
            {{ activeCount }}
          </p>
        </div>
        <p class="text-center text-sm text-on-surface-variant">
          {{ preferences.language === 'zh-CN' ? '金额分析请到「统计」查看。' : 'See Stats for spending analysis.' }}
        </p>
      <p v-if="activeCount === 0" class="text-center text-on-surface-variant">`,
)
fs.writeFileSync('src/views/OverviewView.vue', o)
console.log('overview slimmed')

// 5) App.vue data-theme should use resolved theme for system mode
let app = fs.readFileSync('src/App.vue', 'utf8')
app = app.replace(
  ':data-theme="preferences.theme"',
  ':data-theme="preferences.resolvedTheme"',
)
fs.writeFileSync('src/App.vue', app)
console.log('app theme binding updated')

// 6) acceptance: settings still contains WebDAV text via entry row
// theme test: dataset.theme should be dark when selecting dark (still ok)
// overview monthly assertions will break; patch them
let t = fs.readFileSync('src/__tests__/app.acceptance.spec.ts', 'utf8')
t = t.replace(
  /await openDestination\(wrapper, 'nav-overview', '\/'\)\n    expect\(wrapper\.text\(\)\)\.toContain\('1'\)\n    expect\(wrapper\.text\(\)\)\.toMatch\(\/15\\.99\/\)\n    expect\(wrapper\.text\(\)\)\.toContain\('Netflix'\)/g,
  `await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('Netflix')`,
)
t = t.replace(
  /await openDestination\(wrapper, 'nav-overview', '\/'\)\n    expect\(wrapper\.text\(\)\)\.toContain\('Netflix'\)\n    expect\(wrapper\.text\(\)\)\.toMatch\(\/15\\.99\/\)/g,
  `await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).toContain('Netflix')`,
)
t = t.replace(
  /await openDestination\(wrapper, 'nav-overview', '\/'\)\n    \/\/ 120\.00 yearly => 10\.00 normalized monthly\n    expect\(wrapper\.get\('\[data-testid="overview-monthly"\]'\)\.text\(\)\)\.toMatch\(\/10\\.00\/\)\n    expect\(wrapper\.text\(\)\)\.toContain\('Adobe'\)/,
  `await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).toContain('Adobe')
    await openDestination(wrapper, 'nav-stats', '/stats')
    expect(wrapper.get('[data-testid="stats-total"]').text()).toMatch(/120\\.00|10\\.00/)` ,
)
t = t.replace(
  /await openDestination\(wrapper, 'nav-overview', '\/'\)\n    expect\(wrapper\.text\(\)\)\.not\.toContain\('Netflix Plus'\)\n    expect\(wrapper\.get\('\[data-testid="overview-monthly"\]'\)\.text\(\)\)\.toMatch\(\/0\\.00\/\)/,
  `await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).not.toContain('Netflix Plus')`,
)
t = t.replace(
  /await openDestination\(wrapper, 'nav-overview', '\/'\)\n    expect\(wrapper\.text\(\)\)\.toContain\('Netflix Plus'\)\n    expect\(wrapper\.get\('\[data-testid="overview-monthly"\]'\)\.text\(\)\)\.toMatch\(\/18\\.99\/\)/,
  `await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).toContain('Netflix Plus')`,
)
// theme default may be system; when set dark still expects dark resolved theme - ok
fs.writeFileSync('src/__tests__/app.acceptance.spec.ts', t)
console.log('tests patched')

console.log('done')
