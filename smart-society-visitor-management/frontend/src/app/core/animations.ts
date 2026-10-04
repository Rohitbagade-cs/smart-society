import {
  animate,
  group,
  query,
  stagger,
  style,
  transition,
  trigger,
} from '@angular/animations';

/**
 * Shared animation triggers for the Smart Society UI.
 *
 * Usage: import the trigger you need and add it to the component's
 * `animations: [...]` array, then bind it in the template, e.g.
 * `<div class="page" [@fadeSlideIn]>` or
 * `<div class="card-grid" [@staggerCards]>` (children need class "anim-card").
 *
 * Easing everywhere is the same soft spring (cubic-bezier(0.22, 1, 0.36, 1))
 * so motion feels consistent across pages.
 */

/** Gentle rise-and-fade for page sections and cards entering the view. */
export const fadeSlideIn = trigger('fadeSlideIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(18px)' }),
    animate(
      '450ms cubic-bezier(0.22, 1, 0.36, 1)',
      style({ opacity: 1, transform: 'translateY(0)' })
    ),
  ]),
]);

/** Staggered cascade for grids — apply to the container, tag children "anim-card". */
export const staggerCards = trigger('staggerCards', [
  transition(':enter', [
    query(
      '.anim-card',
      [
        style({ opacity: 0, transform: 'translateY(22px) scale(0.97)' }),
        stagger(
          70,
          animate(
            '520ms cubic-bezier(0.22, 1, 0.36, 1)',
            style({ opacity: 1, transform: 'translateY(0) scale(1)' })
          )
        ),
      ],
      { optional: true }
    ),
  ]),
]);

/** Pop-in for stat numbers, badges and small widgets. */
export const popIn = trigger('popIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'scale(0.85)' }),
    animate(
      '380ms cubic-bezier(0.22, 1, 0.36, 1)',
      style({ opacity: 1, transform: 'scale(1)' })
    ),
  ]),
]);

/**
 * Route transitions. Wrap a <router-outlet> like:
 *
 *   <div class="route-wrap" [@routeTransition]="prepareRoute(outlet)">
 *     <router-outlet #outlet="outlet"></router-outlet>
 *   </div>
 *
 * and expose `prepareRoute(outlet: RouterOutlet)` returning a string key
 * (e.g. the activated route path). The outgoing view fades out while the
 * incoming view slides up — absolutely positioned so they cross-fade
 * without pushing layout around (see .route-wrap in styles.css).
 */
export const routeTransition = trigger('routeTransition', [
  transition('* <=> *', [
    query(
      ':enter, :leave',
      [
        style({
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
        }),
      ],
      { optional: true }
    ),
    query(
      ':leave',
      [animate('180ms ease-out', style({ opacity: 0, transform: 'translateY(-8px)' }))],
      { optional: true }
    ),
    query(
      ':enter',
      [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate(
          '380ms 100ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ],
      { optional: true }
    ),
  ]),
]);

/** Slide-in for toast-style panels and banners (used with *ngIf toggles). */
export const slideAlert = trigger('slideAlert', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(24px)' }),
    animate(
      '320ms cubic-bezier(0.22, 1, 0.36, 1)',
      style({ opacity: 1, transform: 'translateX(0)' })
    ),
  ]),
  transition(':leave', [
    animate('220ms ease-in', style({ opacity: 0, transform: 'translateX(24px)' })),
  ]),
]);

/** Exported as a group for components that want the common set. */
export const uiAnimations = [fadeSlideIn, staggerCards, popIn, slideAlert];
