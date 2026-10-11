import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, catchError, debounceTime, distinctUntilChanged, forkJoin, of, takeUntil } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AiService, SecurityFlag } from '../../core/ai.service';
import { UiStateService, DateRangeKey } from '../../core/ui-state.service';
import { AccessLog, Society, VisitRequest } from '../../core/models';
import { toISODate } from '../../core/utils';
import { GroupedBarChartComponent, GroupedBarDatum } from '../../shared/charts/grouped-bar-chart.component';
import { DonutChartComponent, DonutDatum } from '../../shared/charts/donut-chart.component';

interface Kpi {
  key: string;
  label: string;
  icon: string;
  tone: string;
  value: number;
  delta?: string;
  deltaTone?: 'up' | 'down' | 'flat';
}

interface FrequentVisitor {
  name: string;
  flat: string;
  phone: string;
  count: number;
}

interface AfterHoursEntry {
  name: string;
  gate: string;
  time: string;
}

interface ChatMsg {
  me: boolean;
  text: string;
}

const APPROVEDISH = new Set(['approved', 'checked_in', 'checked_out']);

function statusChip(status: string): string {
  return 'chip-' + status.replace(/_/g, '-');
}

function statusLabel(status: string): string {
  return status
    .split('_')
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

function timeAgo(iso?: string): string {
  if (!iso) return '—';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatProgressSpinnerModule,
    GroupedBarChartComponent,
    DonutChartComponent,
  ],
  template: `
    <div class="page">
      <div class="page-head-row">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Society at a glance · {{ rangeLabel }}</p>
        </div>
        <button class="btn btn-secondary" (click)="refresh()" [disabled]="loading">
          <mat-icon>refresh</mat-icon> Refresh
        </button>
      </div>

      <!-- KPI cards -->
      <div class="dash-kpis" *ngIf="!loading; else kpiSpin">
        <div class="stat-card" *ngFor="let k of kpis">
          <div class="stat-ic" [ngClass]="k.tone"><mat-icon>{{ k.icon }}</mat-icon></div>
          <div class="stat-body">
            <div class="stat-value">{{ k.value }}</div>
            <div class="stat-label">{{ k.label }}</div>
            <div class="stat-delta" [ngClass]="k.deltaTone" *ngIf="k.delta">{{ k.delta }}</div>
          </div>
        </div>
      </div>
      <ng-template #kpiSpin>
        <div class="card"><div class="empty-state"><mat-spinner diameter="36"></mat-spinner></div></div>
      </ng-template>

      <div class="dash-grid mt">
        <!-- 7-day traffic -->
        <div class="widget col-span-8">
          <div class="widget-head">
            <div>
              <div class="widget-title">Visitor traffic</div>
              <div class="widget-sub">Approved vs rejected · {{ chartSubtitle }}</div>
            </div>
          </div>
          <app-grouped-bar-chart [data]="traffic" title=""></app-grouped-bar-chart>
        </div>

        <!-- gate-wise donut -->
        <div class="widget col-span-4">
          <div class="widget-head">
            <div>
              <div class="widget-title">Gate-wise entries</div>
              <div class="widget-sub">{{ rangeLabel }}</div>
            </div>
          </div>
          <app-donut-chart [data]="gateDonut" title="" centerLabel="entries"></app-donut-chart>
        </div>

        <!-- security flags feed -->
        <div class="widget col-span-4">
          <div class="widget-head">
            <div>
              <div class="widget-title">Security flags</div>
              <div class="widget-sub">Live · rule-based</div>
            </div>
            <a class="widget-link" routerLink="/admin/flags">View all</a>
          </div>
          <div *ngIf="flagsLoading" class="empty-state"><mat-spinner diameter="28"></mat-spinner></div>
          <div *ngIf="!flagsLoading && !flags.length" class="empty-state">
            <mat-icon>shield</mat-icon>
            <div class="empty-title">All clear</div>
            <div>No flags raised.</div>
          </div>
          <div class="flag-item" *ngFor="let f of flags.slice(0, 4)">
            <span class="sev-dot" [ngClass]="'sev-' + f.severity"></span>
            <div style="flex:1; min-width:0">
              <div class="flag-title">{{ f.title }}</div>
              <div class="flag-detail">{{ f.detail }}</div>
            </div>
          </div>
        </div>

        <!-- frequent visitors -->
        <div class="widget col-span-4">
          <div class="widget-head">
            <div>
              <div class="widget-title">Frequent visitors</div>
              <div class="widget-sub">5+ visits in the last 7 days</div>
            </div>
          </div>
          <div *ngIf="!frequent.length" class="empty-state">
            <mat-icon>repeat</mat-icon>
            <div class="empty-title">None this week</div>
            <div>No visitor crossed 5 visits.</div>
          </div>
          <div class="list-row" *ngFor="let v of frequent.slice(0, 5)">
            <span class="avatar">{{ v.name.charAt(0).toUpperCase() }}</span>
            <div style="flex:1; min-width:0">
              <div class="timeline-main">{{ v.name }}</div>
              <div class="timeline-sub">Flat {{ v.flat || '—' }} · {{ v.phone }}</div>
            </div>
            <span class="chip chip-approved">{{ v.count }} visits</span>
          </div>
        </div>

        <!-- after-hours -->
        <div class="widget col-span-4">
          <div class="widget-head">
            <div>
              <div class="widget-title">After-hours entries</div>
              <div class="widget-sub">Outside {{ hoursLabel }}</div>
            </div>
            <span class="chip chip-high" *ngIf="afterHours.length">{{ afterHours.length }}</span>
          </div>
          <div *ngIf="!afterHours.length" class="empty-state">
            <mat-icon>nightlight</mat-icon>
            <div class="empty-title">Quiet nights</div>
            <div>No entries outside visiting hours.</div>
          </div>
          <div class="timeline">
            <div class="timeline-item alert" *ngFor="let a of afterHours.slice(0, 4)">
              <div class="timeline-main">{{ a.name }}</div>
              <div class="timeline-sub">{{ a.time }} · {{ a.gate }}</div>
            </div>
          </div>
        </div>

        <!-- activity timeline -->
        <div class="widget col-span-7">
          <div class="widget-head">
            <div>
              <div class="widget-title">Recent activity</div>
              <div class="widget-sub">Latest gate movements</div>
            </div>
            <a class="widget-link" routerLink="/guard/daily-log">Daily log</a>
          </div>
          <div *ngIf="!activity.length" class="empty-state">
            <mat-icon>history</mat-icon>
            <div class="empty-title">No movements yet</div>
          </div>
          <div class="timeline">
            <div class="timeline-item" [ngClass]="a.direction" *ngFor="let a of activity">
              <div class="timeline-main">
                {{ a.visitor_name || 'Visitor' }}
                <span class="chip" [ngClass]="a.direction === 'in' ? 'chip-checked-in' : 'chip-expired'"
                      style="margin-left:8px">{{ a.direction === 'in' ? 'Entry' : 'Exit' }}</span>
              </div>
              <div class="timeline-sub">{{ a.gate }} · {{ timeAgo(a.timestamp) }}</div>
            </div>
          </div>
        </div>

        <!-- AI assistant panel -->
        <div class="widget col-span-5">
          <div class="widget-head">
            <div>
              <div class="widget-title">AI assistant</div>
              <div class="widget-sub">Ask about live society data</div>
            </div>
            <a class="widget-link" routerLink="/admin/ai-chat">Open full chat</a>
          </div>
          <div class="ai-panel">
            <div class="ai-msgs" #msgs>
              <div class="bubble" [ngClass]="m.me ? 'me' : 'bot'" *ngFor="let m of chat">{{ m.text }}</div>
              <div class="bubble bot" *ngIf="chatLoading"><span class="typing"><span></span><span></span><span></span></span></div>
            </div>
            <div class="ai-suggest" *ngIf="chat.length <= 1">
              <button *ngFor="let s of suggestions" (click)="ask(s)">{{ s }}</button>
            </div>
            <div class="ai-input-row">
              <input [(ngModel)]="draft" (keyup.enter)="ask()" placeholder="Ask about today's traffic…" [disabled]="chatLoading" />
              <button class="ai-send" (click)="ask()" [disabled]="chatLoading || !draft.trim()" aria-label="Send">
                <mat-icon>send</mat-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- recent requests table -->
        <div class="widget col-span-12" style="padding:0; overflow:hidden">
          <div class="table-toolbar">
            <div>
              <div class="widget-title">Recent visit requests</div>
              <div class="widget-sub">{{ tableCount }} requests</div>
            </div>
            <span class="toolbar-spacer"></span>
            <label class="search-box">
              <mat-icon>search</mat-icon>
              <input [(ngModel)]="search" (ngModelChange)="search$.next($event)" placeholder="Search name or phone…" aria-label="Search requests" />
            </label>
            <select class="select-box" [(ngModel)]="statusFilter" (ngModelChange)="loadTable()" aria-label="Status filter">
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="checked_in">Checked in</option>
              <option value="checked_out">Checked out</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select class="select-box" [(ngModel)]="pageSize" (ngModelChange)="page = 1; loadTable()" aria-label="Rows per page">
              <option [ngValue]="8">8 / page</option>
              <option [ngValue]="20">20 / page</option>
              <option [ngValue]="50">50 / page</option>
            </select>
          </div>
          <div class="table-scroll">
            <table class="data-table">
              <thead>
                <tr><th>ID</th><th>Visitor</th><th>Flat</th><th>Purpose</th><th>Status</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of rows">
                  <td class="cell-sub">#{{ r.id }}</td>
                  <td>
                    <div class="cell-main">{{ r.visitor?.full_name }}</div>
                    <div class="cell-sub">{{ r.visitor?.phone }}</div>
                  </td>
                  <td>{{ r.resident_flat || '—' }}</td>
                  <td>{{ r.purpose }}</td>
                  <td><span class="chip" [ngClass]="chipOf(r.status)">{{ labelOf(r.status) }}</span></td>
                </tr>
              </tbody>
            </table>
            <div class="empty-state" *ngIf="!tableLoading && !rows.length">
              <mat-icon>inbox</mat-icon>
              <div class="empty-title">No requests found</div>
              <div>Try a different search or filter.</div>
            </div>
            <div class="empty-state" *ngIf="tableLoading"><mat-spinner diameter="32"></mat-spinner></div>
          </div>
          <div class="table-foot">
            <span>Page {{ page }} of {{ totalPages }}</span>
            <div class="pager">
              <button (click)="prevPage()" [disabled]="page <= 1" aria-label="Previous page"><mat-icon>chevron_left</mat-icon></button>
              <button (click)="nextPage()" [disabled]="page >= totalPages" aria-label="Next page"><mat-icon>chevron_right</mat-icon></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private ai = inject(AiService);
  private ui = inject(UiStateService);
  private destroy$ = new Subject<void>();

  loading = true;
  flagsLoading = true;
  tableLoading = false;

  kpis: Kpi[] = [];
  traffic: GroupedBarDatum[] = [];
  chartSubtitle = '';
  gateDonut: DonutDatum[] = [];
  flags: SecurityFlag[] = [];
  frequent: FrequentVisitor[] = [];
  afterHours: AfterHoursEntry[] = [];
  activity: AccessLog[] = [];
  hoursLabel = 'visiting hours';

  // table state
  rows: VisitRequest[] = [];
  tableCount = 0;
  page = 1;
  pageSize = 8;
  search = '';
  statusFilter = '';
  search$ = new Subject<string>();

  // mini AI chat
  chat: ChatMsg[] = [{ me: false, text: 'Hi! Ask me anything about live society data — traffic, pending approvals, frequent visitors.' }];
  draft = '';
  chatLoading = false;
  suggestions = ['How many visitors came today?', 'Who was rejected this week?', 'Which gate is busiest?'];

  range: DateRangeKey = 'last7d';
  rangeLabel = 'Last 7 days';

  ngOnInit(): void {
    this.search$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.page = 1;
        this.loadTable();
      });
    this.ui.dateRange$.pipe(takeUntil(this.destroy$)).subscribe((r) => {
      this.range = r;
      this.rangeLabel = r === 'today' ? 'Today' : r === 'last30d' ? 'Last 30 days' : 'Last 7 days';
      this.refresh();
    });
    this.loadTable();
  }

  refresh(): void {
    this.loadOverview();
    this.loadFlags();
  }

  private loadOverview(): void {
    this.loading = true;
    const todayISO = toISODate(new Date());
    const { from, days } = this.ui.bounds();
    forkJoin({
      window: this.api
        .list<VisitRequest>('/visit-requests/', { page_size: 200 })
        .pipe(catchError(() => of({ count: 0, next: null, previous: null, results: [] as VisitRequest[] }))),
      pending: this.api
        .list('/visit-requests/', { page_size: 1, status: 'pending' })
        .pipe(catchError(() => of({ count: 0, next: null, previous: null, results: [] as never[] }))),
      inside: this.api
        .list('/visit-requests/', { page_size: 1, status: 'checked_in' })
        .pipe(catchError(() => of({ count: 0, next: null, previous: null, results: [] as never[] }))),
      logs: this.api
        .list<AccessLog>('/access-logs/', { page_size: 200 })
        .pipe(catchError(() => of({ count: 0, next: null, previous: null, results: [] as AccessLog[] }))),
      society: this.api.get<Society>('/society/').pipe(catchError(() => of(null as unknown as Society))),
    }).subscribe((r) => {
      const reqs = r.window.results ?? [];
      const logs = r.logs.results ?? [];
      const inRange = (iso?: string) => !!iso && iso.slice(0, 10) >= from;
      const todayReqs = reqs.filter((x) => (x.created_at ?? '').slice(0, 10) === todayISO);
      const yesterdayISO = toISODate(new Date(Date.now() - 86400000));
      const yCount = reqs.filter((x) => (x.created_at ?? '').slice(0, 10) === yesterdayISO).length;
      const rejectedInRange = reqs.filter(
        (x) => x.status === 'rejected' && inRange(x.created_at)
      ).length;
      const rejLabel = this.range === 'today' ? 'today' : this.range === 'last30d' ? 'last 30 days' : 'last 7 days';

      this.kpis = [
        {
          key: 'today', label: 'Visitors today', icon: 'people', tone: 'blue',
          value: todayReqs.length,
          delta: this.delta(todayReqs.length, yCount, 'vs yesterday'),
          deltaTone: todayReqs.length >= yCount ? 'up' : 'down',
        },
        { key: 'pending', label: 'Pending approvals', icon: 'pending_actions', tone: 'amber', value: r.pending.count },
        { key: 'inside', label: 'Currently inside', icon: 'login', tone: 'green', value: r.inside.count },
        {
          key: 'rej', label: `Rejections · ${rejLabel}`, icon: 'cancel', tone: 'red',
          value: rejectedInRange,
        },
      ];

      this.traffic = this.buildTraffic(reqs);
      this.gateDonut = this.buildGateDonut(logs, from);
      this.frequent = this.buildFrequent(reqs);
      this.afterHours = this.buildAfterHours(logs, from, r.society);
      this.activity = logs.slice(0, 8);
      this.loading = false;
    });
  }

  private delta(now: number, before: number, suffix: string): string {
    const d = now - before;
    const sign = d > 0 ? '+' : '';
    return `${sign}${d} ${suffix}`;
  }

  /** Approved vs rejected buckets adapted to the selected range. */
  private buildTraffic(reqs: VisitRequest[]): GroupedBarDatum[] {
    const inBucket = (iso: string | undefined, start: Date, end: Date) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= start.getTime() && t < end.getTime();
    };
    const empty = (label: string): GroupedBarDatum => ({ label, approved: 0, rejected: 0 });
    const buckets: { label: string; start: Date; end: Date; d: GroupedBarDatum }[] = [];

    if (this.range === 'today') {
      this.chartSubtitle = 'today · 4-hour slots';
      const base = new Date();
      base.setHours(0, 0, 0, 0);
      const labels = ['12a', '4a', '8a', '12p', '4p', '8p'];
      for (let i = 0; i < 6; i++) {
        const start = new Date(base.getTime() + i * 4 * 3600000);
        const end = new Date(start.getTime() + 4 * 3600000);
        buckets.push({ label: labels[i], start, end, d: empty(labels[i]) });
      }
    } else if (this.range === 'last30d') {
      this.chartSubtitle = 'last 30 days · 2-day buckets';
      const fmt = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short' });
      const base = new Date();
      base.setHours(0, 0, 0, 0);
      for (let i = 14; i >= 0; i--) {
        const start = new Date(base.getTime() - (i * 2 + 1) * 86400000);
        const end = new Date(start.getTime() + 2 * 86400000);
        const label = fmt.format(start);
        buckets.push({ label, start, end, d: empty(label) });
      }
    } else {
      this.chartSubtitle = 'last 7 days';
      const fmt = new Intl.DateTimeFormat('en', { weekday: 'short' });
      const base = new Date();
      base.setHours(0, 0, 0, 0);
      for (let i = 6; i >= 0; i--) {
        const start = new Date(base.getTime() - i * 86400000);
        const end = new Date(start.getTime() + 86400000);
        const label = fmt.format(start);
        buckets.push({ label, start, end, d: empty(label) });
      }
    }

    for (const req of reqs) {
      const b = buckets.find((x) => inBucket(req.created_at, x.start, x.end));
      if (!b) continue;
      if (APPROVEDISH.has(req.status)) b.d.approved++;
      else if (req.status === 'rejected') b.d.rejected++;
    }
    return buckets.map((b) => b.d);
  }

  private buildGateDonut(logs: AccessLog[], from: string): DonutDatum[] {
    const byGate = new Map<string, number>();
    for (const l of logs) {
      if (l.direction !== 'in') continue;
      if ((l.timestamp ?? '').slice(0, 10) < from) continue;
      const g = l.gate || 'Unknown gate';
      byGate.set(g, (byGate.get(g) ?? 0) + 1);
    }
    return [...byGate.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  }

  private buildFrequent(reqs: VisitRequest[]): FrequentVisitor[] {
    const weekAgo = Date.now() - 7 * 86400000;
    const byKey = new Map<string, { name: string; flat: string; phone: string; count: number }>();
    for (const r of reqs) {
      if (!r.created_at || new Date(r.created_at).getTime() < weekAgo) continue;
      const key = r.visitor?.phone?.trim() || r.visitor?.full_name?.trim().toLowerCase() || `#${r.id}`;
      const cur = byKey.get(key) ?? {
        name: r.visitor?.full_name ?? 'Unknown',
        flat: r.resident_flat ?? '',
        phone: r.visitor?.phone ?? '',
        count: 0,
      };
      cur.count++;
      byKey.set(key, cur);
    }
    return [...byKey.values()]
      .filter((v) => v.count >= 5)
      .sort((a, b) => b.count - a.count);
  }

  private buildAfterHours(logs: AccessLog[], from: string, society: Society | null): AfterHoursEntry[] {
    const start = society?.visiting_hours_start ?? '06:00';
    const end = society?.visiting_hours_end ?? '22:00';
    this.hoursLabel = `${this.fmtTime(start)} – ${this.fmtTime(end)}`;
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + (m || 0);
    };
    const sMin = toMin(start);
    const eMin = toMin(end);
    const out: AfterHoursEntry[] = [];
    for (const l of logs) {
      if (l.direction !== 'in' || !l.timestamp) continue;
      if (l.timestamp.slice(0, 10) < from) continue;
      const d = new Date(l.timestamp);
      const mins = d.getHours() * 60 + d.getMinutes();
      const outside = sMin <= eMin ? mins < sMin || mins > eMin : mins < sMin && mins > eMin;
      if (outside) {
        out.push({
          name: l.visitor_name || 'Visitor',
          gate: l.gate || '—',
          time: d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
        });
      }
    }
    return out.slice(0, 8);
  }

  private fmtTime(t: string): string {
    const [h, m] = t.split(':').map(Number);
    const ap = h >= 12 ? 'PM' : 'AM';
    const hh = h % 12 || 12;
    return `${hh}:${String(m || 0).padStart(2, '0')} ${ap}`;
  }

  private loadFlags(): void {
    this.flagsLoading = true;
    this.ai
      .suspicious()
      .pipe(catchError(() => of([] as SecurityFlag[])))
      .subscribe((flags) => {
        this.flags = flags ?? [];
        this.flagsLoading = false;
      });
  }

  // ---- recent-requests table ----
  loadTable(): void {
    this.tableLoading = true;
    this.api
      .list<VisitRequest>('/visit-requests/', {
        page: this.page,
        page_size: this.pageSize,
        search: this.search || undefined,
        status: this.statusFilter || undefined,
      })
      .pipe(
        catchError(() =>
          of({ count: 0, next: null, previous: null, results: [] as VisitRequest[] })
        )
      )
      .subscribe((r) => {
        this.rows = r.results ?? [];
        this.tableCount = r.count ?? 0;
        this.tableLoading = false;
      });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.tableCount / this.pageSize));
  }

  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadTable();
    }
  }

  nextPage(): void {
    if (this.page < this.totalPages) {
      this.page++;
      this.loadTable();
    }
  }

  chipOf = statusChip;
  labelOf = statusLabel;
  timeAgo = timeAgo;

  // ---- mini AI chat ----
  ask(preset?: string): void {
    const q = (preset ?? this.draft).trim();
    if (!q || this.chatLoading) return;
    this.chat.push({ me: true, text: q });
    this.draft = '';
    this.chatLoading = true;
    this.ai
      .chat(q)
      .pipe(catchError(() => of({ answer: '' })))
      .subscribe((r) => {
        this.chatLoading = false;
        this.chat.push({
          me: false,
          text: r?.answer?.trim() || 'The assistant is unavailable right now (the AI key may not be configured).',
        });
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
