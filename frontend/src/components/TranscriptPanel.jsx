import { useState } from 'react'
import useEditorStore from '../store/editorStore'
import { formatTime } from '../utils/timeFormat'

export default function TranscriptPanel({ videoRef }) {
  const transcript = useEditorStore((s) => s.transcript)
  const currentTime = useEditorStore((s) => s.currentTime)

  if (!transcript.length) return null

  function seekTo(t) {
    if (videoRef?.current) videoRef.current.currentTime = t
  }

  return (
    <div style={ { maxHeight: 320, overflowY: 'auto', fontSize: 13 } }>
      {transcript.map((seg, i) => {
        const active = currentTime >= seg.start && currentTime < seg.end
        return <TranscriptRow key={i} seg={seg} active={active} onClick={() => seekTo(seg.start)} />
      })}
    </div>
  )
}

function TranscriptRow({ seg, active, onClick }) {
  const [hvering, setHvering] = useState(false)

  return (
    <div onMouseEnter={() => setHvering(true)} onMouseLeave={() => setHvering(false)}
      style={{
        display: 'flex', gap: 10, padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
        transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
        background: active ? 'rgba(0, 229, 255, 0.08)' : hvering ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
        borderLeft: active ? '2px solid #00e5ff' : '2px solid transparent',
        marginBottom: 2,
      }}
    >
      <div style={{
          color: active ? '#00e5ff' : '#636b7d',
          flexShrink: 0, minWidth: 120, fontVariantNumeric: 'tabular-nums',
          fontSize: 12, fontWeight: active ? 600 : 400,
          transition: 'color 200ms',
        }}
    >
        {formatTime(seg.start)} → {formatTime(seg.end)}
      </div>
      <div style={{
        color: active ? '#e8ecf4' : '#a0a8b8',
        lineHeight: 1.5, transition: 'color 200ms',
      }}
    >
      {seg.text}
    </div>
    </div>
  )
}
