# Auralize Agent Guide

## Setup

### Backend

```powershell
cd apps/api
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements-dev.txt
```

### Frontend

```powershell
cd apps/web
npm.cmd install
```

## Folder Map

- `apps/api/app` — FastAPI routes and backend services
- `apps/api/tests` — backend unit and integration tests
- `apps/web/src/components` — dashboard, recap, passport, and share UI
- `apps/web/src/lib` — analytics, sharing, caching, export, and preferences helpers
- `apps/web/e2e` — Playwright browser smoke tests
- `docs` — screenshots and supporting documentation

## Code Style

- Keep backend code Ruff-clean with the config in `apps/api/pyproject.toml`
- Keep frontend code TypeScript-first and colocate UI tests with feature domains where practical
- Prefer non-destructive refactors and preserve Git history for file moves

## Validation Commands

### Backend

```powershell
cd apps/api
python -m ruff check app tests
python -m unittest discover -s tests -v
python -m compileall app
```

### Frontend

```powershell
cd apps/web
npm.cmd run test
npm.cmd run test:e2e
node .\node_modules\typescript\bin\tsc -b --pretty false
```
