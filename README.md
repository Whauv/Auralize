# Auralize

Auralize is a YouTube Music and Last.fm listening visualizer with a React + TypeScript + Vite frontend and a FastAPI backend.

## Features

- Google Takeout `watch-history.json` upload flow
- YouTube Data API enrichment for titles, artists, thumbnails, durations, and tags
- Stats dashboard with top songs, top artists, genre DNA, mood timeline, and listening heatmap
- Shareable Music Passport card with PNG export
- Optional Last.fm Live Mode

## Environment Variables

Backend `backend/.env`

```env
YOUTUBE_API_KEY=
LASTFM_API_KEY=
```

Frontend `.env` or compose environment

```env
VITE_API_BASE_URL=http://localhost:8000
```

## Local Setup

## Project Structure

```text
Auralize/
├── backend/           FastAPI API, parsers, enrichment, and integrations
├── frontend/          React dashboard, passport card, and upload flows
├── docs/
│   └── screenshots/   Screenshot placeholders for README assets
├── docker-compose.yml
└── README.md
```

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend runs on `http://localhost:8000`.

### Frontend

```powershell
cd frontend
npm.cmd install
npm.cmd run dev
```

Frontend dev server runs on `http://localhost:5173`.

Preview build:

```powershell
cd frontend
npm.cmd run build
npm.cmd run preview
```

Preview runs on `http://localhost:4173`.

## Docker

```powershell
docker compose up --build
```

Services:

- Frontend: `http://localhost:4173`
- Backend: `http://localhost:8000`

## API Endpoints

- `POST /api/upload`
- `POST /api/stats`
- `POST /api/genre-breakdown`
- `POST /api/mood-timeline`
- `POST /api/lastfm`
- `POST /api/youtube-profile`

## Live Mode

Last.fm Live Mode accepts a username and fetches:

- `user.getrecenttracks`
- `user.gettopartists`
- `user.gettoptracks`

The backend maps this into the same dashboard schema used by the Takeout pipeline.

## Screenshots

- `docs/screenshots/dashboard-overview.png`
- `docs/screenshots/music-passport-card.png`
- `docs/screenshots/lastfm-live-mode.png`
