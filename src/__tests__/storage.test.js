import { describe, it, expect, beforeEach } from 'vitest'
import { loadMatches, writeAll, addMatch, removeMatch, normalizeMatch } from '../services/storage.js'
import { STORAGE_KEY } from '../constants/options.js'

// 使用一个隔离的 Map 作为 storage 实现，避免污染真实 localStorage
function makeMemoryStorage(initial = null) {
  const map = new Map()
  if (initial != null) map.set(STORAGE_KEY, initial)
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, val) {
      map.set(key, String(val))
    },
    removeItem(key) {
      map.delete(key)
    },
    _dump() {
      return Object.fromEntries(map.entries())
    }
  }
}

function makeFailingStorage() {
  return {
    getItem() {
      return null
    },
    setItem() {
      throw new Error('QuotaExceededError')
    },
    removeItem() {}
  }
}

const validMatch = {
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
  review: { good: '', improve: '', mistakes: [] },
  createdAt: '2025-06-01T20:00:00.000Z',
  updatedAt: '2025-06-01T20:00:00.000Z'
}

describe('loadMatches', () => {
  it('无数据时返回空数组，corrupted=false', () => {
    const store = makeMemoryStorage()
    const { matches, corrupted } = loadMatches(store)
    expect(matches).toEqual([])
    expect(corrupted).toBe(false)
  })

  it('JSON 损坏时返回空数组且 corrupted=true，不覆盖原数据', () => {
    const store = makeMemoryStorage('{bad json')
    const { matches, corrupted } = loadMatches(store)
    expect(matches).toEqual([])
    expect(corrupted).toBe(true)
    expect(store.getItem(STORAGE_KEY)).toBe('{bad json')
  })

  it('matches 字段不是数组时返回 corrupted=true', () => {
    const store = makeMemoryStorage(JSON.stringify({ version: 1, matches: 'oops' }))
    const { matches, corrupted } = loadMatches(store)
    expect(matches).toEqual([])
    expect(corrupted).toBe(true)
  })

  it('兼容旧格式：直接是数组', () => {
    const store = makeMemoryStorage(JSON.stringify([validMatch]))
    const { matches, corrupted } = loadMatches(store)
    expect(matches.length).toBe(1)
    expect(corrupted).toBe(false)
  })

  it('跳过单条非法记录，其余记录仍可读取，corrupted=true', () => {
    const store = makeMemoryStorage(
      JSON.stringify({
        version: 1,
        matches: [validMatch, { id: 'x' /* 缺失字段 */ }, null]
      })
    )
    const { matches, corrupted } = loadMatches(store)
    expect(matches.length).toBe(1)
    expect(matches[0].id).toBe('m1')
    expect(corrupted).toBe(true)
  })
})

describe('normalizeMatch', () => {
  it('接受完整数据', () => {
    expect(normalizeMatch(validMatch)).not.toBeNull()
  })
  it('拒绝缺少 result 的数据', () => {
    const bad = { ...validMatch, result: 'unknown' }
    expect(normalizeMatch(bad)).toBeNull()
  })
  it('拒绝非法位置', () => {
    const bad = { ...validMatch, position: 'top' }
    expect(normalizeMatch(bad)).toBeNull()
  })
  it('拒绝日期格式错误', () => {
    const bad = { ...validMatch, date: '2025/06/01' }
    expect(normalizeMatch(bad)).toBeNull()
  })
  it('拒绝合法格式但非法日期', () => {
    const bad = { ...validMatch, date: '2025-02-30' }
    expect(normalizeMatch(bad)).toBeNull()
  })
  it('拒绝 rating 超出 0-16', () => {
    const tooHigh = { ...validMatch, stats: { ...validMatch.stats, rating: 20 } }
    const tooLow = { ...validMatch, stats: { ...validMatch.stats, rating: -1 } }
    expect(normalizeMatch(tooHigh)).toBeNull()
    expect(normalizeMatch(tooLow)).toBeNull()
  })
  it('将非法 duration 归一化为 null', () => {
    const m = normalizeMatch({ ...validMatch, stats: { ...validMatch.stats, duration: -5 } })
    expect(m.stats.duration).toBe(null)
  })
})

describe('writeAll / addMatch / removeMatch', () => {
  it('addMatch 成功写入并可读取', () => {
    const store = makeMemoryStorage()
    addMatch(validMatch, store)
    const { matches } = loadMatches(store)
    expect(matches.length).toBe(1)
    expect(matches[0].id).toBe('m1')
  })

  it('addMatch 遇到非法数据时抛错且不写入', () => {
    const store = makeMemoryStorage()
    const bad = { ...validMatch, stats: { ...validMatch.stats, rating: 99 } }
    expect(() => addMatch(bad, store)).toThrow()
    expect(store.getItem(STORAGE_KEY)).toBe(null)
  })

  it('removeMatch 移除指定 id', () => {
    const other = { ...validMatch, id: 'm2', hero: '李白' }
    const store = makeMemoryStorage()
    writeAll([validMatch, other], store)
    removeMatch('m1', store)
    const { matches } = loadMatches(store)
    expect(matches.map((m) => m.id)).toEqual(['m2'])
  })

  it('removeMatch 传入不存在的 id 时不写入', () => {
    const store = makeMemoryStorage()
    writeAll([validMatch], store)
    let writes = 0
    const original = store.setItem.bind(store)
    store.setItem = (k, v) => {
      writes++
      original(k, v)
    }
    removeMatch('does-not-exist', store)
    expect(writes).toBe(0)
  })

  it('写入失败时抛出错误', () => {
    const store = makeFailingStorage()
    expect(() => writeAll([validMatch], store)).toThrow()
  })

  it('addMatch 在原存储损坏时，写入成功后可正常读回（相当于修复）', () => {
    const store = makeMemoryStorage('{bad json')
    // 载入应报 corrupted 但不覆盖
    const before = loadMatches(store)
    expect(before.corrupted).toBe(true)
    expect(store.getItem(STORAGE_KEY)).toBe('{bad json')

    addMatch(validMatch, store)
    const after = loadMatches(store)
    expect(after.corrupted).toBe(false)
    expect(after.matches.length).toBe(1)
  })
})

// 保证测试互相隔离
beforeEach(() => {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch (_) {}
  }
})
