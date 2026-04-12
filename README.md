# Auralize

Auralize is a full-stack music analytics workspace. It combines a FastAPI API and a React + Vite web app to analyze listening history from YouTube Music, music-like YouTube activity, Apple Music exports, and Last.fm.

## Repo Layout

```text
Auralize/
├─ apps/
│  ├─ api/        # FastAPI backend, tests, Dockerfile, Ruff config
│  └─ web/        # React + Vite frontend, Vitest, Playwright, Dockerfile
├─ docs/          # screenshots and repo documentation
├─ .github/       # CI workflow and collaboration templates
├─ docker-compose.yml
├─ .env.example
├─ AGENTS.md
├─ CONTRIBUTING.md
└─ LICENSE
```

## Features

- Google Takeout upload flow for `watch-history.json`
- Unified `YouTube + Music` mode that filters regular YouTube activity down to music-like plays
- Apple Music import
- Last.fm live mode
- Dashboard analytics, recap slides, and exportable music passports
- Frontend unit tests and browser smoke tests
- Backend linting and integration/unit coverage

## Setup

### Backend

```powershell
cd C:\Users\prana\OneDrive\Documents\Playground\Auralize\apps\api
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

API: `http://localhost:8000`

### Frontend

```powershell
cd C:\Users\prana\OneDrive\Documents\Playground\Auralize\apps\web
npm.cmd install
npm.cmd run dev
```

App: `http://localhost:5173`

## Environment

Copy the placeholders from `.env.example` into the app-specific files:

- `apps/api/.env`
- `apps/web/.env` if you want a local frontend override

Required variables:

```env
YOUTUBE_API_KEY=
LASTFM_API_KEY=
VITE_API_BASE_URL=http://localhost:8000
```

## Validation

### Backend

```powershell
cd C:\Users\prana\OneDrive\Documents\Playground\Auralize\apps\api
.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
python -m ruff check app tests
python -m unittest discover -s tests -v
python -m compileall app
```

### Frontend

```powershell
cd C:\Users\prana\OneDrive\Documents\Playground\Auralize\apps\web
npm.cmd run test
npm.cmd run test:e2e
node .\node_modules\typescript\bin\tsc -b --pretty false
```

## Docker

```powershell
cd C:\Users\prana\OneDrive\Documents\Playground\Auralize
docker compose up --build
```

Services:

- Frontend: `http://localhost:4173`
- Backend: `http://localhost:8000`
