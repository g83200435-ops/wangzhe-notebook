import { describe, it, expect } from 'vitest'
import { normalizeMistake, normalizeMatch, normalizeMatchWithMeta } from '../services/storage.js'

const ctx = {
  fallbackId: 'legacy-x-0',
  fallbackCreatedAt: '2025-06-01T20:00:00.000Z',
  fallbackUpdatedAt: '2025-06-01T20:00:00.000Z'
}

const goodMistake = {
  id: 'k',
  category: 'positioning',
  moment: '08:35',
  problem: '走位太靠前',
  correction: '注意站位',
  createdAt: '2025-06-01T20:00:00.000Z',
  updatedAt: '2025-06-01T20:00:00.000Z'
}

describe('normalizeMistake', () => {
  it('接受合法错题', () => {
    expect(normalizeMistake(goodMistake, ctx)).toEqual(goodMistake)
  })

  it('分类不在白名单 → null', () => {
    expect(normalizeMistake({ ...goodMistake, category: 'unknown' }, ctx)).toBeNull()
  })

  it('problem/correction 空白 → null', () => {
    expect(normalizeMistake({ ...goodMistake, problem: '   ' }, ctx)).toBeNull()
    expect(normalizeMistake({ ...goodMistake, correction: '' }, ctx)).toBeNull()
  })

  it('moment 空字符串可接受', () => {
    const m = normalizeMistake({ ...goodMistake, moment: '' }, ctx)
    expect(m.moment).toBe('')
  })

  it('拒绝 8:35 / 08:5 / 08:60 / 100:00', () => {
    for (const bad of ['8:35', '08:5', '08:60', '100:00', 'abc', '1:5']) {
      expect(normalizeMistake({ ...goodMistake, moment: bad }, ctx)).toBeNull()
    }
  })

  it('缺 id 时使用 fallbackId（不生成随机 id）', () => {
    const raw = { ...goodMistake }
    delete raw.id
    const m = normalizeMistake(raw, ctx)
    expect(m.id).toBe('legacy-x-0')
  })

  it('缺 createdAt/updatedAt 时使用 fallback', () => {
    const raw = { ...goodMistake }
    delete raw.createdAt
    delete raw.updatedAt
    const m = normalizeMistake(raw, ctx)
    expect(m.createdAt).toBe(ctx.fallbackCreatedAt)
    expect(m.updatedAt).toBe(ctx.fallbackUpdatedAt)
  })

  it('确定性：相同输入两次调用结果完全一致（含 id/时间）', () => {
    const raw = { ...goodMistake }
    delete raw.id
    delete raw.createdAt
    delete raw.updatedAt
    const a = normalizeMistake(raw, ctx)
    const b = normalizeMistake(raw, ctx)
    expect(a).toEqual(b)
  })
})

describe('normalizeMatch review 兼容', () => {
  const baseMatch = {
    id: 'm1',
    date: '2025-06-01',
    mode: 'ranked',
    position: 'mid',
    hero: '不知火舞',
    result: 'win',
    stats: { kills: 8, deaths: 3, assists: 10, rating: 9.2, duration: 25 },
    teams: {
      allies: { clash: '', jungle: '', mid: '不知火舞', farm: '', roam: '' },
      enemies: { clash: '', jungle: '', mid: '', farm: '', roam: '' }
    },
    createdAt: '2025-06-01T20:00:00.000Z',
    updatedAt: '2025-06-01T20:00:00.000Z'
  }

  it('缺 review 时补默认结构', () => {
    const m = normalizeMatch(baseMatch)
    expect(m.review).toEqual({ good: '', improve: '', mistakes: [] })
  })

  it('review.mistakes 中损坏错题被跳过，对局仍保留；mistakesDropped 累计', () => {
    const raw = {
      ...baseMatch,
      review: {
        good: 'g',
        improve: '',
        mistakes: [
          goodMistake,
          { ...goodMistake, id: 'bad1', category: 'nope' },
          { ...goodMistake, id: 'bad2', problem: '   ' },
          { ...goodMistake, id: 'bad3', moment: '08:60' }
        ]
      }
    }
    const { match, mistakesDropped } = normalizeMatchWithMeta(raw)
    expect(match).not.toBeNull()
    expect(match.review.good).toBe('g')
    expect(match.review.mistakes.length).toBe(1)
    expect(match.review.mistakes[0].id).toBe('k')
    expect(mistakesDropped).toBe(3)
  })

  it('旧错题缺 id/时间：使用 legacy-${matchId}-${index} 与父对局时间；两次规范化结果一致', () => {
    const raw = {
      ...baseMatch,
      review: {
        good: '',
        improve: '',
        mistakes: [
          { category: 'positioning', moment: '', problem: 'p1', correction: 'c1' },
          { category: 'teamfight', moment: '01:23', problem: 'p2', correction: 'c2' }
        ]
      }
    }
    const a = normalizeMatch(raw)
    const b = normalizeMatch(raw)
    expect(a).toEqual(b) // 完全一致
    expect(a.review.mistakes[0].id).toBe('legacy-m1-0')
    expect(a.review.mistakes[1].id).toBe('legacy-m1-1')
    expect(a.review.mistakes[0].createdAt).toBe(baseMatch.createdAt)
    expect(a.review.mistakes[0].updatedAt).toBe(baseMatch.updatedAt)
  })
})
