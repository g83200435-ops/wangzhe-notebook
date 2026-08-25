import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft, Edit2, Trash2 } from 'lucide-react'
import {
  MODE_LABEL,
  POSITION_LABEL,
  POSITIONS,
  RESULT_LABEL
} from '../constants/options.js'
import ReviewEditor from '../components/ReviewEditor.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import UnsavedChangesGuard from '../components/UnsavedChangesGuard.jsx'
import {
  loadMatches,
  removeMatch,
  safeLocalStorage,
  updateMatch
} from '../services/storage.js'
import './MatchDetail.css'

function fmt(iso) {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${day} ${hh}:${mm}`
}

export default function MatchDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [match, setMatch] = useState(undefined)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [pendingDeleteMatch, setPendingDeleteMatch] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [suppressGuard, setSuppressGuard] = useState(false)
  const [storageNotice, setStorageNotice] = useState('')

  useEffect(() => {
    const storage = safeLocalStorage()
    if (!storage) {
      setStorageNotice('当前浏览器无法使用本地存储，无法读取或保存对局。')
      setMatch(null)
      return
    }
    const loaded = loadMatches(storage)
    if (loaded.corrupted) {
      setStorageNotice('本地部分对局数据损坏，无法读取的记录已被跳过。请返回首页查看恢复结果。')
    } else if (loaded.mistakesDropped > 0) {
      setStorageNotice(`这份本地数据中有 ${loaded.mistakesDropped} 条损坏错题已被跳过。`)
    }
    setMatch(loaded.matches.find((item) => item.id === id) || null)
  }, [id])

  // 契约：成功 → return true；失败 → return false 且保留 draft
  const handleSaveReview = (draftReview) => {
    if (saving) return false
    setSaving(true)
    setSaveError('')
    try {
      const updated = updateMatch(id, { review: draftReview }, safeLocalStorage())
      setMatch(updated)
      return true
    } catch (e) {
      setSaveError((e && e.message ? e.message : '保存失败') + '。当前修改保留在页面中。')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = () => {
    try {
      removeMatch(id, safeLocalStorage())
      flushSync(() => {
        setDirty(false)
        setSuppressGuard(true)
      })
      navigate('/', { replace: true })
    } catch (e) {
      setDeleteError((e && e.message ? e.message : '删除失败') + '，请重试。')
      setPendingDeleteMatch(false)
    }
  }

  if (match === undefined) {
    return <div className="empty-state" style={{ marginTop: 20 }}>加载中…</div>
  }
  if (match === null) {
    return (
      <div className="match-detail">
        <div className="page-header">
          <div>
            <h1 className="page-title">未找到该对局</h1>
            <div className="page-subtitle">该对局不存在或已被删除，不会创建新记录。</div>
          </div>
          <Link to="/" className="btn">
            <ArrowLeft size={16} aria-hidden="true" />
            返回首页
          </Link>
        </div>
        {storageNotice ? <div className="notice" role="status">{storageNotice}</div> : null}
      </div>
    )
  }

  const isWin = match.result === 'win'
  const s = match.stats || {}

  return (
    <div className="match-detail">
      <div className="page-header">
        <div>
          <h1 className="page-title">对局详情</h1>
          <div className="page-subtitle">{match.date} · {MODE_LABEL[match.mode] || '-'} · {POSITION_LABEL[match.position] || '-'} · {match.hero}</div>
        </div>
        <div className="page-header-actions">
          <Link to="/" className="btn btn-ghost">
            <ArrowLeft size={16} aria-hidden="true" />
            返回首页
          </Link>
          <Link to={`/matches/${id}/edit`} className="btn">
            <Edit2 size={14} aria-hidden="true" />
            编辑对局
          </Link>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setPendingDeleteMatch(true)}
          >
            <Trash2 size={14} aria-hidden="true" />
            删除对局
          </button>
        </div>
      </div>

      {storageNotice ? <div className="notice" role="status">{storageNotice}</div> : null}

      {deleteError ? (
        <div
          className="notice"
          role="alert"
          style={{ borderColor: 'var(--lose)', color: 'var(--lose)', background: 'var(--lose-bg)' }}
        >
          {deleteError}
        </div>
      ) : null}

      <section className="detail-card">
        <div className="detail-summary">
          <span className={'result-badge ' + (isWin ? 'win' : 'lose')}>
            {RESULT_LABEL[match.result] || '-'}
          </span>
          <span className="hero-name">{match.hero}</span>
          <span className="meta">{POSITION_LABEL[match.position]}</span>
          <span className="meta">{MODE_LABEL[match.mode]}</span>
          <span className="meta">{match.date}</span>
        </div>
        <div className="detail-stats">
          <div className="detail-stat">
            <div className="detail-stat-value">{s.kills} / {s.deaths} / {s.assists}</div>
            <div className="detail-stat-label">KDA</div>
          </div>
          <div className="detail-stat">
            <div className="detail-stat-value">{Number(s.rating).toFixed(1)}</div>
            <div className="detail-stat-label">评分</div>
          </div>
          <div className="detail-stat">
            <div className="detail-stat-value">{s.duration ? s.duration + ' 分钟' : '-'}</div>
            <div className="detail-stat-label">游戏时长</div>
          </div>
        </div>
      </section>

      <section className="detail-card">
        <h2 className="detail-section-title">双方阵容</h2>
        <div className="teams-grid">
          <div>
            <div className="team-side-title">我方阵容</div>
            {POSITIONS.map((p) => (
              <div key={'a-' + p.value} className="team-row">
                <span className="team-pos">
                  {p.label}
                  {p.value === match.position ? <span className="tag-mine">（我）</span> : null}
                </span>
                <span className="team-hero">{(match.teams && match.teams.allies && match.teams.allies[p.value]) || <em className="unfilled">未填</em>}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="team-side-title">敌方阵容</div>
            {POSITIONS.map((p) => (
              <div key={'e-' + p.value} className="team-row">
                <span className="team-pos">{p.label}</span>
                <span className="team-hero">{(match.teams && match.teams.enemies && match.teams.enemies[p.value]) || <em className="unfilled">未填</em>}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ReviewEditor
        value={match.review}
        onSave={handleSaveReview}
        saving={saving}
        saveError={saveError}
        onDirtyChange={setDirty}
      />

      <section className="detail-meta">
        <span>创建时间：{fmt(match.createdAt)}</span>
        <span className="dot">·</span>
        <span>最后修改：{fmt(match.updatedAt)}</span>
      </section>

      <ConfirmDialog
        open={pendingDeleteMatch}
        title="删除这条对局？"
        message={`将永久删除 ${match.date} 的 ${match.hero} 这局记录，无法恢复。`}
        confirmText="确认删除"
        cancelText="取消"
        danger
        onCancel={() => setPendingDeleteMatch(false)}
        onConfirm={handleDeleteConfirm}
      />

      <UnsavedChangesGuard when={dirty && !suppressGuard} />
    </div>
  )
}
