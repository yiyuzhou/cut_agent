import { useRef, useCallback } from 'react'
import useEditorStore from '../store/editorStore'
import CutSegmentRow from './CutSegment'
import { formatTime } from '../utils/timeFormat'

const RULER_HEIGHT = 24
const TRACK_HEIGHT = 40
const HANDLE_W = 6

const TYPE_COLORS = {
  silence: '#555',
  filler: '#c84',
  repetition: '#48c',
  pause: '#666',
  off_topic: '#a4c',
  user: '#e05',
}

function useDrag(onMove, onEnd) {
  const state = useRef(null)

  const onMouseDown = useCallback((e, data) => {
    e.preventDefault()
    state.current = { startX: e.clientX, data }
    const move = (ev) => onMove(ev.clientX - state.current.startX, state.current.data)
    const up = () => { onEnd?.(); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }, [onMove, onEnd])

  return onMouseDown
}

export default function Timeline({ videoRef }) {
  const duration = useEditorStore((s) => s.duration)
  const cuts = useEditorStore((s) => s.cuts)
  const currentTime = useEditorStore((s) => s.currentTime)
  const adjustCut = useEditorStore((s) => s.adjustCut)
  const addUserCut = useEditorStore((s) => s.addUserCut)
  const containerRef = useRef(null)

  const toX = useCallback((t) => duration > 0 ? (t / duration) * 100 : 0, [duration])
  const toTime = useCallback((px) => {
    if (!containerRef.current || duration <= 0) return 0
    return Math.max(0, Math.min(duration, (px / containerRef.current.clientWidth) * duration))
  }, [duration])

  const onDragHandle = useDrag(
    (dx, { id, side, origStart, origEnd }) => {
      if (!containerRef.current) return
      const dt = (dx / containerRef.current.clientWidth) * duration
      if (side === 'left') {
        adjustCut(id, Math.max(0, Math.min(origStart + dt, origEnd - 0.5)), origEnd)
      } else {
        adjustCut(id, origStart, Math.max(origStart + 0.5, Math.min(origEnd + dt, duration)))
      }
    }
  )

  function onTimelineClick(e) {
    if (!containerRef.current || !videoRef?.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const t = toTime(e.clientX - rect.left)
    videoRef.current.currentTime = t
  }

  // Ruler ticks
  const ticks = []
  if (duration > 0) {
    const step = duration <= 60 ? 5 : duration <= 300 ? 30 : 60
    for (let t = 0; t <= duration; t += step) {
      ticks.push(t)
    }
  }

  const enabledCuts = cuts.filter((c) => c.enabled)

  return (
    <div>
      {/* Visual timeline */}
      <div
        ref={containerRef}
        style={{ position: 'relative', height: RULER_HEIGHT + TRACK_HEIGHT, background: '#111', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', userSelect: 'none' }}
        onClick={onTimelineClick}
      >
        {/* Ruler */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: RULER_HEIGHT, background: '#1a1a1a', display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>
          {ticks.map((t) => (
            <div key={t} style={{ position: 'absolute', left: `${toX(t)}%`, transform: 'translateX(-50%)', fontSize: 10, color: '#666' }}>
              {formatTime(t)}
            </div>
          ))}
        </div>

        {/* Track background */}
        <div style={{ position: 'absolute', top: RULER_HEIGHT, left: 0, right: 0, height: TRACK_HEIGHT, background: '#1e1e1e' }} />

        {/* Cut blocks */}
        {cuts.map((cut) => {
          const left = toX(cut.start)
          const width = toX(cut.end) - toX(cut.start)
          const color = TYPE_COLORS[cut.type] || '#555'
          return (
            <div
              key={cut.id}
              style={{
                position: 'absolute',
                top: RULER_HEIGHT + 4,
                height: TRACK_HEIGHT - 8,
                left: `${left}%`,
                width: `${Math.max(width, 0.3)}%`,
                background: cut.enabled ? color : '#333',
                borderRadius: 3,
                opacity: cut.enabled ? 0.85 : 0.4,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Left handle */}
              <div
                style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: HANDLE_W, cursor: 'ew-resize', background: 'rgba(255,255,255,0.2)', borderRadius: '3px 0 0 3px' }}
                onMouseDown={(e) => onDragHandle(e, { id: cut.id, side: 'left', origStart: cut.start, origEnd: cut.end })}
              />
              {/* Right handle */}
              <div
                style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: HANDLE_W, cursor: 'ew-resize', background: 'rgba(255,255,255,0.2)', borderRadius: '0 3px 3px 0' }}
                onMouseDown={(e) => onDragHandle(e, { id: cut.id, side: 'right', origStart: cut.start, origEnd: cut.end })}
              />
            </div>
          )
        })}

        {/* Playhead */}
        {duration > 0 && (
          <div style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: `${toX(currentTime)}%`,
            width: 2,
            background: '#fff',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* Cut list */}
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
          共 {cuts.length} 个剪辑点 · {enabledCuts.length} 个已启用
        </div>
        {cuts.map((cut) => <CutSegmentRow key={cut.id} cut={cut} />)}
      </div>
    </div>
  )
}
