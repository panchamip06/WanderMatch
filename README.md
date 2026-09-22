# WanderMatch — Social & Group Travel Planning with AI Consensus Planner

[![PS-11 Conformance](https://img.shields.io/badge/PS--11%20Conformance-PASS%20(v1.1.0--rc1)-success)](#)
[![Stack](https://img.shields.io/badge/Stack-React%20%7C%20FastAPI%20%7C%20PostgreSQL%20%7C%20WebSockets-blue)](#)
[![Phase](https://img.shields.io/badge/Phases%201%2C%202%2C%203-Complete-emerald)](#)

> **Event**: KogniVera Hackathon 2026 · PS-11  
> **Team**: ChaosMinds  
> **Architecture**: React + TypeScript frontend, FastAPI single-orchestrator backend, PostgreSQL/SQLite system of record, Firebase Authentication identity mapping, per-trip WebSocket synchronization.

---

## 🌟 Overview & Architecture

WanderMatch solves the core conflict points of group travel planning through an intelligent consensus-driven itinerary planner with two distinct operating modes:
* **Mode A (Admin-Led)**: The trip owner holds decision authority with manual AI invocation and proposal resolution.
* **Mode NA (Collaborative / No-Admin)**: Decentralized group voting with a dynamic 10-minute consensus response window triggered by the first objection, leading to automated branching if common ground is exhausted.

### Rule R1 Schema Adherence
* Built with 100% strict compliance with the authoritative PS-11 data model (14 core tables, 27,428 synthetic records).
* **Additive tables only**: No provided tables or columns are renamed, dropped, or repurposed.
* Passed `validate_conformance.py` contract `v1.1.0-rc1` with 0 findings.

---

## 🚀 Implemented Capabilities

### Phase 1 — Architecture & Core Foundations
* FastAPI single-orchestrator backend with CORS, Pydantic schemas, and SQLAlchemy async models for all 14 PS-11 tables + 7 additive tables.
* Firebase Auth token integration with local user profile sync.
* Real-time WebSocket connection manager isolated per trip (`/ws/trips/{trip_id}`).

### Phase 2 — User Onboarding, Trip Creation & Itinerary Flow
* **Traveller Profile & Preferences**: Configurable travel style, pace, budget band, and interests.
* **Trip Creation**: Destination picker across 60 reference cities, party size, and explicit Mode selection (Mode A vs Mode NA).
* **Join Trip**: Multi-member trip participation with role assignments (`editor`, `viewer`).
* **Day-by-Day Slot Management**: Interactive itinerary slots with monotonic `itineraries.version` increments.

### Phase 3 — Proposals, Consensus Voting & Optimistic Concurrency
* **Proposal Submission**: Full support across all 4 documented actions (`add`, `remove`, `replace`, `reschedule`).
* **Voting Rules**: Yes / No / Abstain voting. Non-empty typed objection comment strictly enforced for every No vote (HTTP 422 Unprocessable Entity if omitted).
* **10-Minute Response Window (Mode NA)**: First No vote automatically initiates a 10-minute consensus countdown stored in the additive `proposal_timers` table and broadcasted in real time.
* **Vote Transparency**: "Who voted what" member chips, live vote tallies, and an aggregated objections panel feeding downstream AI consensus.
* **Itinerary Optimistic Concurrency**: Proposal resolution validates `expected_itinerary_version == itinerary.version`, returning HTTP 409 Conflict on mismatch to prevent stale overwrites.

---

## 🛠️ Quick Start & Running Locally

### 1. Backend Setup
```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# Linux/macOS
source .venv/bin/activate

pip install -r requirements.txt
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```
* Backend API: `http://localhost:8000`
* Swagger / OpenAPI Docs: `http://localhost:8000/docs`
* Health Check: `http://localhost:8000/health`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
* Web App: `http://localhost:5173`

---

## 🧪 Automated Testing & Verification

Run the test suite from the repository root:

```bash
# 1. PS-11 Conformance Check (must pass contract v1.1.0-rc1)
python data/tools/validate_conformance.py data/data/PS-11.db

# 2. Phase 2 End-to-End User Flow
python backend/test_phase2.py

# 3. Phase 3 Real-time Multi-Client WebSocket & Optimistic Concurrency Test
python backend/test_phase3.py

# 4. Frontend Production Build
cd frontend && npm run build
```
