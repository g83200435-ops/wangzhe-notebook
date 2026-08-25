import { useRef } from 'react'
import './SegmentedControl.css'

// 紧凑的段控（键盘可用）
// props:
// - options: [{ value, label }]
// - value: 当前值
// - onChange(value)
// - ariaLabel: 中文描述
export default function SegmentedControl({ options, value, onChange, ariaLabel = '筛选' }) {
  const refs = useRef([])

  const handleKey = (e, idx) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = (idx + 1) % options.length
      onChange && onChange(options[next].value)
      setTimeout(() => refs.current[next] && refs.current[next].focus(), 0)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = (idx - 1 + options.length) % options.length
      onChange && onChange(options[prev].value)
      setTimeout(() => refs.current[prev] && refs.current[prev].focus(), 0)
    }
  }

  return (
    <div className="segmented" role="radiogroup" aria-label={ariaLabel}>
      {options.map((opt, i) => {
        const checked = opt.value === value
        return (
          <button
            key={opt.value}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            className={'segmented-item ' + (checked ? 'active' : '')}
            onClick={() => onChange && onChange(opt.value)}
            onKeyDown={(e) => handleKey(e, i)}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
