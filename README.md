# Playto Engineering Challenge Prototype

A community feed prototype with threaded comments, karma system, and rolling 24h leaderboard.

## Stack
- **Backend:** Django 5 + Django REST Framework + SQLite
- **Frontend:** React (Vite) + Tailwind CSS

## Prerequisites
- Python 3.10+
- Node.js 18+

## Setup & Run

### 1. Backend
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Install dependencies
pip install django djangorestframework django-cors-headers
# Run migrations
python manage.py migrate
# Start server
python manage.py runserver
```
Runs on `http://localhost:8000`

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`

## Features
- **Auth**: Register/Login (Standard Django handling)
- **Feed**: Post creation and listing
- **Comments**: Unlimited nested threads (Reddit-style)
- **Likes**: Atomic likes with karma (Post=+5, Comment=+1)
- **Leaderboard**: Updates in real-time based on last 24h activity.

## API Endpoints
- `POST /api/auth/register/`
- `POST /api/auth/login/`
- `GET/POST /api/posts/`
- `GET /api/posts/{id}/` (includes comment tree)
- `POST /api/posts/{id}/comments/`
- `POST /api/comments/{id}/reply/`
- `POST /api/likes/`
- `GET /api/leaderboard/`