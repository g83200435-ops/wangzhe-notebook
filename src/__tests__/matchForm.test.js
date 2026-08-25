import { describe, it, expect } from 'vitest'
import { matchToFormState } from '../components/MatchForm.jsx'

const validMatch = {
  id: 'm1',
  date: '2025-06-01',
  mode: 'ranked',
  position: 'mid',
  hero: '不知火舞',
  result: 'win',
  stats: { kills: 8, deaths: 3, assists: 10, rating: 9.2, duration: 25 },
  teams: {
    allies: { clash: '吕布', jungle: '', mid: '不知火舞', farm: '后羿', roam: '张飞' },
    enemies: { clash: '', jungle: '', mid: '', farm: '', roam: '' }
  },
  review: { good: '', improve: '', mistakes: [] },
  createdAt: '2025-06-01T20:00:00.000Z',
  updatedAt: '2025-06-01T20:00:00.000Z'
}

describe('matchToFormState (编辑初始化)', () => {
  it('清空玩家原位置的手动值，避免切换位置后英雄重复', () => {
    const form = matchToFormState(validMatch)
    expect(form.position).toBe('mid')
    // 我方英雄在渲染时由 alliesDisplay 覆盖到 mid，因此 form.allies.mid 应为空
    expect(form.allies.mid).toBe('')
    // 其他四个位置的手动值保留
    expect(form.allies.clash).toBe('吕布')
    expect(form.allies.jungle).toBe('')
    expect(form.allies.farm).toBe('后羿')
    expect(form.allies.roam).toBe('张飞')
  })

  it('新增（match=null）时返回空的 allies', () => {
    const form = matchToFormState(null)
    expect(form.allies).toEqual({ clash: '', jungle: '', mid: '', farm: '', roam: '' })
    expect(form.position).toBe('')
    expect(form.hero).toBe('')
  })

  it('如果 teams.allies 缺失，返回空 allies', () => {
    const noTeams = { ...validMatch, teams: undefined }
    const form = matchToFormState(noTeams)
    expect(form.allies).toEqual({ clash: '', jungle: '', mid: '', farm: '', roam: '' })
  })
})
