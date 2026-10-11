import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';
import { AiService, SecurityFlag } from '../../core/ai.service';
import { ToastService } from '../../core/toast.service';

type SevFilter = 'all' | 'high' | 'medium' | 'low';

@Component({
  selector: 'app-security-flags',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page">
      <div class="page-head-row">
        <div>
          <h1 class="page-title">Security Flags</h1>
          <p class="page-subtitle">Rule-based watchlist — refreshed from live gate activity.</p>
        </div>
        <div class="pd-row">
          <button class="btn btn-secondary" (click)="load()" [disabled]="loading">
            <mat-icon>refresh</mat-icon> Refresh
          </button>
          <button class="btn btn-primary" (click)="briefing()" [disabled]="briefingLoading">
            <mat-icon>smart_toy</mat-icon>
            {{ briefingLoading ? 'Writing…' : 'AI briefing' }}
          </button>
        </div>
      </div>

      <div class="ai-sev-row" role="group" aria-label="Severity filter">
        <button
          *ngFor="let f of sevFilters"
          class="range-pill-lg"
          [class.active]="sev === f.key"
          (click)="sev = f.key"
        >
          {{ f.label }}
        </button>
      </div>

      <div class="card mt" *ngIf="briefingText">
        <div class="roofline"><span class="beacon"></span>AI security briefing</div>
        <div class="briefing">{{ briefingText }}</div>
      </div>

      <div class="card mt" *ngIf="loading; else flagList">
        <div class="empty-state"><mat-spinner diameter="36"></mat-spinner></div>
      </div>
      <ng-template #flagList>
        <div class="card mt" *ngIf="filtered.length; else noFlags">
          <div class="flag-item" *ngFor="let f of filtered">
            <span class="sev-dot" [ngClass]="'sev-' + f.severity"></span>
            <div style="flex:1">
              <div class="flag-title">{{ f.title }}</div>
              <div class="flag-detail">{{ f.detail }}</div>
            </div>
            <span class="chip" [ngClass]="'chip-' + f.severity">{{ f.severity | titlecase }}</span>
          </div>
        </div>
        <ng-template #noFlags>
          <div class="card mt">
            <div class="empty-state">
              <mat-icon>shield</mat-icon>
              <div class="empty-title">All clear</div>
              <div>No security flags raised by the current rules.</div>
            </div>
          </div>
        </ng-template>
      </ng-template>
    </div>
  `,
  styles: [
    `
      .ai-sev-row { display: flex; gap: 8px; flex-wrap: wrap; }
      .range-pill-lg {
        border: 1px solid var(--border); background: var(--surface); cursor: pointer;
        font: inherit; font-size: 13px; font-weight: 600; color: var(--text-dim);
        padding: 8px 16px; border-radius: 999px; transition: all var(--dur-fast);
      }
      .range-pill-lg:hover { border-color: var(--primary); color: var(--primary); }
      .range-pill-lg.active { background: var(--primary); border-color: var(--primary); color: #fff; }
    `,
  ],
})
export class SecurityFlagsComponent implements OnInit {
  private ai = inject(AiService);
  private toast = inject(ToastService);

  loading = true;
  briefingLoading = false;
  briefingText = '';
  flags: SecurityFlag[] = [];
  sev: SevFilter = 'all';

  sevFilters: { key: SevFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'high', label: 'High' },
    { key: 'medium', label: 'Medium' },
    { key: 'low', label: 'Low' },
  ];

  ngOnInit(): void {
    this.load();
  }

  get filtered(): SecurityFlag[] {
    return this.sev === 'all' ? this.flags : this.flags.filter((f) => f.severity === this.sev);
  }

  load(): void {
    this.loading = true;
    this.ai
      .suspicious()
      .pipe(catchError(() => of([] as SecurityFlag[])))
      .subscribe((flags) => {
        this.flags = flags ?? [];
        this.loading = false;
      });
  }

  briefing(): void {
    this.briefingLoading = true;
    this.ai
      .securityBriefing()
      .pipe(catchError(() => of({ briefing: '' })))
      .subscribe((r) => {
        this.briefingLoading = false;
        if (r?.briefing) {
          this.briefingText = r.briefing;
        } else {
          this.toast.error('Could not generate the briefing right now.');
        }
      });
  }
}
