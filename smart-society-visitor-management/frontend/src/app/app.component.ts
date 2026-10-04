import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { routeTransition } from './core/animations';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div class="route-wrap" [@routeTransition]="prepareRoute(outlet)">
      <router-outlet #outlet="outlet"></router-outlet>
    </div>
  `,
  animations: [routeTransition],
})
export class AppComponent {
  /** Animation key for the outgoing/incoming top-level route (login, admin, guard, resident). */
  prepareRoute(outlet: RouterOutlet): string {
    // activatedRoute throws NG04012 before the first route activates — guard it.
    if (!outlet?.isActivated) return 'root';
    const url = outlet.activatedRoute.snapshot.url.map((s) => s.path).join('/');
    return url || 'root';
  }
}
