import { useEffect, useRef, useState } from 'react'
import { Edit2, Save, Trash2, X, Clock } from 'lucide-react'
import {
  MISTAKE_CATEGORIES,
  MISTAKE_CATEGORY_LABEL,
  isValidMoment
} from '../constants/mistakeCategories.js'
import './MistakeItem.css'

function toFormState(m) {
  return {
    category: (m && m.category) || '',
    moment: (m && m.moment) || '',
    problem: (m && m.problem) || '',
    correction: (m && m.correction) || ''
  }
}

// 单条错题
// props:
// - mistake: 当前错题对象（新增模式时可传 null）
// - editing: 是否处于编辑态
// - onEditStart, onEditCancel: 切换编辑态
// - onEditSubmit(values): 提交编辑（不带 id/时间；由父组件补齐）
// - onDeleteRequest(mistake): 请求删除（父组件负责二次确认）
export default function MistakeItem({
  mistake,
  editing,
  onEditStart,
  onEditCancel,
  onEditSubmit,
  onDeleteRequest
}) {
  const [form, setForm] = useState(toFormState(mistake))
  const [errors, setErrors] = useState({})
  const firstFieldRef = useRef(null)

  useEffect(() => {
    if (editing) {
      setForm(toFormState(mistake))
      setErrors({})
      // 进入编辑态时聚焦到第一个字段
      setTimeout(() => firstFieldRef.current && firstFieldRef.current.focus(), 0)
    }
  }, [editing, mistake])

  const validate = () => {
    const e = {}
    if (!form.category) e.category = '请选择分类'
    if (!form.problem.trim()) e.problem = '请填写问题'
    if (!form.correction.trim()) e.correction = '请填写改进方案'
    const moment = form.moment.trim()
    if (moment !== '' && !isValidMoment(moment)) {
      e.moment = '时间需为 MM:SS，分钟 00–99，秒 00–59'
    }
    return e
  }

  const handleSubmit = () => {
    const v = validate()
    setErrors(v)
    if (Object.keys(v).length > 0) return
    onEditSubmit &&
      onEditSubmit({
        category: form.category,
        moment: form.moment.trim(),
        problem: form.problem.trim(),
        correction: form.correction.trim()
      })
  }

  if (editing) {
    return (
      <div className="mistake-item mistake-item-editing">
        <div className="mistake-form-row">
          <div className="field">
            <label htmlFor={`mi-cat-${mistake ? mistake.id : 'new'}`}>分类</label>
            <select
              id={`mi-cat-${mistake ? mistake.id : 'new'}`}
              ref={firstFieldRef}
              className="select"
              value={form.category}
              onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
            >
              <option value="">请选择</option>
              {MISTAKE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.category ? <div className="field-error">{errors.category}</div> : null}
          </div>
          <div className="field">
            <label htmlFor={`mi-mom-${mistake ? mistake.id : 'new'}`}>时间（MM:SS，可选）</label>
            <input
              id={`mi-mom-${mistake ? mistake.id : 'new'}`}
              type="text"
              inputMode="numeric"
              className="input"
              placeholder="08:35"
              value={form.moment}
              onChange={(e) => setForm((s) => ({ ...s, moment: e.target.value }))}
              maxLength={5}
            />
            {errors.moment ? <div className="field-error">{errors.moment}</div> : null}
          </div>
        </div>
        <div className="field">
          <label htmlFor={`mi-prob-${mistake ? mistake.id : 'new'}`}>问题</label>
          <textarea
            id={`mi-prob-${mistake ? mistake.id : 'new'}`}
            className="input"
            rows={2}
            value={form.problem}
            onChange={(e) => setForm((s) => ({ ...s, problem: e.target.value }))}
            placeholder="这局出错的地方..."
          />
          {errors.problem ? <div className="field-error">{errors.problem}</div> : null}
        </div>
        <div className="field">
          <label htmlFor={`mi-corr-${mistake ? mistake.id : 'new'}`}>改进方案</label>
          <textarea
            id={`mi-corr-${mistake ? mistake.id : 'new'}`}
            className="input"
            rows={2}
            value={form.correction}
            onChange={(e) => setForm((s) => ({ ...s, correction: e.target.value }))}
            placeholder="下次应该怎么做..."
          />
          {errors.correction ? <div className="field-error">{errors.correction}</div> : null}
        </div>
        <div className="mistake-item-actions">
          <button type="button" className="btn" onClick={onEditCancel}>
            <X size={14} aria-hidden="true" />
            取消
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit}>
            <Save size={14} aria-hidden="true" />
            {mistake ? '保存修改' : '添加错题'}
          </button>
        </div>
      </div>
    )
  }

  const catLabel = MISTAKE_CATEGORY_LABEL[mistake.category] || mistake.category
  return (
    <div className="mistake-item">
      <div className="mistake-head">
        <span className={`cat-tag cat-${mistake.category}`}>{catLabel}</span>
        {mistake.moment ? (
          <span className="moment-tag" aria-label={`时间 ${mistake.moment}`}>
            <Clock size={12} aria-hidden="true" />
            {mistake.moment}
          </span>
        ) : null}
        <div className="mistake-item-buttons">
          <button
            type="button"
            className="icon-btn"
            onClick={() => onEditStart && onEditStart(mistake)}
            aria-label="编辑错题"
            title="编辑错题"
          >
            <Edit2 size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            onClick={() => onDeleteRequest && onDeleteRequest(mistake)}
            aria-label="删除错题"
            title="删除错题"
          >
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div className="mistake-body">
        <div className="mistake-line">
          <span className="mistake-label">问题</span>
          <p className="mistake-text">{mistake.problem}</p>
        </div>
        <div className="mistake-line">
          <span className="mistake-label">改进</span>
          <p className="mistake-text">{mistake.correction}</p>
        </div>
      </div>
    </div>
  )
}
