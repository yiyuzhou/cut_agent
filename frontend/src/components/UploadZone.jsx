import { useRef, useState } from 'react'
import useEditorStore from '../store/editorStore'

const styles = {
  zone: {
    border: '2px dashed rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: '60px 40px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 300ms cubic-bezier(0.4,0,0.2,1)',
    background: 'rgba(255, 255, 255, 0.02)',
    position: 'relative',
    overflow: 'hidden',
  },
  zoneActive: {
    borderColor: 'rgba(0, 229, 255, 0.5)',
    background: 'rgba(0, 229, 255, 0.05)',
    boxShadow: '0 0 40px rgba(0, 229, 255, 0.08), inset 0 0 40px rgba(0, 229, 255, 0.03)',
  },
  zoneHover: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
    background: 'rgba(255, 255, 255, 0.03)',
  },
  title: {
    fontSize: 20,
    fontWeight: 600,
    marginBottom: 8,
    color: '#e8ecf4',
  },
  sub: {
    color: '#636b7d',
    fontSize: 14,
    marginBottom: 24,
  },
  btn: {
    marginTop: 0,
    padding: '12px 32px',
    background: 'linear-gradient(135deg, #00e5ff 0%, #448aff 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 200ms cubic-bezier(0.4,0,0.2,1)',
    boxShadow: '0 4px 16px rgba(0, 229, 255, 0.2)',
  },
  progress: {
    marginTop: 16,
    color: '#a0a8b8',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  spinner: {
    width: 16,
    height: 16,
    border: '2px solid rgba(0, 229, 255, 0.2)',
    borderTopColor: '#00e5ff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
}

// Add spin keyframes
if (!document.getElementById('upload-spin')) {
  const s = document.createElement('style')
  s.id = 'upload-spin'
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }'
  document.head.appendChild(s)
}

export default function UploadZone() {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)
  const setJob = useEditorStore((s) => s.setJob)

  async function handleFile(file) {
    if (!file || !file.type.startsWith('video/')) {
      setError('请上传视频文件')
      return
    }
    setError(null)
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      const videoUrl = URL.createObjectURL(file)
      setJob(data.job_id, videoUrl, data.duration)
    } catch (e) {
      setError(e.message)
    } finally {
      setUploading(false)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  const zoneStyle = {
    ...styles.zone,
    ...(dragging ? styles.zoneActive : hovering ? styles.zoneHover : {}),
  }

  return (
    <div
      style={zoneStyle}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current.click()}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.6 }}>
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#00e5ff', opacity: 0.7 }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <div style={styles.title}>拖拽视频到这里</div>
      <div style={styles.sub}>或点击选择文件 · 支持 MP4、MOV、AVI 等格式</div>
      {uploading && (
        <div style={styles.progress}>
          <div style={styles.spinner} />
          上传中...
        </div>
      )}
      {error && (
        <div style={{ ...styles.progress, color: '#ff80ab' }}>{error}</div>
      )}
      {!uploading && (
        <button
          style={styles.btn}
          type="button"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(0, 229, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 229, 255, 0.2)'
          }}
        >
          选择视频
        </button>
      )}
    </div>
  )
}
