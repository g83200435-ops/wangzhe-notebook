// 统计与排序，纯函数

export function totalCount(matches) {
  return Array.isArray(matches) ? matches.length : 0
}

function validMatches(matches) {
  return Array.isArray(matches) ? matches.filter((m) => m && typeof m === 'object') : []
}

function isLoss(match) {
  return match?.result === 'loss' || match?.result === 'lose'
}

function decidedMatches(matches) {
  return validMatches(matches).filter((m) => m.result === 'win' || isLoss(m))
}

export function winCount(matches) {
  return validMatches(matches).filter((m) => m.result === 'win').length
}

export function lossCount(matches) {
  return validMatches(matches).filter(isLoss).length
}

// 胜率字符串，如 "50.0%"；只以明确标记为胜负的对局为分母
export function winRate(matches) {
  const decided = decidedMatches(matches)
  if (decided.length === 0) return '0%'
  const pct = (winCount(decided) / decided.length) * 100
  return pct.toFixed(1) + '%'
}

// 平均评分（保留 1 位小数）；没有有效评分返回 "0.0"
export function averageRating(matches) {
  if (!Array.isArray(matches) || matches.length === 0) return '0.0'
  const ratings = matches
    .map((m) => {
      const value = m && m.stats ? m.stats.rating : null
      return value === null || value === undefined || value === '' ? NaN : Number(value)
    })
    .filter((n) => Number.isFinite(n))
  if (ratings.length === 0) return '0.0'
  const sum = ratings.reduce((a, b) => a + b, 0)
  return (sum / ratings.length).toFixed(1)
}

function byCountThenName(a, b) {
  if (a.count !== b.count) return b.count - a.count
  return a.name.localeCompare(b.name, 'zh-CN')
}

export function heroStats(matches) {
  const grouped = new Map()

  for (const match of validMatches(matches)) {
    const hero = typeof match.hero === 'string' ? match.hero.trim() : ''
    if (!hero) continue
    const current = grouped.get(hero) || { name: hero, matches: [] }
    current.matches.push(match)
    grouped.set(hero, current)
  }

  return [...grouped.values()]
    .map(({ name, matches: heroMatches }) => ({
      name,
      count: heroMatches.length,
      wins: winCount(heroMatches),
      losses: lossCount(heroMatches),
      winRate: winRate(heroMatches),
      averageRating: averageRating(heroMatches)
    }))
    .sort(byCountThenName)
}

function collectMistakeCategories(matches) {
  const counts = new Map()
  for (const match of validMatches(matches)) {
    const mistakes = Array.isArray(match.review?.mistakes) ? match.review.mistakes : []
    for (const mistake of mistakes) {
      const category = typeof mistake?.category === 'string' ? mistake.category.trim() : ''
      if (category) counts.set(category, (counts.get(category) || 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort(byCountThenName)
}

export function mistakeCategoryStats(matches) {
  return collectMistakeCategories(matches)
}

export function lossMistakeCategoryStats(matches) {
  return collectMistakeCategories(validMatches(matches).filter(isLoss))
}

export function growthStats(matches) {
  const list = validMatches(matches)
  return {
    total: list.length,
    wins: winCount(list),
    losses: lossCount(list),
    winRate: winRate(list),
    averageRating: averageRating(list),
    heroes: heroStats(list),
    mistakeCategories: mistakeCategoryStats(list),
    lossMistakeCategories: lossMistakeCategoryStats(list)
  }
}

// 按日期倒序，日期相同时按 createdAt 倒序
export function sortMatches(matches) {
  if (!Array.isArray(matches)) return []
  const copy = [...matches]
  copy.sort((a, b) => {
    const dateA = (a && a.date) || ''
    const dateB = (b && b.date) || ''
    if (dateA !== dateB) return dateA < dateB ? 1 : -1
    const cA = (a && a.createdAt) || ''
    const cB = (b && b.createdAt) || ''
    if (cA !== cB) return cA < cB ? 1 : -1
    return 0
  })
  return copy
}
