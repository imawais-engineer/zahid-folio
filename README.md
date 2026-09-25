# Alpha Insights Advisory

Build the Alpha Insights finance advisory website and dynamic portfolio CMS based on https://github.com/imawais-engineer/alpha-insights and preview https://alpha-insights-gamma.vercel.app/

Requirements:
1. Public Website:
- Finance advisory portfolio for Chaudhary Zahid Ali (Alpha Insights) following the design and layout of the repo (DM Sans, Libre Caslon Display, gold/burgundy/dark luxury finance aesthetic).
- Header, Hero ("Financial clarity. Better decisions."), Credibility metrics, "How I Can Help Your Business" service grid, Experience across leading organisations (PwC, Panda, Domino's, SIXT, PETRONAS), Selected Work with live search, platform filter, capability filter, industry filter, and count, Professional Experience timeline, Client Testimonials, About Zahid, Contact section, and case study modal.
- Provide two versions of the landing page: primary with profile picture and a clean route (/clean or /anonymous) without profile photo, sharing the exact same underlying dynamic components and CMS data.

2. Password-Protected Admin CMS (/admin):
- Blueprint from portfolio-admin-demo.html in the repo.
- Secure authentication for admin access.
- Full CRUD for Portfolio Projects (Create, Read, Update, Delete) stored in the database.
- Fields: Title, Platform tags (select existing or create new), Capability tags (select existing or create new), Industry tags (select existing or create new), Access status (Interactive, Preview only, Available on request), Homepage thumbnail upload, Additional screenshots upload, OneDrive / Excel Online / Power BI embed URL, Short description, Business challenge, Approach, Business value, Display priority (with manual Up/Down or drag-and-drop sorting), and Featured toggle.
- When saved in admin, updates must immediately reflect on the live public portfolio without needing a redeploy.
- Seed the database with the initial projects from script.js (13-Week Cash Flow & Liquidity Model, Management Accounts, Multi-Location Retail FP&A, Budget & Forecast Model, Acquisition & LBO Model, Valuation & Investment Appraisal, CFO & Executive Dashboards, CFO & FP&A Capability Pack).

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://zahid-folio.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e2d041af-f6c7-4018-8b1c-87f3c29fda36).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
