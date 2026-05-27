import { useRef, useCallback } from 'react'
import useEditorStore from '../store/editorStore'
import CutSegmentRow from './CutSegment'
import { formatTime } from '../utils/timeFormat'

const RULER_HEIGHT = 28
const TRACK_HEIGHT = 44
const HANDLE_W = 8

const TYPE_COLORS = {
  silence: 'rgba(120, 130, 160, 0.6)',
  filler: 'rgba(255, 183, 77, 0.7)',
  repetition: 'rgba(68, 138, 255, 0.7)',
  pause: 'rgba(120, 130, 160, 0.5)',
  off_topic: 'rgba(179, 136, 255, 0.7)',
  user: 'rgba(0, 229, 255, 0.7)',
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
  const jobId = useEditorStore((s) => s.jobId)
  const previewUrl = useEditorStore((s) => s.previewUrl)
  const previewLoading = useEditorStore((s) => s.previewLoading)
  const setPreviewUrl = useEditorStore((s) => s.setPreviewUrl)
  const setPreviewLoading = useEditorStore((s) => s.setPreviewLoading)
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

  const ticks = []
  if (duration > 0) {
    const step = duration <= 60 ? 5 : duration <= 300 ? 30 : 60
    for (let t = 0; t <= duration; t += step) ticks.push(t)
  }

  const enabledCuts = cuts.filter((c) => c.enabled)

  async function applyPreview() {
    setPreviewLoading(true)
    setPreviewUrl(null)
    try {
      const res = await fetch('/api/preview/' + jobId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuts: cuts.filter((c) => c.enabled), music_id: null, music_volume: 0, include_subtitles: false }),
      })
      if (!res.ok) throw new Error(await res.text())
      const blob = await res.blob()
      setPreviewUrl(URL.createObjectURL(blob))
    } catch (e) {
      console.error('Preview failed:', e)
    } finally {
      setPreviewLoading(false)
    }
  }
  return (
    <div>
      <div ref={containerRef}
        style={{ position: 'relative', height: RULER_HEIGHT + TRACK_HEIGHT, background: 'rgba(255,255,255,0.03)', borderRadius: 12, overflow: 'hidden', cursor: 'pointer', userSelect: 'none', border: '1px solid rgba(255,255,255,0.06)' }}
        onClick={onTimelineClick}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: RULER_HEIGHT, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'flex-end', paddingBottom: 2, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          {ticks.map((t) => (
            <div key={t} style={{ position: 'absolute', left: toX(t) + '%', transform: 'translateX(-50%)', fontSize: 10, color: '#636b7d', fontVariantNumeric: 'tabular-nums' }}>{formatTime(t)}</div>
          ))}
        </div>
        <div style={{ position: 'absolute', top: RULER_HEIGHT, left: 0, right: 0, height: TRACK_HEIGHT, background: 'rgba(255,255,255,0.015)' }} />
        {cuts.map((cut) => {
          const left = toX(cut.start)
          const width = toX(cut.end) - toX(cut.start)
          const color = TYPE_COLORS[cut.type] || 'rgba(120,130,160,0.5)'
          return (
            <div key={cut.id} style={{ position: 'absolute', top: RULER_HEIGHT + 5, height: TRACK_HEIGHT - 10, left: left + '%', width: Math.max(width, 0.3) + '%', background: cut.enabled ? color : 'rgba(255,255,255,0.08)', borderRadius: 4, opacity: cut.enabled ? 1 : 0.35, transition: 'opacity 200ms' }} onClick={(e) => e.stopPropagation()}>
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: HANDLE_W, cursor: 'ew-resize', background: 'rgba(255,255,255,0.15)', borderRadius: '4px 0 0 4px', transition: 'background 150ms' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,229,255,0.4)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'} onMouseDown={(e) => onDragHandle(e, { id: cut.id, side: 'left', origStart: cut.start, origEnd: cut.end })} />
              <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: HANDLE_W, cursor: 'ew-resize', background: 'rgba(255,255,255,0.15)', borderRadius: '0 4px 4px 0', transition: 'background 150ms' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,229,255,0.4)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'} onMouseDown={(e) => onDragHandle(e, { id: cut.id, side: 'right', origStart: cut.start, origEnd: cut.end })} />
            </div>
          )
        })}
        {duration > 0 && (
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: toX(currentTime) + '%', width: 2, background: 'linear-gradient(180deg, #00e5ff, #b388ff)', pointerEvents: 'none', boxShadow: '0 0 8px rgba(0,229,255,0.5)' }} />
        )}
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontSize: 13, color: '#636b7d', marginBottom: 8, fontVariantNumeric: 'tabular-nums' }}>{'共 ' + cuts.length + ' 个剪辑点 · ' + enabledCuts.length + ' 个已启用'}</div>
        {cuts.map((cut) => <CutSegmentRow key={cut.id} cut={cut} />)}
      </div>
      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={applyPreview} disabled={previewLoading} style={{ padding: '10px 24px', background: previewLoading ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #00e5ff, #69f0ae)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: previewLoading ? 'not-allowed' : 'pointer', marginBottom: 12, transition: 'all 200ms', boxShadow: previewLoading ? 'none' : '0 4px 16px rgba(0,229,255,0.15)', opacity: previewLoading ? 0.6 : 1 }}
          onMouseEnter={(e) => { if (!previewLoading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,229,255,0.25)' }}}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = previewLoading ? 'none' : '0 4px 16px rgba(0,229,255,0.15)' }}>
          {previewLoading ? '生成试看中...' : '应用剪辑 → 试看'}
        </button>
        {previewUrl && (
          <div style={{ background: 'rgba(0,0,0,0.4)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <video src={previewUrl} controls style={{ width: '100%', maxHeight: 300, display: 'block' }} />
          </div>
        )}
      </div>
    </div>
  )
}
