# StayEase Resort Management System

A modern cloud-based Resort Management System for bookings, operations, and guest management.

## Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | **FastAPI** (Python 3.12) |
| ORM | **SQLAlchemy 2.0** (async) |
| Database | **PostgreSQL 16** (asyncpg) |
| Migrations | **Alembic** |
| Auth | **JWT** (python-jose) + **bcrypt** |
| Payments | **Stripe**, Mobile Banking (bkash/Nagad/Rocket) |
| PDF | **ReportLab** |
| File Uploads | **Cloudinary** / local |
| Monitoring | **Prometheus** metrics, **Sentry** errors |
| Real-time | **WebSockets** |
| Rate Limiting | Sliding window middleware |
| Audit | Full action audit logging |
| Testing | **pytest** + pytest-asyncio + httpx |

### Frontend
| Component | Technology |
|-----------|------------|
| Framework | **React 19** + **TypeScript** |
| Build | **Vite 5** |
| Styling | **Tailwind CSS 3** (Emerald/Gold luxury theme) |
| Routing | **React Router v6** |
| State | **TanStack React Query v5** |
| Forms | **React Hook Form** + **Zod** |
| HTTP | **Axios** (token refresh, caching) |
| Icons | **Lucide React** |
| Tests | **Vitest** + **Testing Library** |
| Linting | **ESLint** + **@typescript-eslint** |

### Infrastructure
| Component | Technology |
|-----------|------------|
| Container | **Docker** + **docker-compose** |
| Frontend serving | **Nginx** (production) |
| License | **Apache 2.0** |

---

## Project Structure

```
stayease/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── core/                 # Config, DB, security, email, exceptions
│   │   ├── auth/                 # User auth, roles, permissions
│   │   ├── rooms/                # Room & room type management
│   │   ├── bookings/             # Booking CRUD & status workflow
│   │   ├── payments/             # Stripe & mobile banking payments
│   │   ├── invoices/             # Invoices & PDF generation
│   │   ├── refunds/              # Refund workflow
│   │   ├── housekeeping/         # Housekeeping task management
│   │   ├── reports/              # Analytics & CSV export
│   │   ├── uploads/              # Image uploads (Cloudinary/local)
│   │   ├── ws/                   # WebSocket real-time updates
│   │   ├── monitoring/           # Prometheus metrics
│   │   └── audit/                # Audit logging
│   ├── alembic/                  # DB migrations
│   └── tests/                    # pytest suite
├── frontend/
│   ├── src/
│   │   ├── pages/                # Route pages
│   │   ├── components/           # Shared UI components
│   │   ├── services/             # API client, auth context
│   │   ├── hooks/                # Custom hooks (WebSocket, dark mode)
│   │   ├── store/                # Auth state
│   │   ├── types/                # TypeScript interfaces
│   │   └── test/                 # Vitest suite
│   └── vite.config.ts
├── docker-compose.yml
├── Dockerfile.backend
└── Dockerfile.frontend
```

---

## Prerequisites

| Tool | Version | Check with |
|------|---------|------------|
| Python | 3.12+ | `python --version` |
| Node.js | 20+ | `node --version` |
| npm | 9+ | `npm --version` |
| PostgreSQL | 14+ (or use Neon cloud) | `psql --version` |
| Docker | 24+ (optional) | `docker --version` |

---

## Quick Start Guide

The project is split into a **Backend** (FastAPI) and a **Frontend** (React/Vite). You need **two terminals** — one for each.

### 1. Backend Setup (FastAPI)

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv .venv

# Activate it
# Windows (Git Bash):  source .venv/Scripts/activate
# Windows (CMD):       .venv\Scripts\activate
# macOS / Linux:       source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment config from template
cp .env.example .env
```

> **IMPORTANT:** Open `.env` and set `ENVIRONMENT=development`. Generate a `SECRET_KEY` (you can use `openssl rand -hex 32`). The included `.env.example` has a placeholder — never use it in production.

```bash
# Start the backend
uvicorn app.main:app --reload
```

The backend starts at **`http://localhost:8000`**.  
API docs available at **`http://localhost:8000/docs`** (Swagger) or **`http://localhost:8000/redoc`**.  
On first run, tables are created and default accounts are seeded automatically.

### 2. Frontend Setup (React/Vite)

Open a **second terminal**.

```bash
# Navigate to frontend
cd frontend

# Copy environment config
cp .env.example .env

# Install dependencies
npm install

# Start the Vite dev server
npm run dev
```

