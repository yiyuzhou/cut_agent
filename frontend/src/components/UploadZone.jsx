import { useRef, useState } from 'react'
import useEditorStore from '../store/editorStore'

const styles = {
  zone: {
    border: '2px dashed #444',
    borderRadius: 12,
    padding: '60px 40px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
  },
  zoneActive: {
    borderColor: '#e05',
    background: 'rgba(238,0,85,0.06)',
  },
  title: { fontSize: 22, fontWeight: 600, marginBottom: 8 },
  sub: { color: '#888', fontSize: 14 },
  btn: {
    marginTop: 20,
    padding: '10px 28px',
    background: '#e05',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
  },
  progress: { marginTop: 16, color: '#aaa', fontSize: 14 },
}

export default function UploadZone() {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
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

  return (
    <div
      style={{ ...styles.zone, ...(dragging ? styles.zoneActive : {}) }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => !uploading && inputRef.current.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <div style={styles.title}>拖拽视频到这里</div>
      <div style={styles.sub}>或点击选择文件 · 支持 MP4、MOV、AVI 等格式</div>
      {uploading && <div style={styles.progress}>上传中...</div>}
      {error && <div style={{ ...styles.progress, color: '#f55' }}>{error}</div>}
      {!uploading && <button style={styles.btn} type="button">选择视频</button>}
    </div>
  )
}
