# UI Animations & Polish — Implementation Notes

How the Smart Society frontend got its motion, hover states, charts and toasts.
All motion uses one easing curve (`cubic-bezier(0.22, 1, 0.36, 1)`, a soft spring)
so the app feels consistent. No new npm dependencies were added.

## 1. Animation library — `src/app/core/animations.ts`

Reusable Angular animation triggers. Import the ones you need and list them in
the component's `animations: [...]` array:

| Trigger | Purpose | Usage |
|---|---|---|
| `fadeSlideIn` | Page/section entrance: rises 18px while fading in | `<div class="page" [@fadeSlideIn]>` |
| `staggerCards` | Cascading grid entrance | Container gets `[@staggerCards]`, each child gets class `anim-card` |
| `popIn` | Small pop for stat numbers, badges | `[@popIn]` on the value element |
| `slideAlert` | Slide-in/out for `*ngIf` banners and panels | `[@slideAlert]` on the toggled element |
| `routeTransition` | Cross-fade + slide between routes | See §2 |
| `uiAnimations` | `[fadeSlideIn, staggerCards, popIn, slideAlert]` bundle | `animations: [...uiAnimations]` |

Example — a new page with a staggered card grid:

```ts
import { staggerCards } from '../../core/animations';

@Component({
  ...
  animations: [staggerCards],
  template: `
    <div class="page">
      <div class="card-grid" [@staggerCards]>
        <mat-card class="anim-card" *ngFor="...">...</mat-card>
      </div>
    </div>
  `,
})
```

## 2. Route transitions

`AppComponent` (top-level: login ↔ admin/guard/resident) and `AppShellComponent`
(inside the portal: dashboard ↔ pages) both wrap their `<router-outlet>`:

```html
<div class="route-wrap" [@routeTransition]="prepareRoute(outlet)">
  <router-outlet #outlet="outlet"></router-outlet>
</div>
```

`prepareRoute()` returns the current route path as the animation key, so every
navigation re-triggers the transition. The outgoing view fades out while the
incoming view slides up; both are absolutely positioned during the cross-fade
(see `.route-wrap` in `styles.css`) so the page doesn't jump. `provideAnimations()`
in `main.ts` was already present — no change needed there.

## 3. Global theme — `src/styles.css`

Design tokens live in `:root` (`--brand`, `--text`, `--shadow-*`, `--ease-spring`,
`--radius`). Highlights:

- **Cards**: 12px radius, hairline border, soft shadow; hover lifts 3px with a
  deeper shadow and a gradient top-accent on `.stat-card`. Add `no-lift` to opt out.
- **Stat cards**: icon sits in a tinted rounded tile and playfully scales/rotates
  on hover; values use tabular numerals.
- **Buttons**: raised/flat buttons lift on hover and press down on active;
  icon buttons scale up.
- **Nav**: list items slide 3px right on hover; the active link gets a gradient
  pill background.
- **Tables**: row hover tint; status values render as animated pill chips
  (`.status-pending`, `.status-approved`, `.status-checked_in`, …).
- **Toasts**: every snackbar slides in from the right (`.toast` keyframes);
  `ToastService` adds semantic colors (`.toast-success/error/info/warning`).
- **Dialogs**: soft scale+fade on open; login card and brand icon animate in.
- **Charts**: bars grow with stagger (`barGrow`), donut segments draw via
  `stroke-dashoffset` transitions.
- **Responsive**: grids collapse at 900px/600px; form actions stretch on phones.
- **`prefers-reduced-motion`**: all animation/transition durations collapse for
  users who request reduced motion.

## 4. Toast notifications — `src/app/core/toast.service.ts`

```ts
private toast = inject(ToastService);
this.toast.success('Visitor registered');
this.toast.error('Save failed');        // stays 5s
this.toast.info('Approval sent to the resident');
this.toast.warning('Gate 2 sensor offline');
```

Top-right, auto-dismissing, slide-in animation. Existing raw `MatSnackBar`
calls keep working and pick up the slide-in animation automatically.

## 5. Charts — `src/app/shared/charts/`

Zero-dependency SVG charts used on the admin dashboard:

- `<app-bar-chart [data]="[{label, value}]" title="...">` — weekly entries.
  Bars grow from the baseline with per-bar stagger; hover brightens.
- `<app-donut-chart [data]="[{label, value}]" title="..." centerLabel="...">` —
  visitor-type breakdown with auto legend. Segments draw on load.

Feed them any `{label, value}[]`; empty data shows an empty state.

## 6. Dashboard upgrades

- **Admin**: stat cards stagger in with count-up numbers (`animateStats()` eases
  0 → value over ~800ms), then the two chart cards cascade in; "Manage" tiles
  are now `.link-card`s with hover affordance; added an AI Assistant tile.
- **Guard / Resident**: pages fade-slide in on navigation; security-flag cards
  and briefing panel reuse the global card motion.

## 7. Future-tech hooks (placeholders)

Backend and workflows are untouched. Two stub services mark the integration
points for what's next — both expose `enabled = false` until a provider lands:

- `src/app/core/future/face-recognition.service.ts` — `enrollFace()` /
  `verifyFace()` signatures + provider plan. UI hook: `<!-- FUTURE HOOK -->`
  comment in `guard/verify/verify.component.ts` beside the QR scanner.
- `src/app/core/future/smart-gate.service.ts` — `openBarrier()` /
  `gateStatus()` signatures + controller plan. UI hook: `<!-- FUTURE HOOK -->`
  comment in `guard/entry-exit/entry-exit.component.ts` above the movement form.

When integrating, set `enabled = true`, implement the methods, and render the
hooked panels conditionally on that flag.

## 8. Files changed/added

- Added: `core/animations.ts`, `core/toast.service.ts`,
  `core/future/face-recognition.service.ts`, `core/future/smart-gate.service.ts`,
  `shared/charts/bar-chart.component.ts`, `shared/charts/donut-chart.component.ts`,
  `docs/UI_ANIMATIONS.md`
- Edited: `styles.css`, `app/app.component.ts`,
  `shared/app-shell/app-shell.component.ts`,
  `admin/admin-dashboard/admin-dashboard.component.ts`,
  `guard/guard-dashboard/guard-dashboard.component.ts`,
  `resident/resident-dashboard/resident-dashboard.component.ts`,
  `guard/verify/verify.component.ts` (hook comment),
  `guard/entry-exit/entry-exit.component.ts` (hook comment)
