# DevDrift

DevDrift is a modern, full-stack opportunity discovery platform for developers. It automatically aggregates hackathons, internships, and remote jobs, offering users personalized recommendations and semantic search capabilities powered by vector embeddings.

## 🚀 Features

- **Semantic Search & Recommendations**: Instead of simple keyword matching, DevDrift uses machine learning (`@xenova/transformers`) to generate vector embeddings for user interests and opportunities, powering natural language search and highly relevant home feed recommendations via Supabase `pgvector`.
- **Automated Data Aggregation**: A robust Python scraping pipeline automatically fetches the latest opportunities from across the web.
- **Real-time Analytics**: Tracks user views and saves to dynamically rank the "Popularity" of listings through PostgreSQL triggers.
- **Authentication**: Secure email/password and Google OAuth login via Supabase Auth.
- **Dynamic User Profiles**: Dedicated user profiles displaying customized interests and saved opportunities.

## 🛠️ Tech Stack

### Frontend & Core Application
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI (Radix Primitives) & Lucide Icons
- **ML / Search**: `@xenova/transformers` (running server-side via ONNX Runtime for generating `all-MiniLM-L6-v2` vector embeddings)

### Backend & Database
- **BaaS**: Supabase
- **Database**: PostgreSQL
- **Vector Engine**: `pgvector` extension for computing cosine similarity
- **Auth**: `@supabase/ssr` with Google OAuth integration
- **Automation**: Database Triggers and RPC functions for score decaying and popularity tracking

### Data Aggregation Pipeline (Scraper)
- **Language**: Python 3.11
- **Automation**: GitHub Actions (Scheduled CRON jobs)
- **Web Scraping tools**: 
  - `Playwright` (for JavaScript-rendered SPA targets)
  - `BeautifulSoup4` (for static HTML parsing)
- **Current Data Sources**:
  - **Hackathons**: [Devpost](https://devpost.com/)
  - **Remote Jobs/Internships**: WeWorkRemotely RSS feeds & Arbeitnow API

---

## 🏗️ Getting Started (Local Development)

### Prerequisites
- Node.js (v18 or higher)
- A [Supabase](https://supabase.com/) account and project
- Python 3.11 (if running the scraper locally)

### 1. Clone & Install
```bash
git clone https://github.com/your-username/devdrift.git
cd devdrift

# Install Next.js dependencies
npm install
```

### 2. Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# (Optional) For the python scraper pipeline
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Database Setup
Apply the database migrations in the `supabase/migrations/` folder to your Supabase project. This will set up the `listings`, `profiles`, and `interactions` tables, enable `pgvector`, create the `match_listings` and `recommend_listings_for_user` RPC functions, and configure the database triggers.

### 4. Run the Web App
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

---

## 🤖 Running the Scraper Pipeline

The Python scraper ensures the database is always populated with the latest opportunities.

### Manual Local Run
Navigate to the root directory and install the Python dependencies:
```bash
pip install -r scraper/requirements.txt
playwright install chromium
```
Run the scraper:
```bash
python scraper/main.py
```
*(Append `--dry-run` to test the scraping logic without pushing to the database).*

### GitHub Actions
The scraper is fully automated via GitHub Actions (`.github/workflows/scrape.yml`), running twice daily. Ensure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are configured in your repository's GitHub Action Secrets.

## 🧪 Testing

DevDrift maintains a comprehensive, layer-decoupled automated testing suite to guarantee system stability across the frontend, data ingestion pipeline, and database constraints.

### Frontend Testing (Jest & Playwright)
- **Unit/Integration (Jest):** Run `npm run test` to execute React component tests (`src/__tests__/components`) and mocked Supabase hook validations.
- **End-to-End (Playwright):** Run `npm run test:e2e` to simulate real user interactions in a headless browser. Playwright's `globalSetup` dynamically provisions an isolated test user (`e2e-tester@devdrift.com`) via the Supabase Admin API to bypass GoTrue rate limits and guarantee reliable auth flows.

### Python Scraper Pipeline (Pytest)
Run `$env:PYTHONPATH="."; pytest scraper/tests/` to execute deterministic tests for the data ingestion algorithms. 
`pytest-mock` is used extensively to stub Apify Actor results, XML feeds, and Supabase client insertions—allowing us to test deduplication and metadata mapping offline without burning API credits or hitting the live database.

### Database Integrity (pgTAP)
We leverage [pgTAP](https://pgtap.org/) for native PostgreSQL unit testing inside ephemeral containers.
Run `supabase test db` to automatically evaluate:
- **Row Level Security (RLS):** Validates that interactions (e.g., bookmarks) are strictly isolated between isolated users (mocking JWT claim sets).
- **Triggers:** Ensures auto-generation of `public.profiles` correctly mirrors `auth.users` insertions.
- **RPC Signatures:** Confirms the `recommend_listings_for_user` pgvector embeddings search function is correctly instantiated.

---

## 📄 License
This project is open-source and available under the MIT License.
