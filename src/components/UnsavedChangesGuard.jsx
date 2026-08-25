import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import ConfirmDialog from './ConfirmDialog.jsx'

// 未保存修改保护：
// - 站内导航（Layout 链接、页内按钮、浏览器后退）走 useBlocker
// - 关闭/刷新走 beforeunload
// - 使用现有 ConfirmDialog 呈现「留在页面 / 继续离开」
export default function UnsavedChangesGuard({ when, message }) {
  const blocker = useBlocker(!!when)

  useEffect(() => {
    if (!when) return
    function onBeforeUnload(e) {
      e.preventDefault()
      // 兼容旧浏览器要求
      e.returnValue = ''
      return ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [when])

  const open = blocker && blocker.state === 'blocked'

  return (
    <ConfirmDialog
      open={open}
      title="离开当前页面？"
      message={message || '有未保存的修改。继续离开将丢失这些内容。'}
      confirmText="继续离开"
      cancelText="留在页面"
      danger
      onCancel={() => blocker && blocker.reset && blocker.reset()}
      onConfirm={() => blocker && blocker.proceed && blocker.proceed()}
    />
  )
}
