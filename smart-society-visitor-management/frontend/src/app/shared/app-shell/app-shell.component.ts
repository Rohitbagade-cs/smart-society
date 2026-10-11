import { Component, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, NavigationEnd } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { Subject, catchError, filter, interval, of, takeUntil } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ApiService } from '../../core/api.service';
import { UiStateService, DateRangeKey } from '../../core/ui-state.service';
import { User } from '../../core/models';
import { routeTransition } from '../../core/animations';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

/** Primary navigation — 6 items per portal, as specified. */
const NAV: Record<string, NavItem[]> = {
  admin: [
    { label: 'Dashboard', route: '/admin', icon: 'dashboard' },
    { label: 'Visitor Records', route: '/admin/visitors', icon: 'badge' },
    { label: 'Reports', route: '/admin/reports', icon: 'bar_chart' },
    { label: 'Security Flags', route: '/admin/flags', icon: 'shield' },
    { label: 'AI Assistant', route: '/admin/ai-chat', icon: 'smart_toy' },
    { label: 'Society Config', route: '/admin/society', icon: 'settings' },
  ],
  guard: [
    { label: 'Dashboard', route: '/guard', icon: 'dashboard' },
    { label: 'Verify Visitor', route: '/guard/verify', icon: 'verified' },
    { label: 'Entry / Exit', route: '/guard/entry-exit', icon: 'sync_alt' },
    { label: 'Daily Log', route: '/guard/daily-log', icon: 'list_alt' },
    { label: 'Notifications', route: '/guard/notifications', icon: 'notifications' },
    { label: 'My Profile', route: '/guard/profile', icon: 'account_circle' },
  ],
  resident: [
    { label: 'Dashboard', route: '/resident', icon: 'dashboard' },
    { label: 'Invite Visitor', route: '/resident/invite', icon: 'person_add' },
    { label: 'Visitor History', route: '/resident/history', icon: 'history' },
    { label: 'Notifications', route: '/resident/notifications', icon: 'notifications' },
    { label: 'My Profile', route: '/resident/profile', icon: 'account_circle' },
  ],
};

/** Secondary admin links live under the divider so the primary six stay clean. */
const ADMIN_EXTRA: NavItem[] = [
  { label: 'Users', route: '/admin/users', icon: 'people' },
  { label: 'Audit Log', route: '/admin/audit', icon: 'history' },
];

