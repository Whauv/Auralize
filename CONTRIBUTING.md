# Contributing

## Branching

- Create focused branches for each change
- Keep refactors non-destructive and preserve history with `git mv` when moving files

## Before Opening a PR

Run the stack-specific checks:

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

## Environment

- Never commit `.env` files
- Add new environment variables to the root `.env.example` and the app-level examples when relevant

## Documentation

- Update the nearest README when a folder’s purpose or workflow changes
- Keep root documentation aligned with the current app layout
