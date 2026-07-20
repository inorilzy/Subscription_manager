import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { nextTick } from 'vue'
import App from '../App.vue'
import router from '../router'
import { resetDatabaseForTests } from '../database/client'

async function mountApp(): Promise<VueWrapper> {
  await router.push('/')
  await router.isReady()

  const wrapper = mount(App, {
    global: {
      plugins: [createPinia(), router],
    },
    attachTo: document.body,
  })

  await flushPromises()
  await nextTick()
  return wrapper
}

async function openDestination(wrapper: VueWrapper, testId: string, path: string) {
  expect(wrapper.find(`[data-testid="${testId}"]`).exists()).toBe(true)
  await router.push(path)
  await flushPromises()
  await nextTick()
}

describe('installable local-first app', () => {
  beforeEach(async () => {
    await resetDatabaseForTests()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('starts from a migrated empty database and navigates four destinations', async () => {
    const wrapper = await mountApp()

    expect(wrapper.find('[data-testid="app-ready"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('No subscriptions yet')
    expect(wrapper.text()).toContain('Overview')
    expect(wrapper.find('[data-testid="nav-overview"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-subscriptions"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-stats"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="nav-settings"]').exists()).toBe(true)

    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
    expect(router.currentRoute.value.name).toBe('subscriptions')
    expect(wrapper.text()).toContain('No subscriptions yet')
    expect(wrapper.text()).toContain('Track your first subscription')

    await openDestination(wrapper, 'nav-stats', '/stats')
    expect(router.currentRoute.value.name).toBe('stats')
    expect(wrapper.text()).toContain('Scheduled this month')
    expect(wrapper.text()).toContain('$0.00')

    await openDestination(wrapper, 'nav-settings', '/settings')
    expect(router.currentRoute.value.name).toBe('settings')
    expect(wrapper.text()).toContain('USD')
    expect(wrapper.text()).toContain('English')
    expect(wrapper.text()).not.toContain('WebDAV')
    expect(wrapper.text()).not.toContain('SubScout Pro')
    expect(wrapper.text()).not.toContain('Log Out')
  })
})
