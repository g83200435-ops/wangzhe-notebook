import { useEffect, useRef, useState } from 'react'
import { Download, Upload, X } from 'lucide-react'
import {
  IMPORT_MAX_BYTES,
  buildExportPayload,
  downloadJsonFile,
  getExportFileName,
  mergeMatches,
  overwriteMatches,
  parseImportText
} from '../services/importExport.js'
import { loadMatches, safeLocalStorage, writeAll } from '../services/storage.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import './DataManagerDialog.css'

const NOTICE_TEXT =
  '数据仅保存在当前浏览器中。更换浏览器或设备时，请先导出，再在新浏览器中导入。'

export default function DataManagerDialog({ open, matches, onClose, onDataChanged }) {
  const [mode, setMode] = useState('merge') // 'merge' | 'overwrite'
  const [importState, setImportState] = useState({
    fileName: '',
    error: '',
    summary: null, // { total, valid, invalid }
    parsedMatches: null // 通过 parseImportText 校验后的合法记录
  })
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null) // { added, skipped }
  const [confirmOverwriteOpen, setConfirmOverwriteOpen] = useState(false)

  const fileInputRef = useRef(null)
  const closeBtnRef = useRef(null)
  const previouslyFocusedRef = useRef(null)

  // 记录/恢复焦点，Esc 关闭
  useEffect(() => {
    if (!open) return
    previouslyFocusedRef.current =
      typeof document !== 'undefined' ? document.activeElement : null
    if (closeBtnRef.current) closeBtnRef.current.focus()

    function handleKey(e) {
      if (e.key === 'Escape' && !confirmOverwriteOpen) {
        e.preventDefault()
        onClose && onClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      const prev = previouslyFocusedRef.current
      previouslyFocusedRef.current = null
      if (prev && typeof prev.focus === 'function') {
        setTimeout(() => {
          try { prev.focus() } catch (_) {}
        }, 0)
      }
    }
  }, [open, onClose, confirmOverwriteOpen])

  // 每次打开时清理状态
  useEffect(() => {
    if (open) {
      setMode('merge')
      setImportState({ fileName: '', error: '', summary: null, parsedMatches: null })
      setImporting(false)
      setResult(null)
      setConfirmOverwriteOpen(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [open])

  if (!open) return null

  const canExport = Array.isArray(matches) && matches.length > 0

  const handleExport = () => {
    if (!canExport) return
    try {
      const payload = buildExportPayload(matches, new Date())
      const name = getExportFileName(new Date())
      downloadJsonFile(name, payload)
    } catch (e) {
      setImportState((s) => ({ ...s, error: '导出失败：' + (e && e.message ? e.message : '未知错误') }))
    }
  }

  const handleFilePick = (e) => {
    setResult(null)
    setImportState({ fileName: '', error: '', summary: null, parsedMatches: null })
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (!/\.json$/i.test(file.name)) {
      setImportState({ fileName: file.name, error: '只接受 .json 文件', summary: null, parsedMatches: null })
      return
    }
    if (file.size > IMPORT_MAX_BYTES) {
      setImportState({
        fileName: file.name,
        error: `文件超过 ${(IMPORT_MAX_BYTES / 1024 / 1024).toFixed(0)}MB 上限`,
        summary: null,
        parsedMatches: null
      })
      return
    }
    const reader = new FileReader()
    reader.onerror = () => {
      setImportState({ fileName: file.name, error: '读取文件失败', summary: null, parsedMatches: null })
    }
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : ''
      const parsed = parseImportText(text)
      if (!parsed.ok) {
        setImportState({ fileName: file.name, error: parsed.error, summary: null, parsedMatches: null })
      } else {
        setImportState({
          fileName: file.name,
          error: '',
          summary: parsed.summary,
          parsedMatches: parsed.matches
        })
      }
    }
    reader.readAsText(file)
  }

  const performImport = () => {
    if (importing) return
    const list = importState.parsedMatches
    if (!list) return
    setImporting(true)
    try {
      const store = safeLocalStorage()
      const { matches: existing } = loadMatches(store)
      const { result: next, added, skipped } =
        mode === 'overwrite' ? overwriteMatches(existing, list) : mergeMatches(existing, list)
      writeAll(next, store)
      setResult({ added, skipped })
      onDataChanged && onDataChanged()
    } catch (e) {
      setImportState((s) => ({
        ...s,
        error: '写入失败：' + (e && e.message ? e.message : '未知错误') + '。原有数据未被覆盖。'
      }))
    } finally {
      setImporting(false)
    }
  }

  const handleStartImport = () => {
    if (!importState.parsedMatches || importState.parsedMatches.length === 0) return
    if (mode === 'overwrite') {
      setConfirmOverwriteOpen(true)
      return
    }
    performImport()
  }

  return (
    <div
      className="dialog-mask data-mgr-mask"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dm-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !confirmOverwriteOpen) onClose && onClose()
      }}
    >
      <div className="dialog data-mgr-dialog">
        <div className="data-mgr-header">
          <div id="dm-title" className="dialog-title">数据管理</div>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn btn-ghost data-mgr-close"
            onClick={onClose}
            aria-label="关闭数据管理"
            title="关闭"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="data-mgr-notice">{NOTICE_TEXT}</div>

        <section className="data-mgr-section">
          <div className="data-mgr-section-title">导出</div>
          <div className="data-mgr-desc">
            {canExport
              ? `将当前 ${matches.length} 条对局导出为 JSON 文件。`
              : '当前没有任何对局，无法导出。'}
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExport}
            disabled={!canExport}
          >
            <Download size={16} aria-hidden="true" />
            导出为 JSON
          </button>
        </section>

        <section className="data-mgr-section">
          <div className="data-mgr-section-title">导入</div>
          <div className="data-mgr-desc">
            仅接受本地 .json 文件（最大 {(IMPORT_MAX_BYTES / 1024 / 1024).toFixed(0)}MB）。
            导入前会进行结构校验，导入失败不会覆盖当前数据。
          </div>

          <div className="data-mgr-file-row">
            <label className="btn" htmlFor="dm-file">
              <Upload size={16} aria-hidden="true" />
              选择 JSON 文件
            </label>
            <input
              id="dm-file"
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFilePick}
              className="data-mgr-file-input"
            />
            {importState.fileName ? (
              <span className="data-mgr-file-name" title={importState.fileName}>
                {importState.fileName}
              </span>
            ) : null}
          </div>

          {importState.error ? (
            <div className="data-mgr-error" role="alert">
              {importState.error}
            </div>
          ) : null}

          {importState.summary ? (
            <div className="data-mgr-summary">
              文件包含 {importState.summary.total} 条记录，其中有效 {importState.summary.valid} 条，
              无效 {importState.summary.invalid} 条。
              {importState.summary.mistakesDropped > 0
                ? ` 其中有 ${importState.summary.mistakesDropped} 条错题因格式不正确被跳过。`
                : ''}
            </div>
          ) : null}

          <fieldset className="data-mgr-mode">
            <legend>导入模式</legend>
            <label className={'radio-item ' + (mode === 'merge' ? 'checked win' : '')}>
              <input
                type="radio"
                name="import-mode"
                value="merge"
                checked={mode === 'merge'}
                onChange={() => setMode('merge')}
              />
              <span>合并（推荐）</span>
            </label>
            <label className={'radio-item ' + (mode === 'overwrite' ? 'checked lose' : '')}>
              <input
                type="radio"
                name="import-mode"
                value="overwrite"
                checked={mode === 'overwrite'}
                onChange={() => setMode('overwrite')}
              />
              <span>覆盖</span>
            </label>
          </fieldset>
          <div className="data-mgr-mode-hint">
            {mode === 'merge'
              ? '保留当前数据并合并新数据；按 id 去重，冲突时保留 updatedAt 更新的一条。'
              : '用导入文件替换当前全部数据（需要二次确认）。'}
          </div>

          {result ? (
            <div className="data-mgr-success" role="status">
              成功导入 {result.added} 条，跳过 {result.skipped} 条。
            </div>
          ) : null}

          <div className="data-mgr-actions">
            <button
              type="button"
              className={'btn ' + (mode === 'overwrite' ? 'btn-danger' : 'btn-primary')}
              onClick={handleStartImport}
              disabled={
                importing ||
                !importState.parsedMatches ||
                importState.parsedMatches.length === 0
              }
            >
              {importing ? '导入中…' : mode === 'overwrite' ? '覆盖当前数据' : '开始导入'}
            </button>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmOverwriteOpen}
        title="覆盖当前数据？"
        message={`将用导入文件中的 ${importState.parsedMatches ? importState.parsedMatches.length : 0} 条记录替换当前 ${matches.length} 条记录，无法恢复。`}
        confirmText="确认覆盖"
        cancelText="取消"
        danger
        onCancel={() => setConfirmOverwriteOpen(false)}
        onConfirm={() => {
          setConfirmOverwriteOpen(false)
          performImport()
        }}
      />
    </div>
  )
}
