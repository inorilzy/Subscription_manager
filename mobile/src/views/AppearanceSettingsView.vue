<script setup lang="ts">
import { Check, MoonStar, Palette, SunMedium } from '@lucide/vue'
import { useRouter } from 'vue-router'
import PageTopBar from '../components/PageTopBar.vue'
import type { ThemeMode } from '../i18n/messages'
import { usePreferencesStore } from '../stores/preferences'
import { THEME_PRESET_META, type ThemePreset } from '../theme/presets'

const router = useRouter()
const preferences = usePreferencesStore()

async function goBack() {
  if (router.options.history.state.back) {
    router.back()
    return
  }
  await router.push({ name: 'settings' })
}

async function onThemeModeChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as ThemeMode
  await preferences.setTheme(value)
}

async function onSelectPreset(preset: ThemePreset) {
  await preferences.setThemePreset(preset)
}

function presetName(preset: (typeof THEME_PRESET_META)[number]): string {
  return preferences.language === 'zh-CN' ? preset.nameZh : preset.nameEn
}
</script>

<template>
  <section class="focused-page">
    <PageTopBar
      :title="preferences.language === 'zh-CN' ? '外观与主题' : 'Appearance'"
      back
      :back-label="preferences.t('detail.back')"
      back-test-id="appearance-back"
      @back="goBack"
    />

    <div class="page-content page-content-form space-y-5">
      <h1 class="sr-only">
        {{ preferences.language === 'zh-CN' ? '外观与主题' : 'Appearance' }}
      </h1>

      <section class="space-y-3" aria-labelledby="appearance-presets-heading">
        <h2 id="appearance-presets-heading" class="section-label">
          {{ preferences.language === 'zh-CN' ? '主题预设' : 'Theme presets' }}
        </h2>

        <div class="grid grid-cols-2 gap-3" data-testid="theme-preset-grid">
          <button
            v-for="preset in THEME_PRESET_META"
            :key="preset.id"
            type="button"
            class="tactile-card pressable min-h-28 space-y-3 p-3 text-left"
            :class="
              preferences.themePreset === preset.id ? 'border-primary bg-primary-container/15' : ''
            "
            :data-testid="`theme-preset-${preset.id}`"
            :aria-pressed="preferences.themePreset === preset.id"
            @click="onSelectPreset(preset.id)"
          >
            <div class="flex items-start justify-between gap-2">
              <span class="inline-flex items-center gap-1.5">
                <span
                  v-for="(swatch, index) in preset.swatches"
                  :key="`${preset.id}-${index}`"
                  class="size-4 rounded-full border border-black/10"
                  :style="{ backgroundColor: swatch }"
                  aria-hidden="true"
                />
              </span>
              <span
                v-if="preferences.themePreset === preset.id"
                class="inline-flex size-7 items-center justify-center rounded-full bg-primary text-on-primary"
                aria-hidden="true"
              >
                <Check :size="16" :stroke-width="2.8" />
              </span>
            </div>
            <span class="block font-headline text-sm font-extrabold text-on-surface">
              {{ presetName(preset) }}
            </span>
            <span
              v-if="preferences.themePreset === preset.id"
              class="block text-xs font-bold text-primary"
            >
              {{ preferences.language === 'zh-CN' ? '使用中' : 'Selected' }}
            </span>
          </button>
        </div>
      </section>

      <section class="space-y-3" aria-labelledby="appearance-mode-heading">
        <h2 id="appearance-mode-heading" class="section-label">
          {{ preferences.language === 'zh-CN' ? '显示模式' : 'Display mode' }}
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
              {{ preferences.language === 'zh-CN' ? '明暗模式' : 'Light / Dark' }}
            </label>
            <select
              id="settings-theme"
              data-testid="settings-theme"
              class="settings-row-control h-11 w-[7.25rem] max-w-[42%] rounded-xl border-2 border-outline-variant bg-surface-container-low px-2 text-sm font-bold text-on-surface"
              :value="preferences.theme"
              @change="onThemeModeChange"
            >
              <option value="system">{{ preferences.t('settings.system') }}</option>
              <option value="light">{{ preferences.t('settings.light') }}</option>
              <option value="dark">{{ preferences.t('settings.dark') }}</option>
            </select>
          </div>

          <div class="settings-row min-w-0 gap-3 text-sm text-on-surface-variant">
            <span class="icon-house icon-house-secondary" aria-hidden="true">
              <component
                :is="preferences.resolvedTheme === 'dark' ? MoonStar : SunMedium"
                :size="22"
                :stroke-width="2.4"
              />
            </span>
            <p class="min-w-0 flex-1 leading-5">
              {{
                preferences.language === 'zh-CN'
                  ? `当前解析为${preferences.resolvedTheme === 'dark' ? '深色' : '浅色'}。主题色与明暗模式可独立选择。`
                  : `Currently resolved to ${preferences.resolvedTheme}. Theme colors and light/dark mode are independent.`
              }}
            </p>
          </div>
        </div>
      </section>
    </div>
  </section>
</template>
