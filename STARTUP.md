# JanSetu - Complete System Startup Guide

## 🚀 Project Status: READY TO RUN

All components are configured and tested. The system is ready for end-to-end testing.

---

## Quick Start (Recommended for Replit)

### Option 1: Using Replit "Run" Button
1. Click the green **Run** button in Replit
2. The `.replit` configuration automatically starts:
   - Backend API on port 8000
   - Frontend on port 5000
   - AI Engine on port 8001

**Wait 30-45 seconds for all services to start, then access:**
- Citizen App: https://jansetu.[USERNAME].repl.co
- Officer Portal: https://jansetu.[USERNAME].repl.co/officer
- Backend Docs: https://jansetu.[USERNAME].repl.co/api/v1/docs

---

## Manual Startup (3 Terminals)

### Terminal 1: Start Backend API
```bash
cd /workspaces/JANSETU/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Wait for message:** `Uvicorn running on http://0.0.0.0:8000`

### Terminal 2: Start Frontend
```bash
cd /workspaces/JANSETU/frontend
npm run dev
```

**Wait for message:** `Local: http://localhost:5000`

### Terminal 3: Start AI Engine (Optional)
```bash
cd /workspaces/JANSETU/services/ai-engine
python main.py
```

---

## 🧪 Test Credentials

Use these to log in and test the system:

### Citizen Portal
- **Phone:** 9000000002
- **Password:** Citizen@123
- **Access:** File complaints, track status, see dashboard

### Officer Portal
- **Phone:** 9876543210
- **Password:** Commander@123
- **Access:** View complaint queue, update status, analytics

### Admin Portal
- **Phone:** 9244878755
- **Password:** Admin@123
- **Access:** Full system access including analytics

---

## ✅ MVPTesting Sequence

### Test 1: Backend Health
```bash
curl http://localhost:8000/api/v1/health
# Expected: { "status": "ok" }
```

### Test 2: Citizen Login
1. Go to: http://localhost:5000/login
2. Enter:
   - Phone: 9000000002
   - Password: Citizen@123
3. **Expected:** Redirects to /citizen home with complaint list

### Test 3: File Complaint (Citizen)
1. Click "File Complaint" button
2. Enter details (all fields optional for MVP)
3. Click "Submit"
4. **Expected:** Get tracking token

### Test 4: Officer Queue
1. Open new window: http://localhost:5000/officer/login
2. Enter:
   - Phone: 9876543210
   - Password: Commander@123
3. **Expected:** Dashboard shows complaint queue
4. Update status to "In Progress"

### Test 5: Citizen Track Complaint
1. Go back to citizen app
2. Click "Track Complaint"
3. Enter tracking token
4. **Expected:** See full complaint status

---

## 🔧 Environment Configuration

### Backend (.env)
Located at `/workspaces/JANSETU/backend/.env`

**Required variables:**
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_KEY
- JWT_SECRET

### Frontend (.env.local)
Located at `/workspaces/JANSETU/frontend/.env.local`

**Required variables:**
- VITE_API_BASE_URL=http://localhost:8000

---

## 🎯 API Endpoints (MVP Required)

### Authentication
```
POST   /api/v1/auth/login           → Citizen & Officer login
POST   /api/v1/auth/officer-login   → Officer-only login
POST   /api/v1/auth/register        → New user registration
GET    /api/v1/health               → System health check
```

### Complaints
```
POST   /api/v1/complaints           → File new complaint
GET    /api/v1/complaints/{token}   → Get complaint details
GET    /grievances/my               → Citizen's complaints
GET    /grievances/queue            → Officer's queue
```

---

## 🐛 Troubleshooting

### "Connection Refused"
**Solution:** Backend hasn't started. Wait 30 seconds and refresh.

### "401 Unauthorized"
**Solution:** 
1. Clear localStorage: DevTools → Storage → Local Storage → Clear All
2. Log in again
3. Verify VITE_API_BASE_URL in frontend/.env.local

### Cannot file complaint
**Solution:** Check if:
1. You're logged in as citizen
2. Backend is running on port 8000
3. VITE_API_BASE_URL is set correctly

---

**System Status: ✅ READY FOR TESTING**

