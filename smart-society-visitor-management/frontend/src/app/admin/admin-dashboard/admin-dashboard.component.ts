import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { toISODate, visitorTypeLabel } from '../../core/utils';
import { popIn, staggerCards } from '../../core/animations';
import { BarChartComponent, BarDatum } from '../../shared/charts/bar-chart.component';
import { DonutChartComponent, DonutDatum } from '../../shared/charts/donut-chart.component';

interface QuickLink {
  label: string;
  desc: string;
  route: string;
  icon: string;
}

interface Stats {
  users: number;
  visitors: number;
  pending: number;
  entries: number;
  exits: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    BarChartComponent,
    DonutChartComponent,
  ],
  animations: [staggerCards, popIn],
  template: `
    <div class="page">
      <h1 class="page-title">Admin Dashboard</h1>
      <p class="page-subtitle">Society overview &amp; quick navigation</p>

      <div class="card-grid" *ngIf="!loading; else spinner" [@staggerCards]>
        <mat-card class="stat-card anim-card" *ngFor="let s of statCards">
          <mat-card-content>
            <div class="stat-ic"><mat-icon>{{ s.icon }}</mat-icon></div>
            <div class="stat-value" [@popIn]>{{ stats[s.key] }}</div>
            <div class="stat-label">{{ s.label }}</div>
          </mat-card-content>
        </mat-card>
      </div>
      <ng-template #spinner><mat-spinner diameter="40"></mat-spinner></ng-template>

      <div class="card-grid" *ngIf="!loadingCharts" [@staggerCards]>
        <mat-card class="chart-card anim-card" style="grid-column: span 2;">
          <mat-card-content>
            <app-bar-chart [data]="weeklyEntries" title="Entries — last 7 days"></app-bar-chart>
          </mat-card-content>
        </mat-card>
        <mat-card class="chart-card anim-card">
          <mat-card-content>
            <app-donut-chart
              [data]="typeBreakdown"
              title="Requests by visitor type — this month"
              centerLabel="requests"
            ></app-donut-chart>
          </mat-card-content>
        </mat-card>
      </div>

      <h2>Manage</h2>
      <div class="card-grid" [@staggerCards]>
        <mat-card *ngFor="let l of links" class="anim-card link-card" [routerLink]="l.route">
          <mat-card-content>
            <mat-icon color="primary">{{ l.icon }}</mat-icon>
            <h3 style="margin:8px 0 4px;">{{ l.label }}</h3>
            <p class="page-subtitle" style="margin:0;">{{ l.desc }}</p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);

  loading = true;
  loadingCharts = true;
  stats: Stats = { users: 0, visitors: 0, pending: 0, entries: 0, exits: 0 };

  statCards: { key: keyof Stats; label: string; icon: string }[] = [
    { key: 'users', label: 'Total Users', icon: 'people' },
    { key: 'visitors', label: 'Total Visitors', icon: 'badge' },
    { key: 'pending', label: 'Pending Approvals', icon: 'pending_actions' },
    { key: 'entries', label: 'Entries Today', icon: 'login' },
    { key: 'exits', label: 'Exits Today', icon: 'logout' },
  ];

  weeklyEntries: BarDatum[] = [];
  typeBreakdown: DonutDatum[] = [];

  links: QuickLink[] = [
    { label: 'Users', desc: 'Create, edit and deactivate users & roles', route: '/admin/users', icon: 'people' },
    { label: 'Visitor Records', desc: 'Search the full visitor registry', route: '/admin/visitors', icon: 'badge' },
    { label: 'Reports', desc: 'Daily and monthly society reports', route: '/admin/reports', icon: 'bar_chart' },
    { label: 'Society Config', desc: 'Name, gates, visiting hours, OTP/QR toggles', route: '/admin/society', icon: 'settings' },
    { label: 'Audit Log', desc: 'Who did what, and when', route: '/admin/audit', icon: 'history' },
    { label: 'AI Assistant', desc: 'Ask questions about live society data', route: '/admin/ai-chat', icon: 'smart_toy' },
  ];

  ngOnInit(): void {
    const today = toISODate(new Date());
    const countOf = (obs: ReturnType<ApiService['list']>) =>
      obs.pipe(
        map((r) => r.count),
        catchError(() => of(0))
      );
    forkJoin({
      users: countOf(this.api.list('/users/', { page_size: 1 })),
      visitors: countOf(this.api.list('/visitors/', { page_size: 1 })),
      pending: countOf(this.api.list('/visit-requests/', { page_size: 1, status: 'pending' })),
      entries: countOf(this.api.list('/access-logs/', { page_size: 1, date: today, direction: 'in' })),
      exits: countOf(this.api.list('/access-logs/', { page_size: 1, date: today, direction: 'out' })),
    }).subscribe((s) => {
      this.animateStats(s);
      this.loading = false;
    });

    this.loadCharts();
  }

  /** Ease the stat numbers up from 0 instead of snapping to the final value. */
  private animateStats(target: Stats): void {
    const keys = Object.keys(target) as (keyof Stats)[];
    const steps = 26;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      const p = Math.min(i / steps, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      for (const k of keys) this.stats[k] = Math.round(target[k] * eased);
      if (p >= 1) clearInterval(timer);
    }, 30);
  }

  private loadCharts(): void {
    const days: { date: Date; label: string }[] = [];
    const fmt = new Intl.DateTimeFormat('en', { weekday: 'short' });
    for (let d = 6; d >= 0; d--) {
      const date = new Date();
      date.setDate(date.getDate() - d);
      days.push({ date, label: fmt.format(date) });
    }
    const entries$ = days.map((d) =>
      this.api
        .list('/access-logs/', { page_size: 1, date: toISODate(d.date), direction: 'in' })
        .pipe(
          map((r) => ({ label: d.label, value: r.count })),
          catchError(() => of({ label: d.label, value: 0 }))
        )
    );
    const now = new Date();
    const byType$ = this.api
      .get<Record<string, unknown>>('/reports/monthly/', {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      })
      .pipe(
        map((r) => {
          const byType = (r?.['by_type'] as Record<string, number>) ?? {};
          return Object.entries(byType).map(([k, v]) => ({
            label: visitorTypeLabel(k),
            value: v,
          }));
        }),
        catchError(() => of([] as DonutDatum[]))
      );

    forkJoin({ entries: forkJoin(entries$), byType: byType$ }).subscribe((r) => {
      this.weeklyEntries = r.entries;
      this.typeBreakdown = r.byType;
      this.loadingCharts = false;
    });
  }
}
