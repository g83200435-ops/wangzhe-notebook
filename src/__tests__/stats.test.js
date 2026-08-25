import { describe, it, expect } from 'vitest'
import {
  totalCount,
  winCount,
  lossCount,
  winRate,
  averageRating,
  heroStats,
  mistakeCategoryStats,
  lossMistakeCategoryStats,
  growthStats,
  sortMatches
} from '../utils/stats.js'

const mk = (overrides = {}) => ({
  id: overrides.id || 'x',
  date: overrides.date || '2025-01-01',
  mode: 'ranked',
  position: 'mid',
  hero: overrides.hero || 'A',
  result: overrides.result || 'win',
  stats: {
    kills: 1,
    deaths: 1,
    assists: 1,
    rating: Object.prototype.hasOwnProperty.call(overrides, 'rating') ? overrides.rating : 8,
    duration: null
  },
  teams: { allies: {}, enemies: {} },
  review: { good: '', improve: '', mistakes: overrides.mistakes || [] },
  createdAt: overrides.createdAt || '2025-01-01T10:00:00.000Z',
  updatedAt: '2025-01-01T10:00:00.000Z'
})

describe('stats', () => {
  it('空数组：所有统计返回默认值', () => {
    expect(totalCount([])).toBe(0)
    expect(winCount([])).toBe(0)
    expect(winRate([])).toBe('0%')
    expect(averageRating([])).toBe('0.0')
  })

  it('胜率只统计明确的胜负结果', () => {
    const list = [
      mk({ result: 'win' }),
      mk({ id: 'y', result: 'loss' }),
      mk({ id: 'z', result: 'win' }),
      mk({ id: 'u', result: 'unknown' })
    ]
    expect(winCount(list)).toBe(2)
    expect(lossCount(list)).toBe(1)
    expect(winRate(list)).toBe('66.7%')
  })

  it('平均评分保留一位小数，忽略非数字', () => {
    const list = [
      mk({ id: 'a', rating: 8 }),
      mk({ id: 'b', rating: 9 }),
      mk({ id: 'c', rating: 10 })
    ]
    expect(averageRating(list)).toBe('9.0')
  })

  it('非法输入不报错', () => {
    expect(totalCount(null)).toBe(0)
    expect(winCount(undefined)).toBe(0)
    expect(winRate('not-array')).toBe('0%')
    expect(averageRating({})).toBe('0.0')
  })
})

describe('growth statistics', () => {
  it('空数据返回稳定的无数据结构', () => {
    expect(growthStats([])).toEqual({
      total: 0,
      wins: 0,
      losses: 0,
      winRate: '0%',
      averageRating: '0.0',
      heroes: [],
      mistakeCategories: [],
      lossMistakeCategories: []
    })
  })

  it('忽略缺失评分，并按英雄使用场次降序', () => {
    const list = [
      mk({ id: 'a', hero: 'A', rating: 8 }),
      mk({ id: 'b', hero: 'A', result: 'loss', rating: null }),
      mk({ id: 'c', hero: 'B', rating: 10 }),
      mk({ id: 'd', hero: 'B', result: 'loss', rating: undefined })
    ]
    expect(heroStats(list)).toEqual([
      { name: 'A', count: 2, wins: 1, losses: 1, winRate: '50.0%', averageRating: '8.0' },
      { name: 'B', count: 2, wins: 1, losses: 1, winRate: '50.0%', averageRating: '10.0' }
    ])
  })

  it('按错误分类统计全部标签和失败对局标签', () => {
    const list = [
      mk({ id: 'a', mistakes: [{ category: 'positioning' }, { category: 'teamfight' }] }),
      mk({ id: 'b', result: 'loss', mistakes: [{ category: 'positioning' }, { category: 'map_awareness' }] }),
      mk({ id: 'c', result: 'loss', mistakes: [{ category: 'positioning' }] })
    ]
    expect(mistakeCategoryStats(list)).toEqual([
      { name: 'positioning', count: 3 },
      { name: 'map_awareness', count: 1 },
      { name: 'teamfight', count: 1 }
    ])
    expect(lossMistakeCategoryStats(list)).toEqual([
      { name: 'positioning', count: 2 },
      { name: 'map_awareness', count: 1 }
    ])
  })

  it('新增、修改、删除对局后均从当前数组重新计算', () => {
    const first = [mk({ id: 'a', hero: 'A' })]
    const added = [...first, mk({ id: 'b', hero: 'B', result: 'loss' })]
    const updated = added.map((m) => (m.id === 'a' ? { ...m, hero: 'C' } : m))
    const removed = updated.filter((m) => m.id !== 'b')

    expect(growthStats(first).heroes.map((h) => h.name)).toEqual(['A'])
    expect(growthStats(added).losses).toBe(1)
    expect(growthStats(updated).heroes.map((h) => h.name)).toEqual(['B', 'C'])
    expect(growthStats(removed).heroes.map((h) => h.name)).toEqual(['C'])
  })
})

describe('sortMatches', () => {
  it('按日期倒序排列', () => {
    const list = [
      mk({ id: 'a', date: '2025-01-01' }),
      mk({ id: 'b', date: '2025-03-05' }),
      mk({ id: 'c', date: '2025-02-01' })
    ]
    const sorted = sortMatches(list)
    expect(sorted.map((m) => m.id)).toEqual(['b', 'c', 'a'])
  })

  it('日期相同时按 createdAt 倒序', () => {
    const list = [
      mk({ id: 'a', date: '2025-01-01', createdAt: '2025-01-01T08:00:00.000Z' }),
      mk({ id: 'b', date: '2025-01-01', createdAt: '2025-01-01T12:00:00.000Z' }),
      mk({ id: 'c', date: '2025-01-01', createdAt: '2025-01-01T10:00:00.000Z' })
    ]
    const sorted = sortMatches(list)
    expect(sorted.map((m) => m.id)).toEqual(['b', 'c', 'a'])
  })

  it('不修改原数组', () => {
    const list = [mk({ id: 'a', date: '2025-01-01' }), mk({ id: 'b', date: '2025-02-01' })]
    const copy = list.slice()
    sortMatches(list)
    expect(list).toEqual(copy)
  })
})
