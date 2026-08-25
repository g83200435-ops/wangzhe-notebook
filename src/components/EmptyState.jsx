import { Link } from 'react-router-dom'
import { Inbox, PlusCircle } from 'lucide-react'
import './EmptyState.css'

export default function EmptyState() {
  return (
    <div className="empty-state">
      <Inbox size={32} aria-hidden="true" className="empty-icon" />
      <div className="empty-title">还没有任何对局记录</div>
      <div className="empty-desc">添加第一局，开始积累你的个人错题本。</div>
      <Link to="/add" className="btn btn-primary">
        <PlusCircle size={16} aria-hidden="true" />
        记录新对局
      </Link>
    </div>
  )
}
