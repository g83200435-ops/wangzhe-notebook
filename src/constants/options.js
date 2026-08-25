// 统一的常量选项
// 位置顺序在双方阵容中固定使用

export const POSITIONS = [
  { value: 'clash', label: '对抗路' },
  { value: 'jungle', label: '打野' },
  { value: 'mid', label: '中路' },
  { value: 'farm', label: '发育路' },
  { value: 'roam', label: '游走' }
]

export const POSITION_LABEL = POSITIONS.reduce((acc, p) => {
  acc[p.value] = p.label
  return acc
}, {})

export const MODES = [
  { value: 'ranked', label: '排位赛' },
  { value: 'peak', label: '巅峰赛' }
]

export const MODE_LABEL = MODES.reduce((acc, m) => {
  acc[m.value] = m.label
  return acc
}, {})

export const RESULTS = [
  { value: 'win', label: '胜利' },
  { value: 'lose', label: '失败' }
]

export const RESULT_LABEL = RESULTS.reduce((acc, r) => {
  acc[r.value] = r.label
  return acc
}, {})

// 用于校验的位置值集合
export const POSITION_VALUES = POSITIONS.map((p) => p.value)
export const MODE_VALUES = MODES.map((m) => m.value)
export const RESULT_VALUES = RESULTS.map((r) => r.value)

// 空阵容模板
export function emptyTeams() {
  return {
    allies: { clash: '', jungle: '', mid: '', farm: '', roam: '' },
    enemies: { clash: '', jungle: '', mid: '', farm: '', roam: '' }
  }
}

// 评分范围
export const RATING_MIN = 0
export const RATING_MAX = 16

// localStorage key
export const STORAGE_KEY = 'wangzhe_game_notebook'
export const STORAGE_VERSION = 1
