# GeoAI Deploy Notes

## Target Setup

Recommended production setup:

- Frontend: React/Vite static build served by the hosting panel or Nginx.
- Backend: FastAPI/Uvicorn served as a Python app or on a VPS behind Nginx.
- Domain:
  - Main site: `https://your-domain.uz`
  - API: `https://api.your-domain.uz`

## Frontend Environment

Create `frontend/.env.production` on the server or in the CI/CD environment:

```env
VITE_API_BASE_URL=https://api.your-domain.uz
```

Then build:

```bash
cd frontend
npm install
npm run build
```

Upload the contents of `frontend/dist` to the public web directory.

## Backend Environment

Create `backend/.env` on the server. Do not commit this file to GitHub.

Required SMS settings for Eskiz:

```env
SMS_PROVIDER=eskiz
ESKIZ_EMAIL=your-eskiz-email
ESKIZ_PASSWORD=your-eskiz-password
ESKIZ_FROM=4546
```

Email settings are optional unless email registration is used:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=GeoAI Platformasi
```

## GitHub Auto Deploy

Common flow:

1. Push code from VS Code to GitHub.
2. GitHub Actions builds frontend.
3. GitHub Actions deploys files to hosting through SSH, FTP, or the hosting panel Git feature.
4. Backend restarts on the server.

Exact workflow depends on whether the hosting has SSH/Python app support.

## Shared Hosting Python Backend

If the hosting panel supports "Python web-server" but not a persistent Uvicorn
process, use the WSGI adapter entrypoint:

```text
backend/passenger_wsgi.py
```

Install lightweight production dependencies:

```bash
pip install -r requirements.production.txt
```

The production file intentionally does not install `ultralytics`, because the
current FastAPI routes do not import `app/ai.py` and most shared hostings cannot
install heavy ML dependencies reliably.

## geoaiplatform.uz Suggested Domains

Use:

```text
https://geoaiplatform.uz
https://api.geoaiplatform.uz
```

Frontend production variable:

```env
VITE_API_BASE_URL=https://api.geoaiplatform.uz
```

## GitHub Secrets for FTP Deploy

If Plesk gives FTP access, add these secrets in GitHub repository settings:

```text
FTP_SERVER
FTP_USERNAME
FTP_PASSWORD
FTP_FRONTEND_DIR
```

Example `FTP_FRONTEND_DIR` values depend on Plesk document root, commonly:

```text
/httpdocs/
```

or:

```text
/geoaiplatform.uz/httpdocs/
```

The workflow file is:

```text
.github/workflows/frontend-deploy.yml
```

## Google Search

After deployment:

1. Enable HTTPS for `geoaiplatform.uz`.
2. Make sure `https://geoaiplatform.uz/robots.txt` opens.
3. Make sure `https://geoaiplatform.uz/sitemap.xml` opens.
4. Add the domain to Google Search Console.
5. Submit `https://geoaiplatform.uz/sitemap.xml`.
