# Zyllora

> **Your study material. Your personal AI tutor.**

Zyllora is an AI-powered learning platform engineered for university students. Students upload academic PDFs (textbooks, lecture slides, research papers) and interact with an AI tutor that adapts to their learning pace, explains concepts with genuine page citations, and generates targeted revision quizzes.

---

## Technical Stack

- **Frontend:** React 18 + Vite, JavaScript, Tailwind CSS, Lucide React, React Router 6
- **Backend:** Python 3.12 + FastAPI, Pydantic v2, Uvicorn, PyJWT
- **Database & Auth:** Supabase PostgreSQL with Row Level Security (RLS), Supabase Auth
- **Storage:** Private Supabase Storage (Week 2)
- **PDF Extraction:** PyMuPDF (Week 2)
- **AI/RAG:** Provider-independent vector engine with pgvector (Week 3)

---

## Project Structure

```
zyllora/
├── frontend/               # React + Vite web client
│   ├── src/
│   │   ├── components/     # Navbar, Sidebar, Footer, ProtectedRoute
│   │   ├── pages/          # Landing, Login, Signup, ForgotPassword, Onboarding, Dashboard, Settings
│   │   ├── context/        # AuthContext (Supabase Auth & preview mode)
│   │   ├── hooks/          # useAuth
│   │   ├── services/       # Supabase client & FastAPI client
│   │   └── index.css       # Tailwind directives & sleek theme styling
│   ├── .env.example        # Client environment variables
│   └── package.json
├── backend/                # FastAPI application
│   ├── app/
│   │   ├── dependencies/   # Supabase JWT token verification
│   │   ├── routers/        # Health check & Auth endpoints
│   │   ├── schemas/        # Pydantic v2 data models
│   │   ├── config.py       # Pydantic Settings
│   │   └── main.py         # App entry point, CORS, error handling
│   ├── tests/              # Pytest automated test suite
│   ├── .env.example        # Server environment variables
│   ├── requirements.txt
│   └── pytest.ini
├── database/
│   └── migrations/         # 001_initial_schema.sql (9 tables + RLS)
├── docs/                   # Architecture, Database, Windows Setup guides
├── .gitignore
└── README.md
```

---

## Quickstart (Windows PowerShell)

### 1. Launch FastAPI Backend
```powershell
cd "D:\Ujan Dutta\Zyllora\backend"
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --port 8000 --reload
```
API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)  
Health Check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

### 2. Launch React Frontend
```powershell
cd "D:\Ujan Dutta\Zyllora\frontend"
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Week 1 Milestone Status

- [x] Initial full-stack project structure established
- [x] Modern, minimal SaaS frontend with restrained indigo/violet accent
- [x] Landing Page, Login, Signup, Password Reset, Onboarding, Dashboard, Settings screens
- [x] Responsive layout (desktop, tablet, mobile) with drawer navigation
- [x] FastAPI backend with CORS, centralized error handling, and health check endpoint
- [x] Supabase JWT verification dependency (derives user identity server-side)
- [x] SQL database migration with 9 core tables and Row Level Security (RLS)
- [x] Automated pytest test suite for backend endpoints
- [x] Windows PowerShell installation & run instructions
