# Graph Report - WanderMatch  (2026-09-23)

## Corpus Check
- 42 files · ~68,287 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 639 nodes · 1215 edges · 44 communities (32 shown, 12 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 65 edges (avg confidence: 0.91)
- Token cost: 1,200 input · 850 output

## Community Hubs (Navigation)
- Proposal API & Orchestration
- React App & Navigation UI
- Backend Core & Database Config
- Frontend NPM Dependencies
- Authentication & User Profiles
- Architecture & System Services
- Voting API & Additive Models
- PS-11 Relational Schema
- PS-11 Conformance Standards
- TypeScript App Configuration
- Hackathon Design Guidelines
- AI Planning & Face Recognition
- TypeScript Node Configuration
- Core Domain SQLAlchemy Models
- Milestones & Infrastructure Architecture
- Hackathon Rules & Process
- Consensus User Flow States
- Real-time WebSocket Manager
- Data Model Integrity Rules
- UI Prototype & Screens
- Face Recognition Service
- Vote Validation Schemas
- Team ChaosMinds Engineering Roles
- WanderMatch Core Capabilities
- Constraint Validation Rules
- Reference Data Endpoints
- Oxlint Code Quality Config
- Client WebSocket Service
- Backend Core Dependencies
- Itinerary Concurrency & Additives
- Service Health Monitoring
- Travel Decision Modes
- TypeScript Project References
- Docker Infrastructure Services
- AI Consensus Prompt Templates
- Frontend Entrypoint Setup
- SQLAlchemy Base Declarative
- ISO-8601 Temporal Standard
- Brand Favicon Asset
- UI Icon Sprite Asset
- Frontend Linter Setup
- React Framework Asset
- Vite Bundler Asset
- Backend Service Container

## God Nodes (most connected - your core abstractions)
1. `ApiService` - 31 edges
2. `ChaosMinds PS-11 Design Document` - 29 edges
3. `useAuth()` - 29 edges
4. `PS-11 Data Model Document` - 28 edges
5. `WanderMatch Design Document (Chaosminds)` - 27 edges
6. `PS-11 Data Model Document` - 22 edges
7. `react` - 21 edges
8. `compilerOptions` - 18 edges
9. `lucide-react` - 17 edges
10. `PS-11 README (Start Here)` - 16 edges

## Surprising Connections (you probably didn't know these)
- `09:00 Rule (Feature Freeze 3 Hours Before Deadline)` --semantically_similar_to--> `Checkpoint 2: AI Working Demo (Hour 21 / 09:00)`  [INFERRED] [semantically similar]
  data/04_HACKATHON_DAY_PROCESS.md → docs/ChaosMinds_PS11_Design.pdf
- `Itinerary Versioning for Conflict Handling` --semantically_similar_to--> `Additive Tables (branches, branch_members, revision_history, trip_chat_messages, face_profiles, photos/photo_person)`  [INFERRED] [semantically similar]
  data/01_YOUR_DATA_MODEL.md → docs/ChaosMinds_PS11_Design.pdf
- `ChaosMinds PS-11 Design Document` --references--> `WanderMatch — Social & Group Travel Planning`  [EXTRACTED]
  docs/ChaosMinds_PS11_Design.pdf → data/01_YOUR_DATA_MODEL.md
- `WanderMatch Design Document (Chaosminds)` --conceptually_related_to--> `Design Submission (Hackathon Deliverable)`  [INFERRED]
  docs/design_text.txt → data/03_DESIGN_SUBMISSION_GUIDE.md
- `Landing Page Hero Banner` --conceptually_related_to--> `WanderMatch Overview`  [INFERRED]
  frontend/src/assets/hero.png → README.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Collaborative Itinerary Planning Flow (Proposals → Votes → AI Consensus)** — data_01_your_data_model_proposals_table, data_01_your_data_model_votes_table, docs_design_text_consensus_planner, data_01_your_data_model_itinerary_items_table [EXTRACTED 1.00]
- **Consensus & Conflict Resolution Flow (proposals, votes, AI planner working together)** — data_01_your_data_model_table_proposals, data_01_your_data_model_table_votes, docs_chaosmindss_ps11_design_ai_consensus_planner, docs_chaosmindss_ps11_design_mode_a_admin_led, docs_chaosmindss_ps11_design_mode_na_no_admin [EXTRACTED 1.00]
- **Eight Data Integrity Rules (R1-R8) Governing All Tables** — data_01_your_data_model_r1_additive_only, data_01_your_data_model_r2_opaque_ids, data_01_your_data_model_r3_money_pair, data_01_your_data_model_r8_no_hard_delete, data_01_your_data_model_r6_bcp47_language [EXTRACTED 1.00]
- **Core PS-11 Data Model Tables (trips, trip_members, itineraries, itinerary_items, proposals, votes)** — data_01_your_data_model_table_trips, data_01_your_data_model_table_trip_members, data_01_your_data_model_table_itineraries, data_01_your_data_model_table_itinerary_items, data_01_your_data_model_table_proposals, data_01_your_data_model_table_votes [EXTRACTED 1.00]
- **Full Technology Stack (React, FastAPI, PostgreSQL, Hosted LLM, Cloudinary, DeepFace, Firebase Auth)** — docs_chaosmindss_ps11_design_react_typescript_frontend, docs_chaosmindss_ps11_design_architecture_fastapi, docs_chaosmindss_ps11_design_postgresql, docs_chaosmindss_ps11_design_hosted_llm_api, docs_chaosmindss_ps11_design_cloudinary, docs_chaosmindss_ps11_design_deepface_arcface, docs_chaosmindss_ps11_design_firebase_auth [EXTRACTED 1.00]
- **WanderMatch Tech Stack (React + FastAPI + PostgreSQL + LLM)** — docs_design_text_react_typescript_frontend, docs_design_text_fastapi_backend, docs_design_text_postgresql_database, docs_design_text_hosted_llm_api [EXTRACTED 1.00]
- **Travel Planning Operating Modes** — readme_wandermatch, readme_mode_a, readme_mode_na [EXTRACTED 1.00]
- **Multi-Service Container Infrastructure** — infra_docker_compose_postgres, infra_docker_compose_backend, infra_docker_compose_frontend [EXTRACTED 1.00]

## Communities (44 total, 12 thin omitted)

### Community 0 - "Proposal API & Orchestration"
Cohesion: 0.05
Nodes (77): create_proposal(), list_trip_proposals(), AsyncSession, get, post, Submit a proposal for an itinerary item across 4 actions (add, remove, replace,…, Resolve a proposal (accept or reject). Applies strict itinerary optimistic…, Fetch all proposals for the trip with live vote tallies, voter details, and… (+69 more)

### Community 1 - "React App & Navigation UI"
Cohesion: 0.08
Nodes (44): MainLayout(), ProtectedRoute(), Navbar(), NavbarProps, StatusBadge(), StatusBadgeProps, BranchViewScreen(), CreateTripModal() (+36 more)

### Community 2 - "Backend Core & Database Config"
Cohesion: 0.06
Nodes (39): asyncio, backend_app_api, Settings, init_db(), Initialize additive tables in the database if they do not exist., lifespan(), Lifecycle event handler for database initialization and services., init_firebase() (+31 more)

### Community 3 - "Frontend NPM Dependencies"
Cohesion: 0.05
Nodes (36): dependencies, lucide-react, react, react-dom, react-router-dom, tailwindcss, @tailwindcss/vite, devDependencies (+28 more)

### Community 4 - "Authentication & User Profiles"
Cohesion: 0.16
Nodes (24): get_my_profile(), login(), AsyncSession, get, post, Update traveller preferences and profile details., Sync Firebase user identity to the PostgreSQL/SQLite `users` table. If the user…, Return the authenticated user profile with preferences. (+16 more)

### Community 5 - "Architecture & System Services"
Cohesion: 0.11
Nodes (26): Additive Tables, AI Service, Frontend Module: Branch View, External Service: Cloudinary (Photo Storage), Collaboration Service, External Service: DeepFace / ArcFace (Face Detection & Recognition), Frontend Module: Face Registration, FastAPI Backend (Single Orchestrator) (+18 more)

### Community 6 - "Voting API & Additive Models"
Cohesion: 0.14
Nodes (22): cast_vote(), AsyncSession, post, Cast or update a vote on a proposal. Enforces that 'no' votes MUST carry a non-…, Branch, BranchMember, FaceProfile, Photo (+14 more)

### Community 7 - "PS-11 Relational Schema"
Cohesion: 0.17
Nodes (24): cities table, countries table, currencies table, PS-11 Data Model Document, itineraries table, itinerary_items table, languages table, Polymorphic (entity_type, entity_id) Reference Pattern (+16 more)

### Community 8 - "PS-11 Conformance Standards"
Cohesion: 0.10
Nodes (22): Data Model v1.1.0-rc1, Kognivera Hackathon 2026, Polymorphic Entity Reference (entity_type, entity_id) Pattern, PS-11 Data Model Document, Rule R2: IDs are opaque prefixed strings, Rule R3: Money is decimal + ISO-4217 currency code, never a float, Rule R6: Language is BCP-47 tag, Rule R8: Nothing is hard-deleted (+14 more)

### Community 9 - "TypeScript App Configuration"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 10 - "Hackathon Design Guidelines"
Cohesion: 0.15
Nodes (17): PS-11 Data Model Diagram (Interactive HTML), AI Approach Section Requirement (what AI does, grounding, measurability), Design Submission (Hackathon Deliverable), Design Submission Deadline: 2 September 2026, Design Submission Guide — PS-11, Submission File Limits (max 10 files, 25 MB each, one upload locked), Submission Naming Convention (TeamName_PS-11_Design_v1.pdf), Required Design Submission Sections (Cover, Problem, Scope, User Journey, Architecture, Data Model, AI Approach, Tech Stack, 24-hour Plan, Risks, Multilingual) (+9 more)

### Community 11 - "AI Planning & Face Recognition"
Cohesion: 0.21
Nodes (17): Blended Common-Ground Generator (AI Feature), Branch-Trigger Classifier (AI Feature), Cloudinary (Photo Storage), AI Consensus Planner, DeepFace / ArcFace Face Recognition Service, WanderMatch Design Document (Chaosminds), face_profiles table (New Additive Table), FastAPI Backend (Single Orchestrator) (+9 more)

### Community 12 - "TypeScript Node Configuration"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "Core Domain SQLAlchemy Models"
Cohesion: 0.23
Nodes (15): City, Country, Currency, Itinerary, ItineraryItem, Language, Proposal, Base (+7 more)

### Community 14 - "Milestones & Infrastructure Architecture"
Cohesion: 0.18
Nodes (15): AI Consensus Planner (Blended Common-Ground Generator), Architecture: FastAPI Single Orchestrator + WebSockets, Branch-Trigger Classifier, Checkpoint 1: Core Working Demo without AI (Hour 12 / 00:00), Checkpoint 2: AI Working Demo (Hour 21 / 09:00), Cloudinary (photo storage, thumbnails, delivery), DeepFace / ArcFace Face Recognition Service, ChaosMinds PS-11 Design Document (+7 more)

### Community 15 - "Hackathon Rules & Process"
Cohesion: 0.15
Nodes (14): PS-11 Problem Statement, WanderMatch — Social & Group Travel Planning, 09:00 Rule (Feature Freeze 3 Hours Before Deadline), Hackathon Day Process — PS-11, Final Submission at 12:00 (running app, solution write-up, presentation, source code), Hackathon Rules (3-5 members, 1 problem statement, no renaming provided fields), Kognivera Hackathon 2026, Mentors (unblock/review; come with specific questions) (+6 more)

### Community 16 - "Consensus User Flow States"
Cohesion: 0.19
Nodes (13): Add Slots (Everyone Adds Places & Time), AI Consensus? (Decision), Choose Branch (Everyone Selects a Branch), Continue Trip (Trip Continues Happily), Create Branch (AI Creates Alternative Plans), Create Trip (Invite Friends), Discuss / Modify (Chat, Suggest Changes, Add Constraints), End (+5 more)

### Community 17 - "Real-time WebSocket Manager"
Cohesion: 0.31
Nodes (5): ConnectionManager, Any, WebSocket, Broadcast a structured JSON event to all connected clients on this trip channel., Per-trip in-memory WebSocket connection and broadcast manager. Can be swapped…

### Community 18 - "Data Model Integrity Rules"
Cohesion: 0.31
Nodes (9): Rule R1: Additive Only, Rule R2: IDs are Opaque Prefixed Strings, Rule R3: Money is a Pair (decimal + ISO-4217), Rule R6: Language is a BCP-47 Tag, Working With The Data — PS-11, Largest-Remainder Money Split Algorithm, Money Handling Convention (Decimal, No Float), validate_conformance.py Tool (+1 more)

### Community 19 - "UI Prototype & Screens"
Cohesion: 0.25
Nodes (9): Table: proposals (274 rows), Table: votes (761 rows), Branch View Screen (Confirm / Request Modification), ChaosMinds PS-11 Frontend Prototype Document, Face Registration Screen (3-photo optional registration), Slot Detail Screen (proposals, live tally, No-reasons), Slot Statuses: Empty / Proposing / Voting / Common-Ground Round n / Branching / Confirmed, Solo Match Screen (ranked group matches and guide matches) (+1 more)

### Community 20 - "Face Recognition Service"
Cohesion: 0.25
Nodes (5): FaceService, Any, DeepFace / ArcFace Face Recognition Service Stub - P Nithya's Track Provides…, Extract facial embedding vector (stub for DeepFace.represent)., Match against registered face profiles. If below threshold, returns Unknown…

### Community 21 - "Vote Validation Schemas"
Cohesion: 0.29
Nodes (6): CastVoteRequest, Config, BaseModel, VoteOut, field_validator, ValidationInfo

### Community 22 - "Team ChaosMinds Engineering Roles"
Cohesion: 0.29
Nodes (7): Nikitha M N (Frontend / Real-time UI), P Nithya (Auth / Presence / Deployment), Panchami P (Backend / PostgreSQL & Voting Logic), PostgreSQL (system of record for PS-11 schema + additive tables), React + TypeScript Frontend, Team Chaosminds, Deployment: Vercel/Render + Managed PostgreSQL

### Community 23 - "WanderMatch Core Capabilities"
Cohesion: 0.29
Nodes (7): Landing Page Hero Banner, Mode A (Admin-Led), Mode NA (Collaborative), Phase 2 User Onboarding & Itinerary Flow, Phase 3 Proposals & Consensus Voting, Rule R1 Schema Adherence, WanderMatch Overview

### Community 24 - "Constraint Validation Rules"
Cohesion: 0.33
Nodes (4): HardConstraintValidator, Any, Hard-Constraint Validator Stub - Sharvani G Bhaskar's Track Ensures AI-…, Validate candidate against hard constraints.

### Community 25 - "Reference Data Endpoints"
Cohesion: 0.40
Nodes (6): list_cities(), list_currencies(), AsyncSession, get, List reference cities from PS-11 system of record., List ISO-4217 currencies from PS-11 system of record.

### Community 26 - "Oxlint Code Quality Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 28 - "Backend Core Dependencies"
Cohesion: 0.40
Nodes (5): FastAPI Dependency, Firebase Admin Dependency, SQLAlchemy Dependency, WebSockets Dependency, Phase 1 Architecture & Foundations

### Community 29 - "Itinerary Concurrency & Additives"
Cohesion: 0.40
Nodes (5): Itinerary Versioning for Conflict Handling, Rule R1: Additive Only (never rename/drop/repurpose provided fields), Table: itineraries (803 rows), Additive Tables (branches, branch_members, revision_history, trip_chat_messages, face_profiles, photos/photo_person), Optimistic Concurrency via itinerary.version Bump

### Community 30 - "Service Health Monitoring"
Cohesion: 0.50
Nodes (4): health_check(), AsyncSession, get, Health check endpoint confirming FastAPI orchestrator and database connectivity.

### Community 31 - "Travel Decision Modes"
Cohesion: 1.00
Nodes (3): 10-Minute Response Window (triggered by first No vote), Mode A: Admin-Led Consensus Flow, Mode NA: No-Admin Common-Ground + Branching Flow

### Community 33 - "Docker Infrastructure Services"
Cohesion: 0.67
Nodes (3): Backend Container Service, Frontend Container Service, PostgreSQL pgvector Service

## Knowledge Gaps
- **138 isolated node(s):** `StatusBadgeProps`, `Message`, `MessageHandler`, `Config`, `allowImportingTsExtensions` (+133 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 240 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PS-11 Data Model Document` connect `PS-11 Conformance Standards` to `Backend Core & Database Config`, `Hackathon Design Guidelines`, `Hackathon Rules & Process`, `UI Prototype & Screens`, `Team ChaosMinds Engineering Roles`, `Itinerary Concurrency & Additives`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `PS-11 README (Start Here)` connect `Hackathon Design Guidelines` to `Backend Core & Database Config`, `PS-11 Relational Schema`, `PS-11 Conformance Standards`, `Hackathon Rules & Process`, `Data Model Integrity Rules`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `WanderMatch — Social & Group Travel Planning` connect `Hackathon Rules & Process` to `PS-11 Relational Schema`, `PS-11 Conformance Standards`, `Hackathon Design Guidelines`, `AI Planning & Face Recognition`, `Milestones & Infrastructure Architecture`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `WanderMatch Design Document (Chaosminds)` (e.g. with `Design Submission (Hackathon Deliverable)` and `WanderMatch Frontend Design Document (Chaosminds)`) actually correct?**
  _`WanderMatch Design Document (Chaosminds)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `StatusBadgeProps`, `Message`, `MessageHandler` to the rest of the system?**
  _138 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Proposal API & Orchestration` be split into smaller, more focused modules?**
  _Cohesion score 0.05112279025322503 - nodes in this community are weakly interconnected._
- **Should `React App & Navigation UI` be split into smaller, more focused modules?**
  _Cohesion score 0.07698476343223737 - nodes in this community are weakly interconnected._