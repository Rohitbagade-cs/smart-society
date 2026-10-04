import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, catchError, interval, of, takeUntil } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { User } from '../../core/models';
import { routeTransition } from '../../core/animations';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

const NAV: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', route: '/admin', icon: 'dashboard' },
    { label: 'Users', route: '/admin/users', icon: 'people' },
    { label: 'Visitor Records', route: '/admin/visitors', icon: 'badge' },
    { label: 'Reports', route: '/admin/reports', icon: 'bar_chart' },
    { label: 'Society Config', route: '/admin/society', icon: 'settings' },
    { label: 'Audit Log', route: '/admin/audit', icon: 'history' },
    { label: 'AI Assistant', route: '/admin/ai-chat', icon: 'smart_toy' },
  ],
  guard: [
    { label: 'Dashboard', route: '/guard', icon: 'dashboard' },
    { label: 'Verify Visitor', route: '/guard/verify', icon: 'verified' },
    { label: 'Entry / Exit', route: '/guard/entry-exit', icon: 'sync_alt' },
    { label: 'Daily Log', route: '/guard/daily-log', icon: 'list_alt' },
    { label: 'Notifications', route: '/guard/notifications', icon: 'notifications' },
  ],
  resident: [
    { label: 'Dashboard', route: '/resident', icon: 'dashboard' },
    { label: 'Invite Visitor', route: '/resident/invite', icon: 'person_add' },
    { label: 'Visitor History', route: '/resident/history', icon: 'history' },
    { label: 'Notifications', route: '/resident/notifications', icon: 'notifications' },
  ],
};

