README.md ke liye yeh paste karo:

```markdown
<div align="center">

# 🏛️ JAN-SETU 2.0
### AI-Powered Citizen Grievance Management System

[![Python](https://img.shields.io/badge/Python-3.11-blue?style=flat-square&logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql)](https://postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**Bridging citizens and government through the power of AI**

[🌐 Live Demo](#) · [📖 Docs](#) · [🐛 Report Bug](#) · [✨ Request Feature](#)

</div>

---

## 🎯 What is JanSetu?

JanSetu is an intelligent grievance management platform that allows Indian citizens
to file complaints in **22 regional languages** using text, voice, or photo — and
get resolution in record time. The AI pipeline classifies, authenticates, and routes
every complaint to the correct government department in **under 3 seconds**.

> Built by **Team HORCRUX** at BGI Hackathon 2026

---

## ⚡ The Problem

India's CPGRAMS processes **2 million+ complaints per year — all manually.**

| Existing System | JanSetu |
|---|---|
| Manual classification | AI classifies in < 3 sec |
| English only | 22 Indian languages |
| No fraud detection | 5-signal auth score |
| No duplicate detection | MiniLM semantic clustering |
| No SLA prediction | XGBoost predicts resolution days |
| Batch processing | Real-time Socket.io updates |

---

## 🤖 AI Pipeline

```
User Input (text/voice/photo)
       │
       ▼
  🎙️ Whisper STT        → Audio to text
       │
       ▼
  🔬 IndicTrans2         → Any language → English
       │
       ▼
  🧠 DistilBERT          → Category + Priority + Sentiment
       │
       ▼
  🔍 MiniLM              → Duplicate & Cluster detection
       │
       ▼
  🖼️ CLIP               → Photo validates complaint
       │
       ▼
  🔐 Auth Score Engine   → 5-signal fraud detection (0-100)
       │
       ▼
  ⏱️ XGBoost SLA         → Predicted resolution days
       │
       ▼
  🔀 Smart Routing       → Department + Officer + Zone
```

---

## 🏗️ System Architecture

```
┌─────────────────────┐    ┌─────────────────────┐
│   Citizen Portal    │    │   Officer Portal     │
│   (React - :3000)   │    │   (React - :3001)    │
└────────┬────────────┘    └──────────┬──────────┘
         │                            │
         └──────────┬─────────────────┘
                    │
         ┌──────────▼──────────┐
         │   FastAPI Backend   │  :8000
         │   JWT Auth · RBAC   │
         └──────────┬──────────┘
              ┌─────┴─────┐
              │           │
    ┌─────────▼──┐  ┌─────▼──────┐
    │ AI Engine  │  │ Socket.io  │
    │  :8001     │  │  :3002     │
    └─────────┬──┘  └────────────┘
              │
    ┌─────────▼──────────────┐
    │  PostgreSQL · Redis    │
    │  MongoDB · Supabase    │
    └────────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + Vite
- **Tailwind CSS** + Framer Motion
- **Firebase Auth** (Phone OTP + Google + Email)
- **Socket.io Client** (real-time updates)

### Backend
- **FastAPI** (Python 3.11)
- **Node.js** + Socket.io (realtime service)
- **JWT** authentication with role-based access
- **Celery** + Redis (background tasks)

### AI / ML
| Model | Purpose |
|---|---|
| `distilbert-base-multilingual-cased` | Complaint classification (fine-tuned) |
| `all-MiniLM-L6-v2` | Duplicate & cluster detection |
| `openai/clip-vit-base-patch32` | Media validation |
| `openai/whisper-small` | Voice to text |
| `ai4bharat/IndicTrans2` | 22 Indian language translation |
| `XGBoost Regressor` | SLA resolution prediction |

### Database & Infrastructure
- **PostgreSQL** via Supabase
- **Redis** (cache + queue)
- **MongoDB** (logs + analytics)
- **Docker** + Docker Compose

---

## 📊 Key Metrics

```
Category Classification Accuracy  →  85%+
Priority Detection F1 Score       →  0.82
Auth Score Fraud Detection        →  89%
SLA Prediction MAE                →  < 1.0 day
AI Pipeline Latency               →  < 3 seconds
Languages Supported               →  22
```

---

## 🚀 Quick Start

```bash
# Clone the repo
git clone https://github.com/SUDHANSHU924/JAN-SETU2.O.git
cd JAN-SETU2.O

# Copy environment variables
cp .env.example .env
# Fill in your Supabase + Firebase credentials

# Start everything
bash deploy.sh
```

**Or run manually:**

```bash
# Backend
cd backend && pip install -r requirements.txt
uvicorn main:app --port 8000 --reload

# Frontend
cd frontend && npm install && npm run dev

# Services (AI + Realtime)
cd services && docker-compose up
```

---

## 🔑 Test Credentials

| Role | Phone/Email | Password |
|---|---|---|
| 👤 Citizen | `9000000002` | `Citizen@123` |
| 👮 Officer | `9876543210` | `Commander@123` |
| 🔧 Admin | `9000000001` | `Admin@123` |

---

## 📁 Project Structure

```
JAN-SETU2.O/
├── frontend/          React app (citizen + officer views)
├── backend/           FastAPI REST API
├── services/
│   ├── ai-engine/     AI inference microservice
│   └── realtime/      Socket.io live updates
├── database/
│   └── migrations/    PostgreSQL schema + seed data
└── deploy.sh          One-command startup
```

---

## 🧩 Core Innovations

- **🔐 Authenticity Score Engine** — 5-signal fraud detection (no existing Indian portal has this)
- **🔥 Mass Civic Alert** — 50+ similar complaints = auto cluster + Critical priority
- **📈 Dept Accountability Score** — Real-time public leaderboard for departments
- **⚡ Auto Escalation** — L1 → L2 → L3 public board without human intervention
- **🗣️ Voice-First Rural Access** — File complaint in Bhojpuri or any regional language

---

## 👥 Team HORCRUX

| Name | Role |
|---|---|
| **Sudhanshu Suryawanshi** | Frontend + Database |
| **Vagisha Yadav** | Frontend + UI/UX |
| **Anuradha Verma** | AI/ML Models |
| **Goutam Saha** | Backend + AI/ML |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built with ❤️ for India · BGI Hackathon 2026 · Team HORCRUX
</div>
```

Yeh paste karo aur **Commit changes** click karo. README automatically GitHub pe render ho jaayega with badges, tables, aur code blocks. 🚀
