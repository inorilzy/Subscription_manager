import { describe, expect, it } from 'vitest'
import { DEFAULT_EXCHANGE_RATES } from '../domain/exchange'
import {
  buildCategoryDonut,
  listCategoryDonutScopes,
  resolveDefaultCategoryDonutScope,
  type CategoryAmountGroup,
} from '../domain/stats'

const groups: CategoryAmountGroup[] = [
  {
    currency: 'CNY',
    categories: [
      { category: 'AI', amountMinor: 4000 },
      { category: 'Tools', amountMinor: 1000 },
    ],
  },
  {
    currency: 'USD',
    categories: [{ category: 'Default', amountMinor: 1599 }],
  },
  {
    currency: 'JPY',
    categories: [{ category: 'Default', amountMinor: 980 }],
  },
]

describe('category donut domain', () => {
  it('lists native currency scopes and can offer combined CNY when rates exist', () => {
    expect(listCategoryDonutScopes(groups)).toEqual(['CNY', 'JPY', 'USD'])
    expect(resolveDefaultCategoryDonutScope(groups, DEFAULT_EXCHANGE_RATES)).toBe('cny')
    expect(resolveDefaultCategoryDonutScope(groups, { CNY: 1 })).toBe('CNY')
  })

  it('builds a combined CNY donut with merged categories and ranked chart tokens', () => {
    // CNY AI 40.00 + Tools 10.00 + USD 15.99*7.2 + JPY 980*0.048
    // = 4000 + 1000 + 11512.8~11513 + 4704 = 21217 fen? check via convert
    const model = buildCategoryDonut(groups, {
      scope: 'cny',
      rates: DEFAULT_EXCHANGE_RATES,
    })
    expect(model.scope).toBe('cny')
    expect(model.displayCurrency).toBe('CNY')
    expect(model.missingRates).toEqual([])
    expect(model.totalMinor).toBe(
      4000 + 1000 + Math.round(15.99 * 7.2 * 100) + Math.round(980 * 0.048 * 100),
    )
    expect(model.slices[0]?.category).toBe('Default')
    expect(model.slices.map((s) => s.colorToken)).toEqual(['chart-1', 'chart-2', 'chart-3'])
    const percentSum = model.slices.reduce((sum, s) => sum + s.percent, 0)
    expect(percentSum).toBeCloseTo(100, 5)
  })

  it('keeps a single native currency scope without conversion', () => {
    const model = buildCategoryDonut(groups, {
      scope: 'USD',
      rates: DEFAULT_EXCHANGE_RATES,
    })
    expect(model.scope).toBe('USD')
    expect(model.displayCurrency).toBe('USD')
    expect(model.totalMinor).toBe(1599)
    expect(model.slices).toEqual([
      {
        category: 'Default',
        amountMinor: 1599,
        percent: 100,
        colorToken: 'chart-1',
      },
    ])
  })

  it('folds beyond five categories into Other and reports missing rates for combined mode', () => {
    const many: CategoryAmountGroup[] = [
      {
        currency: 'CNY',
        categories: [
          { category: 'A', amountMinor: 6000 },
          { category: 'B', amountMinor: 5000 },
          { category: 'C', amountMinor: 4000 },
          { category: 'D', amountMinor: 3000 },
          { category: 'E', amountMinor: 2000 },
          { category: 'F', amountMinor: 1000 },
          { category: 'G', amountMinor: 500 },
        ],
      },
    ]
    const model = buildCategoryDonut(many, {
      scope: 'CNY',
      rates: DEFAULT_EXCHANGE_RATES,
      otherLabel: '其他',
    })
    expect(model.slices).toHaveLength(6)
    expect(model.slices[5]).toMatchObject({
      category: '其他',
      amountMinor: 1500,
      colorToken: 'chart-other',
    })

    const missing = buildCategoryDonut(
      [{ currency: 'EUR', categories: [{ category: 'Default', amountMinor: 999 }] }],
      { scope: 'cny', rates: { CNY: 1 } },
    )
    expect(missing.missingRates).toEqual(['EUR'])
    expect(missing.totalMinor).toBe(0)
    expect(missing.slices).toEqual([])
  })
})
