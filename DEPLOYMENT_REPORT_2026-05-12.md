# JANSETU Deployment Report

Date: 2026-05-12  
Owner: Sudhanshu Suryawanshi  
Project Path: `/Users/sudhanshusuryawanshi/VS Code.../Python files/JANSETU-main`

## 1) Deployment Summary

- Frontend deployed on Vercel.
- Backend deployed on Railway.
- Initial frontend issue: `Failed to fetch`.
- Root cause: Vercel frontend project missing `VITE_API_BASE_URL`.
- Secondary issue: Audio transcription fallback message (`Could not transcribe. Please type manually.`).
- Root cause: Backend runtime missing `ffmpeg` + `openai-whisper`.

Current status:
- Frontend build is loading with correct backend URL.
- Backend health endpoints are responding `200 OK`.
- Auth routes are working.
- Audio transcription endpoint is returning `200 OK` in production logs.

## 2) Tech Stack

### Frontend
- React 19
- Vite 8
- React Router DOM 7
- Zustand
- Framer Motion
- Vite PWA Plugin

Key frontend configs:
- Env: `VITE_API_BASE_URL`
- Hosting: Vercel
- SPA rewrite via `frontend/vercel.json`
- Service Worker enabled (PWA)

### Backend
- FastAPI
- Uvicorn
- Supabase Python SDK
- Pydantic / Pydantic Settings
- JWT via `python-jose`
- `openai-whisper` for audio transcription
- `ffmpeg` at container level for audio conversion

Key backend configs:
- Hosting: Railway
- Container: `backend/Dockerfile`
- CORS middleware enabled in `backend/app/main.py`

### Database / Services
- Supabase (Postgres + API)
- Optional integrations present in code:
  - Twilio SMS (currently mock mode if creds absent)
  - CLIP / sentence-transformers features are optional and can be missing

## 3) Important Environment Variables

### Vercel (Frontend project: `frontend`)
- `VITE_API_BASE_URL=https://jansetu-backend-production.up.railway.app`
  - Added for:
    - `Production`
    - `Preview`

Verification command:
```bash
npx vercel env ls
```

### Railway (Backend)
Required for core backend + DB:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET` (or `SECRET_KEY`)

Optional:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

## 4) Credentials (Important)

Note: These are currently active/observed during debugging. Rotate if needed before sharing publicly.

### Citizen
- Phone: `9000000002`
- Password: `Citizen@123`

### Officer (reported in seed docs, but was invalid on prod at one point)
- Phone: `9876543210`
- Password: `Commander@123`

### Admin (confirmed working in production)
- Phone: `9000000001`
- Password: `Admin@123`

### Officer login endpoint
- `POST /api/v1/auth/officer-login`

## 5) Fixes Applied in Code

### Frontend safety + diagnostics
- `frontend/src/config/api.js`
  - Added API base URL normalization.
  - Added missing-env guard message.
- `frontend/src/services/api.js`
  - Added explicit fail-fast if `VITE_API_BASE_URL` is missing.

### Backend transcription fix
- `backend/requirements.txt`
  - Added `openai-whisper==20250625`
- `backend/requirements-prod.txt`
  - Added `openai-whisper==20250625`
- `backend/Dockerfile`
  - Added `ffmpeg` apt install step.
- `backend/app/services/ai_pipeline.py`
  - Whisper model changed from `"base"` to `"tiny"` for lighter Railway runtime.

## 6) Deployment Evidence (Observed)

### Backend health
- `GET /health` -> `200 OK`
- `GET /api/v1/health` -> `200 OK`

### CORS/auth
- OPTIONS + login calls succeeded from deployed frontend origin.
- `POST /auth/login` -> multiple `200 OK` observed.
- `POST /api/v1/auth/officer-login` -> `200 OK` observed.

### Audio transcription
- `POST /grievances/test/transcribe-audio` -> repeated `200 OK` observed in Railway logs.

## 7) Known Non-blocking Warnings

These were present in logs but do not block core flow:
- Missing local AI weights under `/services/ai-engine/weights/...`
- Optional module missing: `transformers`
- Optional module missing: `sentence_transformers`
- Twilio creds missing -> SMS mock mode
- `/favicon.ico` `404` (cosmetic for backend)

## 8) Current Production URLs

- Frontend (active tested): `https://frontend-kappa-seven-72.vercel.app/login`
- Backend: `https://jansetu-backend-production.up.railway.app`

## 9) Post-deploy User-side Steps (Browser)

If stale behavior appears due to PWA cache:
1. Open site in Chrome.
2. DevTools -> Application -> Service Workers -> Unregister.
3. Application -> Clear Storage -> Clear site data.
4. Hard reload (`Cmd+Shift+R`).

## 10) Git Push Plan (Next Step)

Before pushing:
1. Review `git status` carefully (worktree has many unrelated changes).
2. Stage only required files for this deployment fix/report.
3. Commit with clear message.
4. Push to GitHub repo branch.

Suggested minimal stage set for this work:
- `backend/Dockerfile`
- `backend/requirements.txt`
- `backend/requirements-prod.txt`
- `backend/app/services/ai_pipeline.py`
- `frontend/src/config/api.js`
- `frontend/src/services/api.js`
- `DEPLOYMENT_REPORT_2026-05-12.md`

Suggested commit message:
`fix(deploy): set frontend API guard and enable railway audio transcription with ffmpeg+whisper`

## 11) Security Reminder

Because this report contains credentials:
- Do not publish this file in a public repository as-is.
- Prefer moving credentials to a private vault and redacting before public push.

