import useEditorStore from '../store/editorStore'
import { formatTime } from '../utils/timeFormat'

const TYPE_COLORS = {
  silence: '#555',
  filler: '#c84',
  repetition: '#48c',
  pause: '#555',
  off_topic: '#a4c',
  user: '#e05',
}

const TYPE_LABELS = {
  silence: '静音',
  filler: '口误',
  repetition: '重复',
  pause: '停顿',
  off_topic: '离题',
  user: '手动',
}

const styles = {
  wrap: {
    background: '#1a1a1a',
    borderRadius: 8,
    padding: '8px 12px',
    marginBottom: 4,
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    opacity: 1,
    transition: 'opacity 0.2s',
  },
  wrapDisabled: { opacity: 0.4 },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    padding: '2px 7px',
    borderRadius: 4,
    color: '#fff',
    flexShrink: 0,
  },
  time: { fontSize: 12, color: '#aaa', flexShrink: 0, minWidth: 120 },
  text: { fontSize: 12, color: '#ccc', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  toggle: {
    width: 36,
    height: 20,
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.2s',
  },
}

export default function CutSegmentRow({ cut }) {
  const toggleCut = useEditorStore((s) => s.toggleCut)
  const color = TYPE_COLORS[cut.type] || '#555'

  return (
    <div style={{ ...styles.wrap, ...(cut.enabled ? {} : styles.wrapDisabled) }}>
      <div style={{ ...styles.badge, background: color }}>{TYPE_LABELS[cut.type] || cut.type}</div>
      <div style={styles.time}>{formatTime(cut.start)} → {formatTime(cut.end)}</div>
      <div style={styles.text}>{cut.transcript_text || '—'}</div>
      <button
        style={{ ...styles.toggle, background: cut.enabled ? '#e05' : '#333' }}
        onClick={() => toggleCut(cut.id)}
        title={cut.enabled ? '点击保留此段' : '点击剪掉此段'}
      >
        {cut.enabled ? '剪' : '留'}
      </button>
    </div>
  )
}
