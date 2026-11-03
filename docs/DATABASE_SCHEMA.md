# Zyllora Database Schema & Migrations Reference

This document details the Supabase PostgreSQL database architecture created in Week 1.

---

## 1. Schema Tables Overview

| Table Name | Description | RLS Enabled |
| :--- | :--- | :---: |
| `public.profiles` | Student profile metadata, major, explanation level, learning goal | **Yes** |
| `public.documents` | PDF document records, file size, page count, processing state | **Yes** |
| `public.document_chunks` | Extracted text chunks with page ranges (indexed for RAG) | **Yes** |
| `public.chat_sessions` | AI study conversation containers linked to documents | **Yes** |
| `public.chat_messages` | Message history with grounding metadata & page citations | **Yes** |
| `public.quizzes` | Multi-choice quiz configurations & document links | **Yes** |
| `public.quiz_questions` | Individual assessment questions, options, explanations | **Yes** |
| `public.quiz_attempts` | Student submissions, answers, scores, and duration | **Yes** |
| `public.usage_records` | Granular per-user consumption logs for quotas & cost control | **Yes** |

---

## 2. Row Level Security (RLS) Strategy

- **Zero Trust by Default:** Every table has `ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;` executed.
- **Strict User Isolation:**
  - Queries must match the verified JWT user ID: `USING (auth.uid() = user_id)`.
  - For `profiles`: `USING (auth.uid() = id)`.
  - For child tables (`quiz_questions`, `document_chunks`), policies verify ownership either directly via stored `user_id` or joined parent references.
- **Service Role Key:** The frontend only uses the public anonymous key (`VITE_SUPABASE_ANON_KEY`), ensuring all frontend database requests run under the authenticated user's RLS context.

---

## 3. How to Apply the Initial Migration in Supabase

1. Open your project on [https://supabase.com/dashboard](https://supabase.com/dashboard).
2. Navigate to the **SQL Editor** in the left sidebar.
3. Open the file `database/migrations/001_initial_schema.sql`.
4. Copy the entire SQL content and paste it into the Supabase SQL editor.
5. Click **Run**.
6. Verify in the **Table Editor** that the 9 tables are created with the shield icon indicating RLS is active.
