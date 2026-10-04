/** Shared constants and small helpers. */

/** Visitor-type choices: `value` is the backend choice key, `label` is shown in the UI. */
export const VISITOR_TYPES = [
  { value: 'guest', label: 'Guest' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'service', label: 'Service / Maintenance' },
  { value: 'cab', label: 'Cab / Taxi' },
  { value: 'other', label: 'Other' },
] as const;

/** Display label for a stored visitor_type key (e.g. 'guest' -> 'Guest'). */
export function visitorTypeLabel(value: string | null | undefined): string {
  return VISITOR_TYPES.find((t) => t.value === value)?.label ?? value ?? '';
}

/** Extract the gate list from a /society/ response (handles paginated / list / object shapes). */
export function extractGates(res: unknown, fallback = 'Main Gate'): string[] {
  if (!res) return [fallback];
  const list = Array.isArray(res)
    ? res
    : (res as { results?: unknown }).results ?? res;
  const first = (Array.isArray(list) ? list[0] : list) as { gates?: unknown } | null;
  const raw = first?.gates ?? fallback;
  const gates = String(raw)
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean);
  return gates.length ? gates : [fallback];
}

/** Flatten a DRF error response (nested objects/arrays) into a readable message. */
export function formatApiError(err: unknown, fallback = 'Request failed'): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  if (typeof err !== 'object') return fallback;
  const record = err as Record<string, unknown>;
  if (typeof record['detail'] === 'string') return record['detail'];
  const parts: string[] = [];
  const walk = (node: unknown, prefix: string): void => {
    if (typeof node === 'string') {
      parts.push(prefix ? `${prefix}: ${node}` : node);
    } else if (Array.isArray(node)) {
      node.forEach((v) => walk(v, prefix));
    } else if (node && typeof node === 'object') {
      Object.entries(node as Record<string, unknown>).forEach(([k, v]) =>
        walk(v, prefix ? `${prefix}.${k}` : k)
      );
    }
  };
  walk(record, '');
  return parts.join(' ') || fallback;
}

export const ID_PROOF_TYPES = [
  'Aadhaar',
  'PAN',
  'Driving Licence',
  'Voter ID',
  'Passport',
  'Other',
];

export const USER_ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'guard', label: 'Security Guard' },
  { value: 'resident', label: 'Resident' },
] as const;

/** Format a Date as a local yyyy-MM-dd string (avoids UTC-shift bugs). */
export function toISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Extract the resident *user* id from a ResidentProfile whose `user` may be an id, a nested object, or missing. */
export function residentUserId(profile: {
  user?: number | { id: number } | null;
}): number | null {
  const u = profile?.user;
  if (u == null) return null;
  return typeof u === 'number' ? u : u.id;
}

/** Display label for a resident profile in selects. */
export function residentLabel(profile: {
  flat_no: string;
  tower?: string;
  user?: number | { username?: string; first_name?: string; last_name?: string } | null;
}): string {
  const u = profile?.user;
  const name =
    u == null || typeof u === 'number'
      ? ''
      : [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '';
  const flat = profile?.tower ? `${profile.tower}-${profile.flat_no}` : profile?.flat_no ?? '';
  return name ? `${flat} — ${name}` : flat;
}
