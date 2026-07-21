export const SUBSCRIPTION_ICON_KEYS = [
  'auto',
  'chatgpt',
  'grok',
  'claude',
  'gemini',
  'deepseek',
  'qwen',
  'doubao',
  'kimi',
  'yuanbao',
  'perplexity',
  'copilot',
  'midjourney',
  'netflix',
  'spotify',
  'youtube',
  'notion',
  'github',
] as const

export type SubscriptionIconKey = (typeof SUBSCRIPTION_ICON_KEYS)[number]

export interface SubscriptionIconOption {
  key: SubscriptionIconKey
  label: string
}

export const FEATURED_SUBSCRIPTION_ICONS: readonly SubscriptionIconOption[] = [
  { key: 'chatgpt', label: 'ChatGPT' },
  { key: 'grok', label: 'Grok' },
  { key: 'claude', label: 'Claude' },
]

export const OPTIONAL_SUBSCRIPTION_ICONS: readonly SubscriptionIconOption[] = [
  { key: 'gemini', label: 'Gemini' },
  { key: 'deepseek', label: 'DeepSeek' },
  { key: 'qwen', label: 'Qwen' },
  { key: 'doubao', label: '豆包' },
  { key: 'kimi', label: 'Kimi' },
  { key: 'yuanbao', label: '元宝' },
  { key: 'perplexity', label: 'Perplexity' },
  { key: 'copilot', label: 'Copilot' },
  { key: 'midjourney', label: 'Midjourney' },
  { key: 'netflix', label: 'Netflix' },
  { key: 'spotify', label: 'Spotify' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'notion', label: 'Notion' },
  { key: 'github', label: 'GitHub' },
]

const ICON_KEY_SET = new Set<string>(SUBSCRIPTION_ICON_KEYS)

export function isSubscriptionIconKey(value: unknown): value is SubscriptionIconKey {
  return typeof value === 'string' && ICON_KEY_SET.has(value)
}

export function normalizeSubscriptionIconKey(value: unknown): SubscriptionIconKey {
  return isSubscriptionIconKey(value) ? value : 'auto'
}

export function inferSubscriptionIconKey(name: string): SubscriptionIconKey {
  const value = name.trim().toLowerCase()
  if (/chat\s?gpt|openai|\bgpt(?:\b|-)/i.test(value)) return 'chatgpt'
  if (/\bgrok\b|\bxai\b|x\.ai/i.test(value)) return 'grok'
  if (/\bclaude\b|anthropic/i.test(value)) return 'claude'
  if (/\bgemini\b|google ai/i.test(value)) return 'gemini'
  if (/deep\s?seek|深度求索/i.test(value)) return 'deepseek'
  if (/\bqwen\b|通义|千问/i.test(value)) return 'qwen'
  if (/doubao|豆包/i.test(value)) return 'doubao'
  if (/\bkimi\b|moonshot|月之暗面/i.test(value)) return 'kimi'
  if (/yuanbao|元宝|tencent ai/i.test(value)) return 'yuanbao'
  if (/perplexity/i.test(value)) return 'perplexity'
  if (/copilot/i.test(value)) return 'copilot'
  if (/midjourney/i.test(value)) return 'midjourney'
  if (/netflix|奈飞/i.test(value)) return 'netflix'
  if (/spotify/i.test(value)) return 'spotify'
  if (/youtube|油管/i.test(value)) return 'youtube'
  if (/notion/i.test(value)) return 'notion'
  if (/github/i.test(value)) return 'github'
  return 'auto'
}