The frontend starts at **`http://localhost:5173`**.

### 3. Open in Browser

Go to **[http://localhost:5173](http://localhost:5173)** — the Landing Page loads first.  
Click **Sign In** from the navbar to log in.

### Default Accounts

After seeding, the following accounts are available (password is configured in `.env`):

| Role | Email |
|------|-------|
| **Resort Owner** | `admin@stayease.com` |
| **Manager** | `manager@stayease.com` |
| **Receptionist** | `reception@stayease.com` |
| **Housekeeping** | `housekeeping@stayease.com` |
| **Accountant** | `accountant@stayease.com` |
| **Guest** | `guest@stayease.com` |

---

## Docker Setup

For a fully containerized setup, run everything with a single command:

```bash
docker-compose up --build
```

This starts three services:
- **db** — PostgreSQL 16 Alpine (port 5432)
- **backend** — FastAPI on port 8000
- **frontend** — Nginx serving the built app on port 80

The frontend is configured to proxy API requests to the backend.

---

## Database Migrations

The project uses Alembic for database migrations. After making model changes:

```bash
cd backend
# Generate a new migration
alembic revision --autogenerate -m "description"

# Apply pending migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

---

## Running Tests

### Backend
```bash
cd backend
source .venv/Scripts/activate
pytest -v
```

Tests use an in-memory SQLite database, so no PostgreSQL connection is needed.

### Frontend
```bash
cd frontend
npm test
# or with coverage
npm run test:coverage
```

---

## API Overview

All API endpoints are under `/api/v1`. Full interactive documentation is available at `/docs` when the backend is running.

| Endpoint | Module | Description |
|----------|--------|-------------|
| `/auth/*` | Auth | Register, login, refresh tokens, password reset, email verification, user CRUD, role management |
| `/rooms/*` | Rooms | Room and room type CRUD, availability queries |
| `/bookings/*` | Bookings | Create, cancel, check-in/check-out bookings; guest listing |
| `/payments/*` | Payments | Record, refund; Stripe card & mobile banking (bkash/Nagad/Rocket) |
| `/invoices/*` | Invoices | Create, view (JSON/HTML/PDF), update status |
| `/refunds/*` | Refunds | Initiate and complete refunds |
| `/housekeeping/*` | Housekeeping | Create, assign, and update housekeeping tasks |
| `/reports/*` | Reports | Occupancy, revenue, bookings summary, CSV export |
| `/uploads/*` | Uploads | Room images and user avatars (Cloudinary or local) |
| `/ws` | WebSocket | Real-time notifications (housekeeping, booking updates) |
| `/health` | Health | Server health check with memory/CPU stats |
| `/metrics` | Metrics | Prometheus metrics endpoint |

---

## Features

- **Guest Portal** — Browse luxury resort rooms, book stays, view payment & invoice history
- **Role-Based Access** — 6 roles with 14 granular permissions: Resort Owner, Manager, Receptionist, Housekeeping, Accountant, Guest
- **Booking Workflow** — Full lifecycle: create, confirm, check-in, check-out, cancel
- **Payment Processing** — Stripe integration + mobile banking (bkash, Nagad, Rocket) with full refund workflow
- **Invoice Generation** — Printable HTML views and PDF downloads via ReportLab
- **Housekeeping Management** — Task assignment, priority levels, status tracking
- **Real-Time Updates** — WebSocket-powered notifications for housekeeping tasks and booking changes
- **Analytics & Reports** — Occupancy rates, revenue summaries, booking stats with CSV export
- **Audit Logging** — Full action audit trail for compliance and security
- **Monitoring** — Prometheus metrics and Sentry error tracking
- **Image Uploads** — Cloudinary integration for room images and user avatars
- **Dark Mode** — Toggle in the sidebar; persists to localStorage
- **Premium Design** — Emerald/Gold luxury theme with Tailwind CSS
- **Responsive** — Works on desktop, tablet, and mobile

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ModuleNotFoundError: No module named 'psutil'` | `pip install psutil` — or re-run `pip install -r requirements.txt` |
| `Cannot find package 'vitest'` | Run `npm install` in the frontend directory |
| `database "stayease" does not exist` | Create the database: `createdb stayease` or use a cloud URL in `.env` |
| `Port 8000 already in use` | Kill the process or use: `uvicorn app.main:app --reload --port 8001` |
| `Port 5173 already in use` | Vite will auto-prompt to use a different port; press **y** |
| `SECRET_KEY not set` | Generate one with `openssl rand -hex 32` and add it to `.env` |
