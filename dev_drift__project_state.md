# DevDrift — Project State & Implementation Plan

> **Last updated:** 2026-06-04  
> **Phase:** 1 (Foundation) & Data Aggregation (Orbit) — ✅ Complete  
> **Build status:** ✅ Production build passes (`npm run build`)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Project Structure](#3-project-structure)
4. [Configuration Files Reference](#4-configuration-files-reference)
5. [Supabase Database Schema](#5-supabase-database-schema)
6. [Phase 1 & 2 — Implementation Checklist (Completed)](#6-phase-1--2--implementation-checklist-completed)
7. [Phase 3 — Pending Requirements](#7-phase-3--pending-requirements)

---

## 1. Project Overview

**DevDrift** is a full-stack web application for discovering developer opportunities — hackathons, jobs, and internships — powered by semantic search via pgvector embeddings. Users can browse, save, and get personalised recommendations based on their interest tags.

### Core Value Propositions

| Feature | Description |
|---|---|
| **Semantic Discovery** | Vector similarity search (384-dim) matches listings to natural-language queries |
| **Multi-Type Listings** | Unified model for hackathons, jobs, and internships |
| **Personalisation** | User interest tags + interaction history drive recommendations |
| **Real-Time Engagement** | Popularity scoring and save/view tracking per listing |
| **Orbit Aggregation** | Cron-scheduled scraper pipeline syncing opportunities globally & locally |

---

## 2. Tech Stack & Architecture

### 2.1 Frontend

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **Framework** | Next.js (App Router) | `16.2.7` | React Server Components enabled |
| **Language** | TypeScript | `^5` | Strict mode, bundler module resolution |
| **UI Library** | Shadcn UI | `^4.10.0` | `base-nova` style, RSC-compatible |
| **Primitives** | Base UI (React) | `^1.5.0` | Headless primitives under Shadcn |
| **Styling** | Tailwind CSS | `^4` | v4 with PostCSS, CSS variables (oklch) |
| **Animations** | tw-animate-css | `^1.4.0` | Tailwind animation utilities |
| **Icons** | Lucide React | `^1.17.0` | Tree-shakeable SVG icon library |
| **Class Utils** | clsx + tailwind-merge | `^2.1.1` / `^3.6.0` | Via `cn()` helper in `src/lib/utils.ts` |
| **Variant System** | class-variance-authority | `^0.7.1` | Component variant definitions |
| **Fonts** | Geist Sans + Geist Mono | Google Fonts | CSS variables: `--font-geist-sans`, `--font-geist-mono` |

### 2.2 Backend & Data

| Layer | Technology | Notes |
|---|---|---|
| **Backend** | Next.js API Routes / Server Actions | App Router server-side capabilities |
| **Database** | Supabase (PostgreSQL) | Managed Postgres with Auth, Storage, Realtime |
| **Vector Search** | pgvector extension | 384-dim embeddings, IVFFlat cosine index |
| **Text Search** | pg_trgm extension | Trigram-based fuzzy matching |
| **Auth** | Supabase Auth | Row Level Security (RLS) integrated |
| **Timestamps** | moddatetime extension | Auto `updated_at` via triggers |

### 2.3 Scraper Pipeline (Orbit)

| Layer | Technology | Notes |
|---|---|---|
| **Language** | Python `3.11` | Scraper implementation language |
| **Automation** | Playwright (Python) | Headless Chromium rendering for Devpost hackathons |
| **Parser** | BeautifulSoup4 | DOM selector extraction for listings data |
| **Scheduler** | GitHub Actions | 12-hour cron job workflow scheduler |
| **Integration** | Supabase Python SDK | Pushes listings via service role authentication |

### 2.4 Architecture Diagram

```mermaid
graph TB
    subgraph Client["Browser (Client)"]
        RSC["React Server Components"]
        CC["Client Components"]
        TW["Tailwind CSS v4 + Shadcn UI"]
    end

    subgraph NextJS["Next.js 16 App Router"]
        Pages["Pages & Layouts"]
        API["API Routes / Server Actions"]
        MW["Middleware"]
    end

    subgraph Orbit["Orbit Aggregation (12-hour Cron)"]
        GHA["GitHub Actions Workflow"]
        PY["Python Main orchestrator"]
        PW["Playwright (Devpost)"]
        RSS["urllib/BS4 (WWR RSS + Arbeitnow JSON)"]
    end

    subgraph Supabase["Supabase Platform"]
        Auth["Supabase Auth"]
        DB["PostgreSQL + pgvector"]
        RLS["Row Level Security"]
        Storage["Supabase Storage"]
    end

    subgraph EmbeddingService["Embedding Service"]
        Model["all-MiniLM-L6-v2 (384-dim)"]
    end

    Client --> NextJS
    Pages --> RSC
    Pages --> CC
    RSC --> TW
    CC --> TW
    API --> Auth
    API --> DB
    DB --> RLS
    API --> EmbeddingService
    Model --> DB
    Orbit --> DB
```

### 2.5 Path Aliases

| Alias | Resolves To | Usage |
|---|---|---|
| `@/*` | `./src/*` | All imports |
| `@/components` | `./src/components` | React components |
| `@/components/ui` | `./src/components/ui` | Shadcn UI primitives |
| `@/lib` | `./src/lib` | Utility libraries |
| `@/hooks` | `./src/hooks` | Custom React hooks |

---

## 3. Project Structure

```
DevDrift/
├── .git/                           # Git repository
├── .github/
│   └── workflows/
│       └── scrape.yml              # Orbit scraper cron workflow (12-hour schedule)
├── .next/                          # Next.js build output (gitignored)
├── node_modules/                   # Dependencies (gitignored)
├── public/                         # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── scraper/                        # Orbit Data Aggregation Scraper Pipeline (Python)
│   ├── config.py                   # Connections and scraping configurations
│   ├── db.py                       # Supabase client initialization & upsert logic
│   ├── devpost.py                  # Playwright Devpost scraper
│   ├── jobs.py                     # We Work Remotely & Arbeitnow scraper
│   ├── main.py                     # Entrypoint orchestration script
│   ├── normalizer.py               # Data formatting & schema mapping helper
│   └── requirements.txt            # Python requirements
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── favicon.ico
│   │   ├── globals.css             # Tailwind v4 + Shadcn theme (oklch vars)
│   │   ├── layout.tsx              # Root layout (Geist fonts, metadata)
│   │   └── page.tsx                # Home page (scaffold default)
│   ├── components/
│   │   └── ui/
│   │       └── button.tsx          # Shadcn Button (base-nova + CVA)
│   └── lib/
│       └── utils.ts                # cn() — clsx + tailwind-merge
├── supabase/
│   └── migrations/
│       └── 00001_initial_schema.sql  # Full database schema
├── .gitignore
├── AGENTS.md                       # Next.js agent rules
├── CLAUDE.md                       # Claude config
├── README.md
├── components.json                 # Shadcn UI configuration
├── eslint.config.mjs               # ESLint 9 flat config
├── next-env.d.ts                   # Next.js TypeScript env declarations
├── next.config.ts                  # Next.js configuration (empty)
├── package-lock.json
├── package.json                    # Project manifest
├── postcss.config.mjs              # PostCSS → Tailwind v4
├── tsconfig.json                   # TypeScript configuration
└── dev_drift_project_state.md      # ← This file
```

---

## 4. Configuration Files Reference

### 4.1 `package.json`

```json
{
  "name": "devdrift",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  }
}
```

**Runtime Dependencies:** `next@16.2.7`, `react@19.2.4`, `react-dom@19.2.4`, `shadcn@^4.10.0`, `@base-ui/react@^1.5.0`, `class-variance-authority@^0.7.1`, `clsx@^2.1.1`, `lucide-react@^1.17.0`, `tailwind-merge@^3.6.0`, `tw-animate-css@^1.4.0`

**Dev Dependencies:** `@tailwindcss/postcss@^4`, `@types/node@^20`, `@types/react@^19`, `@types/react-dom@^19`, `eslint@^9`, `eslint-config-next@16.2.7`, `tailwindcss@^4`, `typescript@^5`

### 4.2 `components.json` (Shadcn UI)

| Setting | Value |
|---|---|
| Style | `base-nova` |
| RSC | `true` |
| TSX | `true` |
| Base Color | `neutral` |
| CSS Variables | `true` (oklch) |
| Icon Library | `lucide` |
| RTL | `false` |

### 4.3 `tsconfig.json`

- **Target:** ES2017
- **Module:** ESNext (bundler resolution)
- **Strict mode:** Enabled
- **JSX:** react-jsx
- **Path alias:** `@/*` → `./src/*`
- **Plugin:** `next` (type-checked routes)

### 4.4 Theme System (`globals.css`)

The theme uses **oklch** color space for perceptually uniform colors with full light/dark mode support via the `.dark` class.

| Token | Light | Dark |
|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.145 0 0)` |
| `--foreground` | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--primary` | `oklch(0.205 0 0)` | `oklch(0.922 0 0)` |
| `--secondary` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--muted` | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |
| `--border` | `oklch(0.922 0 0)` | `oklch(1 0 0 / 10%)` |
| `--radius` | `0.625rem` | `0.625rem` |

---

## 5. Supabase Database Schema

> **Migration file:** [`supabase/migrations/00001_initial_schema.sql`](file:///c:/Users/SmilinJasper/Desktop/projects/Test/DevDrift/supabase/migrations/00001_initial_schema.sql)

### 5.1 Extensions

```sql
CREATE EXTENSION IF NOT EXISTS vector    WITH SCHEMA extensions;  -- pgvector (semantic search)
CREATE EXTENSION IF NOT EXISTS pg_trgm   WITH SCHEMA extensions;  -- Trigram fuzzy text search
CREATE EXTENSION IF NOT EXISTS moddatetime WITH SCHEMA extensions;  -- Auto updated_at
```

### 5.2 Custom Enums

```sql
CREATE TYPE public.listing_type AS ENUM ('hackathon', 'job', 'internship');
CREATE TYPE public.interaction_kind AS ENUM ('view', 'save');
```

### 5.3 Entity-Relationship Diagram

```mermaid
erDiagram
    AUTH_USERS ||--|| PROFILES : "id (PK/FK)"
    PROFILES ||--o{ LISTINGS : "created_by"
    PROFILES ||--o{ INTERACTIONS : "user_id"
    LISTINGS ||--o{ INTERACTIONS : "listing_id"

    PROFILES {
        uuid id PK "FK → auth.users(id) ON DELETE CASCADE"
        text username UK "CHECK: 3–40 chars"
        text full_name "nullable"
        text avatar_url "nullable"
        text bio "CHECK: ≤ 500 chars"
        text_array interests "DEFAULT '{}' — free-form tags"
        text location "nullable"
        text website_url "nullable"
        timestamptz created_at "DEFAULT now()"
        timestamptz updated_at "DEFAULT now() — auto via moddatetime"
    }

    LISTINGS {
        uuid id PK "DEFAULT gen_random_uuid()"
        uuid created_by FK "→ profiles(id) CASCADE"
        text title "CHECK: 1–200 chars"
        text description "nullable"
        listing_type type "ENUM: hackathon | job | internship"
        text_array tags "DEFAULT '{}'"
        text location "nullable — free-form"
        boolean is_remote "DEFAULT false"
        timestamptz starts_at "nullable"
        timestamptz ends_at "nullable — CHECK: ≥ starts_at"
        text application_url "nullable"
        float popularity_score "DEFAULT 0 — CHECK: ≥ 0"
        vector_384 embedding "nullable — 384-dim for cosine similarity"
        boolean is_published "DEFAULT true"
        timestamptz created_at "DEFAULT now()"
        timestamptz updated_at "DEFAULT now() — auto via moddatetime"
    }

    INTERACTIONS {
        uuid id PK "DEFAULT gen_random_uuid()"
        uuid user_id FK "→ profiles(id) CASCADE"
        uuid listing_id FK "→ listings(id) CASCADE"
        interaction_kind kind "ENUM: view | save"
        timestamptz created_at "DEFAULT now()"
    }
```

### 5.4 Indexes

| Table | Index | Type | Details |
|---|---|---|---|
| `profiles` | `idx_profiles_username` | B-tree | Fast username lookups |
| `profiles` | `idx_profiles_interests` | GIN | Array containment queries on tags |
| `listings` | `idx_listings_type` | B-tree | Filter by listing type |
| `listings` | `idx_listings_created_by` | B-tree | Find listings by creator |
| `listings` | `idx_listings_location` | B-tree | Location-based filtering |
| `listings` | `idx_listings_starts_at` | B-tree | Date range queries |
| `listings` | `idx_listings_popularity` | B-tree (DESC) | Sort by popularity |
| `listings` | `idx_listings_tags` | GIN | Array containment on tags |
| `listings` | `idx_listings_is_published` | Partial B-tree | WHERE `is_published = true` |
| `listings` | `idx_listings_embedding` | **IVFFlat** | `vector_cosine_ops`, `lists = 100` |
| `interactions` | `idx_interactions_user_id` | B-tree | User's interactions |
| `interactions` | `idx_interactions_listing_id` | B-tree | Listing's interactions |
| `interactions` | `idx_interactions_kind` | B-tree | Filter by kind |
| `interactions` | `idx_interactions_created_at` | B-tree (DESC) | Recent interactions |
| `interactions` | `idx_interactions_user_listing_kind` | Composite B-tree | "Did user save this?" fast path |

---

## 6. Phase 1 & 2 — Implementation Checklist (Completed)

### ✅ Project Scaffolding
- [x] Initialize Next.js 16 with App Router and `src/` directory
- [x] Configure TypeScript (strict mode, bundler resolution, path aliases)
- [x] Set up Tailwind CSS v4 with PostCSS integration
- [x] Configure Shadcn UI (`base-nova` style, RSC, CSS variables)
- [x] Install and configure Shadcn Button component as baseline
- [x] Set up `cn()` utility (`clsx` + `tailwind-merge`)
- [x] Configure ESLint 9 with `eslint-config-next` (core-web-vitals + typescript)
- [x] Set up Geist Sans + Geist Mono fonts via `next/font/google`
- [x] Configure light/dark theme tokens in oklch color space

### ✅ Database Schema
- [x] Enable `pgvector` extension for 384-dim vector embeddings
- [x] Enable `pg_trgm` extension for fuzzy text search
- [x] Enable `moddatetime` extension for auto-timestamp management
- [x] Create `listing_type` enum (`hackathon`, `job`, `internship`)
- [x] Create `interaction_kind` enum (`view`, `save`)
- [x] Create `profiles` table with `TEXT[]` interests array, linked to `auth.users`
- [x] Create `listings` table with `vector(384)` embedding column, popularity score, dates, location
- [x] Create `interactions` table with save/view tracking, unique-save constraint
- [x] Add comprehensive indexes (B-tree, GIN, IVFFlat vector index)
- [x] Add `moddatetime` triggers for automatic `updated_at`
- [x] Create `handle_new_user()` trigger function for auto profile creation on signup
- [x] Create `match_listings()` function for semantic cosine-similarity search
- [x] Configure Row Level Security policies (read-public / write-own)
- [x] Configure schema grants for `anon` and `authenticated` roles

### ✅ Data Aggregation (Orbit Pipeline)
- [x] Created scraper configurations and targets (`scraper/config.py`)
- [x] Created Playwright Devpost scraper with infinite scrolling to fetch Global and India hackathons (`scraper/devpost.py`)
- [x] Created remote internship scraper from We Work Remotely RSS and Arbeitnow API (`scraper/jobs.py`)
- [x] Implemented normalizer mapping raw data to listings schema (`scraper/normalizer.py`)
  - Cleans HTML tags from descriptions
  - Standardizes tags and categories
  - Parses cross-month and same-month date ranges into ISO 8601 timestamps
- [x] Created Supabase synchronization layer (`scraper/db.py`)
  - Ensures system crawler profile (`crawler@devdrift.com`) exists in profiles table
  - Selects and maps existing listings to prevent duplicates by matching `application_url`
  - Upserts listings (updating matching records, inserting new records) bypassing RLS via Service Role Key
- [x] Created main runner orchestrator with `--dry-run` flag support (`scraper/main.py`)
- [x] Set up GitHub Actions 12-hour cron job workflow (.github/workflows/scrape.yml) with automatic Playwright browser setup
- [x] Completed verification checks locally in dry-run mode (successfully parsing 49 opportunities)

---

## 7. Phase 3 — Pending Requirements

### 7.1 Supabase Integration (High Priority)
- [ ] Install `@supabase/supabase-js` and `@supabase/ssr`
- [ ] Create Supabase client utilities (`src/lib/supabase/client.ts`, `server.ts`, `middleware.ts`)
- [ ] Add environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- [ ] Create `.env.local.example` with required variable documentation
- [ ] Implement Next.js middleware for Supabase Auth session refresh
- [ ] Run the migration SQL against a live Supabase project

### 7.2 Authentication
- [ ] Implement sign-up flow (email/password, OAuth providers)
- [ ] Implement sign-in / sign-out flows
- [ ] Build protected route middleware (redirect unauthenticated users)
- [ ] Create auth context/provider for client components
- [ ] Build profile onboarding flow (username, interests tag selection)

### 7.3 TypeScript Data Layer
- [ ] Create TypeScript types mirroring the database schema (`src/types/database.ts`)
- [ ] Generate Supabase types via `supabase gen types typescript`
- [ ] Build data-access functions for profiles, listings, and interactions
- [ ] Implement server actions for CRUD operations

### 7.4 Embedding Pipeline
- [ ] Choose and integrate embedding model (`all-MiniLM-L6-v2` or alternative)
- [ ] Build embedding generation pipeline (on listing create/update)
- [ ] Implement semantic search API route using `match_listings()`
- [ ] Consider edge function for embedding generation vs. client-side

### 7.5 Core UI Pages
- [ ] **Landing page** — Hero section, feature highlights, CTA
- [ ] **Listings feed** — Filterable grid/list of hackathons, jobs, internships
- [ ] **Listing detail page** — Full listing info with save/view tracking
- [ ] **Search page** — Semantic search + traditional filters (type, location, date, tags)
- [ ] **Profile page** — User profile with interests, saved listings, activity
- [ ] **Create listing page** — Form for posting new opportunities
- [ ] **Dashboard** — User's own listings, saved items, analytics

### 7.6 Core UI Components
- [ ] Add essential Shadcn components: `Card`, `Input`, `Badge`, `Dialog`, `Dropdown Menu`, `Tabs`, `Select`, `Skeleton`, `Toast`
- [ ] Build `ListingCard` component (type badge, location, dates, save button)
- [ ] Build `TagInput` component for interests/tags
- [ ] Build `SearchBar` with semantic search integration
- [ ] Build `FilterPanel` (type, location, remote, date range)
- [ ] Build `Navbar` with auth state, navigation, theme toggle
- [ ] Build `Footer` component

### 7.7 Interaction Tracking
- [ ] Implement view tracking (record on listing page visit)
- [ ] Implement save/unsave toggle functionality
- [ ] Build popularity score calculation (cron or trigger-based)
- [ ] Create "Saved Listings" page with user's saved items

### 7.8 Deployment & DevOps
- [ ] Configure `next.config.ts` for production (images, redirects, headers)
- [ ] Set up Vercel deployment (or alternative)
- [ ] Configure Supabase project (production keys, connection pooling)
- [ ] Set up CI/CD pipeline for Next.js app build verification
- [ ] Add SEO metadata to all pages

### 7.9 Quality & Polish
- [ ] Implement dark mode toggle with system preference detection
- [ ] Add loading states and skeleton screens
- [ ] Implement error boundaries and error pages
- [ ] Add responsive design breakpoints
- [ ] Performance optimisation (image optimisation, code splitting)
- [ ] Accessibility audit (ARIA labels, keyboard navigation, focus management)
