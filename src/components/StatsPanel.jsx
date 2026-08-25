import './StatsPanel.css'
import { totalCount, winCount, winRate, averageRating } from '../utils/stats.js'

export default function StatsPanel({ matches }) {
  const items = [
    { label: '总对局', value: totalCount(matches) },
    { label: '胜利场数', value: winCount(matches) },
    { label: '胜率', value: winRate(matches) },
    { label: '平均评分', value: averageRating(matches) }
  ]
  return (
    <div className="stats-panel">
      {items.map((it) => (
        <div className="stat-item" key={it.label}>
          <div className="stat-value">{it.value}</div>
          <div className="stat-label">{it.label}</div>
        </div>
      ))}
    </div>
  )
}
