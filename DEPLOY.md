# GeoAI Deploy Notes

## Target Setup

Recommended production setup:

- Frontend: Netlify, deployed from GitHub.
- Backend: Railway FastAPI service.
- Main domain: `https://geoaiplatform.uz`
- API: Railway backend public URL, or later `https://api.geoaiplatform.uz`

Netlify should manage SSL for the frontend domain. Do not issue the
`geoaiplatform.uz` frontend certificate from Plesk after the domain is connected
to Netlify.

## Frontend on Netlify

The repository includes `netlify.toml` for this monorepo setup:

```toml
[build]
  base = "frontend"
  command = "npm ci && npm run build"
  publish = "dist"
```

Netlify deploy steps:

1. Push the repository to GitHub.
2. In Netlify, choose **Add new site**.
3. Choose **Import an existing project**.
4. Select GitHub and choose the `geoai-platform` repository.
5. Netlify should read `netlify.toml` automatically.
6. Confirm the build settings:
   - Base directory: `frontend`
   - Build command: `npm ci && npm run build`
   - Publish directory: `dist`
7. Deploy the site.

Frontend API variable:

```env
VITE_API_BASE_URL=https://geoai-platform-production.up.railway.app
```

This value is already included in `netlify.toml`. If the Railway backend URL is
different, update it in Netlify environment variables or in `netlify.toml`.

React Router refresh support is handled by this redirect in `netlify.toml`:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Domain on Netlify

After the Netlify preview URL works:

1. Open the Netlify site.
2. Go to **Domain management**.
3. Add custom domain:
   - `geoaiplatform.uz`
   - `www.geoaiplatform.uz`
4. Netlify will show the DNS records that must be added at the domain DNS
   provider.
5. Add those records in Eskiz/Plesk DNS.
6. Remove or replace old Plesk web records only when Netlify tells you to.

Keep mail records unless you are intentionally moving email away from Eskiz:

- `MX`
- `mail.geoaiplatform.uz`
- `webmail.geoaiplatform.uz`
- `_dmarc`
- SPF `TXT`

## Backend on Railway

Railway remains the backend host.

Railway backend service settings:

- Root directory: `backend`
- Config file: `backend/railway.json`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Required Railway variables for SMS:

```env
SMS_PROVIDER=eskiz
ESKIZ_EMAIL=your-eskiz-email
ESKIZ_PASSWORD=your-eskiz-password
ESKIZ_FROM=4546
```

Optional email variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=GeoAI Platformasi
```

## Local Development

Backend:

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload --port 8001
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Frontend local URL: `http://localhost:5173`
Backend local URL: `http://127.0.0.1:8001`

## Google Search

After Netlify custom domain and SSL are active:

1. Make sure `https://geoaiplatform.uz/robots.txt` opens.
2. Make sure `https://geoaiplatform.uz/sitemap.xml` opens.
3. Add the domain to Google Search Console.
4. Submit `https://geoaiplatform.uz/sitemap.xml`.
