// localStorage 读写服务
// 读取路径：不产生随机 id，不依赖当前时间；相同输入多次规范化结果一致
// 写入路径：addMatch / updateMatch 在写入前 normalize 校验

import {
  STORAGE_KEY,
  STORAGE_VERSION,
  MODE_VALUES,
  POSITION_VALUES,
  RESULT_VALUES,
  RATING_MIN,
  RATING_MAX,
  emptyTeams
} from '../constants/options.js'
import { MISTAKE_CATEGORY_VALUES, isValidMoment } from '../constants/mistakeCategories.js'

const POSITION_KEYS = ['clash', 'jungle', 'mid', 'farm', 'roam']
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isValidDateString(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false
  const d = new Date(s + 'T00:00:00Z')
  if (Number.isNaN(d.getTime())) return false
  const [y, m, day] = s.split('-').map(Number)
  return d.getUTCFullYear() === y && d.getUTCMonth() + 1 === m && d.getUTCDate() === day
}

function toStringSafe(v) {
  if (typeof v === 'string') return v
  if (v == null) return ''
  return String(v)
}

function normalizeTeamSide(raw) {
  const side = { clash: '', jungle: '', mid: '', farm: '', roam: '' }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const key of POSITION_KEYS) {
      side[key] = toStringSafe(raw[key]).trim()
    }
  }
  return side
}

function normalizeTeams(raw) {
  if (!raw || typeof raw !== 'object') return emptyTeams()
  return {
    allies: normalizeTeamSide(raw.allies),
    enemies: normalizeTeamSide(raw.enemies)
  }
}

// 规范化单条错题
// ctx: { fallbackId, fallbackCreatedAt, fallbackUpdatedAt }
// - 不生成随机 id，不使用当前时间
// - 缺失 id/时间时使用 ctx 提供的稳定 fallback
// 返回 null 表示该条错题不合法，应被丢弃
export function normalizeMistake(raw, ctx) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const ctxObj = ctx && typeof ctx === 'object' ? ctx : {}

  const category = raw.category
  if (!MISTAKE_CATEGORY_VALUES.includes(category)) return null

  const problem = toStringSafe(raw.problem).trim()
  if (!problem) return null

  const correction = toStringSafe(raw.correction).trim()
  if (!correction) return null

  // moment 可为空；非空必须严格 MM:SS
  const momentRaw = toStringSafe(raw.moment).trim()
  let moment = ''
  if (momentRaw !== '') {
    if (!isValidMoment(momentRaw)) return null
    moment = momentRaw
  }

  const rawId = toStringSafe(raw.id).trim()
  const id = rawId || toStringSafe(ctxObj.fallbackId).trim()
  if (!id) return null

  const rawCreated = toStringSafe(raw.createdAt).trim()
  const createdAt = rawCreated || toStringSafe(ctxObj.fallbackCreatedAt).trim()
  if (!createdAt) return null

  const rawUpdated = toStringSafe(raw.updatedAt).trim()
  const updatedAt =
    rawUpdated || toStringSafe(ctxObj.fallbackUpdatedAt).trim() || createdAt

  return { id, category, moment, problem, correction, createdAt, updatedAt }
}

// 内部：规范化整局 + 累计丢弃的错题数
// 返回 { match: Match|null, mistakesDropped: number }
export function normalizeMatchWithMeta(raw) {
  const result = { match: null, mistakesDropped: 0 }
  if (!raw || typeof raw !== 'object') return result

  const id = toStringSafe(raw.id).trim()
  if (!id) return result

  const date = toStringSafe(raw.date).trim()
  if (!isValidDateString(date)) return result

  const mode = MODE_VALUES.includes(raw.mode) ? raw.mode : null
  if (!mode) return result

  const position = POSITION_VALUES.includes(raw.position) ? raw.position : null
  if (!position) return result

  const hero = toStringSafe(raw.hero).trim()
  if (!hero) return result

  const resultValue = RESULT_VALUES.includes(raw.result) ? raw.result : null
  if (!resultValue) return result

  const s = raw.stats && typeof raw.stats === 'object' ? raw.stats : {}
  const kills = Number.isFinite(Number(s.kills)) ? Math.max(0, Math.trunc(Number(s.kills))) : 0
  const deaths = Number.isFinite(Number(s.deaths)) ? Math.max(0, Math.trunc(Number(s.deaths))) : 0
  const assists = Number.isFinite(Number(s.assists)) ? Math.max(0, Math.trunc(Number(s.assists))) : 0

  const ratingNum = Number(s.rating)
  if (!Number.isFinite(ratingNum) || ratingNum < RATING_MIN || ratingNum > RATING_MAX) {
    return result
  }
  const rating = ratingNum

  const duration =
    s.duration == null || s.duration === ''
      ? null
      : Number.isFinite(Number(s.duration)) && Number(s.duration) > 0
        ? Number(s.duration)
        : null

  const teams = normalizeTeams(raw.teams)

  const createdAt = toStringSafe(raw.createdAt) || ''
  const updatedAt = toStringSafe(raw.updatedAt) || createdAt

  // review：good/improve 保留（trim 在使用侧做，避免破坏尾随空格意图）
  const rawReview =
    raw.review && typeof raw.review === 'object' && !Array.isArray(raw.review) ? raw.review : {}
  const good = toStringSafe(rawReview.good)
  const improve = toStringSafe(rawReview.improve)

  const rawMistakes = Array.isArray(rawReview.mistakes) ? rawReview.mistakes : []
  const mistakes = []
  let mistakesDropped = 0
  for (let i = 0; i < rawMistakes.length; i++) {
    const item = rawMistakes[i]
    const ctx = {
      fallbackId: `legacy-${id}-${i}`,
      fallbackCreatedAt: createdAt,
      fallbackUpdatedAt: updatedAt
    }
    const m = normalizeMistake(item, ctx)
    if (m) mistakes.push(m)
    else mistakesDropped++
  }

  result.match = {
    id,
    date,
    mode,
    position,
    hero,
    result: resultValue,
    stats: { kills, deaths, assists, rating, duration },
    teams,
    review: { good, improve, mistakes },
    createdAt,
    updatedAt
  }
  result.mistakesDropped = mistakesDropped
  return result
}

