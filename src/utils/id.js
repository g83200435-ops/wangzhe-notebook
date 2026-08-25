// 生成唯一 id
export function generateId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch (_) {
    // 忽略后走 fallback
  }
  return (
    'm_' +
    Date.now().toString(36) +
    '_' +
    Math.random().toString(36).slice(2, 10)
  )
}
