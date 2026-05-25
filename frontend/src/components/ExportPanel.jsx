import { useEffect, useRef } from 'react'
import useEditorStore from '../store/editorStore'

const styles = {
  section: { marginBottom: 16 },
  row: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  label: { color: '#aaa', fontSize: 13, width: 80 },
  bar: { flex: 1, height: 8, background: '#2a2a2a', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', background: '#e05', borderRadius: 4, transition: 'width 0.3s' },
  pct: { width: 40, textAlign: 'right', fontSize: 13, color: '#aaa' },
  btn: {
    padding: '12px 32px',
    background: '#e05',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnDisabled: { background: '#444', cursor: 'not-allowed' },
  downloadBtn: {
    display: 'inline-block',
    padding: '12px 32px',
    background: '#2a7',
    color: '#fff',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 700,
    textDecoration: 'none',
    marginTop: 8,
  },
  status: { fontSize: 13, color: '#888', marginTop: 8 },
  toggle: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 },
}

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

  async function startExport() {
    const res = await fetch(`/api/export/${jobId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cuts,
        include_subtitles: subtitles.length > 0,
        music_id: selectedMusicId,
        music_volume: musicVolume,
      }),
    })
    if (!res.ok) return
    const data = await res.json()
    setExport(data.export_id)

    if (esRef.current) esRef.current.close()
    const es = new EventSource(`/api/export/progress/${data.export_id}`)
    esRef.current = es
    es.onmessage = (e) => {
      const d = JSON.parse(e.data)
      setExportProgress(d.status, d.progress ?? 0)
      if (d.status === 'done' || d.status === 'error') es.close()
    }
    es.onerror = () => { setExportProgress('error', 0); es.close() }
  }

  useEffect(() => () => esRef.current?.close(), [])

  const busy = exportStatus === 'pending' || exportStatus === 'exporting'

  return (
    <div>
      {exportStatus && (
        <div style={styles.section}>
          <div style={styles.row}>
            <div style={styles.label}>导出进度</div>
            <div style={styles.bar}>
              <div style={{ ...styles.fill, width: `${exportProgress}%` }} />
            </div>
            <div style={styles.pct}>{Math.round(exportProgress)}%</div>
          </div>
          {exportStatus === 'done' && (
            <a
              href={`/api/export/download/${exportId}`}
              download="edited_vlog.mp4"
              style={styles.downloadBtn}
            >
              下载视频
            </a>
          )}
          {exportStatus === 'error' && (
            <div style={{ ...styles.status, color: '#f55' }}>导出失败，请重试</div>
          )}
        </div>
      )}
      <button
        style={{ ...styles.btn, ...(busy ? styles.btnDisabled : {}) }}
        onClick={startExport}
        disabled={busy}
      >
        {busy ? '导出中...' : '开始导出'}
      </button>
    </div>
  )
}
