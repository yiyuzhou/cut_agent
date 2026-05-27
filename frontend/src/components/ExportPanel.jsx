import { useEffect, useRef, useState } from 'react'
import useEditorStore from '../store/editorStore'

export default function ExportPanel() {
  const jobId = useEditorStore((s) => s.jobId)
  const cuts = useEditorStore((s) => s.cuts)
  const subtitles = useEditorStore((s) => s.subtitles)
  const selectedMusicId = useEditorStore((s) => s.selectedMusicId)
  const musicVolume = useEditorStore((s) => s.musicVolume)
  const exportId = useEditorStore((s) => s.exportId)
  const exportStatus = useEditorStore((s) => s.exportStatus)
  const exportProgress = useEditorStore((s) => s.exportProgress)
  const setExport = useEditorStore((s) => s.setExport)
  const setExportProgress = useEditorStore((s) => s.setExportProgress)
  const esRef = useRef(null)
  const [exportError, setExportError] = useState(null)

  async function startExport() {
    const res = await fetch('/api/export/' + jobId, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cuts, include_subtitles: subtitles.length > 0, music_id: selectedMusicId, music_volume: musicVolume }),
    })
    if (!res.ok) return
    const data = await res.json()
    setExport(data.export_id)
    if (esRef.current) esRef.current.close()
    const es = new EventSource('/api/export/progress/' + data.export_id)
    esRef.current = es
    es.onmessage = (e) => {
      const d = JSON.parse(e.data)
      setExportProgress(d.status, d.progress ?? 0)
      if (d.error) setExportError(d.error)
      if (d.status === 'done' || d.status === 'error') es.close()
    }
    es.onerror = () => { setExportProgress('error', 0); es.close() }
  }

  useEffect(() => () => esRef.current?.close(), [])
  const busy = exportStatus === 'pending' || exportStatus === 'exporting'

  return (
    <div>
      {exportStatus && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ color: '#a0a8b8', fontSize: 13, width: 80, fontWeight: 500 }}>导出进度</div>
            <div style={{ flex: 1, height: 8, background: 'rgba(255, 255, 255, 0.06)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 4, transition: 'width 400ms cubic-bezier(0.4,0,0.2,1)', background: 'linear-gradient(90deg, #00e5ff, #69f0ae, #b388ff)', backgroundSize: '200% 100%', animation: 'progressAurora 3s linear infinite', width: exportProgress + '%' }} />
            </div>
            <div style={{ width: 40, textAlign: 'right', fontSize: 13, color: '#a0a8b8', fontVariantNumeric: 'tabular-nums' }}>{Math.round(exportProgress)}%</div>
          </div>
          {exportStatus === 'done' && (
            <a href={'/api/export/download/' + exportId} download="edited_vlog.mp4"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 28px', background: 'linear-gradient(135deg, #69f0ae, #00e5ff)', color: '#06080f', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none', marginTop: 8, transition: 'all 200ms', boxShadow: '0 4px 16px rgba(105, 240, 174, 0.2)' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(105, 240, 174, 0.3)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(105, 240, 174, 0.2)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              下载视频
            </a>
          )}
          {exportStatus === 'error' && (
            <div style={{ fontSize: 13, color: '#ff80ab', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
              导出失败{exportError ? '：' + exportError : '，请重试'}
            </div>
          )}
        </div>
      )}
      <button style={{ padding: '12px 36px', background: busy ? 'rgba(255, 255, 255, 0.06)' : 'linear-gradient(135deg, #00e5ff, #b388ff)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)', boxShadow: busy ? 'none' : '0 4px 20px rgba(0, 229, 255, 0.2)', opacity: busy ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
        onClick={startExport} disabled={busy}
        onMouseEnter={(e) => { if (!busy) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(0, 229, 255, 0.3)' }}}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = busy ? 'none' : '0 4px 20px rgba(0, 229, 255, 0.2)' }}>
        {busy && <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />}
        {busy ? '导出中...' : '开始导出'}
      </button>
    </div>
  )
}
