# StayEase Resort Management System

A modern cloud-based Resort Management System for bookings, operations, and guest management.

## 🚀 Quick Start Guide

Follow these steps to run the StayEase project locally on your machine. The project is split into a **Backend** (FastAPI) and a **Frontend** (React/Vite).

### 1. Backend Setup (FastAPI)

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Activate your virtual environment:
   ```bash
   # On Windows:
   source .venv/Scripts/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file by copying the template:
   ```bash
   cp .env.example .env
   ```
   *(Ensure `ENVIRONMENT=development` is set in the `.env` file so the database automatically seeds!)*
5. Run the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend will be available at `http://localhost:8000`. 
   *(The database tables and default owner account will be created automatically on startup).*

### 2. Frontend Setup (React/Vite)

1. Open a **new, separate** terminal window and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install the Node modules:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your Chrome browser and navigate to `http://localhost:5173`.

---

## 🔑 Default Sign-in Information

When running in development mode, the database seeds the following accounts automatically on startup.

> [!IMPORTANT]
> Always use the **full email address** when logging in. The login page also shows these credentials as a reminder.

### Resort Owner (Admin)
- **Email:** `aonontojahan@gmail.com`
- **Password:** `aonontojahan`
- **Access:** Full dashboard — Staff Management, Rooms, Bookings, Guests, Housekeeping, Payments, Reports.

### Guest (Demo)
- **Email:** `guest@stayease.com`
- **Password:** `guest123`
- **Access:** Guest portal — Browse Rooms, My Bookings, Payment History.

> **New guests** can also self-register at `/register` and will be automatically logged in.

---

## 📝 Features

- **Guest Portal:** Browse luxury resort rooms, book stays, and view payment history.
- **Resort Owner Dashboard:** View analytics, occupancy reports, and manage all staff across the platform.
- **Premium Design:** Implements a modern Emerald/Gold luxury theme for a high-end user experience.
