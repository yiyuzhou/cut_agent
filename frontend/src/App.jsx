import { useRef } from 'react'
import useEditorStore from './store/editorStore'
import UploadZone from './components/UploadZone'
import AnalysisPanel from './components/AnalysisPanel'
import Timeline from './components/Timeline'
import TranscriptPanel from './components/TranscriptPanel'
import MusicPicker from './components/MusicPicker'
import ExportPanel from './components/ExportPanel'

const styles = {
  app: { maxWidth: 1100, margin: '0 auto', padding: '32px 24px' },
  header: { marginBottom: 32 },
  h1: { fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' },
  sub: { color: '#666', fontSize: 14, marginTop: 4 },
  card: { background: '#161616', borderRadius: 12, padding: '24px 28px', marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#ddd' },
  videoWrap: { position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  video: { width: '100%', maxHeight: 400, display: 'block' },
  cols: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 },
}

export default function App() {
  const jobId = useEditorStore((s) => s.jobId)
  const videoUrl = useEditorStore((s) => s.videoUrl)
  const analysisStage = useEditorStore((s) => s.analysisStage)
  const cuts = useEditorStore((s) => s.cuts)
  const setCurrentTime = useEditorStore((s) => s.setCurrentTime)
  const videoRef = useRef(null)

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <div style={styles.h1}>Cut Agent</div>
        <div style={styles.sub}>Vlog 自动剪辑 · AI 驱动</div>
      </div>

      {/* Upload */}
      {!jobId && (
        <div style={styles.card}>
          <UploadZone />
        </div>
      )}

      {/* Video player + analysis */}
      {jobId && (
        <>
          <div style={styles.card}>
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
          </div>

          {/* Timeline + transcript */}
          {analysisStage === 'done' && cuts.length > 0 && (
            <div style={styles.card}>
              <div style={styles.sectionTitle}>剪辑时间轴</div>
              <Timeline videoRef={videoRef} />
            </div>
          )}

          {analysisStage === 'done' && (
            <div style={styles.cols}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>转录文本</div>
                <TranscriptPanel videoRef={videoRef} />
              </div>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>背景音乐</div>
                <MusicPicker />
              </div>
            </div>
          )}

          {analysisStage === 'done' && (
            <div style={styles.card}>
              <div style={styles.sectionTitle}>导出</div>
              <ExportPanel />
            </div>
          )}
        </>
      )}
    </div>
  )
}
