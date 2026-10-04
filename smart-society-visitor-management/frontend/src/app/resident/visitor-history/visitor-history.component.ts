import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/api.service';
import { VisitRequest, VisitStatus } from '../../core/models';

@Component({
  selector: 'app-visitor-history',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <h1 class="page-title">Visitor History</h1>
      <p class="page-subtitle">Every visit request raised for your flat</p>

      <mat-card class="mb">
        <mat-card-content>
          <form [formGroup]="filters" class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Search visitor / purpose</mat-label>
              <input matInput formControlName="search" (keyup.enter)="applyFilters()" />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Status</mat-label>
              <mat-select formControlName="status">
                <mat-option value="">All</mat-option>
                <mat-option *ngFor="let s of statuses" [value]="s">{{ s }}</mat-option>
              </mat-select>
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
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let r">{{ r.id }}</td>
            </ng-container>
            <ng-container matColumnDef="visitor">
              <th mat-header-cell *matHeaderCellDef>Visitor</th>
              <td mat-cell *matCellDef="let r">
                {{ r.visitor?.full_name }}<br />
                <small style="color:#888;">{{ r.visitor?.phone }}</small>
              </td>
            </ng-container>
            <ng-container matColumnDef="purpose">
              <th mat-header-cell *matHeaderCellDef>Purpose</th>
              <td mat-cell *matCellDef="let r">{{ r.purpose }}</td>
            </ng-container>
            <ng-container matColumnDef="expected_at">
              <th mat-header-cell *matHeaderCellDef>Expected</th>
              <td mat-cell *matCellDef="let r">{{ r.expected_at | date: 'medium' }}</td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let r">
                <span class="status status-{{ r.status }}">{{ r.status }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="otp_verified">
              <th mat-header-cell *matHeaderCellDef>OTP</th>
              <td mat-cell *matCellDef="let r">
                <mat-icon [color]="r.otp_verified ? 'primary' : ''">
                  {{ r.otp_verified ? 'verified' : 'pending' }}
                </mat-icon>
              </td>
            </ng-container>
            <ng-container matColumnDef="created_at">
              <th mat-header-cell *matHeaderCellDef>Requested</th>
              <td mat-cell *matCellDef="let r">{{ r.created_at | date: 'medium' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
          <div class="empty-state" *ngIf="!loading && data.length === 0">No visitor history yet.</div>
          <div style="padding:16px;" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>
        </div>
        <mat-paginator
          [length]="total"
          [pageSize]="pageSize"
          [pageIndex]="pageIndex"
          [pageSizeOptions]="[5, 10, 25]"
          (page)="onPage($event)"
        ></mat-paginator>
      </mat-card>
    </div>
  `,
})
export class VisitorHistoryComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  statuses: VisitStatus[] = ['pending', 'approved', 'rejected', 'expired', 'cancelled'];
  displayedColumns = ['id', 'visitor', 'purpose', 'expected_at', 'status', 'otp_verified', 'created_at'];
  data: VisitRequest[] = [];
  total = 0;
  pageSize = 10;
  pageIndex = 0;
  loading = false;

  filters = this.fb.group({ search: [''], status: [''] });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    const f = this.filters.value;
    this.api
      .list<VisitRequest>('/visit-requests/', {
        page: this.pageIndex + 1,
        page_size: this.pageSize,
        search: f.search?.trim() || undefined,
        status: f.status || undefined,
      })
      .subscribe({
        next: (r) => {
          this.data = r.results;
          this.total = r.count;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snack.open('Failed to load history', 'Close', { duration: 3000 });
        },
      });
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.load();
  }

  clearFilters(): void {
    this.filters.reset({ search: '', status: '' });
    this.applyFilters();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.load();
  }
}
