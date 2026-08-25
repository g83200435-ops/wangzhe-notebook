import { useEffect, useMemo, useRef, useState } from 'react'
import { Save } from 'lucide-react'
import {
  MODES,
  POSITIONS,
  RESULTS,
  RATING_MIN,
  RATING_MAX
} from '../constants/options.js'
import './MatchForm.css'

function todayStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function emptySide() {
  return { clash: '', jungle: '', mid: '', farm: '', roam: '' }
}

// 把一个存量 Match 转换为表单字段
function matchToFormState(match) {
  if (!match) {
    return {
      date: todayStr(),
      mode: '',
      position: '',
      hero: '',
      duration: '',
      result: '',
      kills: '',
      deaths: '',
      assists: '',
      rating: '',
      allies: emptySide(),
      enemies: emptySide()
    }
  }
  const stats = match.stats || {}
  const alliesFromStorage = { ...emptySide(), ...(match.teams && match.teams.allies ? match.teams.allies : {}) }
  const enemiesFromStorage = { ...emptySide(), ...(match.teams && match.teams.enemies ? match.teams.enemies : {}) }
  // 关键：清空玩家当前位置对应槽位的「手动值」，避免切换位置时英雄同时出现在新旧两个位置
  // 我方玩家位置的显示始终由 form.hero 驱动（渲染时通过 alliesDisplay 覆盖）
  if (match.position && Object.prototype.hasOwnProperty.call(alliesFromStorage, match.position)) {
    alliesFromStorage[match.position] = ''
  }
  return {
    date: match.date || todayStr(),
    mode: match.mode || '',
    position: match.position || '',
    hero: match.hero || '',
    duration: stats.duration == null || stats.duration === 0 ? '' : String(stats.duration),
    result: match.result || '',
    kills: stats.kills == null ? '' : String(stats.kills),
    deaths: stats.deaths == null ? '' : String(stats.deaths),
    assists: stats.assists == null ? '' : String(stats.assists),
    rating: stats.rating == null ? '' : String(stats.rating),
    allies: alliesFromStorage,
    enemies: enemiesFromStorage
  }
}

// 导出以便单测
export { matchToFormState }

