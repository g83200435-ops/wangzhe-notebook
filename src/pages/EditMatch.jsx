import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import MatchForm from '../components/MatchForm.jsx'
import UnsavedChangesGuard from '../components/UnsavedChangesGuard.jsx'
import { loadMatches, safeLocalStorage, updateMatch } from '../services/storage.js'

export default function EditMatch() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState(undefined)
  const [submitError, setSubmitError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [savingNav, setSavingNav] = useState(false)
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

  const handleSubmit = (matchLike) => {
    setSubmitError('')
    try {
      updateMatch(id, matchLike, safeLocalStorage())
      flushSync(() => {
        setDirty(false)
        setSavingNav(true)
      })
      navigate(`/matches/${id}`, { replace: true })
    } catch (err) {
      setSubmitError((err && err.message ? err.message : '保存失败') + '。本次修改未保存，请稍后重试。')
    }
  }

  if (match === undefined) {
    return <div className="empty-state" style={{ marginTop: 20 }}>加载中…</div>
  }
  if (match === null) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1 className="page-title">未找到该对局</h1>
            <div className="page-subtitle">该对局不存在或已被删除</div>
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

  return (
    <div className="edit-match">
      <div className="page-header">
        <div>
          <h1 className="page-title">编辑对局</h1>
          <div className="page-subtitle">修改基础信息、结果和双方阵容；复盘请在详情页编辑。</div>
        </div>
        <Link to={`/matches/${id}`} className="btn btn-ghost">
          <ArrowLeft size={16} aria-hidden="true" />
          返回详情
        </Link>
      </div>

      {storageNotice ? <div className="notice" role="status">{storageNotice}</div> : null}

      <MatchForm
        initialValue={match}
        submitLabel="保存修改"
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/matches/${id}`)}
        submitError={submitError}
        onDirtyChange={setDirty}
      />

      <UnsavedChangesGuard when={dirty && !savingNav} />
    </div>
  )
}
