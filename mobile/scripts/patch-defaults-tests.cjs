const fs = require('fs')
const path = 'src/__tests__/app.acceptance.spec.ts'
let c = fs.readFileSync(path, 'utf8')

const reps = [
  ["toContain('$15.99')", 'toMatch(/15\\.99/)'],
  ["toContain('$18.99')", 'toMatch(/18\\.99/)'],
  ["toContain('$0.00')", 'toMatch(/0\\.00/)'],
  ["toContain('$10.00')", 'toMatch(/10\\.00/)'],
  ["toContain('No subscriptions yet')", "toContain('还没有订阅')"],
]

for (const [a, b] of reps) c = c.split(a).join(b)

// Theme/language test now starts from zh-CN/CNY defaults and switches to en/USD.
c = c.replace(
  `await wrapper.get('[data-testid="settings-language"]').setValue('zh-CN')
    await flushPromises()
    await nextTick()
    expect(wrapper.text()).toContain('设置')
    expect(wrapper.text()).toContain('外观')

    await wrapper.get('[data-testid="settings-theme"]').setValue('dark')
    await flushPromises()
    await nextTick()
    expect(document.documentElement.dataset.theme).toBe('dark')

    await wrapper.get('[data-testid="settings-currency"]').setValue('CNY')
    await flushPromises()
    await nextTick()
    expect(wrapper.find('[data-testid="currency-warning"]').exists()).toBe(true)
    await wrapper.get('[data-testid="currency-warning-cancel"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.find('[data-testid="currency-warning"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'USD')

    await wrapper.get('[data-testid="settings-currency"]').setValue('CNY')
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="currency-warning-confirm"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'CNY')

    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
    expect(wrapper.text()).toContain('订阅')
    expect(wrapper.text()).toContain('Netflix')

    await reinitializeDatabaseKeepingDataForTests()
    wrapper.unmount()
    document.body.innerHTML = ''
    wrapper = await mountApp()

    await openDestination(wrapper, 'nav-settings', '/settings')
    expect(wrapper.get('[data-testid="settings-language"]').element).toHaveProperty('value', 'zh-CN')
    expect(wrapper.get('[data-testid="settings-theme"]').element).toHaveProperty('value', 'dark')
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'CNY')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(wrapper.text()).toContain('设置')`,
  `await wrapper.get('[data-testid="settings-language"]').setValue('en')
    await flushPromises()
    await nextTick()
    expect(wrapper.text()).toContain('Settings')
    expect(wrapper.text()).toContain('Appearance')

    await wrapper.get('[data-testid="settings-theme"]').setValue('dark')
    await flushPromises()
    await nextTick()
    expect(document.documentElement.dataset.theme).toBe('dark')

    await wrapper.get('[data-testid="settings-currency"]').setValue('USD')
    await flushPromises()
    await nextTick()
    expect(wrapper.find('[data-testid="currency-warning"]').exists()).toBe(true)
    await wrapper.get('[data-testid="currency-warning-cancel"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.find('[data-testid="currency-warning"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'CNY')

    await wrapper.get('[data-testid="settings-currency"]').setValue('USD')
    await flushPromises()
    await nextTick()
    await wrapper.get('[data-testid="currency-warning-confirm"]').trigger('click')
    await flushPromises()
    await nextTick()
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'USD')

    await openDestination(wrapper, 'nav-subscriptions', '/subscriptions')
    expect(wrapper.text()).toContain('Subscriptions')
    expect(wrapper.text()).toContain('Netflix')

    await reinitializeDatabaseKeepingDataForTests()
    wrapper.unmount()
    document.body.innerHTML = ''
    wrapper = await mountApp()

    await openDestination(wrapper, 'nav-settings', '/settings')
    expect(wrapper.get('[data-testid="settings-language"]').element).toHaveProperty('value', 'en')
    expect(wrapper.get('[data-testid="settings-theme"]').element).toHaveProperty('value', 'dark')
    expect(wrapper.get('[data-testid="settings-currency"]').element).toHaveProperty('value', 'USD')
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(wrapper.text()).toContain('Settings')`,
)

fs.writeFileSync(path, c)
console.log('updated')
