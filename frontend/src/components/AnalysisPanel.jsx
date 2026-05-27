import { useEffect, useRef } from 'react'
import useEditorStore from '../store/editorStore'

const styles = {
  panel: { padding: '24px 0 0' },
  title: { fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#d0d4e0', display: 'flex', alignItems: 'center', gap: 8 },
  titleDot: { width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg, #69f0ae, #00e5ff)', flexShrink: 0 },
  row: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 },
  label: { width: 80, color: '#a0a8b8', fontSize: 13, fontWeight: 500 },
  bar: {
    flex: 1,
    height: 6,
    background: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 400ms cubic-bezier(0.4,0,0.2,1)',
    background: 'linear-gradient(90deg, #00e5ff, #69f0ae, #b388ff)',
    backgroundSize: '200% 100%',
    animation: 'progressAurora 3s linear infinite',
  },
  pct: { width: 36, textAlign: 'right', fontSize: 13, color: '#a0a8b8', fontVariantNumeric: 'tabular-nums' },
  status: { marginTop: 12, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 },
  btn: {
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #00e5ff 0%, #b388ff 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    marginTop: 8,
    cursor: 'pointer',
    transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
    boxShadow: '0 4px 16px rgba(0, 229, 255, 0.2)',
  },
  checkIcon: {
    width: 18,
    height: 18,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #69f0ae, #00e5ff)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
  const analysisStatus = useEditorStore((s) => s.analysisStatus)
  const analysisError = useEditorStore((s) => s.analysisError)
  const setAnalysisStage = useEditorStore((s) => s.setAnalysisStage)
  const setCuts = useEditorStore((s) => s.setCuts)
  const setSubtitles = useEditorStore((s) => s.setSubtitles)
  const setTranscript = useEditorStore((s) => s.setTranscript)
  const setDuration = useEditorStore((s) => s.setDuration)
  const esRef = useRef(null)

  function startAnalysis() {
    if (esRef.current) esRef.current.close()
    setAnalysisStage('transcribing', 0, null, '准备中...')
    const es = new EventSource(`/api/analyze/${jobId}`)
    esRef.current = es
    es.onmessage = async (e) => {
      const data = JSON.parse(e.data)
      if (data.error) { setAnalysisStage('error', 0, data.error); es.close(); return }
      if (data.stage) {
        setAnalysisStage(data.stage, data.progress ?? 0, null, data.status || '')
      } else if (data.progress !== undefined) {
        setAnalysisStage(undefined, data.progress, null, data.status || '')
      }
      if (data.stage === 'done') {
        es.close()
        const res = await fetch(`/api/cuts/${jobId}`)
        const payload = await res.json()
        setCuts(payload.cuts)
        setSubtitles(payload.subtitles)
        setTranscript(payload.transcript)
        setDuration(payload.duration)
      }
    }
    es.onerror = () => { setAnalysisStage('error', 0, 'SSE 连接断开，请检查后端是否正常运行'); es.close() }
  }

  useEffect(() => () => esRef.current?.close(), [])

  if (!stage) {
    return (
      <div style={styles.panel}>
        <button
          style={styles.btn}
          onClick={startAnalysis}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 229, 255, 0.3)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 229, 255, 0.2)' }}
        >
          开始分析
        </button>
      </div>
    )
  }

  const stages = ['transcribing', 'analyzing']

  return (
    <div style={styles.panel}>
      <div style={styles.title}>
        <div style={styles.titleDot} />
        分析进度
      </div>
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
      {stage !== 'done' && stage !== 'error' && analysisStatus && (
        <div style={{ marginTop: 4, fontSize: 12, color: '#a0a8b8', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#00e5ff', animation: 'pulse 1.5s ease-in-out infinite' }} />
          {analysisStatus}
        </div>
      )}
      {stage === 'done' && (
        <div style={{ ...styles.status, color: '#69f0ae' }}>
          <div style={styles.checkIcon}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          分析完成，请在下方编辑剪辑点
        </div>
      )}
      {stage === 'error' && analysisError?.includes('DEEPSEEK_API_KEY') && (
        <div style={{ ...styles.status, color: '#ffd54f', flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            需要配置 AI 分析服务
          </div>
          <div style={{ fontSize: 12, color: '#a0a8b8', paddingLeft: 24, lineHeight: 1.6 }}>
            请在后端启动前设置环境变量：<br />
            <code style={{ background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
              set DEEPSEEK_API_KEY=你的密钥
            </code><br />
            前往 <a href="https://platform.deepseek.com" target="_blank" rel="noreferrer" style={{ color: '#00e5ff' }}>platform.deepseek.com</a> 获取 API Key
          </div>
        </div>
      )}
      {stage === 'error' && analysisError && !analysisError.includes('DEEPSEEK_API_KEY') && (
        <div style={{ ...styles.status, color: '#ff80ab', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            分析失败
          </div>
          <div style={{ fontSize: 12, color: '#ff80ab', opacity: 0.8, paddingLeft: 24, wordBreak: 'break-all' }}>
            {analysisError}
          </div>
        </div>
      )}
      {stage === 'error' && !analysisError && (
        <div style={{ ...styles.status, color: '#ff80ab' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          分析失败，请重试
        </div>
      )}
    </div>
  )
}
