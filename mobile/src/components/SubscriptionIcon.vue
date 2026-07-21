<script setup lang="ts">
import {
  BookOpen,
  Boxes,
  BriefcaseBusiness,
  Clapperboard,
  Dumbbell,
  Headphones,
  Sparkles,
  Zap,
} from '@lucide/vue'
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    category: string
    large?: boolean
  }>(),
  { large: false },
)

const categoryKey = computed(() => props.category.trim().toLowerCase())

const icon = computed(() => {
  const key = categoryKey.value
  if (/entertain|movie|video|stream|影视|娱乐/.test(key)) return Clapperboard
  if (/music|audio|podcast|音乐|音频/.test(key)) return Headphones
  if (/health|fitness|gym|sport|健康|健身|运动/.test(key)) return Dumbbell
  if (/product|work|business|office|效率|工作|办公/.test(key)) return BriefcaseBusiness
  if (/utilit|power|energy|phone|internet|工具|水电|通信/.test(key)) return Zap
  if (/education|learn|book|study|教育|学习|阅读/.test(key)) return BookOpen
  if (/other|其他/.test(key)) return Boxes
  return Sparkles
})

const tone = computed(() => {
  const key = categoryKey.value
  if (/entertain|movie|video|stream|影视|娱乐|education|learn|book|study|教育|学习|阅读/.test(key)) {
    return 'icon-house-secondary'
  }
  if (/music|audio|podcast|音乐|音频|utilit|power|energy|phone|internet|工具|水电|通信/.test(key)) {
    return 'icon-house-tertiary'
  }
  if (/product|work|business|office|效率|工作|办公/.test(key)) return 'icon-house-primary'
  return 'icon-house-neutral'
})
</script>

<template>
  <span class="icon-house" :class="[tone, { 'icon-house-lg': large }]" aria-hidden="true">
    <component :is="icon" :size="large ? 30 : 26" :stroke-width="2.4" />
  </span>
</template>
