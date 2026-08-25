import { CheckCircle2, CircleDot } from 'lucide-react'
import { countMistakes, getReviewStatus } from '../utils/review.js'
import './StatusBadge.css'

export default function StatusBadge({ match }) {
  const status = getReviewStatus(match)
  const count = countMistakes(match)
  const done = status === 'done'
  const Icon = done ? CheckCircle2 : CircleDot
  return (
    <span className={'status-badge ' + (done ? 'done' : 'todo')} aria-label={done ? '已复盘' : '待复盘'}>
      <Icon size={12} aria-hidden="true" />
      <span>{done ? '已复盘' : '待复盘'}</span>
      {count > 0 ? <span className="count">· {count} 条错题</span> : null}
    </span>
  )
}
