import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { PlusCircle, Database } from 'lucide-react'
import StatsPanel from '../components/StatsPanel.jsx'
import MatchCard from '../components/MatchCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import DataManagerDialog from '../components/DataManagerDialog.jsx'
import SegmentedControl from '../components/SegmentedControl.jsx'
import { loadMatches, removeMatch, safeLocalStorage } from '../services/storage.js'
import { sortMatches } from '../utils/stats.js'
import { getReviewStatus } from '../utils/review.js'
import './Dashboard.css'

const FILTER_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'todo', label: '待复盘' },
  { value: 'done', label: '已复盘' }
]

export default function Dashboard() {
  const [matches, setMatches] = useState([])
  const [readCorrupted, setReadCorrupted] = useState(false)
  const [mistakesDropped, setMistakesDropped] = useState(0)
  const [deleteError, setDeleteError] = useState('')
  const [pending, setPending] = useState(null)
  const [dataMgrOpen, setDataMgrOpen] = useState(false)
  const [filter, setFilter] = useState('all')

  const reload = useCallback(() => {
    const { matches, corrupted, mistakesDropped } = loadMatches()
    setMatches(matches)
    setReadCorrupted(corrupted)
    setMistakesDropped(mistakesDropped || 0)
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const sorted = useMemo(() => sortMatches(matches), [matches])
  const filtered = useMemo(() => {
    if (filter === 'all') return sorted
    return sorted.filter((m) => getReviewStatus(m) === filter)
  }, [sorted, filter])

  const handleConfirmDelete = () => {
    if (!pending) return
    try {
      removeMatch(pending.id, safeLocalStorage())
      setPending(null)
      setDeleteError('')
      reload()
    } catch (e) {
      setDeleteError(e && e.message ? e.message : '删除失败，请重试')
    }
  }

  const totalMatches = matches.length
  const showEmpty = totalMatches === 0
  const showFilterEmpty = totalMatches > 0 && filtered.length === 0

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div className="page-subtitle">快速查看你最近的对局与整体表现</div>
        </div>
        <div className="page-header-actions">
          <button
            type="button"
            className="btn"
            onClick={() => setDataMgrOpen(true)}
            aria-label="数据管理"
          >
            <Database size={16} aria-hidden="true" />
            数据管理
          </button>
          <Link to="/add" className="btn btn-primary">
            <PlusCircle size={16} aria-hidden="true" />
            记录新对局
          </Link>
        </div>
      </div>

      {readCorrupted ? (
        <div className="notice" role="status">
          本地记录读取失败或存在损坏数据，已跳过无法读取的记录，其余有效记录仍可查看。原始数据不会被自动覆盖，下一次成功保存或删除时会自动修复。
        </div>
      ) : null}

      {mistakesDropped > 0 ? (
        <div className="notice" role="status">
          本地有 {mistakesDropped} 条无法解析的错题已被跳过，其余记录不受影响。原始数据不会被自动覆盖，下一次保存或删除时会自动修复。
        </div>
      ) : null}

      {deleteError ? (
        <div
          className="notice"
          role="alert"
          style={{ borderColor: 'var(--lose)', color: 'var(--lose)', background: 'var(--lose-bg)' }}
        >
          {deleteError}
        </div>
      ) : null}

      <StatsPanel matches={matches} />

      <section className="recent-section" aria-label="最近对局">
        <div className="section-header">
          <h2 className="section-title">最近对局</h2>
          {totalMatches > 0 ? (
            <SegmentedControl
              options={FILTER_OPTIONS}
              value={filter}
              onChange={setFilter}
              ariaLabel="按复盘状态筛选"
            />
          ) : null}
        </div>

        {showEmpty ? (
          <EmptyState />
        ) : showFilterEmpty ? (
          <div className="filter-empty">
            {filter === 'todo' ? '没有待复盘的对局。' : '没有已复盘的对局。'}
          </div>
        ) : (
          <div className="match-list">
            {filtered.map((m) => (
              <MatchCard key={m.id} match={m} onDelete={(match) => setPending(match)} />
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={!!pending}
        title="删除这条对局？"
        message={pending ? `将永久删除 ${pending.date} 的 ${pending.hero} 这局记录，无法恢复。` : ''}
        confirmText="确认删除"
        cancelText="取消"
        danger
        onCancel={() => setPending(null)}
        onConfirm={handleConfirmDelete}
      />

      <DataManagerDialog
        open={dataMgrOpen}
        matches={matches}
        onClose={() => setDataMgrOpen(false)}
        onDataChanged={reload}
      />
    </div>
  )
}
