# Smart Society Visitor Management — Frontend

Angular 17 (standalone components) + Angular Material frontend for the
**Smart Society Visitor Management and Secure Access Control System**.
It talks to the Django REST Framework backend at `http://localhost:8000/api/`.

## Prerequisites

- Node.js 18+ and npm
- The Django backend running at `http://localhost:8000` (serves `/api/…`)

## Setup

```bash
cd frontend
npm install
```

## Run (development)

```bash
npm start
# equivalent: ng serve --proxy-config proxy.conf.json
```

Open http://localhost:4200. API calls to `/api/…` are proxied to
`http://localhost:8000` by `proxy.conf.json`, so no CORS setup is needed in dev.

## Build

```bash
npm run build        # production build -> dist/frontend
npm run build:prod   # same as above (explicit)
```

## Production configuration

`src/environments/environment.prod.ts` sets `apiUrl: 'https://YOUR_DOMAIN/api'`.
Replace `YOUR_DOMAIN` with the deployed backend host (HTTPS-ready deployment),
then build with `npm run build`. The dev environment uses `/api` via the proxy.

## Project structure

```
src/
  main.ts                 # bootstrap: router + HttpClient + interceptor + animations
  index.html / styles.css # Material theme, responsive layout helpers
  environments/           # dev (proxy) / prod API URLs
  app/
    app.component.ts      # <router-outlet> root
    app.routes.ts         # role-guarded routes (/login, /admin/*, /guard/*, /resident/*)
    core/
      models.ts           # interfaces matching the DRF contract
      utils.ts            # visitor types, date helpers, resident helpers
      auth.service.ts     # JWT login/logout/refresh, current user, role helpers
      api.service.ts      # typed CRUD wrapper (all lists are paginated)
      token.interceptor.ts# Bearer token attach + silent refresh-and-retry on 401
      role.guard.ts       # canActivateFn requiring roles from route data
    login/                # username/password, role-based redirect, error display
    shared/
      app-shell/          # toolbar + responsive sidenav + notifications bell (polls unread count)
      confirm-dialog/     # reusable confirm dialog
    admin/
      admin-dashboard/    # stat cards (users, visitors, pending, today's in/out) + links
      user-management/    # users table + create/edit dialog (role select, write-only password)
      visitor-records/    # searchable table (search/type/date filters, server pagination)
      reports/            # daily (date picker) + monthly (year/month) report cards
      society-config/     # singleton society settings form
      audit-log/          # filterable audit table
    guard/
      guard-dashboard/    # register-visitor form (resident select, nested visitor payload)
      verify/             # load request, send OTP (dev shows otp_code), verify OTP, show QR PNG
      entry-exit/         # approved-request select, gate select, In/Out recording
      daily-log/          # date + gate filtered access-log table
    resident/
      resident-dashboard/ # pending requests with approve/reject + note, upcoming visits
      visitor-history/    # searchable, status-filtered history table
      notifications/      # list, mark read, mark all read
```

## Roles & access

| Role     | Home      | Capabilities                                              |
|----------|-----------|-----------------------------------------------------------|
| admin    | /admin    | users, visitor records, reports, society config, audit log |
| guard    | /guard    | register visitors, OTP/QR verification, entry/exit, daily log |
| resident | /resident | approve/reject requests, visitor history, notifications    |

Login returns `{access, refresh, user}`; the interceptor attaches the access
token and transparently refreshes it once on a 401.

## Notes / assumptions

- Dev OTP: `POST /visit-requests/{id}/send-otp/` returns `{otp_code}` in dev —
  the verify screen displays it in a highlighted box.
- QR: `GET /visit-requests/{id}/qr/` returns a PNG blob, rendered via object URL.
- `/api/society/` may return the singleton as an object or a one-item list —
  both shapes are handled.
- Optional query params unknown to the backend (e.g. `status` on some lists)
  are ignored server-side without breaking the UI.
