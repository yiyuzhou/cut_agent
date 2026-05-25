import { useEffect, useRef } from 'react'
import useEditorStore from '../store/editorStore'

const styles = {
  panel: { padding: '24px 0' },
  title: { fontSize: 16, fontWeight: 600, marginBottom: 16 },
  row: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  label: { width: 80, color: '#aaa', fontSize: 13 },
  bar: { flex: 1, height: 6, background: '#2a2a2a', borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', background: '#e05', borderRadius: 3, transition: 'width 0.3s' },
  pct: { width: 36, textAlign: 'right', fontSize: 13, color: '#aaa' },
  status: { marginTop: 8, fontSize: 13, color: '#888' },
  btn: {
    padding: '10px 28px',
    background: '#e05',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    marginTop: 8,
  },
}

const STAGE_LABELS = {
  transcribing: '语音转录',
  analyzing: 'AI 分析',
  done: '完成',
}

export default function AnalysisPanel() {
  const jobId = useEditorStore((s) => s.jobId)
  const stage = useEditorStore((s) => s.analysisStage)
  const progress = useEditorStore((s) => s.analysisProgress)
  const setAnalysisStage = useEditorStore((s) => s.setAnalysisStage)
  const setCuts = useEditorStore((s) => s.setCuts)
  const setSubtitles = useEditorStore((s) => s.setSubtitles)
  const setTranscript = useEditorStore((s) => s.setTranscript)
  const setDuration = useEditorStore((s) => s.setDuration)
  const esRef = useRef(null)

  function startAnalysis() {
    if (esRef.current) esRef.current.close()
    setAnalysisStage('transcribing', 0)

    const es = new EventSource(`/api/analyze/${jobId}`)
    esRef.current = es

    es.onmessage = async (e) => {
      const data = JSON.parse(e.data)
      if (data.error) {
        setAnalysisStage('error', 0)
        es.close()
        return
      }
      if (data.heartbeat) return  // 忽略心跳包
      if (data.stage) {
        setAnalysisStage(data.stage, data.progress ?? 0)
      }
      if (data.stage === 'done') {
        es.close()
        // Fetch cuts
        const res = await fetch(`/api/cuts/${jobId}`)
        const payload = await res.json()
        setCuts(payload.cuts)
        setSubtitles(payload.subtitles)
        setTranscript(payload.transcript)
        setDuration(payload.duration)
      }
    }

    es.onerror = () => {
      setAnalysisStage('error', 0)
      es.close()
    }
  }

  useEffect(() => () => esRef.current?.close(), [])

  if (!stage) {
    return (
      <div style={styles.panel}>
        <button style={styles.btn} onClick={startAnalysis}>开始分析</button>
      </div>
    )
  }

  const stages = ['transcribing', 'analyzing']

  return (
    <div style={styles.panel}>
      <div style={styles.title}>分析进度</div>
      {stages.map((s) => {
        const isActive = stage === s
        const isDone = stages.indexOf(s) < stages.indexOf(stage) || stage === 'done'
        const pct = isDone ? 100 : isActive ? progress : 0
        return (
          <div key={s} style={styles.row}>
            <div style={styles.label}>{STAGE_LABELS[s]}</div>
            <div style={styles.bar}>
              <div style={{ ...styles.fill, width: `${pct}%` }} />
            </div>
            <div style={styles.pct}>{pct}%</div>
          </div>
        )
      })}
      {stage === 'done' && (
        <div style={{ ...styles.status, color: '#4c4' }}>分析完成，请在下方编辑剪辑点</div>
      )}
      {stage === 'error' && (
        <div style={{ ...styles.status, color: '#f55' }}>分析失败，请重试</div>
      )}
    </div>
  )
}
