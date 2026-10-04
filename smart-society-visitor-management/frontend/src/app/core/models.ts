/** Domain models matching the Django REST API contract (backend: http://localhost:8000/api/). */

export type Role = 'admin' | 'guard' | 'resident';

export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  role: Role;
  is_active: boolean;
  date_joined?: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ResidentProfile {
  id: number;
  /** user id, or nested User object depending on serializer depth */
  user: number | User;
  flat_no: string;
  tower?: string;
  phone?: string;
  family_members?: number;
}

export interface SecurityGuardProfile {
  id: number;
  user: number | User;
  gate?: string;
  shift?: string;
  phone?: string;
}

export interface Visitor {
  id: number;
  full_name: string;
  phone: string;
  id_proof_type?: string;
  id_proof_number?: string;
  photo_url?: string | null;
  visitor_type: string;
  vehicle_number?: string;
  created_at?: string;
}

export type VisitStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'cancelled'
  | 'checked_in'
  | 'checked_out';

export interface VisitRequest {
  id: number;
  visitor: Visitor;
  visitor_id?: number;
  /** resident user id */
  resident: number;
  resident_username?: string;
  resident_flat?: string | null;
  purpose: string;
  expected_at: string;
  status: VisitStatus;
  qr_token?: string;
  otp_verified: boolean;
  created_at?: string;
}

export type Direction = 'in' | 'out';

export interface AccessLog {
  id: number;
  visit_request: number;
  visitor_name?: string;
  gate: string;
  direction: Direction;
  timestamp?: string;
  recorded_by?: number;
}

/** Named AppNotification to avoid clashing with the DOM Notification type. */
export interface AppNotification {
  id: number;
  user?: number;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_request?: number | null;
}

export interface Society {
  id: number;
  name: string;
  address: string;
  city: string;
  total_flats: number;
  /** comma-separated gate names, e.g. "Main Gate, Service Gate" */
  gates: string;
  contact_email: string;
  contact_phone: string;
  visiting_hours_start: string;
  visiting_hours_end: string;
  otp_enabled: boolean;
  qr_enabled: boolean;
}

export interface AuditLog {
  id: number;
  actor?: number | null;
  actor_username?: string | null;
  action: string;
  entity?: string;
  entity_id?: number | null;
  timestamp: string;
  ip_address?: string;
  details?: Record<string, unknown> | string | null;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

/** Report payloads are intentionally loose — the UI renders whichever metrics exist. */
export interface DailyReport {
  date: string;
  total_requests?: number;
  approved?: number;
  rejected?: number;
  pending?: number;
  total_entries?: number;
  total_exits?: number;
  unique_visitors?: number;
  [key: string]: unknown;
}

export interface MonthlyReport {
  year: number;
  month: number;
  total_requests?: number;
  approved?: number;
  rejected?: number;
  total_entries?: number;
  total_exits?: number;
  daily_breakdown?: Record<string, unknown>[];
  [key: string]: unknown;
}
