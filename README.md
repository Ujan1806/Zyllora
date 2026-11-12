# Zyllora

> **Your study material. Your personal AI tutor.**

Zyllora is an AI-powered learning platform engineered for university students. Students upload academic PDFs (textbooks, lecture slides, research papers) and interact with an AI tutor that adapts to their learning pace, explains concepts with genuine page citations, and generates targeted revision quizzes.

---

## Technical Stack

- **Frontend:** React 18 + Vite, JavaScript, Tailwind CSS, Lucide React, React Router 6
- **Backend:** Python 3.12 + FastAPI, Pydantic v2, Uvicorn, PyJWT
- **Database & Auth:** Supabase PostgreSQL with Row Level Security (RLS), Supabase Auth
- **Vector Search:** `pgvector` with HNSW cosine index and semantic chunk retrieval
- **Storage:** Private Supabase Storage Bucket (`documents`) with RLS policy isolation
- **PDF Extraction:** PyMuPDF (fitz) with page-level boundary preservation
- **Chunking Engine:** Sentence/paragraph boundary chunking with overlap & page ranges
- **AI/RAG:** Provider-independent vector engine (Google Gemini 1.5 Flash / text-embedding-004, OpenAI/Groq compatible, and offline Mock provider)

---

## Project Structure

```
zyllora/
├── frontend/               # React + Vite web client
│   ├── src/
│   │   ├── components/     # Navbar, Sidebar, Footer, DocumentViewerModal, ProtectedRoute
│   │   ├── pages/          # Landing, Login, Signup, ForgotPassword, Onboarding, Dashboard, Settings, TutorWorkspacePage
│   │   ├── context/        # AuthContext (Supabase Auth & preview mode)
│   │   ├── hooks/          # useAuth
│   │   ├── services/       # Supabase client & FastAPI client (upload, list, status, page, delete, tutor chat)
│   │   └── index.css       # Tailwind directives & sleek theme styling
│   ├── .env.example        # Client environment variables
│   └── package.json
├── backend/                # FastAPI application
│   ├── app/
│   │   ├── dependencies/   # Supabase JWT token verification
│   │   ├── routers/        # Health check, Auth, Documents, and Tutor endpoints
│   │   ├── schemas/        # Pydantic v2 data models (tutor, document, health, auth)
│   │   ├── services/       # ai/, pdf_service, chunking_service, embedding_service, retrieval_service, prompt_service, tutor_service, storage_service, document_db
│   │   ├── config.py       # Pydantic Settings & configurable limits
│   │   └── main.py         # App entry point, CORS, error handling
│   ├── tests/              # Pytest automated test suite (27 tests)
│   ├── .env.example        # Server environment variables
│   ├── requirements.txt
│   └── pytest.ini
├── database/
│   └── migrations/         # 001_initial_schema.sql, 002_storage_and_documents.sql, 003_pgvector_and_embeddings.sql
├── docs/                   # Architecture, Database, Windows Setup guides
├── .gitignore
└── README.md
```

---

## Quickstart (Windows PowerShell)

### 1. Launch FastAPI Backend
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest -v
uvicorn app.main:app --port 8000 --reload
```
API Documentation: [http://localhost:8000/docs](http://localhost:8000/docs)  
Health Check: [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)  
Documents API: [http://localhost:8000/api/v1/documents](http://localhost:8000/api/v1/documents)  
AI Tutor API: [http://localhost:8000/api/v1/tutor/chat](http://localhost:8000/api/v1/tutor/chat)

### 2. Launch React Frontend
```powershell
cd frontend
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Development Milestones

### Week 1 — Project Foundation & UI Skeleton
- [x] Initial full-stack project structure established
- [x] Modern, minimal SaaS frontend with restrained indigo/violet accent
- [x] Landing Page, Login, Signup, Password Reset, Onboarding, Dashboard, Settings screens
- [x] Responsive layout (desktop, tablet, mobile) with drawer navigation
- [x] FastAPI backend with CORS, centralized error handling, and health check endpoint
- [x] Supabase JWT verification dependency (derives user identity server-side)
- [x] SQL database migration with 9 core tables and Row Level Security (RLS)
- [x] Windows PowerShell installation & run instructions

### Week 2 — PDF Upload and Document Processing
- [x] Polished drag-and-drop PDF upload UI with file size, progress bar, and status tracking
- [x] Configurable limits for file size (50MB), page count (200 pages), and processing timeouts
- [x] Document REST APIs: `upload`, `list`, `get`, `status`, `delete`, `pages/{page_number}`, `retry`
- [x] PyMuPDF extraction engine preserving 1-indexed page boundaries & metadata
- [x] Scanned / image-only PDF detection alerting students that OCR is required
- [x] Text chunking engine (500-800 words, ~80 word overlap, sentence/paragraph boundary aware)
- [x] Accurate `page_start` and `page_end` persistence per chunk
- [x] Private Supabase Storage bucket migration with RLS user isolation policies
- [x] Interactive document text inspector modal in frontend to review pages and chunks
- [x] 18 automated unit and integration tests passing with 100% success rate

### Week 3 — AI Tutor and RAG Engine
- [x] Provider-independent AI architecture (`BaseLLMProvider`, `BaseEmbeddingProvider`)
- [x] Google Gemini integration (`gemini-1.5-flash` / `text-embedding-004`) with usable free tier
- [x] OpenAI / Groq compatible alternative provider + offline deterministic Mock provider
- [x] Semantic vector retrieval engine with cosine similarity & configurable top-k filtering
- [x] `pgvector` database migration (003) with HNSW index and `match_document_chunks` RPC
- [x] Tutor system prompt with prompt injection firewall and zero hallucinated citations
- [x] 4 adaptive explanation modes: Beginner, Detailed, Step-by-Step, Example-Based
- [x] Structured JSON output validation (`answer`, `key_points`, `example`, `citations`, `grounded`)
- [x] Persistent study sessions and conversation history (`POST /chat`, `GET /sessions`, `DELETE /sessions`)
- [x] Frontend 3-panel interactive AI Tutor Workspace with live chat, source citation inspector, and session management
- [x] 27 automated unit and integration tests passing with 100% success rate
