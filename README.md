# Cut Agent

AI 驱动的 Vlog 自动剪辑工具。上传视频后，系统自动完成语音转写、静音检测和 AI 智能分析，帮助用户快速识别并剪除冗余内容，支持添加背景音乐和字幕导出。

## 功能特性

- **语音转写** — 基于 OpenAI Whisper 自动将视频语音转为文字
- **静音检测** — 使用 ffmpeg 检测并标记视频中的静音/空白片段
- **AI 智能分析** — 通过 DeepSeek 大模型识别口癖、重复、冗长停顿和跑题内容
- **可视化时间轴** — 交互式时间轴，支持切换、调整、添加/删除剪辑片段
- **背景音乐** — 可选的 BGM 库，支持音量调节和预览
- **字幕烧录** — 导出时可将 SRT 字幕烧录到视频中
- **实时进度** — 分析和导出过程通过 SSE 推送实时进度

## 系统架构

```
┌─────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)          │
│  UploadZone │ Timeline │ TranscriptPanel │ Export   │
│            Zustand Store (全局状态管理)              │
└──────────────────────┬──────────────────────────────┘
                       │ REST + SSE
┌──────────────────────┴──────────────────────────────┐
│                  Backend (FastAPI + uvicorn)         │
│                                                     │
│  路由层 (api/routes/)                                │
│    upload.py     analyze.py     export.py            │
│                                                     │
│  服务层 (services/)                                  │
│    transcriber.py  →  Whisper 语音转写              │
│    silence_detector.py →  ffmpeg 静音检测           │
│    analyzer.py     →  DeepSeek AI 分析              │
│    cut_merger.py   →  剪辑片段合并去重               │
│    exporter.py     →  ffmpeg 视频导出                │
└─────────────────────────────────────────────────────┘
```

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 18 + Vite 5 |
| 状态管理 | Zustand 4 |
| 后端框架 | FastAPI (Python) |
| 语音转写 | OpenAI Whisper (base 模型) |
| AI 分析 | DeepSeek V4 Pro (函数调用模式) |
| 视频处理 | ffmpeg / ffprobe |
| 通信协议 | REST API + Server-Sent Events (SSE) |

## 目录结构

```
cut_agent/
├── backend/
│   ├── main.py                 # 应用入口，FastAPI 配置
│   ├── models.py               # Pydantic 数据模型
│   ├── requirements.txt        # Python 依赖
│   ├── api/
│   │   ├── job_store.py        # 内存任务存储
│   │   └── routes/
│   │       ├── upload.py       # 视频上传 API
│   │       ├── analyze.py      # 分析 API (SSE 流)
│   │       └── export.py       # 导出、下载、音乐 API
│   └── services/
│       ├── transcriber.py      # Whisper 语音转写
│       ├── silence_detector.py # ffmpeg 静音检测
│       ├── analyzer.py         # DeepSeek AI 剪辑分析
│       ├── cut_merger.py       # 片段合并与去重
│       └── exporter.py         # ffmpeg 视频导出
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx            # React 入口
│       ├── App.jsx             # 根组件 / 布局
│       ├── index.css           # 全局样式
│       ├── store/
│       │   └── editorStore.js  # Zustand 状态管理
│       ├── components/
│       │   ├── UploadZone.jsx     # 拖拽上传区域
│       │   ├── AnalysisPanel.jsx  # 分析启动与进度
│       │   ├── Timeline.jsx       # 可视化时间轴
│       │   ├── CutSegment.jsx     # 单条剪辑片段
│       │   ├── TranscriptPanel.jsx# 文字稿面板
│       │   ├── MusicPicker.jsx    # 背景音乐选择
│       │   └── ExportPanel.jsx    # 导出面板
│       └── utils/
│           └── timeFormat.js   # 时间格式化工具
└── .gitignore
```

## 快速开始

### 环境要求

- **Python** 3.10+
- **Node.js** 18+
- **ffmpeg** / **ffprobe** (需要加入系统 PATH)

### 1. 克隆项目

```bash
git clone <repo-url>
cd cut_agent
```

### 2. 配置后端

```bash
cd backend

# 创建虚拟环境
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 设置环境变量
export DEEPSEEK_API_KEY=<your-deepseek-api-key>   # Windows: set DEEPSEEK_API_KEY=<key>

# 启动后端 (监听端口 8765)
python main.py
```

### 3. 配置前端

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器 (监听端口 5173，自动代理 /api 到后端)
npm run dev
```

### 4. 打开浏览器

访问 `http://localhost:5173`，拖拽或选择视频文件开始使用。

### 5. 生产构建

```bash
cd frontend
npm run build   # 输出到 ../backend/static/

cd ../backend
python main.py  # FastAPI 自动托管前端静态文件
```

## API 概览

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/api/upload` | 上传视频文件 (multipart/form-data) |
| `GET` | `/api/analyze/{job_id}` | SSE 流，返回分析进度 |
| `GET` | `/api/cuts/{job_id}` | 获取剪辑片段、字幕、转写文本 |
| `POST` | `/api/export/{job_id}` | 提交导出任务 |
| `GET` | `/api/export/progress/{export_id}` | SSE 流，返回导出进度 |
| `GET` | `/api/export/download/{export_id}` | 下载导出视频 |
| `GET` | `/api/music` | 获取背景音乐列表 |
| `GET` | `/api/music/{track_id}/preview` | 获取音乐预览 (audio/mpeg) |

## 数据处理流程

1. **上传** — 视频文件通过 POST 上传，生成 UUID 任务 ID，用 ffprobe 获取时长
2. **转写** — Whisper base 模型将音频转为带时间戳的文字稿和 SRT 字幕
3. **检测** — 并行执行静音检测 (ffmpeg silencedetect) 和 AI 剪辑分析 (DeepSeek 函数调用)
4. **合并** — 合并静音片段和 AI 建议片段，过滤短片段 (< 0.5s)，去重取高置信度
5. **审阅** — 前端时间轴展示全部剪辑建议，用户可切换启用/停用、手动调整边界
6. **导出** — ffmpeg 根据最终剪辑列表裁剪视频，可选烧录字幕和混入背景音乐

## 配置

- `DEEPSEEK_API_KEY` — DeepSeek API 密钥 (环境变量)，用于 AI 剪辑分析
- `backend/music/catalog.json` — 背景音乐库配置文件，定义可选曲目
- `backend/music/` — 存放背景音乐文件 (.mp3) 和预览文件 (_preview.mp3)
- 前端开发代理配置位于 `frontend/vite.config.js`，默认将 `/api` 请求代理至 `localhost:8765`
