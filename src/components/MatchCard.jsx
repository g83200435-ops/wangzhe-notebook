import { Link } from 'react-router-dom'
import { Trash2 } from 'lucide-react'
import { MODE_LABEL, POSITION_LABEL, RESULT_LABEL } from '../constants/options.js'
import StatusBadge from './StatusBadge.jsx'
import './MatchCard.css'

export default function MatchCard({ match, onDelete }) {
  const s = match.stats || { kills: 0, deaths: 0, assists: 0, rating: 0 }
  const isWin = match.result === 'win'
  return (
    <article className={'match-card ' + (isWin ? 'is-win' : 'is-lose')}>
      <Link to={`/matches/${match.id}`} className="match-card-link" aria-label={`查看 ${match.date} ${match.hero} 的对局详情`}>
        <div className="match-line-1">
          <span className={'result-badge ' + (isWin ? 'win' : 'lose')}>
            {RESULT_LABEL[match.result] || '-'}
          </span>
          <span className="hero-name" title={match.hero}>{match.hero}</span>
          <span className="meta-sep">·</span>
          <span className="meta">{POSITION_LABEL[match.position] || '-'}</span>
          <span className="meta-sep">·</span>
          <span className="meta">{MODE_LABEL[match.mode] || '-'}</span>
          <StatusBadge match={match} />
        </div>
        <div className="match-line-2">
          <span className="date">{match.date}</span>
          <span className="kda" aria-label="KDA">
            KDA <b>{s.kills}</b> / <b>{s.deaths}</b> / <b>{s.assists}</b>
          </span>
          <span className="rating" aria-label="评分">
            评分 <b>{Number(s.rating).toFixed(1)}</b>
          </span>
          {s.duration ? <span className="duration">{s.duration} 分钟</span> : null}
        </div>
      </Link>
      <button
        type="button"
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onDelete && onDelete(match)
        }}
        aria-label="删除该对局"
        title="删除该对局"
      >
        <Trash2 size={16} aria-hidden="true" />
      </button>
    </article>
  )
}
