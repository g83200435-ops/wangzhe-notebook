// 导入/导出相关的纯函数
// 只处理数据变换与校验，不涉及 UI 与 localStorage 的读写副作用
// localStorage 的实际写入仍走 services/storage.js

import { STORAGE_VERSION } from '../constants/options.js'
import { normalizeMatchWithMeta } from './storage.js'

export const IMPORT_MAX_BYTES = 5 * 1024 * 1024 // 5 MB
export const EXPORT_VERSION = STORAGE_VERSION

function pad(n) {
  return String(n).padStart(2, '0')
}

// 生成导出文件名，例如 wangzhe-notebook-2026-07-22.json
export function getExportFileName(date) {
  const d = date instanceof Date ? date : new Date()
  return `wangzhe-notebook-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}

// 构造导出文件负载
export function buildExportPayload(matches, now) {
  return {
    version: EXPORT_VERSION,
    exportedAt: (now instanceof Date ? now : new Date()).toISOString(),
    matches: Array.isArray(matches) ? matches : []
  }
}

// 解析并校验导入文本
// 成功：{ ok: true, matches, summary: { total, valid, invalid, mistakesDropped } }
// 失败：{ ok: false, error }
// 只做纯校验，不修改任何存储
export function parseImportText(text) {
  if (typeof text !== 'string' || text.length === 0) {
    return { ok: false, error: '文件内容为空' }
  }
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch (_) {
    return { ok: false, error: '文件不是有效的 JSON' }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: '文件格式不正确，应为对象 { version, matches }' }
  }
  if (parsed.version !== EXPORT_VERSION) {
    return { ok: false, error: `不支持的版本号：${JSON.stringify(parsed.version)}` }
  }
  if (!Array.isArray(parsed.matches)) {
    return { ok: false, error: 'matches 字段不是数组' }
  }
  const valid = []
  let invalid = 0
  let mistakesDropped = 0
  for (const item of parsed.matches) {
    const { match, mistakesDropped: md } = normalizeMatchWithMeta(item)
    if (match) {
      valid.push(match)
      mistakesDropped += md
    } else {
      invalid++
    }
  }
  return {
    ok: true,
    matches: valid,
    summary: {
      total: parsed.matches.length,
      valid: valid.length,
      invalid,
      mistakesDropped
    }
  }
}

// 合并：按 id 去重，id 相同时保留 updatedAt 更新（较大）的一条
// 返回 { result, added, skipped }
// added: 本次实际写入的数量（新增 + 覆盖旧记录）
// skipped: 因为已有更新记录而被跳过的数量
export function mergeMatches(existing, incoming) {
  const cur = Array.isArray(existing) ? existing : []
  const inc = Array.isArray(incoming) ? incoming : []
  const map = new Map()
  for (const m of cur) map.set(m.id, m)
  let added = 0
  let skipped = 0
  for (const item of inc) {
    const prev = map.get(item.id)
    if (!prev) {
      map.set(item.id, item)
      added++
      continue
    }
    const prevT = prev.updatedAt || prev.createdAt || ''
    const incT = item.updatedAt || item.createdAt || ''
    if (incT > prevT) {
      map.set(item.id, item)
      added++
    } else {
      skipped++
    }
  }
  return { result: Array.from(map.values()), added, skipped }
}

// 覆盖：用 incoming 全量替换
// 返回 { result, added, skipped }
export function overwriteMatches(_existing, incoming) {
  const inc = Array.isArray(incoming) ? incoming.slice() : []
  return { result: inc, added: inc.length, skipped: 0 }
}

// 触发浏览器下载
// 该函数带有副作用，位于工具模块的最后，保持前面的纯函数便于测试
export function downloadJsonFile(fileName, payload) {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    throw new Error('当前环境不支持文件下载')
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // 释放对象 URL，避免内存泄漏
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
