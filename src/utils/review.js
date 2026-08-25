// 复盘状态与错题计数：纯函数，基于规范化后的内容
// good / improve 先 trim；只有存在合法内容才视为「已复盘」
// mistakes 在读取路径上已经过 normalizeMistake 过滤，这里只再做安全兜底

import { isValidMoment, MISTAKE_CATEGORY_VALUES } from '../constants/mistakeCategories.js'

function isValidMistakeShape(m) {
  if (!m || typeof m !== 'object' || Array.isArray(m)) return false
  if (!MISTAKE_CATEGORY_VALUES.includes(m.category)) return false
  if (typeof m.problem !== 'string' || m.problem.trim() === '') return false
  if (typeof m.correction !== 'string' || m.correction.trim() === '') return false
  if (m.moment !== '' && !isValidMoment(m.moment || '')) return false
  return true
}

export function validMistakes(match) {
  const list = match && match.review && Array.isArray(match.review.mistakes) ? match.review.mistakes : []
  return list.filter(isValidMistakeShape)
}

export function countMistakes(match) {
  return validMistakes(match).length
}

// 'done' 已复盘 / 'todo' 待复盘
export function getReviewStatus(match) {
  const review = match && match.review ? match.review : null
  const good = typeof review?.good === 'string' ? review.good.trim() : ''
  const improve = typeof review?.improve === 'string' ? review.improve.trim() : ''
  if (good.length > 0 || improve.length > 0) return 'done'
  if (countMistakes(match) > 0) return 'done'
  return 'todo'
}