const TITLES: Record<string, string> = {
  admin: 'Admin Portal',
  guard: 'Security Desk',
  resident: 'Resident Portal',
};

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatBadgeModule,
    MatMenuModule,
  ],
  template: `
    <mat-sidenav-container class="shell-container">
      <mat-sidenav
        #drawer
        class="shell-sidenav"
        [mode]="isHandset ? 'over' : 'side'"
        [opened]="!isHandset"
      >
        <mat-toolbar class="brand-bar">
          <div class="brand-lockup">
            <div class="brand-mark"><mat-icon>apartment</mat-icon></div>
            <div>
              <div class="brand-name">Smart Society</div>
              <div class="brand-sub">Secure Access</div>
            </div>
          </div>
        </mat-toolbar>
        <mat-nav-list>
          <a
            mat-list-item
            *ngFor="let item of nav"
            [routerLink]="item.route"
            routerLinkActive="active-link"
            [routerLinkActiveOptions]="{ exact: item.route.split('/').length === 2 }"
            (click)="isHandset && drawer.close()"
          >
            <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
            <span matListItemTitle>{{ item.label }}</span>
          </a>
        </mat-nav-list>
      </mat-sidenav>

      <mat-sidenav-content class="shell-content">
        <mat-toolbar class="topbar">
          <button *ngIf="isHandset" mat-icon-button (click)="drawer.toggle()" aria-label="Menu">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="page-title-top">{{ title }}</span>
          <span class="toolbar-spacer"></span>

          <button
            mat-icon-button
            [routerLink]="notifRoute"
            aria-label="Notifications"
            [matBadge]="unread"
            [matBadgeHidden]="unread === 0"
            matBadgeColor="warn"
          >
            <mat-icon [class.bell-ring]="unread > 0">notifications</mat-icon>
          </button>

          <button mat-button [matMenuTriggerFor]="userMenu" class="user-chip">
            <mat-icon>account_circle</mat-icon>
            <span *ngIf="!isHandset">{{ user?.username }}</span>
            <mat-icon *ngIf="!isHandset">arrow_drop_down</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item disabled>
              <mat-icon>person</mat-icon>
              <span>{{ user?.username }} ({{ roleLabel }})</span>
            </button>
            <button mat-menu-item (click)="logout()">
              <mat-icon>logout</mat-icon>
              <span>Sign out</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <div class="route-wrap" [@routeTransition]="prepareRoute(outlet)">
          <router-outlet #outlet="outlet"></router-outlet>
        </div>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  animations: [routeTransition],
  styles: [
    `
      .shell-container {
        height: 100vh;
        background: transparent;
      }
      .mat-drawer {
        background: rgba(255, 255, 255, 0.88) !important;
        border-right: 1px solid var(--border) !important;
        backdrop-filter: blur(16px);
        width: 264px;
        box-shadow: 4px 0 24px rgba(35, 42, 90, 0.06);
      }
      .mat-drawer-container {
        background: transparent !important;
      }
      .brand-bar {
        background: transparent !important;
        border-bottom: 1px solid var(--border-soft);
        padding: 14px 16px !important;
        height: auto !important;
      }
      .brand-lockup {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .brand-mark {
        width: 40px;
        height: 40px;
        border-radius: 13px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--violet), var(--pink));
        box-shadow: 0 6px 16px rgba(124, 77, 255, 0.4);
        flex: none;
      }
      .brand-mark mat-icon {
        color: #fff;
        font-size: 22px;
        width: 22px;
        height: 22px;
      }
      .brand-name {
        font-size: 16px;
        font-weight: 800;
        letter-spacing: -0.01em;
        line-height: 1.2;
        color: var(--text);
      }
      .brand-sub {
        font-size: 11px;
        color: var(--text-faint);
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      mat-nav-list {
        padding: 12px 0 !important;
      }
      mat-nav-list a.mat-mdc-list-item {
        margin: 3px 12px;
        border-radius: 12px;
        color: var(--text-dim);
        height: 46px !important;
        font-weight: 500 !important;
        transition:
          background 0.2s,
          color 0.2s,
          transform 0.2s var(--ease-out);
      }
      mat-nav-list a.mat-mdc-list-item:hover {
        background: rgba(47, 107, 255, 0.06);
        color: var(--text);
        transform: translateX(3px);
      }
      mat-nav-list a.mat-mdc-list-item.active-link {
        background: var(--primary-soft);
        color: var(--primary-ink);
        font-weight: 700 !important;
        box-shadow: inset 3px 0 0 var(--primary);
      }
      mat-nav-list a.mat-mdc-list-item.active-link .mat-icon {
        color: var(--primary);
      }
      mat-nav-list .mat-icon {
        color: var(--text-faint);
        transition: color 0.22s;
      }
      mat-nav-list a.mat-mdc-list-item:hover .mat-icon {
        color: var(--primary);
      }
      .topbar {
        background: rgba(255, 255, 255, 0.82) !important;
        backdrop-filter: blur(16px);
        border-bottom: 1px solid var(--border-soft);
        color: var(--text) !important;
        box-shadow: 0 2px 16px rgba(35, 42, 90, 0.05);
      }
      .topbar .page-title-top {
        font-size: 18px;
        font-weight: 800;
        letter-spacing: -0.01em;
      }
      .user-chip {
        border: 1px solid var(--border);
        border-radius: 24px !important;
        padding: 4px 12px 4px 8px !important;
        background: #f4f6fc;
        color: var(--text);
        transition: background 0.2s, border-color 0.2s !important;
      }
      .user-chip:hover {
        background: var(--primary-soft) !important;
        border-color: rgba(47, 107, 255, 0.35);
      }
    `,
  ],
})
export class AppShellComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private api = inject(ApiService);
  private bp = inject(BreakpointObserver);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  @ViewChild('drawer') drawer!: MatSidenav;

  user: User | null = null;
  isHandset = false;
  unread = 0;
  nav: NavItem[] = [];
  title = 'Smart Society';
  roleLabel = '';
  notifRoute = '/resident/notifications';

  ngOnInit(): void {
    this.auth.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((u) => {
      this.user = u;
      this.buildNav();
    });
    this.buildNav();

    this.bp
      .observe([Breakpoints.Handset])
      .pipe(takeUntil(this.destroy$))
      .subscribe((r) => (this.isHandset = r.matches));

    this.pollUnread();
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.pollUnread());
  }

  private buildNav(): void {
    const role = this.user?.role;
    this.nav = (role && NAV[role]) || [];
    this.title = (role && TITLES[role]) || 'Smart Society';
    this.roleLabel = role ? role[0].toUpperCase() + role.slice(1) : '';
    this.notifRoute =
      role === 'resident' ? '/resident/notifications' : '/guard/notifications';
  }

  private pollUnread(): void {
    this.api
      .get<{ unread_count?: number; count?: number }>('/notifications/unread-count/')
      .pipe(catchError(() => of<{ unread_count?: number; count?: number }>({ unread_count: 0 })))
      .subscribe((res) => {
        this.unread = res?.unread_count ?? res?.count ?? 0;
      });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  /** Animation key for page transitions inside the shell (dashboard <-> pages). */
  prepareRoute(outlet: RouterOutlet): string {
    // activatedRoute throws NG04012 before the first route activates — guard it.
    if (!outlet?.isActivated) return 'home';
    const url = outlet.activatedRoute.snapshot.url.map((s) => s.path).join('/');
    return url || 'home';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
