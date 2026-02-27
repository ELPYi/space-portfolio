# Space Portfolio

All Rights Reserved.

## Deploy on Fly.io

This repo is configured to deploy as a single Fly app:
- Vite frontend is built into `dist/`
- Node server serves `dist/` and handles WebSockets on the same port

### Prerequisites
- Install `flyctl`
- Run `flyctl auth login`

### First deploy
1. From project root, create/update your app name in `fly.toml`:
   - `app = "your-unique-fly-app-name"`
2. Launch once (if app does not exist yet):
   - `flyctl launch --no-deploy`
3. Deploy:
   - `flyctl deploy`
4. Open:
   - `flyctl open`

### Ongoing deploys
- `flyctl deploy`

### Optional: keep one instance always on
If you want zero cold starts:
- Set `min_machines_running = 1` in `fly.toml`
