# Zyllora — Windows Installation and Setup Guide

This guide covers setup and running both the **FastAPI Backend** and **React + Vite Frontend** on Windows using PowerShell.

---

## Prerequisites

1. **Node.js**: v18+ or v20+ (`node -v`, `npm -v`)
2. **Python**: Python 3.10+ (Tested on Python 3.12.10)
3. **PowerShell**: Windows PowerShell 5.1 or PowerShell 7+

---

## 1. Backend Setup

### Step 1: Open PowerShell and navigate to the backend directory
```powershell
cd backend
```

### Step 2: Create a virtual environment (if not already created)
```powershell
python -m venv .venv
```
*(If `python` is not directly in your system PATH, use your local Python executable path e.g.: `& "C:\Path\To\Python312\python.exe" -m venv .venv`)*

### Step 3: Activate the virtual environment
```powershell
.\.venv\Scripts\Activate.ps1
```
*(If PowerShell shows an execution policy error, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`)*

### Step 4: Install dependencies
```powershell
pip install -r requirements.txt
```

### Step 5: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Open `backend/.env` in your editor and configure:
- `SUPABASE_JWT_SECRET`: Found in your Supabase Dashboard under `Project Settings > API > JWT Settings > JWT Secret`.
- `AI_PROVIDER`: `gemini` (recommended free tier) or `mock` (for offline testing)
- `GEMINI_API_KEY`: Get a free key at [Google AI Studio](https://aistudio.google.com/app/apikey) (Free tier: 1,500 requests/day, 15 RPM).

### Step 6: Run Backend Automated Tests
```powershell
pytest -v
```
*(Runs 27 automated tests verifying JWT auth, PDF processing, semantic vector embeddings, RAG retrieval ranking, prompt injection firewall, and cross-user isolation)*

### Step 7: Launch the FastAPI Backend Server
```powershell
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The backend API is now running at:
- **Base URL**: `http://localhost:8000`
- **Interactive OpenAPI Docs**: `http://localhost:8000/docs`
- **Health Check Endpoint**: `http://localhost:8000/api/v1/health`
- **Documents Endpoint**: `http://localhost:8000/api/v1/documents`
- **Tutor Chat Endpoint**: `http://localhost:8000/api/v1/tutor/chat`

---

## 2. Frontend Setup

### Step 1: Open a new PowerShell terminal and navigate to frontend
```powershell
cd frontend
```

### Step 2: Install Node Dependencies
```powershell
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```powershell
Copy-Item .env.example .env
```
Open `frontend/.env` and update:
- `VITE_API_BASE_URL`: `http://localhost:8000/api/v1`
- `VITE_SUPABASE_URL`: Your Supabase Project URL (`https://<ref>.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Public Key (Found in Supabase Dashboard > Project Settings > API)

*(Note: Even without Supabase cloud keys, the frontend includes an **Instant Demo Mode** allowing complete testing of drag-and-drop PDF uploads, background processing status, and the interactive AI Tutor Workspace!)*

### Step 4: Launch the Frontend Development Server
```powershell
npm run dev
```
Open your browser at:
- **Frontend App**: `http://localhost:5173`

---

## 3. Supabase Database & Vector Setup

1. Log in to [Supabase](https://supabase.com).
2. Create a new project or select an existing one.
3. Open the **SQL Editor** in your Supabase Dashboard.
4. Run `database/migrations/001_initial_schema.sql` (Creates core tables with RLS).
5. Run `database/migrations/002_storage_and_documents.sql` (Creates private storage bucket with user-isolated RLS).
6. Run `database/migrations/003_pgvector_and_embeddings.sql` (Enables pgvector, HNSW cosine index, and vector similarity search function).
