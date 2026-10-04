import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/api.service';
import { Visitor } from '../../core/models';
import { VISITOR_TYPES, toISODate, visitorTypeLabel } from '../../core/utils';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-visitor-records',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCardModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <h1 class="page-title">Visitor Records</h1>
      <p class="page-subtitle">Searchable registry of every visitor</p>

      <mat-card class="mb">
        <mat-card-content>
          <form [formGroup]="filters" class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Search name / phone</mat-label>
              <input matInput formControlName="search" (keyup.enter)="applyFilters()" />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Visitor type</mat-label>
              <mat-select formControlName="type">
                <mat-option value="">All types</mat-option>
                <mat-option *ngFor="let t of visitorTypes" [value]="t.value">{{ t.label }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>From date</mat-label>
              <input matInput [matDatepicker]="fromPicker" formControlName="date_from" />
              <mat-datepicker-toggle matSuffix [for]="fromPicker"></mat-datepicker-toggle>
              <mat-datepicker #fromPicker></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>To date</mat-label>
              <input matInput [matDatepicker]="toPicker" formControlName="date_to" />
              <mat-datepicker-toggle matSuffix [for]="toPicker"></mat-datepicker-toggle>
              <mat-datepicker #toPicker></mat-datepicker>
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
              <td mat-cell *matCellDef="let v">{{ v.id }}</td>
            </ng-container>
            <ng-container matColumnDef="full_name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let v">{{ v.full_name }}</td>
            </ng-container>
            <ng-container matColumnDef="phone">
              <th mat-header-cell *matHeaderCellDef>Phone</th>
              <td mat-cell *matCellDef="let v">{{ v.phone }}</td>
            </ng-container>
            <ng-container matColumnDef="visitor_type">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let v">{{ visitorTypeLabel(v.visitor_type) }}</td>
            </ng-container>
            <ng-container matColumnDef="id_proof">
              <th mat-header-cell *matHeaderCellDef>ID Proof</th>
              <td mat-cell *matCellDef="let v">
                {{ v.id_proof_type ? v.id_proof_type + ' ' + (v.id_proof_number || '') : '—' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="vehicle_number">
              <th mat-header-cell *matHeaderCellDef>Vehicle</th>
              <td mat-cell *matCellDef="let v">{{ v.vehicle_number || '—' }}</td>
            </ng-container>
            <ng-container matColumnDef="created_at">
              <th mat-header-cell *matHeaderCellDef>Registered</th>
              <td mat-cell *matCellDef="let v">{{ v.created_at | date: 'medium' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let v">
                <button mat-icon-button color="warn" (click)="remove(v)" title="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
          <div class="empty-state" *ngIf="!loading && data.length === 0">No visitors found.</div>
          <div style="padding:16px;" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>
        </div>
        <mat-paginator
          [length]="total"
          [pageSize]="pageSize"
          [pageIndex]="pageIndex"
          [pageSizeOptions]="[5, 10, 25, 50]"
          (page)="onPage($event)"
        ></mat-paginator>
      </mat-card>
    </div>
  `,
})
export class VisitorRecordsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  visitorTypes = VISITOR_TYPES;
  visitorTypeLabel = visitorTypeLabel;
  displayedColumns = ['id', 'full_name', 'phone', 'visitor_type', 'id_proof', 'vehicle_number', 'created_at', 'actions'];
  data: Visitor[] = [];
  total = 0;
  pageSize = 10;
  pageIndex = 0;
  loading = false;

  filters = this.fb.group({
    search: [''],
    type: [''],
    date_from: [null as Date | null],
    date_to: [null as Date | null],
  });

  ngOnInit(): void {
    this.load();
  }

  private query(): Record<string, unknown> {
    const f = this.filters.value;
    return {
      page: this.pageIndex + 1,
      page_size: this.pageSize,
      search: f.search?.trim() || undefined,
      type: f.type || undefined,
      date_from: f.date_from ? toISODate(f.date_from) : undefined,
      date_to: f.date_to ? toISODate(f.date_to) : undefined,
    };
  }

  load(): void {
    this.loading = true;
    this.api.list<Visitor>('/visitors/', this.query()).subscribe({
      next: (r) => {
        this.data = r.results;
        this.total = r.count;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Failed to load visitors', 'Close', { duration: 3000 });
      },
    });
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.load();
  }

  clearFilters(): void {
    this.filters.reset({ search: '', type: '', date_from: null, date_to: null });
    this.applyFilters();
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.load();
  }

  remove(v: Visitor): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: { title: 'Delete visitor', message: `Delete visitor record "${v.full_name}"?` },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.api.delete(`/visitors/${v.id}/`).subscribe({
        next: () => {
          this.snack.open('Visitor deleted', 'Close', { duration: 2500 });
          this.load();
        },
        error: () => this.snack.open('Delete failed', 'Close', { duration: 3000 }),
      });
    });
  }
}
