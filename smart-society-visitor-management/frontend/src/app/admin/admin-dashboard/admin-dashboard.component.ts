import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AiService } from '../../core/ai.service';
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
    FormsModule,
    BarChartComponent,
    DonutChartComponent,
  ],
  animations: [staggerCards, popIn],
  template: `
    <div class="page">
      <div class="dash-head admin-heading">
        <div>
          <div class="eyebrow"><span class="live-dot"></span> OPERATIONS OVERVIEW</div>
          <h1 class="page-title">Good day, administrator</h1>
          <p class="page-subtitle">A clear view of access activity across your community.</p>
        </div>
        <a mat-raised-button color="primary" routerLink="/admin/visitors"><mat-icon>badge</mat-icon> View visitor records</a>
      </div>

      <div class="admin-kpi-strip" *ngIf="!loading; else spinner" [@staggerCards]>
        <article class="admin-kpi" *ngFor="let s of statCards; let first = first" [class.kpi-primary]="first">
          <div class="kpi-top"><span class="stat-label">{{ s.label }}</span><mat-icon>{{ s.icon }}</mat-icon></div>
          <div class="stat-value" [@popIn]>{{ stats[s.key] }}</div>
          <span class="kpi-note">{{ s.key === 'pending' ? 'Awaiting a resident response' : s.key === 'entries' ? 'Recorded at the gate today' : s.key === 'exits' ? 'Recorded at the gate today' : 'Across this community' }}</span>
        </article>
      </div>
      <ng-template #spinner><mat-spinner diameter="40"></mat-spinner></ng-template>

      <div class="admin-insights" *ngIf="!loadingCharts" [@staggerCards]>
        <mat-card class="chart-card anim-card traffic-chart">
          <mat-card-content>
            <app-bar-chart [data]="weeklyEntries" title="Entries — last 7 days"></app-bar-chart>
          </mat-card-content>
        </mat-card>
        <mat-card class="chart-card anim-card type-chart">
          <mat-card-content>
            <app-donut-chart
              [data]="typeBreakdown"
              title="Requests by visitor type — this month"
              centerLabel="Request"
            ></app-donut-chart>
          </mat-card-content>
        </mat-card>
      </div>

      <section class="ai-command" aria-labelledby="ai-command-title">
        <div class="ai-command-intro">
          <div class="ai-orbit" aria-hidden="true"><mat-icon>auto_awesome</mat-icon></div>
          <div class="eyebrow">CIVICSPACE INTELLIGENCE</div>
          <h2 id="ai-command-title">Your community, in context.</h2>
          <p>Ask a question about visitor activity. Answers are generated from your society’s live records.</p>
          <a routerLink="/admin/ai-chat" class="ai-full-link">Open AI Assistant <mat-icon>arrow_forward</mat-icon></a>
        </div>
        <div class="ai-command-body">
          <div class="ai-prompts" aria-label="Suggested questions">
            <button type="button" *ngFor="let prompt of aiPrompts" (click)="askAi(prompt)" [disabled]="aiLoading">{{ prompt }}</button>
          </div>
          <form class="ai-ask-form" (ngSubmit)="askAi()">
            <label class="sr-only" for="dashboard-ai-question">Ask about visitor activity</label>
            <input id="dashboard-ai-question" name="question" [(ngModel)]="aiQuestion" placeholder="Ask about visitor activity…" [disabled]="aiLoading" autocomplete="off" />
            <button type="submit" aria-label="Ask AI" [disabled]="!aiQuestion.trim() || aiLoading">
              <mat-spinner *ngIf="aiLoading" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!aiLoading">arrow_upward</mat-icon>
            </button>
          </form>
          <div class="ai-answer" *ngIf="aiAnswer" aria-live="polite">
            <span class="ai-answer-label"><mat-icon>auto_awesome</mat-icon> LIVE DATA RESPONSE</span>
            <p>{{ aiAnswer }}</p>
          </div>
          <p class="ai-error" *ngIf="aiError" role="alert">{{ aiError }}</p>
        </div>
      </section>

      <div class="section-heading"><div><div class="eyebrow">WORKSPACE</div><h2>Manage your community</h2></div><span>Tools for day-to-day operations</span></div>
      <div class="admin-tools" [@staggerCards]>
        <a *ngFor="let l of links" class="admin-tool anim-card" [routerLink]="l.route">
          <span class="tool-icon"><mat-icon>{{ l.icon }}</mat-icon></span>
          <span class="tool-copy"><strong>{{ l.label }}</strong><small>{{ l.desc }}</small></span>
          <mat-icon class="tool-arrow">arrow_forward</mat-icon>
        </a>
      </div>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private ai = inject(AiService);

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
  aiQuestion = '';
  aiAnswer = '';
  aiError = '';
  aiLoading = false;
  aiPrompts = [
    'Summarize today’s gate activity',
    'Any after-hours entries this week?',
    'Which visitor type is most common?',
  ];

  askAi(prompt?: string): void {
    const question = (prompt ?? this.aiQuestion).trim();
    if (!question || this.aiLoading) return;
    this.aiQuestion = question;
    this.aiAnswer = '';
    this.aiError = '';
    this.aiLoading = true;
    this.ai.chat(question).subscribe({
      next: (reply) => {
        this.aiAnswer = reply.answer || 'No answer was returned for that question.';
        this.aiLoading = false;
      },
      error: (error) => {
        this.aiError = error?.status === 429
          ? 'The AI request limit has been reached. Try again later or open the full assistant.'
          : error?.status === 503
            ? 'AI is not configured for this workspace. Contact your system administrator.'
            : 'The AI assistant could not answer right now. Please try again.';
        this.aiLoading = false;
      },
    });
  }

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
