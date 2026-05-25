import useEditorStore from '../store/editorStore'
import { formatTime } from '../utils/timeFormat'

const styles = {
  panel: { maxHeight: 280, overflowY: 'auto', fontSize: 13 },
  seg: {
    display: 'flex',
    gap: 10,
    padding: '6px 0',
    borderBottom: '1px solid #1e1e1e',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  segActive: { background: '#1e1e1e', borderRadius: 4 },
  time: { color: '#e05', flexShrink: 0, minWidth: 90, fontVariantNumeric: 'tabular-nums' },
  text: { color: '#ccc', lineHeight: 1.5 },
}

export default function TranscriptPanel({ videoRef }) {
  const transcript = useEditorStore((s) => s.transcript)
  const currentTime = useEditorStore((s) => s.currentTime)

  if (!transcript.length) return null

  function seekTo(t) {
    if (videoRef?.current) videoRef.current.currentTime = t
  }

  return (
    <div style={styles.panel}>
      {transcript.map((seg, i) => {
        const active = currentTime >= seg.start && currentTime < seg.end
        return (
          <div
            key={i}
            style={{ ...styles.seg, ...(active ? styles.segActive : {}) }}
            onClick={() => seekTo(seg.start)}
          >
            <div style={styles.time}>{formatTime(seg.start)}</div>
            <div style={styles.text}>{seg.text}</div>
          </div>
        )
      })}
    </div>
  )
}
