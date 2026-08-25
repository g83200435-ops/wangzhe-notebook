import { describe, it, expect } from 'vitest'
import { getReviewStatus, countMistakes, validMistakes } from '../utils/review.js'

const mkMatch = (review) => ({
  id: 'm1', date: '2025-01-01', mode: 'ranked', position: 'mid', hero: 'H', result: 'win',
  stats: { kills: 0, deaths: 0, assists: 0, rating: 0, duration: null },
  teams: { allies: {}, enemies: {} },
  createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z',
  review
})

const validMistake = {
  id: 'k', category: 'positioning', moment: '08:35', problem: 'p', correction: 'c',
  createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z'
}

describe('getReviewStatus', () => {
  it('全空 → todo', () => {
    expect(getReviewStatus(mkMatch({ good: '', improve: '', mistakes: [] }))).toBe('todo')
  })
  it('good/improve 只有空白 → todo', () => {
    expect(getReviewStatus(mkMatch({ good: '   ', improve: '\n\t', mistakes: [] }))).toBe('todo')
  })
  it('good 有内容 → done', () => {
    expect(getReviewStatus(mkMatch({ good: 'g', improve: '', mistakes: [] }))).toBe('done')
  })
  it('improve 有内容 → done', () => {
    expect(getReviewStatus(mkMatch({ good: '', improve: 'i', mistakes: [] }))).toBe('done')
  })
  it('至少一条合法错题 → done', () => {
    expect(getReviewStatus(mkMatch({ good: '', improve: '', mistakes: [validMistake] }))).toBe('done')
  })
  it('mistakes 全部非法 → todo', () => {
    const bad = { ...validMistake, category: 'nope' }
    expect(getReviewStatus(mkMatch({ good: '', improve: '', mistakes: [bad, null] }))).toBe('todo')
  })
  it('review 为 null/undefined → todo', () => {
    expect(getReviewStatus({ id: 'x' })).toBe('todo')
    expect(getReviewStatus(null)).toBe('todo')
  })
})

describe('countMistakes / validMistakes', () => {
  it('只计合法错题', () => {
    const match = mkMatch({
      good: '', improve: '',
      mistakes: [
        validMistake,
        { ...validMistake, id: 'b', category: 'nope' },
        { ...validMistake, id: 'c', problem: '' }
      ]
    })
    expect(countMistakes(match)).toBe(1)
    expect(validMistakes(match).length).toBe(1)
  })
})
