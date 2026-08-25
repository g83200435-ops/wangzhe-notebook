// 错题分类常量与 moment 校验
// 单一数据源；其他文件均从此处导入

export const MISTAKE_CATEGORIES = [
  { value: 'map_awareness', label: '地图意识' },
  { value: 'positioning', label: '走位' },
  { value: 'teamfight', label: '团战' },
  { value: 'laning', label: '对线' },
  { value: 'resources', label: '资源运营' },
  { value: 'mechanics', label: '技能操作' },
  { value: 'build', label: '出装铭文' },
  { value: 'decision', label: '决策' },
  { value: 'communication', label: '沟通配合' },
  { value: 'other', label: '其他' }
]

export const MISTAKE_CATEGORY_VALUES = MISTAKE_CATEGORIES.map((c) => c.value)

export const MISTAKE_CATEGORY_LABEL = MISTAKE_CATEGORIES.reduce((acc, c) => {
  acc[c.value] = c.label
  return acc
}, {})

// 严格 MM:SS：分钟 00-99、秒 00-59
// 拒绝 "8:35"、"08:5"、"08:60"、"100:00"、"abc" 等
export function isValidMoment(v) {
  if (typeof v !== 'string') return false
  const m = /^(\d{2}):(\d{2})$/.exec(v)
  if (!m) return false
  const mm = Number(m[1])
  const ss = Number(m[2])
  return mm >= 0 && mm <= 99 && ss >= 0 && ss <= 59
}
