# AGENTS.md - Planificador de Recursos y Presupuestos

## Project Overview
Docker Compose project with decoupled architecture: **React 18 frontend** + **Node.js/Express backend** + **SQLite** database, served via **Nginx** reverse proxy.

## Architecture
- **Frontend** (`planificador-web`): React 18 + React Router 6 + Tailwind CSS + Recharts + React Joyride (guided tour)
- **Backend** (`planificador-api`): Node.js + Express + SQLite3 + Multer (PDF uploads)
- **Database**: SQLite (`backend/data/planificador.sqlite`)
- **Proxy**: Nginx proxies `/api` → backend, serves SPA fallback
- **Production**: Runs behind Traefik (external network `traefik_default`), no exposed ports
- **Local dev**: Uses `docker-compose.override.yml` (exposes port 8086, gitignored)

## Key Commands

### Local Development (Docker)
```bash
# Build and start
docker compose up --build -d

# Status
docker compose ps

# Backend logs
docker compose logs -f planificador-api

# Frontend: http://localhost:8086
```

### Frontend (local, without Docker)
```bash
cd /home/cremheda/Docker/planificador
npm install
npm start          # dev server on port 3000
npm run build      # production build to build/
npm test           # react-scripts test (Jest)
```

### Backend (local, without Docker)
```bash
cd /home/cremheda/Docker/planificador/backend
npm install
npm start          # runs on port 3001
npm test           # runs node --test (native test runner)
```

### Build (Docker)
```bash
# Frontend: builds React app, runs postbuild polyfill script for iOS 12 Safari
# Backend: copies src, runs npm install --omit=dev
docker compose build
```

## Key Project Details

### Browserslist (iOS 12 Safari support)
- Production: `ios_saf >= 12.0`
- Polyfill: `src/index.js` imports `react-app-polyfill/stable`
- Postbuild script: `scripts/fix-ios12-bundle.js` (runs after build)

### Authentication (Backend)
- Session-based, HttpOnly cookie: `planificador_session`
- Roles (seeded): `admin` (full), `editor` (CRUD budgets/personnel/PDFs), `viewer` (read-only)
- Admin bootstrap: set `BOOTSTRAP_ADMIN_EMAIL` + `BOOTSTRAP_ADMIN_PASSWORD` env vars, or auto-creates `admin@planificador.local` with random password (logged at startup)
- Endpoints: `GET /api/auth/me`, `POST /api/auth/login`, `POST /api/auth/signup`, `POST /api/auth/logout`, admin endpoints under `/api/auth/users` and `/api/auth/roles`

### Database (SQLite)
Tables: `budgets`, `executed_budgets`, `personnel`, `accepted_budgets`, `users`, `roles`, `user_roles`, `sessions`
- PDF metadata stored in DB (`pdfFilename`, `pdfOriginalName`)
- Files stored on disk: `/app/upload/pdfs` (mapped to `/var/lib/contel-planificador/upload`)

### PDF Endpoints
- `POST /api/accepted-budgets/:id/pdf` (multipart `file`)
- `GET /api/accepted-budgets/:id/pdf`
- `DELETE /api/accepted-budgets/:id/pdf`
- `POST /api/budgets/:id/pdf`
- `GET /api/budgets/:id/pdf`
- `DELETE /api/budgets/:id/pdf`
- `GET /api/executed-budgets/:id/pdf`

### Frontend Structure (`src/`)
- Views: `App.jsx`, `PlanningView.jsx`, `BudgetDashboard.jsx`, `ExecutedBudgets.jsx`, `PersonnelManager.jsx`
- Context: `AppContext.js` (global state), `ThemeContext.js`
- Hooks: `useBudgets`, `usePersonnel`, `useBackendAuth`, `useLocalAuth`, `useAdminUsers`, `useMessage`
- Components: `GuidedTour` (React Joyride), `AuthForm`, `UserAdmin`, `CollapsibleCard`, `AuthWrapper`, `MessageModal`

### Testing
- **Backend**: Native Node.js native test runner (`node --test`), tests in `backend/test/*.test.js`
- **Frontend**: React Testing Library via `react-scripts test` (not currently used)

### Environment Variables (Backend)
- `PORT` (default 3001)
- `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`
- `SESSION_SECRET` (required in production)
- `NODE_ENV=production`

### Docker Volumes (Production)
- `/var/lib/contel-planificador/data` → `/app/data` (SQLite)
- `/var/lib/contel-planificador/upload` → `/app/upload` (PDFs)

### Nginx Config (`nginx.conf`)
- Proxies `/api/` → `http://planificador-api:3001/api/`
- SPA fallback: `try_files $uri /index.html;`

## Common Tasks

### Run backend tests locally
```bash
cd backend && npm test
```

### View backend logs (Docker)
```bash
docker compose logs -f planificador-api
```

### Access SQLite database (Docker)
```bash
docker exec -it planificador-api sqlite3 /app/data/planificador.sqlite
```

### Build frontend for production (local)
```bash
npm run build  # outputs to build/, runs ios12 polyfill fix
```

### Bootstrap admin (first run, empty DB)
Set env vars in `docker-compose.override.yml` or backend container:
```yaml
environment:
  - BOOTSTRAP_ADMIN_EMAIL=admin@example.com
  - BOOTSTRAP_ADMIN_PASSWORD=securepassword
```

## Project Structure
```
planificador/
├── src/                    # React frontend
├── backend/
│   ├── src/                # Express API
│   ├── test/               # Node.js native tests (auth.test.js)
│   ├── data/               # SQLite DB (gitignored)
│   └── Dockerfile
├── nginx.conf              # Nginx proxy config
├── docker-compose.yml      # Production (Traefik)
├── docker-compose.override.yml  # Local dev (ports, volumes) - gitignored
├── Dockerfile              # Frontend multi-stage build
├── package.json            # Frontend deps
├── tailwind.config.js
└── README.md
```

## Roadmap / Known Gaps
- Add automated frontend tests
- Improve business validation & audit trails
- No lint/typecheck configured (react-scripts default)

## Recent Changes (v0.12)
- Sorting by acceptance date in "Bolsa de Presupuestos Aceptados" and "Lista de Presupuestos en Planificación" (3-state toggle: asc/desc/none)
- Reordered PlanningView left column: "Mesa de Planificación" now above "Bolsa de Presupuestos Aceptados"
- Clean rewrite of `PlanningView.jsx` (removed duplicate cards, extracted sort toggle component)