// 通用对局表单
// props:
// - initialValue: null (新增) 或 Match (编辑)
// - submitLabel: 主按钮文案
// - onSubmit(matchLike): 提交回调，父组件负责持久化；若抛错请通过 submitError prop 反馈
// - onCancel(): 取消回调
// - submitError: 父组件的保存失败提示（受控）
// - onDirtyChange(bool): dirty 状态变化回调
export default function MatchForm({
  initialValue,
  submitLabel = '保存对局',
  onSubmit,
  onCancel,
  submitError = '',
  onDirtyChange
}) {
  const initialForm = useMemo(() => matchToFormState(initialValue || null), [initialValue])
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  // 记录初始快照用于 dirty 判定；initialValue 变化时重置
  const snapshotRef = useRef(initialForm)

  useEffect(() => {
    setForm(initialForm)
    setErrors({})
    setSubmitting(false)
    snapshotRef.current = initialForm
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialForm])

  // 通过 useEffect 上报 dirty 状态，避免在 setState updater 中产生副作用
  useEffect(() => {
    if (!onDirtyChange) return
    onDirtyChange(!isSameForm(form, snapshotRef.current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  const setField = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const setAllySlot = (pos, val) => {
    setForm((prev) => ({ ...prev, allies: { ...prev.allies, [pos]: val } }))
  }
  const setEnemySlot = (pos, val) => {
    setForm((prev) => ({ ...prev, enemies: { ...prev.enemies, [pos]: val } }))
  }

  // 渲染我方阵容时，用户所选位置显示 hero 且只读
  const alliesDisplay = useMemo(() => {
    if (!form.position) return form.allies
    return { ...form.allies, [form.position]: form.hero }
  }, [form.allies, form.position, form.hero])

  const validate = () => {
    const e = {}
    if (!form.date) e.date = '请选择日期'
    if (!form.mode) e.mode = '请选择游戏模式'
    if (!form.position) e.position = '请选择位置'
    if (!form.hero.trim()) e.hero = '请填写你使用的英雄'
    if (!form.result) e.result = '请选择胜负'

    const intFields = [
      ['kills', form.kills, '击杀'],
      ['deaths', form.deaths, '死亡'],
      ['assists', form.assists, '助攻']
    ]
    for (const [key, val, label] of intFields) {
      if (val === '' || val == null) {
        e[key] = `请填写${label}数`
      } else {
        const n = Number(val)
        if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
          e[key] = `${label}数必须是 0 或正整数`
        }
      }
    }

    if (form.rating === '' || form.rating == null) {
      e.rating = '请填写游戏评分'
    } else {
      const r = Number(form.rating)
      if (!Number.isFinite(r) || r < RATING_MIN || r > RATING_MAX) {
        e.rating = `评分需在 ${RATING_MIN} 到 ${RATING_MAX} 之间`
      }
    }

    if (form.duration !== '' && form.duration != null) {
      const d = Number(form.duration)
      if (!Number.isFinite(d) || d <= 0) {
        e.duration = '时长必须是正数（分钟）'
      }
    }
    return e
  }

  const buildMatchLike = () => {
    // 我方阵容：所选位置 = hero；其他位置 = 手动值
    const finalAllies = {}
    for (const p of POSITIONS) {
      if (p.value === form.position) finalAllies[p.value] = form.hero.trim()
      else finalAllies[p.value] = (form.allies[p.value] || '').trim()
    }
    const finalEnemies = {}
    for (const p of POSITIONS) {
      finalEnemies[p.value] = (form.enemies[p.value] || '').trim()
    }
    return {
      date: form.date,
      mode: form.mode,
      position: form.position,
      hero: form.hero.trim(),
      result: form.result,
      stats: {
        kills: Math.trunc(Number(form.kills)),
        deaths: Math.trunc(Number(form.deaths)),
        assists: Math.trunc(Number(form.assists)),
        rating: Number(Number(form.rating).toFixed(1)),
        duration: form.duration === '' ? null : Number(form.duration)
      },
      teams: { allies: finalAllies, enemies: finalEnemies }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    const v = validate()
    setErrors(v)
    if (Object.keys(v).length > 0) return
    setSubmitting(true)
    try {
      await Promise.resolve(onSubmit && onSubmit(buildMatchLike()))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="match-form" onSubmit={handleSubmit} noValidate>
      {submitError ? (
        <div
          className="notice"
          role="alert"
          style={{ borderColor: 'var(--lose)', color: 'var(--lose)', background: 'var(--lose-bg)' }}
        >
          {submitError}
        </div>
      ) : null}

      <section className="form-section">
        <h2 className="form-section-title">基础信息</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="f-date">日期</label>
            <input
              id="f-date"
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => setField('date', e.target.value)}
            />
            {errors.date ? <div className="field-error">{errors.date}</div> : null}
          </div>
          <div className="field">
            <label htmlFor="f-mode">游戏模式</label>
            <select
              id="f-mode"
              className="select"
              value={form.mode}
              onChange={(e) => setField('mode', e.target.value)}
            >
              <option value="">请选择</option>
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            {errors.mode ? <div className="field-error">{errors.mode}</div> : null}
          </div>
          <div className="field">
            <label htmlFor="f-position">位置</label>
            <select
              id="f-position"
              className="select"
              value={form.position}
              onChange={(e) => setField('position', e.target.value)}
            >
              <option value="">请选择</option>
              {POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            {errors.position ? <div className="field-error">{errors.position}</div> : null}
          </div>
          <div className="field">
            <label htmlFor="f-hero">我使用的英雄</label>
            <input
              id="f-hero"
              type="text"
              className="input"
              value={form.hero}
              onChange={(e) => setField('hero', e.target.value)}
              placeholder="例如：不知火舞"
              maxLength={40}
            />
            {errors.hero ? <div className="field-error">{errors.hero}</div> : null}
          </div>
          <div className="field">
            <label htmlFor="f-duration">游戏时长（分钟，可选）</label>
            <input
              id="f-duration"
              type="number"
              className="input"
              min="0"
              step="1"
              value={form.duration}
              onChange={(e) => setField('duration', e.target.value)}
              placeholder="例如：25"
            />
            {errors.duration ? <div className="field-error">{errors.duration}</div> : null}
          </div>
        </div>
      </section>

      <section className="form-section">
        <h2 className="form-section-title">对局结果</h2>
        <div className="field">
          <span className="label-text">胜负</span>
          <div className="radio-row">
            {RESULTS.map((r) => (
              <label
                key={r.value}
                className={'radio-item ' + (form.result === r.value ? 'checked ' + r.value : '')}
              >
                <input
                  type="radio"
                  name="result"
                  value={r.value}
                  checked={form.result === r.value}
                  onChange={() => setField('result', r.value)}
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
          {errors.result ? <div className="field-error">{errors.result}</div> : null}
        </div>
        <div className="grid-4">
          <div className="field">
            <label htmlFor="f-kills">击杀</label>
            <input
              id="f-kills"
              type="number"
              className="input"
              min="0"
              step="1"
              value={form.kills}
              onChange={(e) => setField('kills', e.target.value)}
            />
            {errors.kills ? <div className="field-error">{errors.kills}</div> : null}
          </div>
          <div className="field">
            <label htmlFor="f-deaths">死亡</label>
            <input
              id="f-deaths"
              type="number"
              className="input"
              min="0"
              step="1"
              value={form.deaths}
              onChange={(e) => setField('deaths', e.target.value)}
            />
            {errors.deaths ? <div className="field-error">{errors.deaths}</div> : null}
          </div>
          <div className="field">
            <label htmlFor="f-assists">助攻</label>
            <input
              id="f-assists"
              type="number"
              className="input"
              min="0"
              step="1"
              value={form.assists}
              onChange={(e) => setField('assists', e.target.value)}
            />
            {errors.assists ? <div className="field-error">{errors.assists}</div> : null}
          </div>
          <div className="field">
            <label htmlFor="f-rating">评分（0 - 16）</label>
            <input
              id="f-rating"
              type="number"
              className="input"
              min={RATING_MIN}
              max={RATING_MAX}
              step="0.1"
              value={form.rating}
              onChange={(e) => setField('rating', e.target.value)}
            />
            {errors.rating ? <div className="field-error">{errors.rating}</div> : null}
          </div>
        </div>
      </section>

      <section className="form-section">
        <h2 className="form-section-title">双方阵容</h2>
        <div className="team-hint">
          阵容按照 对抗路 / 打野 / 中路 / 发育路 / 游走 的顺序排列。你所选位置的我方英雄由「我使用的英雄」自动填入且不可编辑，避免重复填写。所有阵容字段均可留空。
        </div>
        <div className="grid-2">
          <div>
            <div className="team-side-title">我方阵容</div>
            {POSITIONS.map((p) => {
              const isMine = form.position === p.value
              return (
                <div className="team-slot" key={'a-' + p.value}>
                  <label htmlFor={'a-' + p.value} className="slot-label">
                    {p.label}
                    {isMine ? <span className="tag-mine">（我）</span> : null}
                  </label>
                  <input
                    id={'a-' + p.value}
                    type="text"
                    className="input"
                    value={alliesDisplay[p.value]}
                    readOnly={isMine}
                    onChange={(e) => setAllySlot(p.value, e.target.value)}
                    placeholder={isMine ? '' : `我方${p.label}英雄（可留空）`}
                    maxLength={40}
                  />
                </div>
              )
            })}
          </div>
          <div>
            <div className="team-side-title">敌方阵容</div>
            {POSITIONS.map((p) => (
              <div className="team-slot" key={'e-' + p.value}>
                <label htmlFor={'e-' + p.value} className="slot-label">
                  {p.label}
                </label>
                <input
                  id={'e-' + p.value}
                  type="text"
                  className="input"
                  value={form.enemies[p.value]}
                  onChange={(e) => setEnemySlot(p.value, e.target.value)}
                  placeholder={`敌方${p.label}英雄（可留空）`}
                  maxLength={40}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="form-actions">
        <button type="button" className="btn" onClick={onCancel} disabled={submitting}>
          取消
        </button>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          <Save size={16} aria-hidden="true" />
          {submitting ? '保存中…' : submitLabel}
        </button>
      </div>
    </form>
  )
}

function isSameForm(a, b) {
  if (!a || !b) return false
  if (a.date !== b.date) return false
  if (a.mode !== b.mode) return false
  if (a.position !== b.position) return false
  if (a.hero !== b.hero) return false
  if (a.duration !== b.duration) return false
  if (a.result !== b.result) return false
  if (a.kills !== b.kills) return false
  if (a.deaths !== b.deaths) return false
  if (a.assists !== b.assists) return false
  if (a.rating !== b.rating) return false
  const keys = ['clash', 'jungle', 'mid', 'farm', 'roam']
  for (const k of keys) {
    if ((a.allies || {})[k] !== (b.allies || {})[k]) return false
    if ((a.enemies || {})[k] !== (b.enemies || {})[k]) return false
  }
  return true
}
