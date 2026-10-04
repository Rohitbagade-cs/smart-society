import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, of } from 'rxjs';
import * as XLSX from 'xlsx';
import { ApiService } from '../../core/api.service';
import { DailyReport, MonthlyReport } from '../../core/models';
import { toISODate, visitorTypeLabel } from '../../core/utils';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <h1 class="page-title">Reports</h1>
      <p class="page-subtitle">Daily and monthly visitor &amp; access summaries</p>

      <div class="card-grid" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));">
        <mat-card>
          <mat-card-header><mat-card-title>Daily report</mat-card-title></mat-card-header>
          <mat-card-content>
            <form [formGroup]="dailyForm" class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Date</mat-label>
                <input matInput [matDatepicker]="dayPicker" formControlName="date" />
                <mat-datepicker-toggle matSuffix [for]="dayPicker"></mat-datepicker-toggle>
                <mat-datepicker #dayPicker></mat-datepicker>
              </mat-form-field>
            </form>
            <div class="form-actions" style="justify-content:flex-start;">
              <button mat-raised-button color="primary" (click)="loadDaily()" [disabled]="loadingDaily">
                {{ loadingDaily ? 'Loading…' : 'Load' }}
              </button>
              <button mat-stroked-button (click)="exportDaily()" [disabled]="!daily">
                <mat-icon>download</mat-icon> Excel
              </button>
            </div>
            <div *ngIf="daily" class="mt">
              <div class="card-grid" style="grid-template-columns:1fr 1fr;">
                <div *ngFor="let m of dailyMetrics">
                  <div class="stat-label">{{ m.label }}</div>
                  <div class="stat-value" style="font-size:24px;">{{ m.value }}</div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title>Monthly report</mat-card-title></mat-card-header>
          <mat-card-content>
            <form [formGroup]="monthlyForm" class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Year</mat-label>
                <mat-select formControlName="year">
                  <mat-option *ngFor="let y of years" [value]="y">{{ y }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Month</mat-label>
                <mat-select formControlName="month">
                  <mat-option *ngFor="let m of months; let i = index" [value]="i + 1">{{ m }}</mat-option>
                </mat-select>
              </mat-form-field>
            </form>
            <div class="form-actions" style="justify-content:flex-start;">
              <button mat-raised-button color="primary" (click)="loadMonthly()" [disabled]="loadingMonthly">
                {{ loadingMonthly ? 'Loading…' : 'Load' }}
              </button>
              <button mat-stroked-button (click)="exportMonthly()" [disabled]="!monthly">
                <mat-icon>download</mat-icon> Excel
              </button>
            </div>
            <div *ngIf="monthly" class="mt">
              <div class="card-grid" style="grid-template-columns:1fr 1fr;">
                <div *ngFor="let m of monthlyMetrics">
                  <div class="stat-label">{{ m.label }}</div>
                  <div class="stat-value" style="font-size:24px;">{{ m.value }}</div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card *ngIf="monthly?.daily_breakdown?.length">
        <mat-card-header><mat-card-title>Daily breakdown</mat-card-title></mat-card-header>
        <mat-card-content>
          <div class="table-wrap">
            <table mat-table [dataSource]="monthly!.daily_breakdown!">
              <ng-container *ngFor="let col of breakdownCols" [matColumnDef]="col">
                <th mat-header-cell *matHeaderCellDef>{{ col | titlecase }}</th>
                <td mat-cell *matCellDef="let row">{{ row[col] ?? '—' }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="breakdownCols"></tr>
              <tr mat-row *matRowDef="let row; columns: breakdownCols"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class ReportsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  months = MONTHS;
  years: number[] = [];
  dailyForm = this.fb.group({ date: [new Date()] });
  monthlyForm = this.fb.group({ year: [new Date().getFullYear()], month: [new Date().getMonth() + 1] });

  daily: DailyReport | null = null;
  monthly: MonthlyReport | null = null;
  loadingDaily = false;
  loadingMonthly = false;

  ngOnInit(): void {
    const y = new Date().getFullYear();
    this.years = [y - 2, y - 1, y, y + 1];
    this.loadDaily();
    this.loadMonthly();
  }

  private metricsOf(r: Record<string, unknown>): { label: string; value: unknown }[] {
    const pick: [string, string][] = [
      ['total_requests', 'Total requests'],
      ['approved', 'Approved'],
      ['rejected', 'Rejected'],
      ['pending', 'Pending'],
      ['total_entries', 'Entries'],
      ['total_exits', 'Exits'],
      ['unique_visitors', 'Unique visitors'],
    ];
    return pick
      .filter(([k]) => r[k] !== undefined && r[k] !== null)
      .map(([k, label]) => ({ label, value: r[k] }));
  }

  get dailyMetrics() {
    return this.daily ? this.metricsOf(this.daily as Record<string, unknown>) : [];
  }
  get monthlyMetrics() {
    return this.monthly ? this.metricsOf(this.monthly as Record<string, unknown>) : [];
  }
  get breakdownCols(): string[] {
    const rows = this.monthly?.daily_breakdown;
    if (!rows?.length) return [];
    return Object.keys(rows[0] as Record<string, unknown>);
  }

  loadDaily(): void {
    const d = this.dailyForm.value.date ?? new Date();
    this.loadingDaily = true;
    this.api
      .get<DailyReport>('/reports/daily/', { date: toISODate(d) })
      .pipe(catchError(() => of(null)))
      .subscribe((r) => {
        this.loadingDaily = false;
        this.daily = r;
        if (!r) this.snack.open('Failed to load daily report', 'Close', { duration: 3000 });
      });
  }

  loadMonthly(): void {
    const { year, month } = this.monthlyForm.value;
    this.loadingMonthly = true;
    this.api
      .get<MonthlyReport>('/reports/monthly/', { year, month })
      .pipe(catchError(() => of(null)))
      .subscribe((r) => {
        this.loadingMonthly = false;
        // Backend names it `by_day`; the breakdown table reads `daily_breakdown`.
        this.monthly = r
          ? {
              ...r,
              daily_breakdown: (r.daily_breakdown ?? r['by_day']) as
                | Record<string, unknown>[]
                | undefined,
            }
          : r;
        if (!r) this.snack.open('Failed to load monthly report', 'Close', { duration: 3000 });
      });
  }

  /** Export the loaded daily report as an .xlsx file (Summary + access logs sheets). */
  exportDaily(): void {
    if (!this.daily) return;
    const d = this.daily as unknown as Record<string, unknown>;
    const wb = XLSX.utils.book_new();

    const summary: { Metric: string; Value: unknown }[] = this.dailyMetrics.map((m) => ({
      Metric: m.label,
      Value: m.value,
    }));
    const byType = d['by_type'] as Record<string, number> | undefined;
    if (byType && Object.keys(byType).length) {
      summary.push({ Metric: '— By visitor type —', Value: '' });
      for (const [k, v] of Object.entries(byType)) {
        summary.push({ Metric: visitorTypeLabel(k), Value: v });
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');

    const logs = d['logs'] as Record<string, unknown>[] | undefined;
    if (logs?.length) {
      const rows = logs.map((l) => ({
        Time: l['timestamp'],
        Visitor: l['visitor_name'] ?? `#${l['visit_request']}`,
        Gate: l['gate'],
        Direction: l['direction'],
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Access logs');
    }

    XLSX.writeFile(wb, `daily-report-${d['date'] ?? 'export'}.xlsx`);
    this.snack.open('Daily report exported to Excel', 'Close', { duration: 2000 });
  }

  /** Export the loaded monthly report as an .xlsx file (Summary + daily breakdown sheets). */
  exportMonthly(): void {
    if (!this.monthly) return;
    const m = this.monthly as unknown as Record<string, unknown>;
    const wb = XLSX.utils.book_new();

    const summary: { Metric: string; Value: unknown }[] = this.monthlyMetrics.map((x) => ({
      Metric: x.label,
      Value: x.value,
    }));
    const byType = m['by_type'] as Record<string, number> | undefined;
    if (byType && Object.keys(byType).length) {
      summary.push({ Metric: '— By visitor type —', Value: '' });
      for (const [k, v] of Object.entries(byType)) {
        summary.push({ Metric: visitorTypeLabel(k), Value: v });
      }
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Summary');

    const breakdown = (m['daily_breakdown'] ?? m['by_day']) as
      | Record<string, unknown>[]
      | undefined;
    if (breakdown?.length) {
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(breakdown), 'Daily breakdown');
    }

    XLSX.writeFile(wb, `monthly-report-${m['year']}-${m['month']}.xlsx`);
    this.snack.open('Monthly report exported to Excel', 'Close', { duration: 2000 });
  }
}
