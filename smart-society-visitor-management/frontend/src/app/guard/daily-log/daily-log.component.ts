import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/api.service';
import { AccessLog } from '../../core/models';
import { toISODate } from '../../core/utils';

@Component({
  selector: 'app-daily-log',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <h1 class="page-title">Daily Log</h1>
      <p class="page-subtitle">Entry/exit movements per date and gate</p>

      <mat-card class="mb">
        <mat-card-content>
          <form [formGroup]="filters" class="form-grid" style="align-items:end;">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Date</mat-label>
              <input matInput [matDatepicker]="datePicker" formControlName="date" />
              <mat-datepicker-toggle matSuffix [for]="datePicker"></mat-datepicker-toggle>
              <mat-datepicker #datePicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Gate</mat-label>
              <mat-select formControlName="gate">
                <mat-option value="">All gates</mat-option>
                <mat-option *ngFor="let g of gates" [value]="g">{{ g }}</mat-option>
              </mat-select>
            </mat-form-field>
            <div class="btn-cell">
              <button mat-raised-button color="primary" (click)="applyFilters()">Filter</button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <div class="table-wrap">
          <table mat-table [dataSource]="data">
            <ng-container matColumnDef="timestamp">
              <th mat-header-cell *matHeaderCellDef>Time</th>
              <td mat-cell *matCellDef="let l">{{ l.timestamp | date: 'medium' }}</td>
            </ng-container>
            <ng-container matColumnDef="visitor_name">
              <th mat-header-cell *matHeaderCellDef>Visitor</th>
              <td mat-cell *matCellDef="let l">{{ l.visitor_name || 'Request #' + l.visit_request }}</td>
            </ng-container>
            <ng-container matColumnDef="gate">
              <th mat-header-cell *matHeaderCellDef>Gate</th>
              <td mat-cell *matCellDef="let l">{{ l.gate }}</td>
            </ng-container>
            <ng-container matColumnDef="direction">
              <th mat-header-cell *matHeaderCellDef>Direction</th>
              <td mat-cell *matCellDef="let l">
                <mat-icon [color]="l.direction === 'in' ? 'primary' : 'accent'">
                  {{ l.direction === 'in' ? 'login' : 'logout' }}
                </mat-icon>
                {{ l.direction === 'in' ? 'Entry' : 'Exit' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="visit_request">
              <th mat-header-cell *matHeaderCellDef>Request</th>
              <td mat-cell *matCellDef="let l">#{{ l.visit_request }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
          <div class="empty-state" *ngIf="!loading && data.length === 0">No log entries for this filter.</div>
          <div style="padding:16px;" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>
        </div>
        <mat-paginator
          [length]="total"
          [pageSize]="pageSize"
          [pageIndex]="pageIndex"
          [pageSizeOptions]="[10, 25, 50]"
          (page)="onPage($event)"
        ></mat-paginator>
      </mat-card>
    </div>
  `,
})
export class DailyLogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  displayedColumns = ['timestamp', 'visitor_name', 'gate', 'direction', 'visit_request'];
  data: AccessLog[] = [];
  gates: string[] = [];
  total = 0;
  pageSize = 25;
  pageIndex = 0;
  loading = false;

  filters = this.fb.group({
    date: [new Date()],
    gate: [''],
  });

  ngOnInit(): void {
    this.api.get<{ gates?: string }>('/society/').subscribe({
      next: (res) => {
        const s = this.unwrapSociety(res);
        this.gates = String(s?.gates || 'Main Gate')
          .split(',')
          .map((g) => g.trim())
          .filter(Boolean);
      },
    });
    this.load();
  }

  private unwrapSociety(res: unknown): { gates?: string } | null {
    if (!res) return null;
    if (Array.isArray(res)) return (res as { gates?: string }[])[0] ?? null;
    const r = res as { results?: { gates?: string }[]; gates?: string };
    if (r.results) return r.results[0] ?? null;
    return r;
  }

  load(): void {
    this.loading = true;
    const f = this.filters.value;
    this.api
      .list<AccessLog>('/access-logs/', {
        page: this.pageIndex + 1,
        page_size: this.pageSize,
        date: f.date ? toISODate(f.date) : undefined,
        gate: f.gate || undefined,
      })
      .subscribe({
        next: (r) => {
          this.data = r.results;
          this.total = r.count;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snack.open('Failed to load daily log', 'Close', { duration: 3000 });
        },
      });
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.load();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.load();
  }
}
