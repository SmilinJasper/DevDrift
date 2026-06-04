# DevDrift — Project State & Implementation Plan

> **Last updated:** 2026-06-04  
> **Phase:** 1 (Foundation) ✅ · 2 (Orbit Data Aggregation) ✅ · 3 (Core UI & Recommendation Feed) ✅  
> **Build Status:** ✅ Production build passes (`npm run build` — compiled successfully)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Project Structure](#3-project-structure)
4. [Configuration Files Reference](#4-configuration-files-reference)
5. [Supabase Database Schema](#5-supabase-database-schema)
6. [Recommendation Engine](#6-recommendation-engine)
7. [Implementation Checklist (Completed)](#7-implementation-checklist-completed)
8. [Pending Requirements for Next Phase](#8-pending-requirements-for-the-next-phase)

---

## 1. Project Overview

**DevDrift** is a premium, dark-mode-first full-stack web application designed for developer opportunity discovery (hackathons, jobs, internships) using Next.js App Router, Tailwind CSS v4, Framer Motion, and Supabase. It uses a 384-dimensional vector embedding model for semantic discovery and features a customized recommendation engine utilizing cosine similarity and tag-overlap scoring with time-decay re-ranking.

---

## 2. Tech Stack & Architecture

### 2.1 Frontend
- **Framework:** Next.js (App Router) `16.2.7`
- **Language:** TypeScript `^5` (Strict Mode)
- **Styling:** Tailwind CSS `^4` (with OKLCH CSS variables, premium gradients, and custom glows)
- **Animations:** Framer Motion (for spring-physics transitions and micro-animations)
- **Icons:** Lucide React
- **Typography:** Outfit (Google Fonts) — modern geometric layout font (`--font-sans`)

### 2.2 Backend & Data
- **Database:** Supabase PostgreSQL
- **Vector Search:** `pgvector` extension (384-dim vector embeddings)
- **Text Search:** `pg_trgm` extension (trigram similarity)
- **Timestamp Automation:** `moddatetime` extension
- **Client/Server Auth:** `@supabase/ssr` + cookie-based auth client

### 2.3 Scraper Pipeline (Orbit)
- **Crawler:** Python 3.11 + Playwright (Devpost headless scraper)
- **Parser:** BeautifulSoup4
- **Sources:** Devpost (Hackathons), We Work Remotely RSS & Arbeitnow JSON API (Internships/Jobs)
- **Sync Layer:** Supabase Python client pushing listings bypassing RLS via Service Role Key

---

## 3. Project Structure

```
DevDrift/
├── .env.local                      # Configured Supabase keys (URL & Anon)
├── .github/
│   └── workflows/
│       └── scrape.yml              # GitHub Actions scraper cron workflow (12-hour schedule)
├── scraper/                        # Orbit Data Aggregation Scraper Pipeline (Python)
│   ├── config.py                   # Connections and scraping configurations
│   ├── db.py                       # Supabase client initialization & upsert logic
│   ├── devpost.py                  # Playwright Devpost scraper
│   ├── jobs.py                     # WWR & Arbeitnow scraper
│   ├── main.py                     # Entrypoint orchestration script
│   └── normalizer.py               # Data formatting & schema mapping helper
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── api/
│   │   │   ├── listings/
│   │   │   │   └── route.ts        # GET /api/listings — paginated search & discovery endpoint
│   │   │   └── recommendations/
│   │   │       └── route.ts        # GET /api/recommendations — personalized feed
│   │   ├── discover/
│   │   │   ├── page.tsx            # Discovery shell (Server Component)
│   │   │   └── DiscoveryClient.tsx # Filterable client feed
│   │   ├── globals.css             # Tailwind v4 theme + custom branding tokens
│   │   ├── layout.tsx              # Root layout (Outfit font, dark mode)
│   │   └── page.tsx                # Home page (Hero + HomeFeed)
│   ├── components/
│   │   ├── FilterBar.tsx           # Animated filter tabs (Framer Motion)
│   │   ├── HomeFeed.tsx            # Infinite scroll feed wrapper
│   │   ├── ListingCard.tsx         # Opportunity card with optimistic saving & animations
│   │   ├── ListingCardSkeleton.tsx # Shimmer loading placeholder
│   │   └── Navbar.tsx              # Responsive navigation header
│   ├── hooks/
│   │   ├── useInfiniteScroll.ts    # Intersection Observer pagination hook
│   │   └── useListings.ts          # State-driven listing retrieval hook
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts           # Browser Supabase client
│   │   │   ├── interactions.ts     # Client interactions (save/unsave)
│   │   │   └── server.ts           # Server Supabase client (cookies)
│   │   └── utils.ts                # cn() class utility
│   └── types/
│       └── database.ts             # Strict TypeScript models
└── supabase/
    ├── seed.sql                    # SQL script to insert mock profiles & listings
    └── migrations/
        ├── 00001_initial_schema.sql         # Base database setup
        └── 00002_recommendation_engine.sql  # interest_embedding + recommendations RPC
```

---

## 4. Configuration Files Reference

### 4.1 `.env.local`
```bash
NEXT_PUBLIC_SUPABASE_URL=https://graxbprtcsqvzbvnfrxk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_4UDYHX43a_CLi5iioip2hg_zoN5e1Xg
```

---

## 5. Supabase Database Schema

### 5.1 Tables

#### `public.profiles`
- `id` (uuid, primary key): References `auth.users(id)`
- `username` (text, unique): Required username
- `full_name` (text): Display name
- `avatar_url` (text): Avatar URL
- `bio` (text): Limit 500 characters
- `interests` (text[]): Flat interest tags
- `interest_embedding` (vector(384)): Vector profile calculated from interest tags
- `location` (text): Location details
- `created_at` (timestamptz): Default now
- `updated_at` (timestamptz): Managed by trigger

#### `public.listings`
- `id` (uuid, primary key): Autogenerated UUID
- `created_by` (uuid): References `public.profiles(id)`
- `title` (text): Listing title
- `description` (text): Details of listing
- `type` (public.listing_type): Enum (`hackathon`, `job`, `internship`)
- `tags` (text[]): Associated tags
- `location` (text): Placement
- `is_remote` (boolean): Default false
- `starts_at` (timestamptz): Start date
- `ends_at` (timestamptz): End date
- `application_url` (text): Job/apply link
- `popularity_score` (float): Engagement indicator
- `embedding` (vector(384)): 384-dimensional opportunity vector
- `is_published` (boolean): Default true
- `created_at` (timestamptz): Default now
- `updated_at` (timestamptz): Managed by trigger

#### `public.interactions`
- `id` (uuid, primary key): Autogenerated UUID
- `user_id` (uuid): References `public.profiles(id)`
- `listing_id` (uuid): References `public.listings(id)`
- `kind` (public.interaction_kind): Enum (`view`, `save`)
- `created_at` (timestamptz): Default now
- *Constraint:* Unique index on `(user_id, listing_id, kind)` to prevent duplicates

---

## 6. Recommendation Engine

### 6.1 RPC: `recommend_listings_for_user`
Located in `00002_recommendation_engine.sql`, this function accepts `p_user_id`, `p_match_threshold`, `p_limit`, `p_cursor_score`, and `p_cursor_id`.
- **Strategy A (Vector):** If a user has `interest_embedding`, it scores listings using `1 - (listing.embedding <=> user.interest_embedding)`.
- **Strategy B (Fallback):** If no vector is present, it ranks by `(tag_overlap_ratio × 0.7) + (normalized_popularity × 0.3)`.
- Excludes items already interacted with (saved or viewed).
- Employs Keyset Pagination using `(score, id)` pairs.

### 6.2 Server Re-Ranking
The API handler `GET /api/recommendations` performs an exponential time-decay calculation:
$$\text{final\_score} = \text{similarity} \times e^{-0.01 \times \text{days\_since\_created}}$$
This preserves indexing efficiency inside Postgres while ensuring the freshest listings rise to the top.

---

## 7. Implementation Checklist (Completed)

### ✅ Phase 1 & 2 — Scaffolding, Schema & Scraping
- [x] Initialized Next.js 16 app with Tailwind CSS v4 and Shadcn UI.
- [x] Setup database schemas and migration runner (enabling `pgvector`, `pg_trgm`, triggers).
- [x] Implemented Orbit data aggregation script (`scraper/main.py`) using Playwright and BeautifulSoup4.
- [x] Converted scraped listings into standardized schemas and synchronized 48 listings into the Supabase database.
- [x] Configured GitHub Actions 12-hour cron job scraper execution.

### ✅ Phase 3 — Recommendation API & Premium Core UI
- [x] Created server-side database helper using cookie-based `@supabase/ssr` client.
- [x] Implemented `GET /api/recommendations` with exponential time-decay re-ranking and cursor-based keyset pagination.
- [x] Wired up the typography to Google Fonts **Outfit** for clean headings and body text.
- [x] Built `Navbar` and interactive `ListingCard` with type-specific badges, hover highlights, and Framer Motion spring animations.
- [x] Built `ListingCardSkeleton` shimmer loading placeholders.
- [x] Created `HomeFeed` utilizing Intersection Observers for smooth infinite scrolling.
- [x] Built the state-driven `DiscoveryClient` and `FilterBar` supporting live filtering of jobs, hackathons, and internships.
- [x] Implemented instant optimistic UI updates on the "Save" toggles that roll back gracefully in the case of network issues.

---

## 8. Pending Requirements for the Next Phase

### 8.1 Authentication & Profile Onboarding
- [ ] Implement middleware session refresh (`src/middleware.ts`).
- [ ] Build Sign-Up & Sign-In page flows.
- [ ] Build a guided onboarding flow to capture user interest tags and generate initial `interest_embedding`.
- [ ] Connect authenticated session headers instead of falling back to the guest profile ID.

### 8.2 Real-time Semantic Search
- [ ] Add `SearchBar` component with debounced autocomplete.
- [ ] Implement `POST /api/search` using the `match_listings()` SQL RPC for natural language query matching.

### 8.3 Interaction Logging & Analytics
- [ ] Implement view tracking triggered by page visits.
- [ ] Calculate listing popularity scores automatically via serverless function / database trigger.