// 对外的规范化 API：只返回 match | null
export function normalizeMatch(raw) {
  return normalizeMatchWithMeta(raw).match
}

// 读取全部对局
// 返回 { matches, corrupted, mistakesDropped }
export function loadMatches(storage) {
  const store = storage || safeLocalStorage()
  if (!store) return { matches: [], corrupted: false, mistakesDropped: 0 }

  let raw
  try {
    raw = store.getItem(STORAGE_KEY)
  } catch (_) {
    return { matches: [], corrupted: true, mistakesDropped: 0 }
  }
  if (raw == null || raw === '') return { matches: [], corrupted: false, mistakesDropped: 0 }

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (_) {
    return { matches: [], corrupted: true, mistakesDropped: 0 }
  }

  let arr
  if (Array.isArray(parsed)) {
    arr = parsed
  } else if (parsed && typeof parsed === 'object') {
    if (!Array.isArray(parsed.matches)) return { matches: [], corrupted: true, mistakesDropped: 0 }
    arr = parsed.matches
  } else {
    return { matches: [], corrupted: true, mistakesDropped: 0 }
  }

  const matches = []
  let corrupted = false
  let mistakesDropped = 0
  for (const item of arr) {
    const { match, mistakesDropped: md } = normalizeMatchWithMeta(item)
    if (match) {
      matches.push(match)
      mistakesDropped += md
    } else {
      corrupted = true
    }
  }
  return { matches, corrupted, mistakesDropped }
}

// 写入全部对局；失败时抛出错误
export function writeAll(matches, storage) {
  const store = storage || safeLocalStorage()
  if (!store) throw new Error('浏览器不支持或禁用了本地存储')
  const payload = JSON.stringify({ version: STORAGE_VERSION, matches })
  try {
    store.setItem(STORAGE_KEY, payload)
  } catch (e) {
    throw new Error('本地存储写入失败：' + (e && e.message ? e.message : '未知错误'))
  }
}

// 追加一条对局；写入前先校验
export function addMatch(newMatch, storage) {
  const normalized = normalizeMatch(newMatch)
  if (!normalized) throw new Error('对局数据不符合规范，未保存')
  const store = storage || safeLocalStorage()
  const { matches } = loadMatches(store)
  const next = [...matches, normalized]
  writeAll(next, store)
  return next
}

// 删除一条对局；找不到 id 时不写入
export function removeMatch(id, storage) {
  const store = storage || safeLocalStorage()
  const { matches } = loadMatches(store)
  const next = matches.filter((m) => m.id !== id)
  if (next.length === matches.length) return matches
  writeAll(next, store)
  return next
}

// 按 id 读取
export function getMatchById(id, storage) {
  if (!id) return null
  const { matches } = loadMatches(storage)
  return matches.find((m) => m.id === id) || null
}

// 更新一条对局
// - 以路径参数 id 与存储中的旧记录为权威来源
// - 强制 id / createdAt 使用旧值；updatedAt 使用当前时间；candidate 不可篡改
// - 先合并旧记录 → 强制字段 → 规范化 → 校验 → 写入
// - 找不到 id 抛「记录不存在」，不写入
// - 规范化失败抛错，不写入
// - 写入失败旧数据保持不变（writeAll 抛错即中止）
export function updateMatch(id, candidate, storage) {
  const store = storage || safeLocalStorage()
  const { matches } = loadMatches(store)
  const idx = matches.findIndex((m) => m.id === id)
  if (idx < 0) throw new Error('记录不存在')

  const old = matches[idx]
  const now = new Date().toISOString()

  const cand = candidate && typeof candidate === 'object' ? candidate : {}

  // 以旧值为基础合并 candidate；candidate 中的 id/createdAt/updatedAt 一律被覆盖
  const merged = {
    ...old,
    ...cand,
    id: old.id,
    createdAt: old.createdAt,
    updatedAt: now
  }

  const normalized = normalizeMatch(merged)
  if (!normalized) throw new Error('对局数据不符合规范，未保存')

  const next = matches.slice()
  next[idx] = normalized
  writeAll(next, store)
  return normalized
}

export function safeLocalStorage() {
  try {
    if (typeof window === 'undefined') return null
    return window.localStorage || null
  } catch (_) {
    return null
  }
}
