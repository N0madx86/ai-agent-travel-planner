# AI-Agent Travel Planner 🧭

A full-stack AI-powered travel planning application with hotel search and itinerary generation.
A local-first, real-time, multi-agent travel intelligence system (India-first).
This project combines live web scraping, local LLM agents, and a full-stack app to help users plan trips, manage budgets and tasks, and generate communications — while keeping control and data local.

---

## Quick Start

### Backend
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
playwright install chromium
python -m uvicorn app.main:app --reload
```

### Frontend
```powershell
cd frontend
npm run dev
```

Visit `http://localhost:5173` to use the app.

---

## Features

- 🏨 Live hotel search from Booking.com (no cached/fake numbers)
- 🤖 AI-powered itinerary generation (Ollama)
- 💾 Smart caching system
- 🎨 Beautiful glassmorphism UI
- 📱 Fully responsive design
- 🧠 Multi-agent reasoning: Planner, Budget, Task Manager, Communication
- 📜 Full audit trail: decisions and sources are recorded for transparency

## Tech Stack

- **Backend:** FastAPI, SQLModel, Playwright, Node.js (Express server.js), Ollama
- **Frontend:** React, Vite, Tailwind CSS v4
- **Database:** SQLite (async)

See `SETUP_GUIDE.md` (if available) for detailed instructions.

---

## Architecture

### High-level flow:
**React Frontend → FastAPI Backend → {Scrapers (Playwright), App DB, Ollama Agents}**

- Frontend: React (interactive UI, confirmations)
- Backend: FastAPI (centralized control, structured data, API)
- Scrapers: Playwright-based crawlers for live site data
- AI: Ollama running local LLMs for agent reasoning
- Database: SQLite for local dev / PostgreSQL for production

Everything that requires confirmation (emails, bookings, writes) goes through the UI.

---

## Prerequisites

- Git
- Node.js (for frontend) — recommended LTS
- Python 3.10+ (for FastAPI backend & scrapers)
- Playwright (browsers) — used by scrapers
- Ollama (or another local LLM runtime) — for local AI agents

Helpful links:
- Ollama: https://ollama.com 
- Playwright: https://playwright.dev

---

## Authors & Credits

- Maintainer: N0madx86 (https://github.com/N0madx86)
- Architecture & design inspired by local-first AI and multi-agent systems.
