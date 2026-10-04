import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/api.service';
import { AuditLog } from '../../core/models';

@Component({
  selector: 'app-audit-log',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <h1 class="page-title">Audit Log</h1>
      <p class="page-subtitle">Immutable record of administrative and security actions</p>

      <mat-card class="mb">
        <mat-card-content>
          <form [formGroup]="filters" class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Search action / user</mat-label>
              <input matInput formControlName="search" (keyup.enter)="applyFilters()" />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
          </form>
          <div class="form-actions" style="justify-content:flex-start;">
            <button mat-raised-button color="primary" (click)="applyFilters()">Search</button>
            <button mat-button (click)="clearFilters()">Clear</button>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <div class="table-wrap">
          <table mat-table [dataSource]="data">
            <ng-container matColumnDef="timestamp">
              <th mat-header-cell *matHeaderCellDef>Timestamp</th>
              <td mat-cell *matCellDef="let a">{{ a.timestamp | date: 'medium' }}</td>
            </ng-container>
            <ng-container matColumnDef="user">
              <th mat-header-cell *matHeaderCellDef>User</th>
              <td mat-cell *matCellDef="let a">{{ a.actor_username || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef>Action</th>
              <td mat-cell *matCellDef="let a">{{ a.action }}</td>
            </ng-container>
            <ng-container matColumnDef="model">
              <th mat-header-cell *matHeaderCellDef>Model</th>
              <td mat-cell *matCellDef="let a">{{ a.entity || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="object_id">
              <th mat-header-cell *matHeaderCellDef>Object</th>
              <td mat-cell *matCellDef="let a">{{ a.entity_id || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="ip_address">
              <th mat-header-cell *matHeaderCellDef>IP</th>
              <td mat-cell *matCellDef="let a">{{ a.ip_address || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="details">
              <th mat-header-cell *matHeaderCellDef>Details</th>
              <td mat-cell *matCellDef="let a">{{ formatDetails(a.details) }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
          <div class="empty-state" *ngIf="!loading && data.length === 0">No audit entries found.</div>
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
export class AuditLogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  displayedColumns = ['timestamp', 'user', 'action', 'model', 'object_id', 'ip_address', 'details'];
  data: AuditLog[] = [];

  /** Render the JSON details column readably ('—' when empty). */
  formatDetails(d: unknown): string {
    if (!d) return '—';
    if (typeof d === 'string') return d || '—';
    if (typeof d === 'object' && Object.keys(d as object).length === 0) return '—';
    try {
      return JSON.stringify(d);
    } catch {
      return '—';
    }
  }
  total = 0;
  pageSize = 25;
  pageIndex = 0;
  loading = false;

  filters = this.fb.group({ search: [''] });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const search = this.filters.value.search?.trim();
    this.api
      .list<AuditLog>('/audit-logs/', {
        page: this.pageIndex + 1,
        page_size: this.pageSize,
        search: search || undefined,
      })
      .subscribe({
        next: (r) => {
          this.data = r.results;
          this.total = r.count;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snack.open('Failed to load audit log', 'Close', { duration: 3000 });
        },
      });
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.load();
  }

  clearFilters(): void {
    this.filters.reset({ search: '' });
    this.applyFilters();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.load();
  }
}
