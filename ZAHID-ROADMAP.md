# Alpha Insights Advisory — Comprehensive Project Roadmap

## 1. Executive Summary & Client Objectives
The goal of this project is to build an elite, executive-tier portfolio and advisory website for **Chaudhary Zahid Ali** (Finance Professional & Executive Advisor) under the brand **Alpha Insights Advisory**, backed by a custom, non-technical, password-protected **Content Management System (CMS)**.

The solution bridges high-end visual design with real-time dynamic database management, allowing the client to independently manage financial models, case studies, client logos, and media attachments without touching code or redeploying the site.

---

## 2. Client Requirements & Feature Specifications

### 2.1 Public Portfolio Website
- **Executive Branding & Palette:** Tailored for strategic corporate finance, M&A, liquidity modeling, and CFO advisory. Deep navy, slate, charcoal, and warm metallic accents with crisp typography.
- **Dual Presentation Routes:**
  - **Primary Route (`/`):** Full homepage featuring the executive portrait, hero statement, value propositions, client logos, and portfolio grid.
  - **Clean / Anonymous Route (`/clean`):** Identical architecture, content, and styling, but cleanly omitting the profile picture for flexible, discreet external sharing.
- **Enterprise Client Marks:** Replaced broken external image placeholders with sharp, responsive, monochrome embedded vector marks for Panda, PwC, SIXT, Domino’s/Alamar, and PETRONAS.
- **Unified Identity:** Cohesive browser favicon, meta titles, and SEO OpenGraph tags:
  - *Title:* `Alpha Insights Advisory | Strategic Finance & Modelling`
  - *Description:* Focused on 13-week cash flow forecasting, board advisory, transactional M&A diligence, and enterprise turnaround.
- **Responsive Ergonomics:** 100% portable across mobile handsets, tablets, ultrawide monitors, and touch devices.

### 2.2 Portfolio Project Architecture
- **Global Project Schema:**
  - `title`: Project title (e.g., *13-Week Cash Flow & Liquidity Model*).
  - `slug`: SEO-friendly URL address slug (e.g., `/projects/13-week-cash-flow-liquidity-model`).
  - `subtitle` / `summary`: Short executive overview.
  - `challenge`, `approach`, `value_delivered`: Structured three-part case study narrative.
  - `skills` & `tags`: Categorized by capabilities (e.g., Financial Modeling, M&A, Treasury) and industries (Retail, FMCG, Energy).
  - `metrics`: Key quantitative outcome badges (e.g., *+$14M Liquidity Unlocked*).
  - `model_embed_url`: Direct interactive spreadsheet, BI dashboard, or financial model embed link.
  - `thumbnail_url` & `gallery_images`: Media attachments and high-resolution dashboard screenshots.
  - `sort_order`: Sequential integer for landing page prioritization.
  - `is_featured`: Boolean flag for prominent hero/top-row highlighting.
  - `public_enabled`: Instant visibility toggle.
- **Hybrid Viewing Experience:**
  - *Homepage Cards:* Immediate modal/drawer preview for fast, frictionless browsing.
  - *Dedicated URL Route (`/projects/:slug`):* Permanent, indexable case study pages with complete narratives, image lightboxes, model embeds, and direct share links.
- **Template Starter Projects:** 8 seeded executive finance projects pre-loaded into the system as editable templates.

### 2.3 Password-Protected Admin CMS (`/admin` & `/auth`)
- **Strict Single-Admin Security:**
  - Public registration / self-service account creation is completely removed.
  - Direct route `/admin` automatically redirects unauthorized visitors to `/auth`.
  - Credentials provisioned for administrator (`czahidali@gmail.com`).
  - Architecture ready for future Multi-Factor Authentication (MFA / 2FA).
- **Full CRUD Capabilities:**
  - **Create:** Add new portfolio projects with attachments, tags, embeds, and metrics.
  - **Read:** Comprehensive tabular and card view of all active, draft, and template records.
  - **Update:** Real-time editing of copy, slugs, thumbnails, galleries, and order.
  - **Delete:** Safe removal with confirmation dialogs.
- **Real-Time Drag & Button Sorting:** Manual Up/Down controls to rearrange project display order on the live website instantly.
- **Public View Visibility Toggle (`public_enabled`):**
  - Instant toggle switch in both the CMS project list and project editor.
  - Disabling a project immediately hides it from the public homepage, search, filters, and direct `/projects/:slug` route.
  - The project remains completely visible and editable within `/admin` for staging or future publication.

---

## 3. Production Architecture & Database Flow

### 3.1 Production Database Choice
In production, the application connects to a **PostgreSQL** database via **Supabase** (either **Lovable Cloud Managed Supabase** or **Self-Hosted Supabase on Hostinger VPS** via Docker):

