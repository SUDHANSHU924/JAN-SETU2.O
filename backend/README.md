# Grievance Backend

This is the backend project for a grievance management system.

The project uses one shared FastAPI backend. Later, two different frontend apps can connect to this same backend:

- **User/Citizen web app**
- **Authority/Officer/Admin dashboard**

There is no frontend code in this repo because this repo is focused only on backend work.

## My Backend Work

This backend is prepared for:

- FastAPI application setup
- Environment-based configuration
- CORS setup for frontend connection
- JWT token generation
- Password hashing utilities
- Pydantic request and response schemas
- Legacy auth and grievance route contracts
- JanSetu-style v1 route scaffolding
- Background task placeholder for AI processing
- Duplicate detection placeholder
- Department routing and SLA calculation logic
- Officer dashboard API route contracts
- WebSocket notification placeholder
- Basic backend testing setup
- Simple Dockerfile for running the backend

## Project Structure

```
grievance-backend/
├── app/
│   ├── main.py
│   ├── config.py
│   ├── api/
│   │   ├── auth.py
│   │   ├── grievances.py
│   │   ├── user_routes.py
│   │   ├── authority_routes.py
│   │   ├── officer.py
│   │   ├── ws.py
│   │   └── v1/
│   ├── services/
│   ├── repositories/
│   ├── models/
│   │   └── schemas.py
│   ├── services/
│   │   ├── ai_pipeline.py
│   │   ├── dedup.py
│   │   └── router.py
│   ├── utils/
│   │   └── auth.py
│   └── db/
├── tests/
├── requirements.txt
├── Dockerfile
├── .env
├── .gitignore
└── README.md
```

## Important Team Notes


**handling:** the backend API, authentication structure, configuration, routes, and integration placeholders.

**Other teammates will handle:**
- Database setup
- PostgreSQL models
- MongoDB storage
- Redis cache logic
- Alembic migrations
- AI/ML model implementation
- User frontend
- Authority dashboard frontend
- Final deployment setup

Database and AI code are not fully implemented here yet. The backend only keeps placeholders so those parts can be connected later.

## Environment Variables

The `.env` file contains configuration values used by the backend:

```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/grievance_db
MONGO_URI=mongodb://localhost:27017
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

The database URLs are placeholders for future database integration.

Legacy routes still exist for testing, while new JanSetu-style routes are
mounted under `/api/v1`. Database, AI microservice, deployment, and frontend
work are handled separately.

## Run Locally

### Create and activate a virtual environment:

```bash
python -m venv venv
source venv/bin/activate
```

On Windows:

```bash
venv\Scripts\activate
```

### Install dependencies:

```bash
pip install -r requirements.txt
```

### Start the FastAPI server:

```bash
uvicorn app.main:app --reload --port 8000
```

### Open Swagger UI:

```
http://localhost:8000/docs
```

## Main API Routes

**Health check:**
- `GET /health`

**User API health:**
- `GET /api/user/health`

**Authority API health:**
- `GET /api/authority/health`

**Auth routes:**
- `POST /auth/register`
- `POST /auth/login`

**v1 auth routes:**
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`

**Grievance route:**
- `POST /grievances/`

**v1 grievance routes:**
- `POST /api/v1/complaints`
- `POST /api/v1/grievances/`

**Officer routes:**
- `GET /api/officer/assigned`
- `PATCH /api/officer/{grievance_id}/resolve`
- `PATCH /api/officer/{grievance_id}/status`
- `GET /api/officer/analytics/summary`

**v1 officer routes:**
- `GET /api/v1/officers/me/queue`
- `GET /api/v1/officers/analytics/summary`

**v1 user route:**
- `GET /api/v1/users/me`

**WebSocket route:**
- `/ws/officer/{officer_id}`

## Current Route Behavior

Most routes currently return mock or placeholder responses.

This is intentional because:
- Database integration will be added by the database teammate
- AI/ML processing will be added by the AI teammate
- Frontend apps will consume these APIs later
- The goal of this backend work is to make the API structure ready for integration

## Authentication

JWT utilities are available for:
- Creating access tokens
- Verifying tokens
- Hashing passwords
- Verifying passwords

Login currently creates a test JWT token. Real user verification will be connected after database integration.

## AI Pipeline Placeholder

The grievance submission route can queue a background task.

Currently, the AI pipeline is only a placeholder. Later, the AI teammate can add:
- Language detection
- Translation
- Category classification
- Priority detection
- Sentiment detection
- Duplicate detection using embeddings

## Department Routing

Basic department routing and SLA calculation are included as backend business logic.

Example categories:
- Roads
- Health
- Water
- Education
- Electricity

If a category is unknown, the grievance is routed to a general department placeholder.

## Testing

Run tests with:

```bash
pytest tests/ -v
```

Tests are intended to check the current backend route contracts and health endpoints.

## Docker

A simple Dockerfile can be used to containerize only the FastAPI backend.

**Build the image:**

```bash
docker build -t grievance-backend .
```

**Run the container:**

```bash
docker run -p 8000:8000 grievance-backend
```

Full Docker Compose with PostgreSQL, MongoDB, and Redis is not included here because database setup is handled separately.

## Final Note

This backend is not a finished full product yet. It is a clean backend foundation.

It is ready to connect:
- Database logic
- AI/ML pipeline
- User frontend
- Authority dashboard
