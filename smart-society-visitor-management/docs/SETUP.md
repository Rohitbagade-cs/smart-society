# Setup Guide

Step-by-step setup for the **Smart Society Visitor Management and Secure Access Control System**
(Angular frontend · Django REST Framework backend · MySQL database).

## 1. Prerequisites

| Tool | Version |
|---|---|
| Python | 3.11+ |
| Node.js | 20+ (with npm) |
| Angular CLI | 17 (`npm i -g @angular/cli@17`) |
| MySQL | 8.0+ |

## 2. Database

```bash
mysql -u root -p -e "CREATE DATABASE smart_society_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

Optionally apply the hand-written schema instead of migrations:

```bash
mysql -u root -p smart_society_db < database/schema.sql
```

## 3. Backend (Django REST API)

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env        # edit DB credentials, SECRET_KEY
python manage.py migrate
python manage.py seed_data  # demo users, visitors, requests, logs
python manage.py runserver 0.0.0.0:8000
```

API base URL: `http://localhost:8000/api/` · Django admin: `http://localhost:8000/admin/`

### Seeded demo credentials

| Role | Username | Password |
|---|---|---|
| Admin | `admin` | `Admin@123` |
| Guard | `guard1`, `guard2` | `Guard@123` |
| Resident | `resident1` … `resident6` | `Resident@123` |

> Change all passwords before any real deployment.

## 4. Frontend (Angular)

```bash
cd frontend
npm install
ng serve --proxy-config proxy.conf.json
```

Open `http://localhost:4200`. API calls to `/api` are proxied to `http://localhost:8000`.

Production build:

```bash
ng build --configuration production   # output in frontend/dist/
# then point environment.prod.ts apiUrl at your HTTPS API domain
```

## 5. Smoke test the flow

1. Log in as `guard1` → **Register Visitor**: pick a resident, fill visitor details, submit.
2. Log in as that resident (`resident1`) → **Dashboard**: approve the pending request.
3. Log in as `guard1` → **Verify**: send OTP / view QR for the request → **Entry/Exit**: check the visitor in and out.
4. Log in as `admin` → **Reports**: daily/monthly summaries; **Audit Log**: every action is recorded.
