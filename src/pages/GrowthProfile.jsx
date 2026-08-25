import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, PlusCircle } from 'lucide-react'
import { loadMatches, safeLocalStorage } from '../services/storage.js'
import { growthStats } from '../utils/stats.js'
import { MISTAKE_CATEGORY_LABEL } from '../constants/mistakeCategories.js'
import './GrowthProfile.css'

function formatCategory(name) {
  return MISTAKE_CATEGORY_LABEL[name] || name || '未分类'
}

function Stat({ label, value }) {
  return (
    <div className="growth-stat">
      <div className="growth-stat-value">{value}</div>
      <div className="growth-stat-label">{label}</div>
    </div>
  )
}

function Ranking({ items, emptyText, renderName }) {
  if (items.length === 0) return <div className="growth-empty-inline">{emptyText}</div>
  return (
    <div className="growth-ranking">
      {items.map((item, index) => (
        <div className="growth-ranking-row" key={item.name}>
          <span className="growth-ranking-index">{index + 1}</span>
          <span className="growth-ranking-name">{renderName(item.name)}</span>
          <strong className="growth-ranking-count">{item.count} 次</strong>
        </div>
      ))}
    </div>
  )
}

export default function GrowthProfile() {
  const [matches, setMatches] = useState([])
  const [storageNotice, setStorageNotice] = useState('')

  useEffect(() => {
    const storage = safeLocalStorage()
    if (!storage) {
      setStorageNotice('当前浏览器无法使用本地存储，成长档案暂时无法读取记录。')
      return
    }
    const loaded = loadMatches(storage)
    setMatches(loaded.matches)
    if (loaded.corrupted && loaded.mistakesDropped > 0) {
      setStorageNotice(`部分记录或错题无法读取，已跳过 ${loaded.mistakesDropped} 条错题，其余有效记录仍可查看。`)
    } else if (loaded.corrupted) {
      setStorageNotice('部分对局数据损坏，已跳过无法读取的记录，其余有效记录仍可查看。')
    } else if (loaded.mistakesDropped > 0) {
      setStorageNotice(`有 ${loaded.mistakesDropped} 条无法解析的错题已被跳过，其余记录不受影响。`)
    }
  }, [])

  const stats = growthStats(matches)

  return (
    <div className="growth-profile">
      <div className="page-header">
        <div>
          <h1 className="page-title">成长档案</h1>
          <div className="page-subtitle">从你的每一场记录中，看见稳定进步的方向</div>
        </div>
        <Link to="/add" className="btn btn-primary">
          <PlusCircle size={16} aria-hidden="true" />
          记录新对局
        </Link>
      </div>

      {storageNotice ? <div className="notice" role="status">{storageNotice}</div> : null}

      {stats.total === 0 ? (
        <div className="growth-empty" role="status">
          <BarChart3 size={36} aria-hidden="true" className="growth-empty-icon" />
          <h2>还没有足够的数据</h2>
          <p>记录几场对局并完成复盘后，这里会自动生成你的成长档案。</p>
          <Link to="/add" className="btn btn-primary">
            <PlusCircle size={16} aria-hidden="true" />
            开始记录第一场
          </Link>
        </div>
      ) : (
        <>
          <section className="growth-section" aria-labelledby="overview-title">
            <h2 id="overview-title" className="growth-section-title">整体表现</h2>
            <div className="growth-stats-grid">
              <Stat label="总场次" value={stats.total} />
              <Stat label="胜场" value={stats.wins} />
              <Stat label="负场" value={stats.losses} />
              <Stat label="胜率" value={stats.winRate} />
              <Stat label="平均评分" value={stats.averageRating} />
            </div>
          </section>

          <section className="growth-section" aria-labelledby="heroes-title">
            <h2 id="heroes-title" className="growth-section-title">英雄表现</h2>
            {stats.heroes.length === 0 ? (
              <div className="growth-empty-inline">暂无英雄数据</div>
            ) : (
              <div className="growth-table-wrap">
                <table className="growth-table">
                  <thead>
                    <tr><th>英雄</th><th>使用场次</th><th>胜场</th><th>胜率</th><th>平均评分</th></tr>
                  </thead>
                  <tbody>
                    {stats.heroes.map((hero) => (
                      <tr key={hero.name}>
                        <th scope="row">{hero.name}</th>
                        <td>{hero.count}</td>
                        <td>{hero.wins}</td>
                        <td>{hero.winRate}</td>
                        <td>{hero.averageRating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="growth-two-column">
            <section className="growth-section" aria-labelledby="mistakes-title">
              <h2 id="mistakes-title" className="growth-section-title">错误标签排行</h2>
              <Ranking items={stats.mistakeCategories} emptyText="还没有错题标签" renderName={formatCategory} />
            </section>
            <section className="growth-section" aria-labelledby="losses-title">
              <h2 id="losses-title" className="growth-section-title">失败对局中的常见错误</h2>
              <Ranking items={stats.lossMistakeCategories} emptyText="还没有失败对局错题" renderName={formatCategory} />
            </section>
          </div>
        </>
      )}
    </div>
  )
}
