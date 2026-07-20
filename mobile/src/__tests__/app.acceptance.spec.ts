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

async function openCreateFrom(wrapper: VueWrapper, source: 'overview' | 'subscriptions') {
  if (source === 'subscriptions') {
    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
  } else {
    await openDestination(wrapper, 'nav-overview', '/')
  }

  expect(wrapper.find('[data-testid="add-subscription"]').exists()).toBe(true)
  await router.push({ name: 'subscription-create' })
  await flushPromises()
  await nextTick()
  expect(router.currentRoute.value.name).toBe('subscription-create')
  expect(wrapper.find('[data-testid="subscription-form"]').exists()).toBe(true)
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

describe('first monthly subscription', () => {
  beforeEach(async () => {
    await resetDatabaseForTests()
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  async function fillAndSubmitSubscription(
    wrapper: VueWrapper,
    values: {
      name: string
      amount: string
      nextBillingDate: string
      category?: string
      planName?: string
      paymentMethodLabel?: string
    },
  ) {
    await wrapper.get('[data-testid="subscription-name"]').setValue(values.name)
    await wrapper.get('[data-testid="subscription-amount"]').setValue(values.amount)
    await wrapper
      .get('[data-testid="subscription-next-billing-date"]')
      .setValue(values.nextBillingDate)

    if (values.category) {
      await wrapper.get('[data-testid="subscription-category"]').setValue(values.category)
    }
    if (values.planName) {
      await wrapper.get('[data-testid="subscription-plan-name"]').setValue(values.planName)
    }
    if (values.paymentMethodLabel) {
      await wrapper
        .get('[data-testid="subscription-payment-method"]')
        .setValue(values.paymentMethodLabel)
    }

    await wrapper.get('[data-testid="subscription-form"]').trigger('submit')
    await flushPromises()
    await nextTick()
    await flushPromises()
  }

  it('creates a monthly subscription visible in list, details, overview and after reinit', async () => {
    let wrapper = await mountApp()

    await openCreateFrom(wrapper, 'overview')

    await fillAndSubmitSubscription(wrapper, {
      name: 'Netflix',
      amount: '15.99',
      nextBillingDate: '2030-06-15',
      category: 'Entertainment',
      planName: 'Standard',
      paymentMethodLabel: 'Visa ending 4242',
    })

    expect(router.currentRoute.value.name).toBe('subscriptions')
    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toContain('$15.99')
    expect(wrapper.text()).toContain('Monthly')
    expect(wrapper.text()).toContain('Entertainment')
    expect(wrapper.text()).toContain('2030-06-15')

    const id = wrapper.get('[data-testid="subscription-item"]').attributes('data-id')
    expect(id).toBeTruthy()
    await router.push({ name: 'subscription-detail', params: { id: String(id) } })
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.name).toBe('subscription-detail')
    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toContain('$15.99')
    expect(wrapper.text()).toContain('Monthly')
    expect(wrapper.text()).toContain('Entertainment')
    expect(wrapper.text()).toContain('2030-06-15')
    expect(wrapper.text()).toContain('Standard')
    expect(wrapper.text()).toContain('Visa ending 4242')
    expect(wrapper.text()).toMatch(/day/i)

    await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).toContain('1')
    expect(wrapper.text()).toContain('$15.99')
    expect(wrapper.text()).toContain('Netflix')

    const { reinitializeDatabaseKeepingDataForTests } = await import('../database/client')
    await reinitializeDatabaseKeepingDataForTests()

    wrapper.unmount()
    document.body.innerHTML = ''
    wrapper = await mountApp()

    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toContain('$15.99')

    await openDestination(wrapper, 'nav-overview', '/')
    expect(wrapper.text()).toContain('Netflix')
    expect(wrapper.text()).toContain('$15.99')
  })

  it('rejects invalid amounts without creating a subscription', async () => {
    const wrapper = await mountApp()

    await openCreateFrom(wrapper, 'subscriptions')

    await fillAndSubmitSubscription(wrapper, {
      name: 'Bad Sub',
      amount: '0',
      nextBillingDate: '2030-08-01',
    })

    expect(router.currentRoute.value.name).toBe('subscription-create')
    expect(wrapper.text()).toMatch(/amount/i)

    await router.push({ name: 'subscriptions' })
    await flushPromises()
    await nextTick()

    expect(router.currentRoute.value.name).toBe('subscriptions')
    expect(wrapper.text()).toContain('No subscriptions yet')
    expect(wrapper.text()).not.toContain('Bad Sub')
  })

  it('uses Other category when none is selected', async () => {
    const wrapper = await mountApp()

    await openCreateFrom(wrapper, 'overview')

    await fillAndSubmitSubscription(wrapper, {
      name: 'Mystery Box',
      amount: '4.50',
      nextBillingDate: '2030-09-10',
    })

    expect(wrapper.text()).toContain('Mystery Box')
    expect(wrapper.text()).toContain('Other')
  })
})