const TITLES: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/visitors': 'Visitor Records',
  '/admin/reports': 'Reports',
  '/admin/flags': 'Security Flags',
  '/admin/ai-chat': 'AI Assistant',
  '/admin/society': 'Society Config',
  '/admin/users': 'User Management',
  '/admin/audit': 'Audit Log',
  '/admin/profile': 'My Profile',
  '/guard': 'Security Desk',
  '/guard/verify': 'Verify Visitor',
  '/guard/entry-exit': 'Entry / Exit',
  '/guard/daily-log': 'Daily Log',
  '/guard/notifications': 'Notifications',
  '/guard/profile': 'My Profile',
  '/resident': 'My Home',
  '/resident/invite': 'Invite Visitor',
  '/resident/history': 'Visitor History',
  '/resident/notifications': 'Notifications',
  '/resident/profile': 'My Profile',
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
        <div class="brand-bar">
          <div class="brand-mark"><mat-icon>apartment</mat-icon></div>
          <div>
            <div class="brand-name">Smart Society</div>
            <div class="brand-sub">{{ portalLabel }}</div>
          </div>
        </div>

        <nav class="side-nav">
          <a
            class="side-link"
            *ngFor="let item of nav"
            [routerLink]="item.route"
            routerLinkActive="active"
            [routerLinkActiveOptions]="{ exact: item.route.split('/').length === 2 }"
            (click)="isHandset && drawer.close()"
          >
            <mat-icon>{{ item.icon }}</mat-icon>
            <span>{{ item.label }}</span>
          </a>

          <ng-container *ngIf="extraNav.length">
            <div class="side-divider"><span>Administration</span></div>
            <a
              class="side-link"
              *ngFor="let item of extraNav"
              [routerLink]="item.route"
              routerLinkActive="active"
              (click)="isHandset && drawer.close()"
            >
              <mat-icon>{{ item.icon }}</mat-icon>
              <span>{{ item.label }}</span>
            </a>
          </ng-container>
        </nav>

        <div class="side-foot">
          <div class="side-user" [routerLink]="profileRoute" (click)="isHandset && drawer.close()">
            <span class="avatar">{{ initials }}</span>
            <span class="side-user-meta">
              <span class="side-user-name">{{ displayName }}</span>
              <span class="side-user-role">{{ roleLabel }}</span>
            </span>
          </div>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="shell-content">
        <mat-toolbar class="topbar">
          <button *ngIf="isHandset" mat-icon-button (click)="drawer.toggle()" aria-label="Menu">
            <mat-icon>menu</mat-icon>
          </button>
          <div class="topbar-title">
            <h1>{{ pageTitle }}</h1>
            <span class="topbar-date">{{ todayLabel }}</span>
          </div>
          <span class="toolbar-spacer"></span>

          <!-- date-range filter: drives the admin dashboard -->
          <div class="range-pills" *ngIf="showRangeFilter" role="group" aria-label="Date range">
            <button
              *ngFor="let o of ui.options"
              class="range-pill"
              [class.active]="ui.dateRange === o.key"
              (click)="ui.setDateRange(o.key)"
            >
              {{ o.label }}
            </button>
          </div>

          <button
            mat-icon-button
            [routerLink]="notifRoute"
            aria-label="Notifications"
            [matBadge]="unread"
            [matBadgeHidden]="unread === 0"
            matBadgeColor="warn"
            class="bell-btn"
          >
            <mat-icon [class.bell-ring]="unread > 0">notifications</mat-icon>
          </button>

          <button mat-icon-button [matMenuTriggerFor]="userMenu" class="avatar-btn" aria-label="Account">
            <span class="avatar">{{ initials }}</span>
          </button>
          <mat-menu #userMenu="matMenu">
            <button mat-menu-item disabled>
              <mat-icon>person</mat-icon>
              <span>{{ displayName }} · {{ roleLabel }}</span>
            </button>
            <button mat-menu-item [routerLink]="profileRoute">
              <mat-icon>account_circle</mat-icon>
              <span>My profile</span>
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
      .shell-container { height: 100vh; }
      .mat-drawer { width: 264px; background: #fff !important; border-right: 1px solid var(--border-soft) !important; }
      .mat-drawer-container { background: var(--bg) !important; }
      .shell-sidenav { display: flex; flex-direction: column; }

      .brand-bar { display: flex; align-items: center; gap: 12px; padding: 20px 20px 16px; }
      .brand-mark {
        width: 42px; height: 42px; border-radius: 13px; flex: none;
        display: flex; align-items: center; justify-content: center;
        background: var(--primary); color: #fff;
        box-shadow: var(--shadow-primary);
      }
      .brand-mark mat-icon { font-size: 23px; width: 23px; height: 23px; }
      .brand-name { font-size: 16px; font-weight: 700; letter-spacing: -0.01em; color: var(--text); }
      .brand-sub { font-size: 11px; font-weight: 600; color: var(--text-faint); letter-spacing: 0.07em; text-transform: uppercase; margin-top: 2px; }

      .side-nav { flex: 1; overflow-y: auto; padding: 4px 12px 12px; display: flex; flex-direction: column; gap: 2px; }
      .side-link {
        display: flex; align-items: center; gap: 12px;
        padding: 11px 14px; border-radius: 12px;
        color: var(--text-dim); font-weight: 500; font-size: 14px;
        transition: background var(--dur-fast), color var(--dur-fast);
      }
      .side-link mat-icon { font-size: 21px; width: 21px; height: 21px; color: var(--text-faint); transition: color var(--dur-fast); }
      .side-link:hover { background: var(--surface-2); color: var(--text); }
      .side-link:hover mat-icon { color: var(--primary); }
      .side-link.active { background: var(--primary-soft); color: var(--primary-ink); font-weight: 600; }
      .side-link.active mat-icon { color: var(--primary); }
      .side-divider {
        display: flex; align-items: center; gap: 8px;
        margin: 14px 6px 6px; font-size: 11px; font-weight: 700;
        letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-faint);
      }
      .side-divider::after { content: ''; flex: 1; height: 1px; background: var(--border-soft); }

      .side-foot { padding: 12px; border-top: 1px solid var(--border-soft); }
      .side-user {
        display: flex; align-items: center; gap: 10px; padding: 8px;
        border-radius: 12px; cursor: pointer; transition: background var(--dur-fast);
      }
      .side-user:hover { background: var(--surface-2); }
      .side-user-meta { display: flex; flex-direction: column; min-width: 0; }
      .side-user-name { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .side-user-role { font-size: 12px; color: var(--text-faint); }

      .topbar {
        background: rgba(255, 255, 255, 0.9) !important;
        backdrop-filter: blur(14px);
        border-bottom: 1px solid var(--border-soft);
        color: var(--text) !important;
        padding: 0 20px !important;
        height: 68px !important;
        gap: 8px;
      }
      .topbar-title h1 { font-size: 18px; font-weight: 700; margin: 0; }
      .topbar-date { font-size: 12px; color: var(--text-faint); font-weight: 500; }
      .range-pills {
        display: flex; background: var(--surface-2); border: 1px solid var(--border-soft);
        border-radius: 999px; padding: 3px; gap: 2px; margin-right: 4px;
      }
      .range-pill {
        border: none; background: transparent; cursor: pointer;
        font: inherit; font-size: 13px; font-weight: 600; color: var(--text-dim);
        padding: 7px 14px; border-radius: 999px; transition: all var(--dur-fast);
      }
      .range-pill:hover { color: var(--text); }
      .range-pill.active { background: #fff; color: var(--primary-ink); box-shadow: var(--shadow-xs); }
      .bell-btn { position: relative; }
      .bell-ring { animation: bellNudge 2.4s ease-in-out infinite; transform-origin: top center; }
      @keyframes bellNudge {
        0%, 88%, 100% { transform: rotate(0); }
        90% { transform: rotate(14deg); } 94% { transform: rotate(-12deg); } 98% { transform: rotate(6deg); }
      }
      .avatar-btn { padding: 2px !important; }
      .route-wrap { min-height: calc(100vh - 68px); }

      @media (max-width: 760px) {
        .topbar { padding: 0 12px !important; height: 60px !important; }
        .topbar-date { display: none; }
        .range-pills { display: none; }
        .route-wrap { min-height: calc(100vh - 60px); }
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
  ui = inject(UiStateService);

  @ViewChild('drawer') drawer!: MatSidenav;

  user: User | null = null;
  isHandset = false;
  unread = 0;
  nav: NavItem[] = [];
  extraNav: NavItem[] = [];
  portalLabel = 'Secure Access';
  pageTitle = 'Dashboard';
  todayLabel = '';
  roleLabel = '';
  initials = '•';
  displayName = '';
  notifRoute = '/resident/notifications';
  profileRoute = '/resident/profile';
  showRangeFilter = false;

  private readonly PORTAL_LABELS: Record<string, string> = {
    admin: 'Admin Portal',
    guard: 'Security Desk',
    resident: 'Resident Portal',
  };

  ngOnInit(): void {
    this.todayLabel = new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date());

    this.auth.currentUser$.pipe(takeUntil(this.destroy$)).subscribe((u) => {
      this.user = u;
      this.buildNav();
    });
    this.buildNav();

    this.bp
      .observe([Breakpoints.Handset])
      .pipe(takeUntil(this.destroy$))
      .subscribe((r) => (this.isHandset = r.matches));

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe((e) => this.onRoute(e.urlAfterRedirects));
    this.onRoute(this.router.url);

    this.pollUnread();
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.pollUnread());
  }

  private onRoute(url: string): void {
    const path = url.split('?')[0].replace(/\/$/, '') || '/';
    this.pageTitle = TITLES[path] ?? this.portalLabel;
    this.showRangeFilter = path === '/admin';
  }

  private buildNav(): void {
    const role = this.user?.role;
    this.nav = (role && NAV[role]) || [];
    this.extraNav = role === 'admin' ? ADMIN_EXTRA : [];
    this.portalLabel = (role && this.PORTAL_LABELS[role]) || 'Secure Access';
    this.roleLabel = role ? role[0].toUpperCase() + role.slice(1) : '';
    this.notifRoute = role === 'resident' ? '/resident/notifications' : '/guard/notifications';
    this.profileRoute = role === 'admin' ? '/admin/profile' : role === 'guard' ? '/guard/profile' : '/resident/profile';
    const name = [this.user?.first_name, this.user?.last_name].filter(Boolean).join(' ').trim();
    this.displayName = name || this.user?.username || '';
    this.initials = this.displayName
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
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

  /** Animation key for page transitions inside the shell. */
  prepareRoute(outlet: RouterOutlet): string {
    if (!outlet?.isActivated) return 'home';
    const url = outlet.activatedRoute.snapshot.url.map((s) => s.path).join('/');
    return url || 'home';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
