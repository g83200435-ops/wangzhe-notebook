import { useEffect, useRef } from 'react'
import './ConfirmDialog.css'

export default function ConfirmDialog({
  open,
  title = '确认操作',
  message = '',
  confirmText = '确认',
  cancelText = '取消',
  danger = false,
  onConfirm,
  onCancel
}) {
  const confirmRef = useRef(null)
  const cancelRef = useRef(null)
  const previouslyFocusedRef = useRef(null)

  useEffect(() => {
    if (!open) return
    // 记录打开前的焦点元素，关闭时恢复
    previouslyFocusedRef.current =
      typeof document !== 'undefined' ? document.activeElement : null
    // 打开后聚焦到取消按钮，避免误触删除
    if (cancelRef.current) cancelRef.current.focus()

    function handleKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel && onCancel()
      } else if (e.key === 'Tab') {
        // 简单的焦点循环
        const focusable = [cancelRef.current, confirmRef.current].filter(Boolean)
        if (focusable.length === 0) return
        const active = document.activeElement
        if (e.shiftKey) {
          if (active === focusable[0]) {
            e.preventDefault()
            focusable[focusable.length - 1].focus()
          }
        } else {
          if (active === focusable[focusable.length - 1]) {
            e.preventDefault()
            focusable[0].focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      // 关闭时把焦点还给触发元素
      const prev = previouslyFocusedRef.current
      previouslyFocusedRef.current = null
      if (prev && typeof prev.focus === 'function') {
        // 延迟一帧，避免与关闭动作产生的其他 focus 冲突
        setTimeout(() => {
          try {
            prev.focus()
          } catch (_) {
            // 元素可能已被移除
          }
        }, 0)
      }
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="dialog-mask"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel && onCancel()
      }}
    >
      <div className="dialog">
        <div id="dialog-title" className="dialog-title">{title}</div>
        {message ? <div className="dialog-message">{message}</div> : null}
        <div className="dialog-actions">
          <button ref={cancelRef} type="button" className="btn" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={'btn ' + (danger ? 'btn-danger' : 'btn-primary')}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
