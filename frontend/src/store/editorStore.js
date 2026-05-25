import { create } from 'zustand'

const useEditorStore = create((set, get) => ({
  // Upload state
  jobId: null,
  videoUrl: null,
  duration: 0,

  // Analysis state
  analysisStage: null,   // 'transcribing' | 'analyzing' | 'done' | 'error'
  analysisProgress: 0,

  // Editor state
  cuts: [],
  subtitles: [],
  transcript: [],
  currentTime: 0,

  // Music
  tracks: [],
  selectedMusicId: null,
  musicVolume: 0.3,

  // Export
  exportId: null,
  exportStatus: null,   // 'pending' | 'exporting' | 'done' | 'error'
  exportProgress: 0,
  downloadUrl: null,

  // Actions
  setJob: (jobId, videoUrl, duration) => set({ jobId, videoUrl, duration }),

  setAnalysisStage: (stage, progress) => set({ analysisStage: stage, analysisProgress: progress }),

  setCuts: (cuts) => set({ cuts }),
  setSubtitles: (subtitles) => set({ subtitles }),
  setTranscript: (transcript) => set({ transcript }),
  setDuration: (duration) => set({ duration }),

  toggleCut: (id) => set((state) => ({
    cuts: state.cuts.map((c) => c.id === id ? { ...c, enabled: !c.enabled } : c),
  })),

  adjustCut: (id, start, end) => set((state) => ({
    cuts: state.cuts.map((c) => c.id === id ? { ...c, start, end } : c),
  })),

  addUserCut: (start, end) => set((state) => ({
    cuts: [...state.cuts, {
      id: crypto.randomUUID(),
      start,
      end,
      type: 'user',
      source: 'user',
      confidence: 1.0,
      transcript_text: '',
      enabled: true,
    }],
  })),

  removeCut: (id) => set((state) => ({
    cuts: state.cuts.filter((c) => c.id !== id),
  })),

  setCurrentTime: (t) => set({ currentTime: t }),

  setTracks: (tracks) => set({ tracks }),
  selectMusic: (id) => set({ selectedMusicId: id }),
  setMusicVolume: (v) => set({ musicVolume: v }),

  setExport: (exportId) => set({ exportId, exportStatus: 'pending', exportProgress: 0, downloadUrl: null }),
  setExportProgress: (status, progress) => set({ exportStatus: status, exportProgress: progress }),
  setDownloadUrl: (url) => set({ downloadUrl: url }),

  reset: () => set({
    jobId: null, videoUrl: null, duration: 0,
    analysisStage: null, analysisProgress: 0,
    cuts: [], subtitles: [], transcript: [], currentTime: 0,
    selectedMusicId: null, musicVolume: 0.3,
    exportId: null, exportStatus: null, exportProgress: 0, downloadUrl: null,
  }),
}))

export default useEditorStore
