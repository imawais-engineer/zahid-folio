# Alpha Insights Advisory — Production Deployment Guide

Repository: `github.com/imawais-engineer/zahid-folio` (branch: `main`)

This guide covers the full path from a fresh server to a live production website:
clone → authenticate → database attach → build → domain + SSL → auto-deploy on every push.

---

## 0. Admin Access (Ready to Test)

- **Login URL:** `/auth` (navigating to `/admin` redirects there)
- **Admin Email:** `czahidali@gmail.com`
- **Temporary Password:** `Zahid@Finance786` — change this in production before going live
- Public sign-up / self-registration is **disabled**; no outside visitor can create an account.
- All 8 template projects are unlocked and fully editable in the CMS (`/admin`), including the Enable/Disable Public View toggle.

---

## 1. GitHub Sync (Lovable → main)

Lovable syncs this project to GitHub in real time:

1. In the Lovable editor, open the **+ menu → GitHub → Connect project** (or the GitHub button in the top bar).
2. Authorize the Lovable GitHub App on your GitHub account.
3. Select repository **`imawais-engineer/zahid-folio`** and target branch **`main`**.
4. Click **Connect / Sync** — every change made in Lovable is committed and pushed to `main` automatically, and pushes to `main` sync back into Lovable.

---

## 2. VPS Server Setup & Clone

SSH into your VPS (e.g. Hostinger) and run:

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Node.js 20 LTS, Git, and Nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# 3. Install PM2 process manager (keeps the app running)
sudo npm install -g pm2

# 4. Clone the repository
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/imawais-engineer/zahid-folio.git
cd zahid-folio

# 5. Install dependencies
npm install
```

For a private repo, authenticate first with a GitHub personal access token:

```bash
git clone https://<TOKEN>@github.com/imawais-engineer/zahid-folio.git
# or configure SSH: ssh-keygen -t ed25519, add the public key to GitHub → Settings → Deploy keys
```

---

## 3. Environment & Database Configuration

Create the production environment file:

```bash
sudo nano /var/www/zahid-folio/.env
```

Paste your project keys (from Lovable: **Project Settings → Integrations → Supabase / Cloud**):

```env
VITE_SUPABASE_URL="https://your-project-url"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_URL="https://your-project-url"
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"   # server-only, never expose to the browser
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

### Option A — Managed Cloud (recommended, zero maintenance)
Keep using the Lovable Cloud database already attached to this project. The keys above are all you need; the schema, RLS policies, roles, and seed data are already live.

### Option B — Self-hosted database on the VPS
```bash
sudo apt install -y docker.io docker-compose
sudo systemctl enable --now docker

git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker
cp .env.example .env
docker compose up -d
```
Then point the `.env` values in `/var/www/zahid-folio/.env` to your local instance (`http://localhost:8000`) and re-apply the migrations in `drizzle/migrations/`.

---

## 4. Build & Run the Production App

```bash
cd /var/www/zahid-folio
npm run build

# Serve with PM2
pm2 start npm --name "alpha-insights" -- start
pm2 save
pm2 startup
```

---

## 5. Nginx Reverse Proxy & Domain Routing

Create the server block:

```bash
sudo nano /etc/nginx/sites-available/zahid-folio
```

Paste (replace `yourdomain.com` with your real domain):

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/zahid-folio/dist;
    index index.html;

    # Client-side routing (SPA fallback)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Long-cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|webp|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/zahid-folio /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 6. DNS & Free SSL (HTTPS)

**DNS records** (at your registrar / Hostinger DNS):

| Type  | Name  | Value              |
|-------|-------|--------------------|
| A     | `@`   | Your VPS public IP |
| CNAME | `www` | `@`                |

**SSL certificate:**

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Choose automatic redirect to HTTPS when prompted. Certificates renew automatically.

---

## 7. Auto-Deploy on Every Push to main

Create a deploy script:

```bash
sudo nano /var/www/deploy.sh
```

```bash
#!/bin/bash
set -e
echo "Deploying latest changes from GitHub main..."
cd /var/www/zahid-folio
git pull origin main
npm install
npm run build
pm2 reload alpha-insights
sudo systemctl reload nginx
echo "Deployment successful!"
```

```bash
sudo chmod +x /var/www/deploy.sh
```

Now every push to `main` (from Lovable or anywhere else) goes live by running:

```bash
/var/www/deploy.sh
```

For fully hands-free deployments, add a GitHub webhook (repo → Settings → Webhooks) pointing to a small listener on the VPS that executes `/var/www/deploy.sh`, or run it from a GitHub Action over SSH.

---

## 8. Post-Launch Checklist

- [ ] Change the temporary admin password (sign in at `/auth` → update credentials).
- [ ] Confirm disabled projects are hidden from `/`, `/clean`, and `/projects/:slug`.
- [ ] Replace the 8 template/sample projects with real case studies in `/admin`.
- [ ] Verify `https://yourdomain.com` loads with a valid certificate.
- [ ] Test `/var/www/deploy.sh` once end-to-end after a push to `main`.
