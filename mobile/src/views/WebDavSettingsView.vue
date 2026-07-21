<script setup lang="ts">
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
