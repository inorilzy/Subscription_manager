<script setup lang="ts">
import {
  Atom,
  Blocks,
  BookOpen,
  Bot,
  Boxes,
  BriefcaseBusiness,
  Clapperboard,
  Coins,
  Code2,
  Dumbbell,
  Gem,
  Headphones,
  MessageCircle,
  Moon,
  Play,
  Sailboat,
  Search,
  Sparkles,
  Waves,
  Zap,
} from '@lucide/vue'
import { computed } from 'vue'
import {
  inferSubscriptionIconKey,
  normalizeSubscriptionIconKey,
  type SubscriptionIconKey,
} from '../domain/subscription-icons'

const props = withDefaults(
  defineProps<{
    category: string
    name?: string
    iconKey?: SubscriptionIconKey | string | null
    large?: boolean
  }>(),
  { name: '', iconKey: 'auto', large: false },
)

const categoryKey = computed(() => props.category.trim().toLowerCase())
const resolvedIconKey = computed<SubscriptionIconKey>(() => {
  const selected = normalizeSubscriptionIconKey(props.iconKey)
  return selected === 'auto' ? inferSubscriptionIconKey(props.name) : selected
})

const serviceVisual = computed(() => {
  switch (resolvedIconKey.value) {
    case 'chatgpt':
      return { icon: Bot, color: '#10a37f' }
    case 'grok':
      return { icon: Atom, color: '#687078' }
    case 'claude':
      return { icon: Sparkles, color: '#d97757' }
    case 'gemini':
      return { icon: Gem, color: '#4285f4' }
    case 'deepseek':
      return { icon: Waves, color: '#4d6bfe' }
    case 'qwen':
      return { icon: MessageCircle, color: '#615ced' }
    case 'doubao':
      return { icon: MessageCircle, color: '#3b82f6' }
    case 'kimi':
      return { icon: Moon, color: '#7c3aed' }
    case 'yuanbao':
      return { icon: Coins, color: '#f59e0b' }
    case 'perplexity':
      return { icon: Search, color: '#20808d' }
    case 'copilot':
      return { icon: Blocks, color: '#7c3aed' }
    case 'midjourney':
      return { icon: Sailboat, color: '#6366f1' }
    case 'netflix':
      return { icon: Clapperboard, color: '#e50914' }
    case 'spotify':
      return { icon: Headphones, color: '#1db954' }
    case 'youtube':
      return { icon: Play, color: '#ff0033' }
    case 'notion':
      return { icon: BookOpen, color: '#687078' }
    case 'github':
      return { icon: Code2, color: '#57606a' }
    default:
      return null
  }
})

const icon = computed(() => {
  if (serviceVisual.value) return serviceVisual.value.icon
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
  if (serviceVisual.value) return 'service-icon-house'
  const key = categoryKey.value
  if (
    /entertain|movie|video|stream|影视|娱乐|education|learn|book|study|教育|学习|阅读/.test(key)
  ) {
    return 'icon-house-secondary'
  }
  if (/music|audio|podcast|音乐|音频|utilit|power|energy|phone|internet|工具|水电|通信/.test(key)) {
    return 'icon-house-tertiary'
  }
  if (/product|work|business|office|效率|工作|办公/.test(key)) return 'icon-house-primary'
  return 'icon-house-neutral'
})

const serviceStyle = computed(() =>
  serviceVisual.value
    ? ({ '--service-icon-color': serviceVisual.value.color } as Record<string, string>)
    : undefined,
)
</script>

<template>
  <span
    class="icon-house"
    :class="[tone, { 'icon-house-lg': large }]"
    :style="serviceStyle"
    :data-icon-key="resolvedIconKey"
    data-testid="subscription-icon-rendered"
    aria-hidden="true"
  >
    <component :is="icon" :size="large ? 30 : 26" :stroke-width="2.4" />
  </span>
</template>

<style scoped>
.service-icon-house {
  border-color: var(--service-icon-color);
  background: color-mix(
    in srgb,
    var(--service-icon-color) 16%,
    var(--color-surface-container-lowest)
  );
  color: var(--service-icon-color);
}
</style>