1. **Option A: Lovable Cloud / Managed Supabase (Recommended)**
   - Zero maintenance, automatic daily backups, automated SSL, global edge API.
   - Connected via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
2. **Option B: Self-Hosted Supabase on Hostinger VPS**
   - 100% of data, authentication tables, and media buckets remain on the Hostinger VPS.
   - Spun up via standard Docker Compose (`docker compose up -d`).

### 3.2 Database Schema & Row-Level Security (RLS)
The database enforces security at the PostgreSQL kernel level via Row-Level Security:

```sql
-- Table: portfolio_projects
CREATE TABLE public.portfolio_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    challenge TEXT,
    approach TEXT,
    value_delivered TEXT,
    client_industry TEXT,
    tags TEXT[] DEFAULT '{}',
    metrics JSONB DEFAULT '[]',
    model_embed_url TEXT,
    thumbnail_url TEXT,
    gallery_images TEXT[] DEFAULT '{}',
    sort_order INT NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    public_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Row-Level Security (RLS) Policies
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

-- 1. Anonymous Public Read Policy:
-- Public visitors can ONLY query projects that have public_enabled = true
CREATE POLICY "Public can view enabled projects"
ON public.portfolio_projects
FOR SELECT
TO anon, authenticated
USING (public_enabled = true);

-- 2. Authenticated Admin Policy:
-- Authenticated administrator has full CRUD permissions across all rows
CREATE POLICY "Admin full access"
ON public.portfolio_projects
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'czahidali@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'czahidali@gmail.com');
```

### 3.3 Media Storage Bucket
- Storage Bucket: `portfolio-media`
- Storage RLS:
  - Public `SELECT` allowed on all objects.
  - `INSERT`, `UPDATE`, `DELETE` restricted strictly to the authenticated administrator.

---

## 4. How Real-Time CMS Operations Work in Production

```
+-------------------------------------------------------------+
|                 Administrator on /admin                     |
|  - Creates / Edits Project Details                          |
|  - Uploads Thumbnails / Financial Models                    |
|  - Toggles Public Visibility (Enable / Disable)             |
|  - Reorders Projects (Up / Down)                            |
+------------------------------+------------------------------+
                               |
                               | Direct Authenticated REST / RPC
                               v
+-------------------------------------------------------------+
|              Production PostgreSQL (Supabase)               |
|  - Inserts / Updates 'portfolio_projects' Table             |
|  - Stores Media in 'portfolio-media' Bucket                 |
|  - Enforces RLS (Only public_enabled=true visible to public)|
+------------------------------+------------------------------+
                               |
                               | Live Client Query (TanStack Query)
                               v
+-------------------------------------------------------------+
|             Public Live Website (/ & /clean)                |
|  - Immediately reflects new / edited projects               |
|  - Renders in specified 'sort_order'                        |
|  - ZERO redeployment or server rebuild required             |
+-------------------------------------------------------------+
```

1. **Creating a Project:**
   The administrator signs in at `/auth`, navigates to `/admin`, and fills the project form. Uploaded attachments go to the storage bucket, returning public URLs. On clicking *Save*, a row is inserted into PostgreSQL. Public visitors immediately see the new project on their next view.
2. **Editing Existing Content:**
   The administrator opens any project, changes copy, metrics, or tags, and saves. The database record updates in milliseconds without touching code or running builds.
3. **Real-Time Sorting (Up / Down):**
   When the administrator moves a project up or down, the CMS writes updated `sort_order` integer values to PostgreSQL. The public landing page fetches records ordered by `sort_order ASC, created_at DESC`, guaranteeing instant reordering.
4. **Public Enable / Disable Toggle:**
   When toggled off, `public_enabled` is set to `false`. Because public queries are constrained by RLS policy `public_enabled = true`, the project vanishes from the public homepage, search indexes, and direct URL `/projects/:slug` instantaneously.

---

## 5. Deployment & Continuous Updates

1. **Source Code Repository:** Synchronized to `imawais-engineer/zahid-folio` on GitHub (`main` branch).
2. **Hostinger VPS Web Server:**
   - Operating System: Ubuntu Linux.
   - Web Server: Nginx acting as high-performance reverse proxy with gzip and asset caching.
   - Process Management: PM2 / Static SPA distribution from `/var/www/zahid-folio/dist`.
   - Security: Let's Encrypt SSL via Certbot auto-renewal.
3. **Automated VPS Update Flow:**
   Running `/var/www/deploy.sh` pulls changes from GitHub `main`, rebuilds the static bundle, and reloads Nginx in seconds.
