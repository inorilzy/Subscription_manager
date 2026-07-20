<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getPreference } from '../database/client'

const currency = ref('USD')
const language = ref('en')
const theme = ref('light')
const loaded = ref(false)

onMounted(async () => {
  currency.value = await getPreference('currency', 'USD')
  language.value = await getPreference('language', 'en')
  theme.value = await getPreference('theme', 'light')
  loaded.value = true
})
</script>

<template>
  <section class="space-y-4">
    <header>
      <h1 class="font-headline text-3xl font-extrabold text-primary">Settings</h1>
    </header>

    <div v-if="loaded" class="tactile-card overflow-hidden">
      <div class="border-b-2 border-surface-container-highest p-4">
        <p class="font-bold text-on-surface">Appearance</p>
        <p class="text-on-surface-variant capitalize">{{ theme }}</p>
      </div>
      <div class="border-b-2 border-surface-container-highest p-4">
        <p class="font-bold text-on-surface">Currency</p>
        <p class="text-on-surface-variant">{{ currency === 'USD' ? 'USD ($)' : currency }}</p>
      </div>
      <div class="p-4">
        <p class="font-bold text-on-surface">Language</p>
        <p class="text-on-surface-variant">{{ language === 'en' ? 'English' : language }}</p>
      </div>
    </div>

    <p class="text-sm text-on-surface-variant">
      Local preferences only. Cloud accounts and paid upgrades are not part of this MVP.
    </p>
  </section>
</template>
