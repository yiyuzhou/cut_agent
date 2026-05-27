import { useRef } from 'react'
import useEditorStore from './store/editorStore'
import UploadZone from './components/UploadZone'
import AnalysisPanel from './components/AnalysisPanel'
import Timeline from './components/Timeline'
import TranscriptPanel from './components/TranscriptPanel'
import MusicPicker from './components/MusicPicker'
import ExportPanel from './components/ExportPanel'

const glass = {
  background: 'rgba(255, 255, 255, 0.04)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: 20,
}

const styles = {
  app: {
    position: 'relative',
    zIndex: 1,
    maxWidth: 1100,
    margin: '0 auto',
    padding: '32px 24px 64px',
  },
  header: {
    marginBottom: 36,
    animation: 'fadeInUp 0.6s ease-out',
  },
  h1: {
    fontSize: 30,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    background: 'linear-gradient(135deg, #00e5ff 0%, #b388ff 50%, #ff80ab 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  sub: {
    color: '#636b7d',
    fontSize: 14,
    marginTop: 6,
    fontWeight: 400,
  },
  card: {
    ...glass,
    padding: '24px 28px',
    marginBottom: 20,
    transition: 'border-color 250ms cubic-bezier(0.4,0,0.2,1), box-shadow 250ms cubic-bezier(0.4,0,0.2,1)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 16,
    color: '#d0d4e0',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00e5ff, #b388ff)',
    flexShrink: 0,
  },
  videoWrap: {
    position: 'relative',
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 16,
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  video: { width: '100%', maxHeight: 400, display: 'block' },
  cols: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 20,
  },
}

function GlassCard({ children, style, sectionTitle }) {
  return (
    <div
      style={{ ...styles.card, ...style }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.14)'
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 229, 255, 0.06)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {sectionTitle && (
        <div style={styles.sectionTitle}>
          <div style={styles.sectionDot} />
          {sectionTitle}
        </div>
      )}
      {children}
    </div>
  )
}

export default function App() {
  const jobId = useEditorStore((s) => s.jobId)
  const videoUrl = useEditorStore((s) => s.videoUrl)
  const analysisStage = useEditorStore((s) => s.analysisStage)
  const cuts = useEditorStore((s) => s.cuts)
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime)
  const reset = useEditorStore((s) => s.reset)
  const videoRef = useRef(null)

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.h1}>Cut Agent</div>
        <div style={styles.sub}>Vlog 自动剪辑 · AI 驱动</div>
      </div>

      {/* Upload */}
      {!jobId && (
        <GlassCard>
          <UploadZone />
        </GlassCard>
      )}

      {/* Video player + analysis */}
      {jobId && (
        <>
          <GlassCard>
            <div style={styles.videoWrap}>
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                style={styles.video}
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
              />
            </div>
            <AnalysisPanel />
          </GlassCard>

          {/* Timeline + transcript */}
          {analysisStage === 'done' && cuts.length > 0 && (
            <GlassCard sectionTitle="剪辑时间轴">
              <Timeline videoRef={videoRef} />
            </GlassCard>
          )}

          {analysisStage === 'done' && (
            <div style={styles.cols}>
              <GlassCard sectionTitle="转录文本">
                <TranscriptPanel videoRef={videoRef} />
              </GlassCard>
              <GlassCard sectionTitle="背景音乐">
                <MusicPicker />
              </GlassCard>
            </div>
          )}

          {analysisStage === 'done' && (
            <GlassCard sectionTitle="导出">
              <ExportPanel />
            </GlassCard>
          )}

          {/* Reset button */}
          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <button
              onClick={reset}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#636b7d',
                padding: '8px 20px',
                borderRadius: 10,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 200ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,128,171,0.3)'
                e.currentTarget.style.color = '#ff80ab'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                e.currentTarget.style.color = '#636b7d'
              }}
            >
              重新开始
            </button>
          </div>
        </>
      )}
    </div>
  )
}
