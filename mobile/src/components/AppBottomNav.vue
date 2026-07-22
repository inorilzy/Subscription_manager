<script setup lang="ts">
import { Compass, List, Settings as SettingsIcon } from '@lucide/vue'
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePreferencesStore } from '../stores/preferences'

const route = useRoute()
const router = useRouter()
const preferences = usePreferencesStore()

const items = computed(() => [
  {
    name: 'overview',
    label: preferences.t('nav.overview'),
    to: '/',
    testId: 'nav-overview',
    icon: Compass,
  },
  {
    name: 'subscriptions',
    label: preferences.t('nav.subscriptions'),
    to: '/subscriptions',
    testId: 'nav-subscriptions',
    icon: List,
  },
  {
    name: 'settings',
    label: preferences.t('nav.settings'),
    to: '/settings',
    testId: 'nav-settings',
    icon: SettingsIcon,
  },
])

const activeName = computed(() => String(route.name ?? 'overview'))

async function navigate(to: string) {
  await router.push(to)
}
</script>

<template>
  <nav class="nav-shell" :aria-label="preferences.language === 'zh-CN' ? '主导航' : 'Primary'">
    <div class="nav-inner">
      <button
        v-for="item in items"
        :key="item.name"
        type="button"
        :data-testid="item.testId"
        class="nav-item"
        :class="{ 'nav-item-active': activeName === item.name }"
        :aria-current="activeName === item.name ? 'page' : undefined"
        @click="navigate(item.to)"
      >
        <component
          :is="item.icon"
          :size="25"
          :stroke-width="activeName === item.name ? 2.8 : 2.2"
          aria-hidden="true"
        />
        <span>{{ item.label }}</span>
      </button>
    </div>
  </nav>
</template>
