# StayEase Resort Management System

A modern cloud-based Resort Management System for bookings, operations, and guest management.

## 📋 Prerequisites

| Tool | Version | Check with |
|------|---------|------------|
| Python | 3.10+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| PostgreSQL | 14+ (or use Neon cloud) | `psql --version` |

---

## 🚀 Quick Start Guide

The project is split into a **Backend** (FastAPI) and a **Frontend** (React/Vite). You need **two terminals** — one for each.

### 1. Backend Setup (FastAPI)

```bash
# Navigate to backend
cd backend

# Create and activate virtual environment
python -m venv .venv

# ── Activate it ──
# Windows (Git Bash):
source .venv/Scripts/activate
# Windows (CMD):
.venv\Scripts\activate
# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# Install dependencies (psutil included in requirements.txt)
pip install -r requirements.txt

# Create environment config from template
cp .env.example .env
```

> **IMPORTANT:** Open `.env` and set `ENVIRONMENT=development`. The included `.env` already has this configured with a Neon PostgreSQL database. If you want to use a **local database**, uncomment the local `DATABASE_URL` line and comment out the Neon one.

```bash
# Start the backend
uvicorn app.main:app --reload
```

The backend starts at **`http://localhost:8000`**.  
On first run, tables are created and default accounts are seeded automatically.

---

### 2. Frontend Setup (React/Vite)

Open a **second terminal**.

```bash
# Navigate to frontend
cd frontend

# Install dependencies (use legacy-peer-deps to avoid React 18 peer conflicts)
npm install --legacy-peer-deps

# Start the Vite dev server
npm run dev
```

The frontend starts at **`http://localhost:5173`**.

---

### 3. Open in Browser

Go to **[http://localhost:5173](http://localhost:5173)** — the Landing Page loads first.  
Click **Sign In** from the navbar to log in.

---

## 🔑 Default Accounts

These accounts are seeded automatically in `development` mode.

### Resort Owner (Admin)
| Field | Value |
|-------|-------|
| Email | `aonontojahan@gmail.com` |
| Password | `aonontojahan` |
| Access | Full system — all tabs, analytics, staff management |

### Guest (Demo)
| Field | Value |
|-------|-------|
| Email | `guest@stayease.com` |
| Password | `guest123` |
| Access | Browse rooms, my bookings, payment history |

> Guests can also **self-register** at `/register`.

---

## 🧪 Running Tests

### Backend
```bash
cd backend
source .venv/Scripts/activate     # or your platform's activate command
pytest -v
```

### Frontend
```bash
cd frontend
npm test
```

---

## 🛠 Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ModuleNotFoundError: No module named 'psutil'` | `pip install psutil` — or re-run `pip install -r requirements.txt` |
| `Cannot find package 'vitest'` | `npm install -D vitest --legacy-peer-deps` |
| `database "stayease" does not exist` | Create the database: `createdb stayease` or switch to the Neon URL in `.env` |
| `Port 8000 already in use` | Kill the process or use: `uvicorn app.main:app --reload --port 8001` |
| `Port 5173 already in use` | Vite will auto-prompt to use a different port; press **y** |

---

## 📝 Features

- **Guest Portal:** Browse luxury resort rooms, book stays, and view payment history.
- **Resort Owner Dashboard:** View analytics, occupancy reports, and manage all staff across the platform.
- **Role-Based Access:** Resort Owner, Manager, Receptionist, Housekeeping, Accountant, Guest.
- **Real-Time Updates:** WebSocket-powered housekeeping task notifications and live refresh.
- **Dark Mode:** Toggle in the sidebar; persists to localStorage.
- **PCI-Compliant Payments:** Stripe integration with full refund workflow.
- **Premium Design:** Emerald/Gold luxury theme with Inter + Playfair Display typography.
