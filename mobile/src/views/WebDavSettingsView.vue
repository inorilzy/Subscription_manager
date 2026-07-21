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
import PageTopBar from '../components/PageTopBar.vue'
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
      :title="preferences.t('settings.webdav')"
      back
      :back-label="preferences.t('detail.back')"
      back-test-id="webdav-back"
      @back="goBack"
    />

    <div class="page-content page-content-form">
      <h1 class="sr-only">{{ preferences.t('settings.webdav') }}</h1>

      <div
        class="tactile-card tactile-card-focus space-y-5 p-5 sm:p-6"
        data-testid="settings-webdav"
      >
        <p id="webdav-hint" class="body-large text-on-surface-variant">
          {{ preferences.t('settings.webdavHint') }}
        </p>

        <div class="space-y-2">
          <label class="field-label" for="webdav-url">
            {{ preferences.t('settings.webdavUrl') }}
          </label>
          <input
            id="webdav-url"
            v-model="webdav.url"
            data-testid="webdav-url"
            type="url"
            autocomplete="off"
            class="field-recessed"
            aria-describedby="webdav-hint"
            placeholder="https://dav.example.com/remote.php/dav/files/user"
          />
        </div>

        <div class="space-y-2">
          <label class="field-label" for="webdav-username">
            {{ preferences.t('settings.webdavUsername') }}
          </label>
          <input
            id="webdav-username"
            v-model="webdav.username"
            data-testid="webdav-username"
            type="text"
            autocomplete="username"
            class="field-recessed"
          />
        </div>

        <div class="space-y-2">
          <label class="field-label" for="webdav-password">
            {{ preferences.t('settings.webdavPassword') }}
          </label>
          <input
            id="webdav-password"
            v-model="webdav.password"
            data-testid="webdav-password"
            type="password"
            autocomplete="current-password"
            class="field-recessed"
          />
        </div>

        <div class="space-y-2">
          <label class="field-label" for="webdav-path">
            {{ preferences.t('settings.webdavPath') }}
          </label>
          <input
            id="webdav-path"
            v-model="webdav.remotePath"
            data-testid="webdav-path"
            type="text"
            autocomplete="off"
            class="field-recessed"
            placeholder="/subscout/backup.json"
          />
        </div>

        <label
          class="field-label flex min-h-20 items-center justify-between gap-4 rounded-2xl border-2 border-outline-variant bg-surface-container-low p-4"
          for="webdav-enabled"
        >
          <span class="text-on-surface">{{ preferences.t('settings.webdavEnabled') }}</span>
          <span class="relative inline-flex h-8 w-14 shrink-0">
            <input
              id="webdav-enabled"
              v-model="webdav.enabled"
              data-testid="webdav-enabled"
              type="checkbox"
              role="switch"
              class="field-recessed peer sr-only min-h-0"
            />
            <span
              class="pointer-events-none absolute inset-0 rounded-full border-2 border-b-4 border-outline-variant bg-surface-container-lowest transition-colors peer-checked:border-primary peer-checked:bg-primary-container peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-focus-visible:ring-offset-2"
              aria-hidden="true"
            ></span>
            <span
              class="pointer-events-none absolute top-1 left-1 size-5 rounded-full transition-all"
              :class="webdav.enabled ? 'translate-x-6 bg-on-primary-container' : 'translate-x-0 bg-outline'"
              aria-hidden="true"
            ></span>
          </span>
        </label>

        <div class="space-y-3 pt-1">
          <div class="grid grid-cols-3 gap-3">
            <button
              type="button"
              class="tactile-btn col-span-2 min-w-0 px-4 py-3"
              data-testid="webdav-save"
              :disabled="webdavBusy"
              @click="onSaveWebDav"
            >
              {{ preferences.t('settings.webdavSave') }}
            </button>
            <button
              type="button"
              class="tactile-btn-secondary min-w-0 px-3 py-3"
              data-testid="webdav-test"
              :disabled="webdavBusy"
              @click="onTestWebDav"
            >
              {{ preferences.t('settings.webdavTest') }}
            </button>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              class="tactile-btn-secondary min-w-0 px-3 py-3"
              data-testid="webdav-upload"
              :disabled="webdavBusy"
              @click="onUploadWebDav"
            >
              {{ preferences.t('settings.webdavUpload') }}
            </button>
            <button
              type="button"
              class="tactile-btn-secondary min-w-0 px-3 py-3"
              data-testid="webdav-download"
              :disabled="webdavBusy"
              @click="onDownloadWebDavClick"
            >
              {{ preferences.t('settings.webdavDownload') }}
            </button>
          </div>
        </div>

        <p
          v-if="webdavMessage"
          class="rounded-xl border-2 border-outline-variant bg-surface-container-low px-4 py-3 text-sm text-on-surface"
          data-testid="webdav-message"
          role="status"
        >
          {{ webdavMessage }}
        </p>
      </div>

      <div
        v-if="showWebDavRestoreConfirm"
        class="tactile-card tactile-card-focus space-y-4 border-error/40 p-5 sm:p-6"
        role="dialog"
        aria-labelledby="webdav-restore-title"
        data-testid="webdav-restore-confirm"
      >
        <h2 id="webdav-restore-title" class="font-headline text-xl font-bold">
          {{ preferences.language === 'zh-CN' ? '从 WebDAV 恢复？' : 'Restore from WebDAV?' }}
        </h2>
        <p class="text-on-surface-variant">{{ preferences.t('settings.webdavDownloadConfirm') }}</p>
        <div class="grid grid-cols-3 gap-3">
          <button
            type="button"
            class="tactile-btn-secondary min-w-0 px-3 py-3"
            data-testid="webdav-restore-cancel"
            @click="cancelWebDavRestore"
          >
            {{ preferences.t('settings.currencyCancel') }}
          </button>
          <button
            type="button"
            class="tactile-btn col-span-2 min-w-0 px-4 py-3"
            data-testid="webdav-restore-yes"
            :disabled="webdavBusy"
            @click="confirmWebDavRestore"
          >
            {{ preferences.language === 'zh-CN' ? '确认恢复' : 'Restore' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
