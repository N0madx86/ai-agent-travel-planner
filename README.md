# AI-Agent Travel Planner 🧭

## A local-first, real-time, multi-agent travel intelligence system (India-first)

### This project combines live web scraping, local LLM agents, and a full-stack app to help users plan trips, manage budgets and tasks, and generate communications — while keeping control and data local.

---

## Quick overview

### - Real-time prices from Indian travel websites via headless browsers (Playwright).
### - Multi-agent reasoning using local LLMs (Ollama) — no cloud LLM APIs required.
### - FastAPI backend controlling structured truth; React frontend for user interaction.
### - The app never performs payments or bookings — it only redirects users to official booking sites.
### - Designed so agents reason over structured data only (no direct web access).

---

## Demo (What it does)

### - Pulls live flight, train, and hotel prices.
### - Suggests itineraries and budget-friendly alternatives.
### - Maintains trip tasks and schedules.
### - Drafts emails and calendar entries for user approval.
### - Keeps everything auditable and user-controlled.

---

## Table of contents

### - [Why this project](#why-this-project)
### - [Architecture](#architecture)
### - [Features](#features)
### - [Prerequisites](#prerequisites)
### - [Local quickstart](#local-quickstart)
### - [Agents & responsibilities](#agents--responsibilities)
### - [Data policy & privacy](#data-policy--privacy)
### - [Roadmap](#roadmap)
### - [Contributing](#contributing)
### - [License & authors](#license--authors)

---

## Why this project

### - Demonstrates real-world web automation and data ingestion from live sites.
### - Shows orchestration of local multi-agent AI for product-level behavior.
### - Focuses on privacy and local-first operation to avoid recurring cloud costs and data leakage.
### - Built as a portfolio-grade full-stack engineering showcase.

---

## Architecture

### High-level flow:
### React Frontend → FastAPI Backend → {Scrapers (Playwright), App DB, Ollama Agents}

### - Frontend: React (interactive UI, confirmations)
### - Backend: FastAPI (centralized control, structured data, API)
### - Scrapers: Playwright-based crawlers for live site data
### - AI: Ollama running local LLMs for agent reasoning
### - Database: SQLite for local dev / PostgreSQL for production

### Everything that requires confirmation (emails, bookings, writes) goes through the UI.

---

## Features

### - Live scraping of fares and availability (no cached/fake numbers).
### - Multi-agent reasoning:
###   - Planner: builds itineraries
###   - Budget: validates budgets and suggests alternatives
###   - Task Manager: handles trip tasks
###   - Communication: drafts emails & calendar items
### - Export / draft generation for emails and calendars
### - Full audit trail: decisions and sources are recorded for transparency

---

## Prerequisites

### - Git
### - Node.js (for frontend) — recommended LTS
### - Python 3.10+ (for FastAPI backend & scrapers)
### - Playwright (browsers) — used by scrapers
### - Ollama (or another local LLM runtime) — for local AI agents
### - (Optional) Docker / Docker Compose for local orchestrated runs

### Helpful links:
### - Ollama: https://ollama.com (install and models)
### - Playwright: https://playwright.dev

---

## Local quickstart (example)

### These are example steps — adjust paths and commands to your repo structure.

### 1. Clone repository
###    git clone https://github.com/N0madx86/ai-agent-travel-planner
###    cd ai-agent-travel-planner

### 2. Backend (FastAPI + scrapers)
###    - Create and activate a virtual environment:
###      python -m venv .venv
###      source .venv/bin/activate  # macOS / Linux
###      .venv\Scripts\activate     # Windows
###    - Install backend dependencies:
###      pip install -r requirements.txt
###    - Initialize database (SQLite by default):
###      (provide any migration or init scripts here)
###    - Start backend:
###      uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

### 3. Frontend (React)
###    - cd frontend    # or appropriate frontend folder
###    - npm install
###    - npm run dev    # or npm start

### 4. Run Ollama and load model(s)
###    - Install and run Ollama locally per their docs.
###    - Ensure the backend can reach Ollama (configure OLLAMA_HOST if needed).

### 5. Scrapers
###    - Install Playwright browsers:
###      playwright install
###    - Run scraper jobs / workers (see scripts/README in repo for exact commands).

### Notes:
### - Use SQLite for simple local dev. Set DATABASE_URL for PostgreSQL if needed.
### - Set environment variables like OLLAMA_HOST, DATABASE_URL, SECRET_KEY, etc., as required (document exact variables in repo).

---

## Agents & responsibilities

### - Planner Agent: consumes structured offers and builds itineraries.
### - Budget Agent: evaluates feasibility vs. user budget and suggests alternates.
### - Task Agent: manages to-do items and reminders for trips.
### - Communication Agent: drafts emails/calendar events (requires user confirmation before sending).

### Important: Agents do not have direct internet access — they operate only on structured data the backend provides.

---

## Real-time data & scraping policy

### - The system fetches live data using headless browser automation.
### - No cached estimates or fabricated numbers — the source URL and timestamp for each price is recorded.
### - Respect site Terms of Service and robots.txt; use throttling and polite scraping patterns.
### - This repo is for education and prototyping — ensure compliance before usage at scale.

---

## Privacy & safety

### - Local LLMs (Ollama) keep models and inference local — minimizing exposure to third-party cloud APIs.
### - The app will never:
###   - Book purchases automatically.
###   - Send emails without explicit user confirmation.
###   - Make payments.
### - All actions that change persistent data require user confirmation via the UI.

---

## Roadmap (high-level)

### Planned / in-progress items:
### - Phase 1: Architecture & design (complete)
### - Phase 2: Core system — backend, scrapers, Ollama integration, basic React UI
### - Phase 3: Intelligence layer — budget analysis, task management, email & calendar drafts, voice interface
### - Future: richer integrations (Google Calendar/Email with explicit OAuth), production-grade deployment, model exploration & plugin system

---

## Contributing

### Contributions are welcome. Please:
### 1. Open an issue describing your idea or bug.
### 2. Fork the repository and work on a feature branch.
### 3. Open a PR with tests (where applicable) and a clear description.

### Guidelines:
### - Explain any scrape patterns and add rate limits to avoid causing harm to target sites.
### - Keep local-first and privacy considerations in mind for feature design.
### - Add docs and tests for new functionality.

---

## Troubleshooting & tips

### - If Playwright fails to launch browsers, run `playwright install`.
### - If Ollama is unreachable, check your OLLAMA_HOST and firewall.
### - For reproducible environments, consider Docker Compose to run backend, frontend, and Ollama locally.

---

## Authors & credits

### - Maintainer: N0madx86 (https://github.com/N0madx86)
### - Architecture & design inspired by local-first AI and multi-agent systems.

---
