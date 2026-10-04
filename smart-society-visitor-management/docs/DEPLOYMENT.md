# Deployment Guide

HTTPS-ready deployment options for the Smart Society Visitor Management system.

## Option A — Docker Compose (recommended for demos)

```bash
docker compose up --build -d
```

`docker-compose.yml` starts three services:

| Service | Exposes |
|---|---|
| `db` (MySQL 8, utf8mb4) | 3306 |
| `api` (Django + Gunicorn) | 8000 |
| `web` (Angular static build, served over HTTPS-ready nginx) | 80, 443 |

Set these in a `.env` file next to the compose file before first run:

```
DB_PASSWORD=...   DJANGO_SECRET_KEY=...   DJANGO_DEBUG=0
```

When `DEBUG=0`, Django enables `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`,
`SECURE_SSL_REDIRECT`, and HSTS (see `backend/config/settings.py`).

### Enabling HTTPS

1. Point your domain (e.g. `society.example.com`) at the server.
2. Mount TLS certificates into the `web` service:
   ```yaml
   volumes:
     - /etc/letsencrypt/live/society.example.com/fullchain.pem:/etc/nginx/ssl/cert.pem:ro
     - /etc/letsencrypt/live/society.example.com/privkey.pem:/etc/nginx/ssl/key.pem:ro
   ```
   and uncomment the `listen 443 ssl;` block in `deploy/nginx.conf`.
3. Get certificates with Certbot: `certbot certonly --standalone -d society.example.com`.

## Option B — Manual server deployment

1. **Database**: MySQL 8 on the server; create `smart_society_db` (utf8mb4).
2. **Backend**: install requirements in a venv, set env vars (`DEBUG=0`, `SECRET_KEY`,
   `DB_*`, `ALLOWED_HOSTS`), run `migrate`, then serve with Gunicorn behind nginx:
   ```
   gunicorn config.wsgi:application --bind 127.0.0.1:8000 --workers 3
   ```
3. **Frontend**: `ng build --configuration production`, serve `dist/` from nginx or any static host;
   set `environment.prod.ts` `apiUrl` to `https://YOUR_DOMAIN/api`.
4. **HTTPS**: terminate TLS at nginx (Certbot), redirect HTTP→HTTPS.

## Security checklist before going live

- [ ] Change all seeded passwords; delete demo data (`python manage.py flush` + `migrate`)
- [ ] Rotate `SECRET_KEY`; never commit `.env`
- [ ] Restrict `ALLOWED_HOSTS` and CORS origins to your domain
- [ ] Disable `send-otp` returning `otp_code` (only returned when `DEBUG=1` by default)
- [ ] Enable MySQL TLS / firewall rules so the DB is not publicly reachable
- [ ] Schedule MySQL backups (`mysqldump smart_society_db`)
- [ ] Review `api/audit-logs/` regularly for anomalies
