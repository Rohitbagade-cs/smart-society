# Smart Society Visitor Management and Secure Access Control System

Full-stack project: **Angular** frontend · **Django REST Framework** backend · **MySQL** database.
This README covers the backend (`backend/`) and the MySQL schema (`database/`).

## 1. Prerequisites

- Python 3.11+
- MySQL 8 server
- pip / venv

## 2. Setup

```bash
cd backend
python3.11 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env          # then edit DB credentials / SECRET_KEY

# Create the database (MySQL 8, utf8mb4)
mysql -u root -p -e "CREATE DATABASE smart_society_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations and seed demo data
python manage.py migrate
python manage.py seed_data

# Start the API server
python manage.py runserver 0.0.0.0:8000
```

Seeded credentials:

| Role     | Username    | Password     |
|----------|-------------|--------------|
| Admin    | `admin`     | `Admin@123`  |
| Guard    | `guard1`    | `Guard@123`  |
| Guard    | `guard2`    | `Guard@123`  |
| Resident | `resident1`…`resident6` | `Resident@123` |

`seed_data` is idempotent — it skips when the `admin` user already exists.

## 3. Architecture

```
Angular (http://localhost:4200)
        │  JWT (Bearer) + CORS
        ▼
Django REST API (http://localhost:8000/api/)
        │  ORM
        ▼
MySQL 8 — smart_society_db (utf8mb4, InnoDB FK constraints)
```

Roles: `admin`, `guard`, `resident`. Auth is JWT (SimpleJWT, custom claims include
`role`). Residents see only their own visit requests and notifications; guards see
all gate data; admins manage users, reports, audit logs and society config.

## 4. API endpoints

Base: `http://localhost:8000/api/`

### Auth
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/auth/login/` | public | `{username,password}` → `{access, refresh, user}` |
| POST | `/api/auth/token/refresh/` | public | `{refresh}` → `{access}` |
| POST | `/api/auth/register/` | admin | create user with role (no self-registration) |
| GET | `/api/auth/me/` | auth | current user profile |

### Users & profiles (admin)
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/users/` | list / create users |
| GET/PATCH/DELETE | `/api/users/{id}/` | user detail (password write-only, hashed) |
| — | `/api/residents/`, `/api/guards/` | full CRUD, `?search=` filterable |

### Society config
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/society/` | auth | singleton config (row id=1) |
| PUT/PATCH | `/api/society/{id}/` | admin | update config (audited) |

### Visitors (guard/admin)
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/visitors/` | filters `?search=` (name/phone), `?type=`, `?date_from=`, `?date_to=` |
| GET/PATCH/DELETE | `/api/visitors/{id}/` | visitor detail |

### Visit requests
| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/api/visit-requests/` | guard/admin all; resident own only | `?status=` filter |
| POST | `/api/visit-requests/` | guard/admin | `{visitor: {...}}` or `{visitor_id, resident_id, purpose, expected_at}` → creates QR token + resident notification |
| GET/PATCH/DELETE | `/api/visit-requests/{id}/` | scoped | detail |
| POST | `/api/visit-requests/{id}/respond/` | resident (own, pending) | `{action: approve\|reject, note}` → Approval row + guard notification |
| POST | `/api/visit-requests/{id}/send-otp/` | guard | 6-digit OTP, SHA-256 stored, 10-min TTL, resident notification; `{otp_code}` returned in DEBUG |
| GET | `/api/visit-requests/{id}/qr/` | auth | visitor pass as PNG QR (`{token, request_id, society}`) |

### OTP
| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/api/otp/verify/` | guard | `{visit_request_id, otp_code}` → sets `otp_verified=true` |

### Access logs (guard/admin)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/access-logs/` | filters `?date=YYYY-MM-DD`, `?gate=` |
| POST | `/api/access-logs/` | `{visit_request_id, gate, direction}` — `in` needs approved (or OTP-verified) → `checked_in`; `out` needs `checked_in` → `checked_out` |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications/` | own inbox |
| PATCH | `/api/notifications/{id}/` | `{is_read: true}` |
| GET | `/api/notifications/unread-count/` | `{count}` |

### Reports & audit (admin)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/reports/daily/?date=YYYY-MM-DD` | totals, by-type breakdown, log list |
| GET | `/api/reports/monthly/?year=&month=` | totals, per-day counts, by-type |
| GET | `/api/audit-logs/` | filters `?action=`, `?entity=` |

Pagination: 20 per page (`?page=`). All write actions of note (user CRUD,
visitor CRUD, approve/reject, entry/exit, config changes) write to `audit_logs`.

## 5. Deployment (HTTPS-ready)

1. Set `DEBUG=0` and a real `SECRET_KEY` in `.env`; restrict `ALLOWED_HOSTS`
   and `CORS_ALLOWED_ORIGINS` to the production domains.
2. Terminate TLS at a reverse proxy (nginx / cloud LB); the app honours
   `X-Forwarded-Proto` and forces secure cookies when `DEBUG=0`.
3. Run behind gunicorn/uvicorn + a process manager; serve static files via the
   proxy. Use `mysql -u ... < database/schema.sql` as the schema reference
   (Django migrations create it in practice).

## 6. Extensibility

The layered design (Angular client → DRF API → MySQL) leaves room for:
facial-recognition verification (plug into the OTP/QR verification views),
smart-gate hardware webhooks (extend `AccessLogViewSet.create`), CCTV
correlation on `AccessLog` timestamps, analytics dashboards on the report
endpoints, and containerised/cloud deployment.
