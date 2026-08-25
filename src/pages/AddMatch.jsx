import { useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import MatchForm from '../components/MatchForm.jsx'
import UnsavedChangesGuard from '../components/UnsavedChangesGuard.jsx'
import { addMatch, safeLocalStorage } from '../services/storage.js'
import { generateId } from '../utils/id.js'

export default function AddMatch() {
  const navigate = useNavigate()
  const [submitError, setSubmitError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [savingNav, setSavingNav] = useState(false)

  const handleSubmit = (matchLike) => {
    setSubmitError('')
    const now = new Date().toISOString()
    const match = {
      ...matchLike,
      id: generateId(),
      review: { good: '', improve: '', mistakes: [] },
      createdAt: now,
      updatedAt: now
    }
    try {
      addMatch(match, safeLocalStorage())
      // 同步应用状态：先关闭 guard，再 navigate，避免被 blocker 拦截
      flushSync(() => {
        setDirty(false)
        setSavingNav(true)
      })
      navigate('/')
    } catch (err) {
      setSubmitError((err && err.message ? err.message : '保存失败') + '。本次记录未保存，请稍后重试。')
    }
  }

  const guardEnabled = dirty && !savingNav

  return (
    <div className="add-match">
      <div className="page-header">
        <div>
          <h1 className="page-title">添加对局</h1>
          <div className="page-subtitle">记录一局游戏，构建你的个人错题本</div>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => navigate('/')}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          返回首页
        </button>
      </div>

      <MatchForm
        submitLabel="保存对局"
        onSubmit={handleSubmit}
        onCancel={() => navigate('/')}
        submitError={submitError}
        onDirtyChange={setDirty}
      />

      <UnsavedChangesGuard when={guardEnabled} />
    </div>
  )
}
