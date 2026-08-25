import { describe, it, expect } from 'vitest'
import {
  getMatchById,
  updateMatch,
  writeAll
} from '../services/storage.js'
import { STORAGE_KEY } from '../constants/options.js'

function makeMemoryStorage(initial = null) {
  const map = new Map()
  if (initial != null) map.set(STORAGE_KEY, initial)
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null },
    setItem(key, val) { map.set(key, String(val)) },
    removeItem(key) { map.delete(key) }
  }
}

function makeFailingStorage(initial = null) {
  const map = new Map()
  if (initial != null) map.set(STORAGE_KEY, initial)
  return {
    getItem(key) { return map.has(key) ? map.get(key) : null },
    setItem() { throw new Error('QuotaExceededError') },
    removeItem() {}
  }
}

const base = {
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
  review: { good: '好', improve: '差', mistakes: [] },
  createdAt: '2025-06-01T20:00:00.000Z',
  updatedAt: '2025-06-01T20:00:00.000Z'
}

describe('getMatchById', () => {
  it('返回目标记录或 null', () => {
    const store = makeMemoryStorage()
    writeAll([base, { ...base, id: 'm2', hero: '李白' }], store)
    expect(getMatchById('m1', store).hero).toBe('不知火舞')
    expect(getMatchById('nope', store)).toBeNull()
    expect(getMatchById(null, store)).toBeNull()
  })
})

describe('updateMatch', () => {
  it('保持 id 与 createdAt；更新 updatedAt', () => {
    const store = makeMemoryStorage()
    writeAll([base], store)
    const before = getMatchById('m1', store)
    // 停留一毫秒确保 updatedAt 不同
    const updated = updateMatch('m1', { hero: '妲己' }, store)
    expect(updated.id).toBe('m1')
    expect(updated.createdAt).toBe(before.createdAt)
    expect(updated.updatedAt).not.toBe(before.updatedAt)
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThan(new Date(before.updatedAt).getTime())
    expect(updated.hero).toBe('妲己')
  })

  it('拒绝 candidate 篡改 id 和 createdAt', () => {
    const store = makeMemoryStorage()
    writeAll([base], store)
    const updated = updateMatch('m1', {
      id: 'evil-id',
      createdAt: '2000-01-01T00:00:00.000Z',
      hero: '妲己'
    }, store)
    expect(updated.id).toBe('m1')
    expect(updated.createdAt).toBe(base.createdAt)
  })

  it('不存在的 id 抛错且不写入', () => {
    const store = makeMemoryStorage()
    writeAll([base], store)
    let writes = 0
    const original = store.setItem
    store.setItem = (k, v) => { writes++; original(k, v) }
    expect(() => updateMatch('nope', { hero: 'x' }, store)).toThrow('记录不存在')
    expect(writes).toBe(0)
  })

  it('非法候选（rating 越界）拒绝写入', () => {
    const store = makeMemoryStorage()
    writeAll([base], store)
    let writes = 0
    const original = store.setItem
    store.setItem = (k, v) => { writes++; original(k, v) }
    expect(() =>
      updateMatch('m1', { stats: { ...base.stats, rating: 999 } }, store)
    ).toThrow()
    expect(writes).toBe(0)
    const stored = getMatchById('m1', store)
    expect(stored.stats.rating).toBe(9.2)
  })

  it('写入失败时旧数据保持不变', () => {
    const failing = makeFailingStorage(JSON.stringify({ version: 1, matches: [base] }))
    expect(() => updateMatch('m1', { hero: '妲己' }, failing)).toThrow()
    // 存储层未变更（初始 payload 依然存在，因为 setItem 会抛而不写）
    const stillRaw = failing.getItem(STORAGE_KEY)
    expect(JSON.parse(stillRaw).matches[0].hero).toBe('不知火舞')
  })

  it('更新基础字段时保留现有 review', () => {
    const store = makeMemoryStorage()
    writeAll([base], store)
    const updated = updateMatch('m1', { hero: '妲己', position: 'mid' }, store)
    expect(updated.review).toEqual(base.review)
  })

  it('单独保存 review 时保留最新基础对局字段', () => {
    const store = makeMemoryStorage()
    // 先把基础对局字段改成非默认值
    writeAll([{ ...base, hero: '妲己' }], store)
    const newReview = { good: '新g', improve: '新i', mistakes: [] }
    const updated = updateMatch('m1', { review: newReview }, store)
    expect(updated.hero).toBe('妲己')
    expect(updated.review).toEqual(newReview)
  })
})
