import { useEffect, useRef, useState } from 'react'
import useEditorStore from '../store/editorStore'

export default function MusicPicker() {
  const tracks = useEditorStore((s) => s.tracks)
  const setTracks = useEditorStore((s) => s.setTracks)
  const selectedMusicId = useEditorStore((s) => s.selectedMusicId)
  const selectMusic = useEditorStore((s) => s.selectMusic)
  const musicVolume = useEditorStore((s) => s.musicVolume)
  const setMusicVolume = useEditorStore((s) => s.setMusicVolume)
  const audioRef = useRef(null)
  const [playingId, setPlayingId] = useState(null)

  useEffect(() => {
    fetch('/api/music').then((r) => r.json()).then((d) => setTracks(d.tracks || []))
  }, [setTracks])

  function togglePreview(track) {
    if (!audioRef.current) return
    if (playingId === track.id) {
      audioRef.current.pause()
      setPlayingId(null)
    } else {
      audioRef.current.src = '/api/music/' + track.id + '/preview'
      audioRef.current.play()
      setPlayingId(track.id)
    }
  }

  return (
    <div>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        <MusicCard title="不添加背景音乐" selected={selectedMusicId === null} onClick={() => selectMusic(null)} muted />
        {tracks.map((track) => (
          <MusicCard key={track.id} title={track.title} subtitle={track.artist} selected={selectedMusicId === track.id} playing={playingId === track.id} onClick={() => selectMusic(track.id)} onPlay={(e) => { e.stopPropagation(); togglePreview(track) }} />
        ))}
      </div>
      {selectedMusicId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14 }}>
          <div style={{ color: '#a0a8b8', fontSize: 13, flexShrink: 0, fontWeight: 500 }}>音乐音量</div>
          <input type="range" min={0} max={1} step={0.05} value={musicVolume} onChange={(e) => setMusicVolume(parseFloat(e.target.value))} style={{ flex: 1 }} />
          <div style={{ color: '#a0a8b8', fontSize: 13, minWidth: 36, fontVariantNumeric: 'tabular-nums' }}>{Math.round(musicVolume * 100)}%</div>
        </div>
      )}
    </div>
  )
}

function MusicCard({ title, subtitle, selected, playing, muted, onClick, onPlay }) {
  const [hovering, setHovering] = useState(false)
  return (
    <div onClick={onClick} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}
      style={{
        background: selected ? 'rgba(0, 229, 255, 0.08)' : hovering ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
        borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
        border: '1px solid ' + (selected ? 'rgba(0, 229, 255, 0.3)' : hovering ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'),
        transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
        boxShadow: selected ? '0 0 20px rgba(0, 229, 255, 0.08)' : 'none',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: subtitle ? 3 : 0, color: muted ? '#636b7d' : '#e8ecf4' }}>{title}</div>
      {subtitle && <div style={{ color: '#636b7d', fontSize: 12, marginBottom: 10 }}>{subtitle}</div>}
      {onPlay && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ background: playing ? 'linear-gradient(135deg, #ff80ab, #b388ff)' : 'rgba(255, 255, 255, 0.08)', border: 'none', color: '#fff', borderRadius: 8, padding: '5px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 500, transition: 'all 200ms', display: 'flex', alignItems: 'center', gap: 4 }}
            onClick={onPlay} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              {playing ? <><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></> : <polygon points="5,3 19,12 5,21" />}
            </svg>
            {playing ? '停止' : '试听'}
          </button>
        </div>
      )}
    </div>
  )
}
