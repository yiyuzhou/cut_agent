import { useEffect, useRef, useState } from 'react'
import useEditorStore from '../store/editorStore'

const styles = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 },
  card: {
    background: '#1a1a1a',
    borderRadius: 8,
    padding: '12px 14px',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'border-color 0.2s',
  },
  cardSelected: { borderColor: '#e05' },
  title: { fontWeight: 600, fontSize: 14, marginBottom: 2 },
  artist: { color: '#888', fontSize: 12, marginBottom: 8 },
  controls: { display: 'flex', alignItems: 'center', gap: 8 },
  playBtn: {
    background: '#333',
    border: 'none',
    color: '#fff',
    borderRadius: 4,
    padding: '4px 10px',
    fontSize: 12,
    cursor: 'pointer',
  },
  volRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 },
  volLabel: { color: '#888', fontSize: 13, flexShrink: 0 },
  none: {
    background: '#1a1a1a',
    borderRadius: 8,
    padding: '12px 14px',
    cursor: 'pointer',
    border: '2px solid transparent',
    color: '#888',
    fontSize: 14,
    transition: 'border-color 0.2s',
  },
}

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
      audioRef.current.src = `/api/music/${track.id}/preview`
      audioRef.current.play()
      setPlayingId(track.id)
    }
  }

  return (
    <div>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />
      <div style={styles.grid}>
        <div
          style={{ ...styles.none, ...(selectedMusicId === null ? { borderColor: '#e05' } : {}) }}
          onClick={() => selectMusic(null)}
        >
          不添加背景音乐
        </div>
        {tracks.map((track) => (
          <div
            key={track.id}
            style={{ ...styles.card, ...(selectedMusicId === track.id ? styles.cardSelected : {}) }}
            onClick={() => selectMusic(track.id)}
          >
            <div style={styles.title}>{track.title}</div>
            <div style={styles.artist}>{track.artist}</div>
            <div style={styles.controls}>
              <button
                style={styles.playBtn}
                onClick={(e) => { e.stopPropagation(); togglePreview(track) }}
              >
                {playingId === track.id ? '⏹ 停止' : '▶ 试听'}
              </button>
            </div>
          </div>
        ))}
      </div>
      {selectedMusicId && (
        <div style={styles.volRow}>
          <div style={styles.volLabel}>音乐音量</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={musicVolume}
            onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
            style={{ flex: 1 }}
          />
          <div style={{ color: '#aaa', fontSize: 13, minWidth: 36 }}>{Math.round(musicVolume * 100)}%</div>
        </div>
      )}
    </div>
  )
}
