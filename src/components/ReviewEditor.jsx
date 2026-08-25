import { useEffect, useMemo, useRef, useState } from 'react'
import { PlusCircle, Save, RotateCcw, AlertCircle } from 'lucide-react'
import MistakeItem from './MistakeItem.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import { generateId } from '../utils/id.js'
import './ReviewEditor.css'

// 编辑对局的复盘部分
// 采用「所有变动进入 draft，显式保存复盘」模式
// props:
// - value: { good, improve, mistakes }（受控快照）
// - onSave(draftReview): 用户点击保存复盘时触发（父组件负责持久化）
// - saving: 保存中禁用
// - saveError: 保存失败提示
// - onDirtyChange(bool)
export default function ReviewEditor({ value, onSave, saving, saveError, onDirtyChange }) {
  const initial = useMemo(() => ({
    good: value && value.good ? value.good : '',
    improve: value && value.improve ? value.improve : '',
    mistakes: value && Array.isArray(value.mistakes) ? value.mistakes : []
  }), [value])

  const [good, setGood] = useState(initial.good)
  const [improve, setImprove] = useState(initial.improve)
  const [mistakes, setMistakes] = useState(initial.mistakes)

  // 单条错题编辑态：null | 'new' | mistakeId
  const [editingId, setEditingId] = useState(null)
  // 待删除的错题
  const [pendingDelete, setPendingDelete] = useState(null)
  // 重置为已保存的二次确认
  const [confirmReset, setConfirmReset] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const snapshotRef = useRef(initial)

  // value 变化时（外部保存成功后）重置本地 draft 与 snapshot
  useEffect(() => {
    setGood(initial.good)
    setImprove(initial.improve)
    setMistakes(initial.mistakes)
    setEditingId(null)
    setPendingDelete(null)
    snapshotRef.current = initial
    onDirtyChange && onDirtyChange(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  const contentDirty = useMemo(() => {
    if ((good || '') !== (snapshotRef.current.good || '')) return true
    if ((improve || '') !== (snapshotRef.current.improve || '')) return true
    if (mistakes.length !== snapshotRef.current.mistakes.length) return true
    for (let i = 0; i < mistakes.length; i++) {
      const a = mistakes[i]
      const b = snapshotRef.current.mistakes[i]
      if (!b) return true
      if (a.id !== b.id) return true
      if (a.category !== b.category) return true
      if ((a.moment || '') !== (b.moment || '')) return true
      if (a.problem !== b.problem) return true
      if (a.correction !== b.correction) return true
      if (a.updatedAt !== b.updatedAt) return true
    }
    return false
  }, [good, improve, mistakes])

  const isDirty = contentDirty || editingId !== null

  useEffect(() => {
    onDirtyChange && onDirtyChange(isDirty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty])

  const startAddMistake = () => {
    if (editingId !== null) return
    setEditingId('new')
  }
  const startEditMistake = (m) => {
    if (editingId !== null) return
    setEditingId(m.id)
  }
  const cancelEdit = () => setEditingId(null)

  const submitMistakeEdit = (values) => {
    const now = new Date().toISOString()
    if (editingId === 'new') {
      const created = {
        id: generateId(),
        category: values.category,
        moment: values.moment,
        problem: values.problem,
        correction: values.correction,
        createdAt: now,
        updatedAt: now
      }
      setMistakes((prev) => [...prev, created])
    } else {
      setMistakes((prev) =>
        prev.map((m) =>
          m.id === editingId
            ? {
                ...m,
                category: values.category,
                moment: values.moment,
                problem: values.problem,
                correction: values.correction,
                updatedAt: now
              }
            : m
        )
      )
    }
    setEditingId(null)
  }

  const requestDelete = (m) => setPendingDelete(m)
  const confirmDelete = () => {
    if (!pendingDelete) return
    setMistakes((prev) => prev.filter((m) => m.id !== pendingDelete.id))
    setPendingDelete(null)
  }

  const handleReset = () => {
    setGood(snapshotRef.current.good || '')
    setImprove(snapshotRef.current.improve || '')
    setMistakes(snapshotRef.current.mistakes)
    setEditingId(null)
    setConfirmReset(false)
  }

  const handleSave = async () => {
    if (saving) return
    if (editingId !== null) return
    let ok = false
    try {
      const result = onSave && onSave({ good, improve, mistakes })
      // onSave 契约：返回 true 或 resolve 为 true → 成功；false / undefined / reject → 失败
      const awaited = await Promise.resolve(result)
      ok = awaited === true
    } catch (_) {
      // onSave 内部通过 saveError prop 展示错误
      ok = false
    }
    if (ok) {
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1600)
    }
    // 失败时保留全部 draft、保持 dirty；只显示错误提示（由父组件通过 saveError 传入）
  }

  const hasEditingWarning = editingId !== null

  return (
    <section className="review-editor">
      <div className="review-editor-header">
        <h2 className="form-section-title" style={{ margin: 0 }}>结构化复盘</h2>
        {isDirty ? (
          <span className="dirty-tag" role="status">未保存修改</span>
        ) : savedFlash ? (
          <span className="dirty-tag saved" role="status">已保存</span>
        ) : null}
      </div>

      {saveError ? (
        <div
          className="notice"
          role="alert"
          style={{ borderColor: 'var(--lose)', color: 'var(--lose)', background: 'var(--lose-bg)' }}
        >
          {saveError}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="rv-good">做得好的地方</label>
        <textarea
          id="rv-good"
          className="input"
          rows={3}
          value={good}
          onChange={(e) => setGood(e.target.value)}
          placeholder="这局中做得不错的部分..."
        />
      </div>
      <div className="field">
        <label htmlFor="rv-improve">需要改进的地方</label>
        <textarea
          id="rv-improve"
          className="input"
          rows={3}
          value={improve}
          onChange={(e) => setImprove(e.target.value)}
          placeholder="这局中值得改进的部分..."
        />
      </div>

      <div className="review-mistakes">
        <div className="review-mistakes-header">
          <div className="review-mistakes-title">
            错题记录 <span className="count">（{mistakes.length}）</span>
          </div>
          <button
            type="button"
            className="btn"
            onClick={startAddMistake}
            disabled={editingId !== null}
          >
            <PlusCircle size={14} aria-hidden="true" />
            新增错题
          </button>
        </div>

        {mistakes.length === 0 && editingId !== 'new' ? (
          <div className="mistake-empty">还没有错题记录。点击「新增错题」记录本局的问题。</div>
        ) : null}

        {mistakes.map((m) => (
          <MistakeItem
            key={m.id}
            mistake={m}
            editing={editingId === m.id}
            onEditStart={startEditMistake}
            onEditCancel={cancelEdit}
            onEditSubmit={submitMistakeEdit}
            onDeleteRequest={requestDelete}
          />
        ))}

        {editingId === 'new' ? (
          <MistakeItem
            mistake={null}
            editing
            onEditCancel={cancelEdit}
            onEditSubmit={submitMistakeEdit}
          />
        ) : null}
      </div>

      {hasEditingWarning ? (
        <div className="review-warning" role="status">
          <AlertCircle size={14} aria-hidden="true" />
          正在编辑一条错题，请先「保存」或「取消」才能保存整个复盘。
        </div>
      ) : null}

      <div className="review-actions">
        <button
          type="button"
          className="btn"
          onClick={() => setConfirmReset(true)}
          disabled={!contentDirty || saving}
          title="放弃未保存的修改，恢复到上次已保存的状态"
        >
          <RotateCcw size={14} aria-hidden="true" />
          重置为已保存
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!isDirty || saving || editingId !== null}
        >
          <Save size={14} aria-hidden="true" />
          {saving ? '保存中…' : '保存复盘'}
        </button>
      </div>

      <ConfirmDialog
        open={!!pendingDelete}
        title="删除这条错题？"
        message={pendingDelete ? '删除后可以在保存复盘前通过「重置为已保存」找回。' : ''}
        confirmText="确认删除"
        cancelText="取消"
        danger
        onCancel={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
      />

      <ConfirmDialog
        open={confirmReset}
        title="重置为已保存？"
        message="所有未保存的复盘修改（包含错题的新增、编辑、删除）都将被丢弃。"
        confirmText="确认重置"
        cancelText="取消"
        danger
        onCancel={() => setConfirmReset(false)}
        onConfirm={handleReset}
      />
    </section>
  )
}
