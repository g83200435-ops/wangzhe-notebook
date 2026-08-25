import { describe, it, expect } from 'vitest'
import {
  buildExportPayload,
  getExportFileName,
  mergeMatches,
  overwriteMatches,
  parseImportText,
  EXPORT_VERSION
} from '../services/importExport.js'

const mk = (over = {}) => ({
  id: over.id || 'a',
  date: over.date || '2025-06-01',
  mode: 'ranked',
  position: 'mid',
  hero: over.hero || '不知火舞',
  result: over.result || 'win',
  stats: { kills: 1, deaths: 1, assists: 1, rating: over.rating != null ? over.rating : 8, duration: null },
  teams: { allies: {}, enemies: {} },
  review: { good: '', improve: '', mistakes: [] },
  createdAt: over.createdAt || '2025-06-01T10:00:00.000Z',
  updatedAt: over.updatedAt || '2025-06-01T10:00:00.000Z'
})

describe('getExportFileName', () => {
  it('生成 YYYY-MM-DD 的文件名', () => {
    const d = new Date('2026-07-22T15:30:00Z')
    // 使用本地日期字段，避免时区导致的用例波动：断言仅前缀与扩展名
    const name = getExportFileName(d)
    expect(name.startsWith('wangzhe-notebook-')).toBe(true)
    expect(name.endsWith('.json')).toBe(true)
    expect(/^wangzhe-notebook-\d{4}-\d{2}-\d{2}\.json$/.test(name)).toBe(true)
  })
})

describe('buildExportPayload', () => {
  it('产出 version/exportedAt/matches 字段', () => {
    const now = new Date('2026-01-02T03:04:05Z')
    const p = buildExportPayload([mk()], now)
    expect(p.version).toBe(EXPORT_VERSION)
    expect(p.exportedAt).toBe(now.toISOString())
    expect(Array.isArray(p.matches)).toBe(true)
    expect(p.matches.length).toBe(1)
  })
  it('非数组输入回退为空数组', () => {
    const p = buildExportPayload(null, new Date())
    expect(p.matches).toEqual([])
  })
})

describe('parseImportText', () => {
  it('空字符串报错', () => {
    expect(parseImportText('').ok).toBe(false)
  })
  it('非法 JSON 报错', () => {
    expect(parseImportText('{bad').ok).toBe(false)
  })
  it('缺少 version 报错', () => {
    const r = parseImportText(JSON.stringify({ matches: [] }))
    expect(r.ok).toBe(false)
  })
  it('version 不匹配报错', () => {
    const r = parseImportText(JSON.stringify({ version: 2, matches: [] }))
    expect(r.ok).toBe(false)
  })
  it('matches 非数组报错', () => {
    const r = parseImportText(JSON.stringify({ version: 1, matches: 'oops' }))
    expect(r.ok).toBe(false)
  })
  it('接收合法内容并统计有效/无效数量', () => {
    const good = mk({ id: 'g' })
    const bad = { ...mk({ id: 'b' }), result: 'xxx' } // 会被 normalizeMatch 拒绝
    const text = JSON.stringify({ version: 1, matches: [good, bad, null, 'not-object'] })
    const r = parseImportText(text)
    expect(r.ok).toBe(true)
    expect(r.summary).toEqual({ total: 4, valid: 1, invalid: 3, mistakesDropped: 0 })
    expect(r.matches.length).toBe(1)
    expect(r.matches[0].id).toBe('g')
  })

  it('对局有效但错题损坏时：对局保留、错题跳过、汇总 mistakesDropped', () => {
    const goodMistake = {
      id: 'k',
      category: 'positioning',
      moment: '08:35',
      problem: 'p',
      correction: 'c',
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z'
    }
    const match = {
      ...mk({ id: 'a' }),
      review: {
        good: '',
        improve: '',
        mistakes: [
          goodMistake,
          { ...goodMistake, id: 'b', category: 'nope' },
          { ...goodMistake, id: 'c', moment: '08:60' }
        ]
      }
    }
    const text = JSON.stringify({ version: 1, matches: [match] })
    const r = parseImportText(text)
    expect(r.ok).toBe(true)
    expect(r.summary.total).toBe(1)
    expect(r.summary.valid).toBe(1)
    expect(r.summary.invalid).toBe(0)
    expect(r.summary.mistakesDropped).toBe(2)
    expect(r.matches[0].review.mistakes.length).toBe(1)
  })

  it('导入导出保留完整复盘数据', () => {
    const mistake = {
      id: 'k1',
      category: 'teamfight',
      moment: '12:34',
      problem: '追击过深',
      correction: '战线拉平后再进',
      createdAt: '2025-05-01T10:00:00.000Z',
      updatedAt: '2025-05-02T10:00:00.000Z'
    }
    const source = {
      ...mk({ id: 'src' }),
      review: { good: 'g', improve: 'i', mistakes: [mistake] }
    }
    // export -> parse
    const payload = buildExportPayload([source], new Date())
    const parsed = parseImportText(JSON.stringify(payload))
    expect(parsed.ok).toBe(true)
    expect(parsed.matches[0].review.good).toBe('g')
    expect(parsed.matches[0].review.improve).toBe('i')
    expect(parsed.matches[0].review.mistakes[0]).toEqual(mistake)
  })
})

describe('mergeMatches', () => {
  it('新 id 会被添加', () => {
    const a = [mk({ id: 'a' })]
    const b = [mk({ id: 'b' })]
    const r = mergeMatches(a, b)
    expect(r.added).toBe(1)
    expect(r.skipped).toBe(0)
    expect(r.result.map((m) => m.id).sort()).toEqual(['a', 'b'])
  })
  it('相同 id 保留 updatedAt 更新的一条', () => {
    const older = mk({ id: 'x', hero: 'old', updatedAt: '2025-01-01T00:00:00.000Z' })
    const newer = mk({ id: 'x', hero: 'new', updatedAt: '2025-06-01T00:00:00.000Z' })
    const r = mergeMatches([older], [newer])
    expect(r.added).toBe(1)
    expect(r.skipped).toBe(0)
    expect(r.result[0].hero).toBe('new')
  })
  it('相同 id 且来源较旧则跳过', () => {
    const older = mk({ id: 'x', hero: 'incoming-old', updatedAt: '2025-01-01T00:00:00.000Z' })
    const newer = mk({ id: 'x', hero: 'existing-new', updatedAt: '2025-06-01T00:00:00.000Z' })
    const r = mergeMatches([newer], [older])
    expect(r.added).toBe(0)
    expect(r.skipped).toBe(1)
    expect(r.result[0].hero).toBe('existing-new')
  })
  it('非数组输入不报错', () => {
    const r = mergeMatches(null, [mk({ id: 'a' })])
    expect(r.result.length).toBe(1)
  })
})

describe('overwriteMatches', () => {
  it('用 incoming 全量替换', () => {
    const r = overwriteMatches([mk({ id: 'a' }), mk({ id: 'b' })], [mk({ id: 'c' })])
    expect(r.result.map((m) => m.id)).toEqual(['c'])
    expect(r.added).toBe(1)
    expect(r.skipped).toBe(0)
  })
  it('incoming 为空时清空全部', () => {
    const r = overwriteMatches([mk({ id: 'a' })], [])
    expect(r.result).toEqual([])
    expect(r.added).toBe(0)
  })
  it('返回的是副本，不引用同一数组', () => {
    const incoming = [mk({ id: 'a' })]
    const r = overwriteMatches([], incoming)
    expect(r.result).not.toBe(incoming)
  })
})
