# Graph Report - WanderMatch  (2026-09-22)

## Corpus Check
- 80 files · ~54,332 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 524 nodes · 945 edges · 29 communities (25 shown, 4 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 66 edges (avg confidence: 0.91)
- Token cost: 12,500 input · 4,200 output

## Community Hubs (Navigation)
- Consensus Engine & Execution Plan
- Relational Schema & Core Entities
- Hackathon Rules & Deliverables
- System Architecture & Services
- Data Model & Entity Schemas
- WanderMatch AI & Feature Scope
- Conformance Validation Tooling
- User Flow & State Transitions
- Data Conventions & Money Rules
- Temporal Data Conventions
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28

## God Nodes (most connected - your core abstractions)
1. `ChaosMinds PS-11 Design Document` - 29 edges
2. `PS-11 Data Model Document` - 28 edges
3. `WanderMatch Design Document (Chaosminds)` - 27 edges
4. `PS-11 Data Model Document` - 22 edges
5. `compilerOptions` - 18 edges
6. `PS-11 README (Start Here)` - 16 edges
7. `User` - 15 edges
8. `compilerOptions` - 15 edges
9. `react` - 12 edges
10. `Design Submission Guide — PS-11` - 11 edges

## Surprising Connections (you probably didn't know these)
- `09:00 Rule (Feature Freeze 3 Hours Before Deadline)` --semantically_similar_to--> `Checkpoint 2: AI Working Demo (Hour 21 / 09:00)`  [INFERRED] [semantically similar]
  data/04_HACKATHON_DAY_PROCESS.md → docs/ChaosMinds_PS11_Design.pdf
- `Itinerary Versioning for Conflict Handling` --semantically_similar_to--> `Additive Tables (branches, branch_members, revision_history, trip_chat_messages, face_profiles, photos/photo_person)`  [INFERRED] [semantically similar]
  data/01_YOUR_DATA_MODEL.md → docs/ChaosMinds_PS11_Design.pdf
- `ChaosMinds PS-11 Design Document` --references--> `WanderMatch — Social & Group Travel Planning`  [EXTRACTED]
  docs/ChaosMinds_PS11_Design.pdf → data/01_YOUR_DATA_MODEL.md
- `WanderMatch Design Document (Chaosminds)` --conceptually_related_to--> `Design Submission (Hackathon Deliverable)`  [INFERRED]
  docs/design_text.txt → data/03_DESIGN_SUBMISSION_GUIDE.md
- `ChaosMinds PS-11 Design Document` --references--> `Table: trips (600 rows)`  [EXTRACTED]
  docs/ChaosMinds_PS11_Design.pdf → data/01_YOUR_DATA_MODEL.pdf

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Collaborative Itinerary Planning Flow (Proposals → Votes → AI Consensus)** — data_01_your_data_model_proposals_table, data_01_your_data_model_votes_table, docs_design_text_consensus_planner, data_01_your_data_model_itinerary_items_table [EXTRACTED 1.00]
- **Consensus & Conflict Resolution Flow (proposals, votes, AI planner working together)** — data_01_your_data_model_table_proposals, data_01_your_data_model_table_votes, docs_chaosmindss_ps11_design_ai_consensus_planner, docs_chaosmindss_ps11_design_mode_a_admin_led, docs_chaosmindss_ps11_design_mode_na_no_admin [EXTRACTED 1.00]
- **Eight Data Integrity Rules (R1-R8) Governing All Tables** — data_01_your_data_model_r1_additive_only, data_01_your_data_model_r2_opaque_ids, data_01_your_data_model_r3_money_pair, data_01_your_data_model_r8_no_hard_delete, data_01_your_data_model_r6_bcp47_language [EXTRACTED 1.00]
- **Core PS-11 Data Model Tables (trips, trip_members, itineraries, itinerary_items, proposals, votes)** — data_01_your_data_model_table_trips, data_01_your_data_model_table_trip_members, data_01_your_data_model_table_itineraries, data_01_your_data_model_table_itinerary_items, data_01_your_data_model_table_proposals, data_01_your_data_model_table_votes [EXTRACTED 1.00]
- **Full Technology Stack (React, FastAPI, PostgreSQL, Hosted LLM, Cloudinary, DeepFace, Firebase Auth)** — docs_chaosmindss_ps11_design_react_typescript_frontend, docs_chaosmindss_ps11_design_architecture_fastapi, docs_chaosmindss_ps11_design_postgresql, docs_chaosmindss_ps11_design_hosted_llm_api, docs_chaosmindss_ps11_design_cloudinary, docs_chaosmindss_ps11_design_deepface_arcface, docs_chaosmindss_ps11_design_firebase_auth [EXTRACTED 1.00]
- **WanderMatch Tech Stack (React + FastAPI + PostgreSQL + LLM)** — docs_design_text_react_typescript_frontend, docs_design_text_fastapi_backend, docs_design_text_postgresql_database, docs_design_text_hosted_llm_api [EXTRACTED 1.00]

## Communities (29 total, 4 thin omitted)

### Community 0 - "Consensus Engine & Execution Plan"
Cohesion: 0.07
Nodes (68): get_my_profile(), get, Return the authenticated user profile., create_proposal(), list_trip_proposals(), AsyncSession, get, post (+60 more)

### Community 1 - "Relational Schema & Core Entities"
Cohesion: 0.08
Nodes (35): App(), MainApp(), Navbar(), NavbarProps, StatusBadge(), StatusBadgeProps, frontend_src_index, BranchViewScreen() (+27 more)

### Community 2 - "Hackathon Rules & Deliverables"
Cohesion: 0.06
Nodes (22): asyncio, HardConstraintValidator, Any, Hard-Constraint Validator Stub - Sharvani G Bhaskar's Track Ensures AI-…, Validate candidate against hard constraints., ConnectionManager, Any, WebSocket (+14 more)

### Community 3 - "System Architecture & Services"
Cohesion: 0.06
Nodes (32): dependencies, lucide-react, react, react-dom, tailwindcss, @tailwindcss/vite, devDependencies, oxlint (+24 more)

### Community 4 - "Data Model & Entity Schemas"
Cohesion: 0.09
Nodes (25): backend_app_api, AsyncSession, post, Sync Firebase user identity to the PostgreSQL/SQLite `users` table. If the user…, sync_firebase_user(), Settings, init_db(), Initialize additive tables in the database if they do not exist. (+17 more)

### Community 5 - "WanderMatch AI & Feature Scope"
Cohesion: 0.11
Nodes (26): Additive Tables, AI Service, Frontend Module: Branch View, External Service: Cloudinary (Photo Storage), Collaboration Service, External Service: DeepFace / ArcFace (Face Detection & Recognition), Frontend Module: Face Registration, FastAPI Backend (Single Orchestrator) (+18 more)

### Community 6 - "Conformance Validation Tooling"
Cohesion: 0.17
Nodes (24): cities table, countries table, currencies table, PS-11 Data Model Document, itineraries table, itinerary_items table, languages table, Polymorphic (entity_type, entity_id) Reference Pattern (+16 more)

### Community 7 - "User Flow & State Transitions"
Cohesion: 0.10
Nodes (22): Data Model v1.1.0-rc1, Kognivera Hackathon 2026, Polymorphic Entity Reference (entity_type, entity_id) Pattern, PS-11 Data Model Document, Rule R2: IDs are opaque prefixed strings, Rule R3: Money is decimal + ISO-4217 currency code, never a float, Rule R6: Language is BCP-47 tag, Rule R8: Nothing is hard-deleted (+14 more)

### Community 8 - "Data Conventions & Money Rules"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 9 - "Temporal Data Conventions"
Cohesion: 0.16
Nodes (16): BaseModel, ResponseEnvelope, Config, CreateTripRequest, ItineraryItemOut, ItineraryOut, BaseModel, TripDetailOut (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (17): PS-11 Data Model Diagram (Interactive HTML), AI Approach Section Requirement (what AI does, grounding, measurability), Design Submission (Hackathon Deliverable), Design Submission Deadline: 2 September 2026, Design Submission Guide — PS-11, Submission File Limits (max 10 files, 25 MB each, one upload locked), Submission Naming Convention (TeamName_PS-11_Design_v1.pdf), Required Design Submission Sections (Cover, Problem, Scope, User Journey, Architecture, Data Model, AI Approach, Tech Stack, 24-hour Plan, Risks, Multilingual) (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.21
Nodes (17): Blended Common-Ground Generator (AI Feature), Branch-Trigger Classifier (AI Feature), Cloudinary (Photo Storage), AI Consensus Planner, DeepFace / ArcFace Face Recognition Service, WanderMatch Design Document (Chaosminds), face_profiles table (New Additive Table), FastAPI Backend (Single Orchestrator) (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (15): AI Consensus Planner (Blended Common-Ground Generator), Architecture: FastAPI Single Orchestrator + WebSockets, Branch-Trigger Classifier, Checkpoint 1: Core Working Demo without AI (Hour 12 / 00:00), Checkpoint 2: AI Working Demo (Hour 21 / 09:00), Cloudinary (photo storage, thumbnails, delivery), DeepFace / ArcFace Face Recognition Service, ChaosMinds PS-11 Design Document (+7 more)

### Community 14 - "Community 14"
Cohesion: 0.15
Nodes (14): PS-11 Problem Statement, WanderMatch — Social & Group Travel Planning, 09:00 Rule (Feature Freeze 3 Hours Before Deadline), Hackathon Day Process — PS-11, Final Submission at 12:00 (running app, solution write-up, presentation, source code), Hackathon Rules (3-5 members, 1 problem statement, no renaming provided fields), Kognivera Hackathon 2026, Mentors (unblock/review; come with specific questions) (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.19
Nodes (13): Add Slots (Everyone Adds Places & Time), AI Consensus? (Decision), Choose Branch (Everyone Selects a Branch), Continue Trip (Trip Continues Happily), Create Branch (AI Creates Alternative Plans), Create Trip (Invite Friends), Discuss / Modify (Chat, Suggest Changes, Add Constraints), End (+5 more)

### Community 16 - "Community 16"
Cohesion: 0.20
Nodes (10): cast_vote(), AsyncSession, post, Cast or update a vote on a proposal. Enforces that 'no' votes MUST carry a non-…, CastVoteRequest, Config, BaseModel, VoteOut (+2 more)

### Community 17 - "Community 17"
Cohesion: 0.21
Nodes (11): csv, fail(), load_csv(), load_sqlite(), main(), validate_conformance.py — KV Hackathon 2026 data conformance check. Checks the…, decimal, glob (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.31
Nodes (9): Rule R1: Additive Only, Rule R2: IDs are Opaque Prefixed Strings, Rule R3: Money is a Pair (decimal + ISO-4217), Rule R6: Language is a BCP-47 Tag, Working With The Data — PS-11, Largest-Remainder Money Split Algorithm, Money Handling Convention (Decimal, No Float), validate_conformance.py Tool (+1 more)

### Community 19 - "Community 19"
Cohesion: 0.25
Nodes (9): Table: proposals (274 rows), Table: votes (761 rows), Branch View Screen (Confirm / Request Modification), ChaosMinds PS-11 Frontend Prototype Document, Face Registration Screen (3-photo optional registration), Slot Detail Screen (proposals, live tally, No-reasons), Slot Statuses: Empty / Proposing / Voting / Common-Ground Round n / Branching / Confirmed, Solo Match Screen (ranked group matches and guide matches) (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.29
Nodes (7): Nikitha M N (Frontend / Real-time UI), P Nithya (Auth / Presence / Deployment), Panchami P (Backend / PostgreSQL & Voting Logic), PostgreSQL (system of record for PS-11 schema + additive tables), React + TypeScript Frontend, Team Chaosminds, Deployment: Vercel/Render + Managed PostgreSQL

### Community 21 - "Community 21"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 22 - "Community 22"
Cohesion: 0.40
Nodes (5): Itinerary Versioning for Conflict Handling, Rule R1: Additive Only (never rename/drop/repurpose provided fields), Table: itineraries (803 rows), Additive Tables (branches, branch_members, revision_history, trip_chat_messages, face_profiles, photos/photo_person), Optimistic Concurrency via itinerary.version Bump

### Community 23 - "Community 23"
Cohesion: 0.50
Nodes (4): health_check(), AsyncSession, get, Health check endpoint confirming FastAPI orchestrator and database connectivity.

### Community 24 - "Community 24"
Cohesion: 1.00
Nodes (3): 10-Minute Response Window (triggered by first No vote), Mode A: Admin-Led Consensus Flow, Mode NA: No-Admin Common-Ground + Branching Flow

## Knowledge Gaps
- **121 isolated node(s):** `Architecture: FastAPI Single Orchestrator + WebSockets`, `Firebase Auth (identity; UID mapped to users.user_id)`, `P Nithya (Auth / Presence / Deployment)`, `Problem: Group Trip Planning Conflict & Consensus Gap`, `Built Scope: Trip creation, invites, auth, itinerary, proposals, voting, modes A/NA, branching, Trip Chat, solo matching, face registration, Cloudinary photos` (+116 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 207 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `PS-11 Data Model Document` connect `User Flow & State Transitions` to `Community 10`, `Community 14`, `Community 17`, `Community 19`, `Community 20`, `Community 22`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Why does `PS-11 README (Start Here)` connect `Community 10` to `Conformance Validation Tooling`, `User Flow & State Transitions`, `Community 14`, `Community 17`, `Community 18`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `WanderMatch — Social & Group Travel Planning` connect `Community 14` to `Conformance Validation Tooling`, `User Flow & State Transitions`, `Community 10`, `Community 11`, `Community 13`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `WanderMatch Design Document (Chaosminds)` (e.g. with `Design Submission (Hackathon Deliverable)` and `WanderMatch Frontend Design Document (Chaosminds)`) actually correct?**
  _`WanderMatch Design Document (Chaosminds)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Architecture: FastAPI Single Orchestrator + WebSockets`, `Firebase Auth (identity; UID mapped to users.user_id)`, `P Nithya (Auth / Presence / Deployment)` to the rest of the system?**
  _121 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Consensus Engine & Execution Plan` be split into smaller, more focused modules?**
  _Cohesion score 0.0689873417721519 - nodes in this community are weakly interconnected._
- **Should `Relational Schema & Core Entities` be split into smaller, more focused modules?**
  _Cohesion score 0.07526881720430108 - nodes in this community are weakly interconnected._