# Auralize

Auralize is a music listening visualizer for YouTube Music, music played from the regular YouTube app, and Last.fm. It combines a React + TypeScript + Vite frontend with a FastAPI backend.

## What It Does

- Upload Google Takeout `watch-history.json`
- Analyze `YouTube Music` only or a new `YouTube + Music` unified mode
- Enrich tracks with YouTube Data API metadata
- Build dashboards, recap stories, and a shareable Music Passport
- Support Last.fm Live Mode

## Environment Variables

Backend: [backend/.env](C:\Users\prana\OneDrive\Documents\Playground\Auralize\backend\.env)

```env
YOUTUBE_API_KEY=
LASTFM_API_KEY=
```

Frontend: optional local override

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Project Structure

```text
Auralize/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   └── services/
│   │       ├── lastfm_api.py
│   │       ├── parser.py
│   │       ├── stats.py
│   │       ├── youtube_api.py
│   │       └── youtube_profile.py
│   ├── data/
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── DashboardAdvancedSections.tsx
│   │   │   ├── DashboardBits.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── MusicPassportCard.tsx
│   │   │   └── RecapView.tsx
│   │   ├── lib/
│   │   │   ├── types.ts
│   │   │   └── utils.ts
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
├── docs/
│   └── screenshots/
├── docker-compose.yml
└── README.md
```

## Local Setup

### Backend

```powershell
cd C:\Users\prana\OneDrive\Documents\Playground\Auralize\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

Backend runs on `http://localhost:8000`.

### Frontend

```powershell
cd C:\Users\prana\OneDrive\Documents\Playground\Auralize\frontend
npm.cmd install
npm.cmd run dev
```

Frontend runs on `http://localhost:5173`.

## Docker

```powershell
cd C:\Users\prana\OneDrive\Documents\Playground\Auralize
docker compose up --build
```

Services:

- Frontend: `http://localhost:4173`
- Backend: `http://localhost:8000`

## API Endpoints

- `GET /api/health`
- `POST /api/upload`
- `POST /api/analyze`
- `POST /api/upload-unified`
- `POST /api/analyze-unified`
- `POST /api/stats`
- `POST /api/stats-unified`
- `POST /api/genre-breakdown`
- `POST /api/genre-breakdown-unified`
- `POST /api/mood-timeline`
- `POST /api/mood-timeline-unified`
- `POST /api/lastfm`
- `POST /api/youtube-profile`

## Unified YouTube Mode

The `YouTube + Music` tab uses the same Google Takeout file as the standard Takeout mode, but it also includes music-like plays from the regular YouTube app.

Included:

- YouTube Music listens
- official audios
- music videos
- lyric videos
- remixes
- `Artist - Topic` uploads

Filtered out:

- search entries
- non-music YouTube videos
- unrelated standard YouTube activity

This mode is now faster than before because the frontend uses a single backend analysis request instead of making separate upload, stats, genre, and mood requests for the same file.

## Screenshots

- `docs/screenshots/dashboard-overview.png`
- `docs/screenshots/music-passport-card.png`
- `docs/screenshots/lastfm-live-mode.png`
