# Playto Engineering Challenge

A full-stack community feed application featuring threaded comments and a real-time karma leaderboard.

## Project Overview

This project implements a social feed where users can post updates, engage in deep discussions via nested threaded comments, and compete on a rolling 24-hour leaderboard based on engagement.

**Key Features:**
- **Community Feed:** Create posts and view a chronological feed.
- **Threaded Comments:** Infinite nesting depth for discussions.
- **Leaderboard:** Top 5 users based on karma earned in the last 24 hours (weighted scoring).

## Tech Stack

- **Backend:** Python, Django, Django REST Framework (DRF)
- **Frontend:** React, Tailwind CSS
- **Database:** SQLite (Default for local setup) / PostgreSQL (Production ready)

## Local Setup

### Backend (Django)

1.  **Navigate to backend:**
    ```bash
    cd backend
    ```

2.  **Create virtual environment & install dependencies:**
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # macOS/Linux
    source venv/bin/activate
    
    pip install -r requirements.txt
    ```

3.  **Run migrations:**
    ```bash
    python manage.py migrate
    ```

4.  **Start server:**
    ```bash
    python manage.py runserver
    ```
    *Runs on:* `http://localhost:8000`

### Frontend (React)

1.  **Navigate to frontend:**
    ```bash
    cd frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start development server:**
    ```bash
    npm run dev
    ```
    *Runs on:* `http://localhost:5173` (typically)

## Deployment

[Link to Live Deployment](#) *(Replace with actual link if deployed, e.g., on Vercel/Render)*