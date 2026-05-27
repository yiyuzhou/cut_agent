import { useState } from 'react'
import useEditorStore from '../store/editorStore'
import { formatTime } from '../utils/timeFormat'

const TYPE_COLORS = {
  silence: { bg: 'rgba(120, 130, 160, 0.15)', text: '#8892a8', border: 'rgba(120, 130, 160, 0.25)' },
  filler: { bg: 'rgba(255, 183, 77, 0.12)', text: '#ffb74d', border: 'rgba(255, 183, 77, 0.25)' },
  repetition: { bg: 'rgba(68, 138, 255, 0.12)', text: '#448aff', border: 'rgba(68, 138, 255, 0.25)' },
  pause: { bg: 'rgba(120, 130, 160, 0.1)', text: '#8892a8', border: 'rgba(120, 130, 160, 0.2)' },
  off_topic: { bg: 'rgba(179, 136, 255, 0.12)', text: '#b388ff', border: 'rgba(179, 136, 255, 0.25)' },
  user: { bg: 'rgba(0, 229, 255, 0.12)', text: '#00e5ff', border: 'rgba(0, 229, 255, 0.25)' },
}

const TYPE_LABELS = {
  silence: '静音',
  filler: '口误',
  repetition: '重复',
  pause: '停顿',
  off_topic: '离题',
  user: '手动',
}

export default function CutSegmentRow({ cut }) {
  const toggleCut = useEditorStore((s) => s.toggleCut)
  const [hovering, setHovering] = useState(false)
  const colors = TYPE_COLORS[cut.type] || TYPE_COLORS.silence
  const isEnabled = cut.enabled

  return (
    <div
      style={{
        background: hovering ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.02)',
        borderRadius: 10,
        padding: '10px 14px',
        marginBottom: 4,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        opacity: isEnabled ? 1 : 0.4,
        transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
        border: '1px solid transparent',
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div style={{
        fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6,
        color: colors.text, background: colors.bg, border: '1px solid ' + colors.border,
        flexShrink: 0, letterSpacing: '0.5px',
      }}>
        {TYPE_LABELS[cut.type] || cut.type}
      </div>
      <div style={{ fontSize: 12, color: '#a0a8b8', flexShrink: 0, minWidth: 120, fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(cut.start)} → {formatTime(cut.end)}
      </div>
      <div style={{ fontSize: 12, color: '#d0d4e0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
        {cut.reasoning || cut.transcript_text || '—'}
      </div>
      <button
        style={{
          width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', flexShrink: 0,
          transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
          background: isEnabled ? 'linear-gradient(135deg, #00e5ff, #448aff)' : 'rgba(255,255,255,0.08)',
          color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: isEnabled ? '0 2px 8px rgba(0,229,255,0.2)' : 'none',
        }}
        onClick={() => toggleCut(cut.id)}
        title={isEnabled ? '点击保留此段' : '点击剪掉此段'}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isEnabled ? '剪' : '留'}
      </button>
    </div>
  )
}
