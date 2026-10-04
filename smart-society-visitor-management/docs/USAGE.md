# Usage Guide

## Roles at a glance

| Role | What they do in the app |
|---|---|
| **Admin** | Manages users & roles, visitor records, society configuration, daily/monthly reports, audit logs |
| **Security Guard** | Registers visitors, sends/verifies OTP, shows QR passes, records entry/exit, maintains the daily gate log |
| **Resident** | Receives visitor requests, approves/rejects access, views own visitor history, receives notifications |

## Guard workflow (gate)

1. **Register Visitor** (`/guard`): select the resident being visited, enter visitor details
   (name, phone, ID proof, type, vehicle), purpose and expected time → creates a
   **VisitRequest** in `pending` status and notifies the resident.
2. **Verify** (`/guard/verify`): for a request, optionally **Send OTP** (resident confirms the
   6-digit code verbally) or display the **QR pass** (`GET /api/visit-requests/{id}/qr/`)
   for the resident/visitor to scan.
3. **Entry/Exit** (`/guard/entry-exit`): pick an approved request and record **Check-in**
   (requires approved or OTP-verified) or **Check-out** (requires checked-in).
4. **Daily Log** (`/guard/daily-log`): filterable register of the day's gate activity.

## Resident workflow

1. **Dashboard** (`/resident`): pending requests show visitor details + purpose —
   **Approve** or **Reject** (optionally with a note).
2. **History** (`/resident/history`): searchable record of all past visits to your flat.
3. **Notifications** (`/resident/notifications`): request alerts, entry/exit updates.

## Admin workflow

- **Users** (`/admin/users`): create/edit/deactivate users with roles admin/guard/resident.
- **Visitor records** (`/admin/visitors`): search by name/phone, filter by type and date range.
- **Reports** (`/admin/reports`): daily summary (date picker) and monthly summary
  (per-day counts, breakdown by visitor type).
- **Society config** (`/admin/society`): society name, address, gates, visiting hours,
  OTP/QR feature toggles.
- **Audit log** (`/admin/audit`): who did what and when (filter by action/entity).

## API quick reference

Base: `http://localhost:8000/api/`

| Area | Endpoints |
|---|---|
| Auth | `POST auth/login/` · `POST auth/token/refresh/` · `POST auth/register/` (admin) · `GET auth/me/` |
| Users | `users/`, `residents/`, `guards/` (admin) |
| Society | `society/` (read all; write admin) |
| Visitors | `visitors/` (guard/admin; `?search=&type=&date_from=&date_to=`) |
| Requests | `visit-requests/` · `visit-requests/{id}/respond/` · `visit-requests/{id}/send-otp/` · `visit-requests/{id}/qr/` |
| OTP | `otp/verify/` |
| Gate | `access-logs/` (`?date=&gate=`) |
| Notifications | `notifications/`, `notifications/unread-count/` |
| Reports | `reports/daily/?date=`, `reports/monthly/?year=&month=` (admin) |
| Audit | `audit-logs/` (admin) |

All list endpoints are paginated (`{count, next, previous, results}`), page size 20.
JWT access tokens are sent as `Authorization: Bearer <token>`.

## Extending the system (future work)

- **Facial recognition**: add a `Visitor.face_embedding` field and a verification service
  endpoint `POST /api/visitors/{id}/verify-face/`; call it from the guard Verify screen.
- **Smart-gate hardware**: have the gate controller poll `GET /api/visit-requests/?status=approved`
  or receive webhooks on `access-logs` creation; drive relays from AccessLog events.
- **CCTV correlation**: store `camera_id`/`clip_ref` on `AccessLog` alongside timestamps.
- **Analytics dashboards**: aggregate endpoints already exist (`reports/*`); add charts in
  the Angular admin dashboard.
- **Cloud deployment**: containerize via `docker-compose.yml`; the app is stateless apart
  from MySQL, so it scales horizontally behind a load balancer.
