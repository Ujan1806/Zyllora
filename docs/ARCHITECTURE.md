# Zyllora System Architecture (Week 1 Foundation)

**Tagline:** Your study material. Your personal AI tutor.

---

## 1. High-Level Architecture Overview

Zyllora is structured as a decoupled full-stack platform optimized for security, modular AI services, and sub-second student interactions:

```
+-------------------------------------------------------------+
|                     Client (Browser)                        |
|   React + Vite SPA + Tailwind CSS + Lucide + React Router   |
+------------------------------+------------------------------+
                               |
            +------------------+------------------+
            | (Direct Client Auth)                | (API Requests with Bearer JWT)
            v                                     v
+-----------------------+              +-----------------------+
|     Supabase Auth     |              |    FastAPI Backend    |
|   OAuth & JWT Tokens  |              |    Python 3.12+       |
+-----------+-----------+              +-----------+-----------+
            |                                      |
            |                                      | (Decodes & validates JWT)
            |                                      | (Derives user identity)
            v                                      v
+-------------------------------------------------------------+
|                   Supabase PostgreSQL DB                     |
|           Row Level Security (RLS) Enforced                  |
|  profiles | documents | chat_sessions | quizzes | usage     |
+-------------------------------------------------------------+
```

---

## 2. Security & Authentication Architecture

1. **Client Authentication:**
   - The user authenticates directly against Supabase Auth (Email/Password or Google OAuth).
   - On successful authentication, Supabase returns a signed JWT containing user claims (`sub`, `email`, `role`).
   - The frontend stores the session securely and passes the token in the `Authorization: Bearer <token>` HTTP header.

2. **Backend Authentication Verification:**
   - The FastAPI backend **never trusts user IDs sent in request bodies**.
   - The `get_current_user` FastAPI dependency intercepts incoming requests, decodes the Bearer token, and verifies the signature using `SUPABASE_JWT_SECRET` (HS256/ES256).
   - The user ID is strictly extracted from the `sub` claim.

3. **Database Isolation (Row Level Security):**
   - Every single table in PostgreSQL has RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
   - Policies strictly enforce `auth.uid() = user_id` for SELECT, INSERT, UPDATE, and DELETE operations.
   - Cross-user data leakage is blocked at the database engine level.

4. **Service-Role Key Protection:**
   - The Supabase Service-Role key is strictly forbidden from the frontend client.
   - Only `VITE_SUPABASE_ANON_KEY` is placed in client environments.

---

## 3. Directory Layout

```
zyllora/
├── frontend/
│   ├── public/
│   │   └── logo.svg
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   └── ProtectedRoute.jsx
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/
│   │   │   └── useAuth.js
│   │   ├── layouts/
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── SignupPage.jsx
│   │   │   ├── ForgotPasswordPage.jsx
│   │   │   ├── OnboardingPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── NotFoundPage.jsx
│   │   ├── services/
│   │   │   ├── api.js
│   │   │   └── supabaseClient.js
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
├── backend/
│   ├── app/
│   │   ├── dependencies/
│   │   │   ├── __init__.py
│   │   │   └── auth.py
│   │   ├── models/
│   │   │   └── __init__.py
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── api.py
│   │   │   ├── auth.py
│   │   │   └── health.py
│   │   ├── schemas/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── error.py
│   │   │   └── health.py
│   │   ├── services/
│   │   │   └── __init__.py
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   └── logger.py
│   │   ├── config.py
│   │   └── main.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── test_auth.py
│   │   └── test_health.py
│   ├── .env.example
│   ├── pytest.ini
│   └── requirements.txt
├── database/
│   └── migrations/
│       └── 001_initial_schema.sql
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATABASE_SCHEMA.md
│   └── SETUP_GUIDE_WINDOWS.md
├── .gitignore
└── README.md
```
