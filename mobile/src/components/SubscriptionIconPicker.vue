<script setup lang="ts">
import { ChevronDown } from '@lucide/vue'
import { ref, watch } from 'vue'
import {
  FEATURED_SUBSCRIPTION_ICONS,
  OPTIONAL_SUBSCRIPTION_ICONS,
  type SubscriptionIconKey,
} from '../domain/subscription-icons'
import { usePreferencesStore } from '../stores/preferences'
import SubscriptionIcon from './SubscriptionIcon.vue'

const props = withDefaults(
  defineProps<{
    modelValue: SubscriptionIconKey
    name?: string
    category?: string
  }>(),
  { name: '', category: 'Default' },
)

const emit = defineEmits<{
  'update:modelValue': [value: SubscriptionIconKey]
}>()

const preferences = usePreferencesStore()
const showMore = ref(OPTIONAL_SUBSCRIPTION_ICONS.some(({ key }) => key === props.modelValue))

watch(
  () => props.modelValue,
  (value) => {
    if (OPTIONAL_SUBSCRIPTION_ICONS.some(({ key }) => key === value)) {
      showMore.value = true
    }
  },
)

function select(key: SubscriptionIconKey) {
  emit('update:modelValue', key)
}
</script>

<template>
  <fieldset class="space-y-3">
    <legend class="label-text mb-1">{{ preferences.t('create.icon') }}</legend>
    <p class="text-xs leading-5 text-on-surface-variant">
      {{ preferences.t('create.iconHint') }}
    </p>

    <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <label
        class="flex min-w-0 cursor-pointer items-center gap-2 rounded-2xl border-2 px-3 py-2.5 transition active:translate-y-0.5"
        :class="
          modelValue === 'auto'
            ? 'border-primary bg-primary/10'
            : 'border-outline-variant bg-surface-container-lowest'
        "
      >
        <input
          :checked="modelValue === 'auto'"
          class="sr-only"
          type="radio"
          name="subscription-icon"
          value="auto"
          data-testid="subscription-icon-auto"
          @change="select('auto')"
        />
        <SubscriptionIcon :category="category" :name="name" icon-key="auto" />
        <span class="truncate text-xs font-extrabold">{{ preferences.t('create.iconAuto') }}</span>
      </label>

      <label
        v-for="option in FEATURED_SUBSCRIPTION_ICONS"
        :key="option.key"
        class="flex min-w-0 cursor-pointer items-center gap-2 rounded-2xl border-2 px-3 py-2.5 transition active:translate-y-0.5"
        :class="
          modelValue === option.key
            ? 'border-primary bg-primary/10'
            : 'border-outline-variant bg-surface-container-lowest'
        "
      >
        <input
          :checked="modelValue === option.key"
          class="sr-only"
          type="radio"
          name="subscription-icon"
          :value="option.key"
          :data-testid="`subscription-icon-${option.key}`"
          @change="select(option.key)"
        />
        <SubscriptionIcon :category="category" :name="name" :icon-key="option.key" />
        <span class="truncate text-xs font-extrabold">{{ option.label }}</span>
      </label>
    </div>

    <button
      type="button"
      class="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-extrabold text-primary"
      data-testid="subscription-icons-more"
      :aria-expanded="showMore"
      @click="showMore = !showMore"
    >
      {{ preferences.t('create.iconMore') }}
      <ChevronDown
        :size="18"
        :class="{ 'rotate-180': showMore }"
        class="transition-transform"
        aria-hidden="true"
      />
    </button>

    <div
      v-if="showMore"
      class="grid grid-cols-2 gap-2 sm:grid-cols-3"
      data-testid="subscription-icon-options"
    >
      <label
        v-for="option in OPTIONAL_SUBSCRIPTION_ICONS"
        :key="option.key"
        class="flex min-w-0 cursor-pointer items-center gap-2 rounded-2xl border-2 px-3 py-2.5 transition active:translate-y-0.5"
        :class="
          modelValue === option.key
            ? 'border-primary bg-primary/10'
            : 'border-outline-variant bg-surface-container-lowest'
        "
      >
        <input
          :checked="modelValue === option.key"
          class="sr-only"
          type="radio"
          name="subscription-icon"
          :value="option.key"
          :data-testid="`subscription-icon-${option.key}`"
          @change="select(option.key)"
        />
        <SubscriptionIcon :category="category" :name="name" :icon-key="option.key" />
        <span class="truncate text-xs font-extrabold">{{ option.label }}</span>
      </label>
    </div>
  </fieldset>
</template>
