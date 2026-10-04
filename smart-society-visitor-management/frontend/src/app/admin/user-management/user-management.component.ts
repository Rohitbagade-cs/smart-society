import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/api.service';
import { Role, User } from '../../core/models';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCardModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <h1 class="page-title">User Management</h1>
      <div class="mb">
        <button mat-raised-button color="primary" (click)="openDialog()">
          <mat-icon>add</mat-icon> Add User
        </button>
      </div>

      <mat-card>
        <div class="table-wrap">
          <table mat-table [dataSource]="data">
            <ng-container matColumnDef="id">
              <th mat-header-cell *matHeaderCellDef>ID</th>
              <td mat-cell *matCellDef="let u">{{ u.id }}</td>
            </ng-container>
            <ng-container matColumnDef="username">
              <th mat-header-cell *matHeaderCellDef>Username</th>
              <td mat-cell *matCellDef="let u">{{ u.username }}</td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let u">{{ u.email }}</td>
            </ng-container>
            <ng-container matColumnDef="role">
              <th mat-header-cell *matHeaderCellDef>Role</th>
              <td mat-cell *matCellDef="let u" style="text-transform:capitalize;">{{ u.role }}</td>
            </ng-container>
            <ng-container matColumnDef="is_active">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let u">
                <mat-icon [color]="u.is_active ? 'primary' : 'warn'" [title]="u.is_active ? 'Active' : 'Inactive'">
                  {{ u.is_active ? 'check_circle' : 'cancel' }}
                </mat-icon>
              </td>
            </ng-container>
            <ng-container matColumnDef="date_joined">
              <th mat-header-cell *matHeaderCellDef>Joined</th>
              <td mat-cell *matCellDef="let u">{{ u.date_joined | date: 'mediumDate' }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let u">
                <button mat-icon-button color="primary" (click)="openDialog(u)" title="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
                <button mat-icon-button (click)="toggleActive(u)" [title]="u.is_active ? 'Deactivate' : 'Activate'">
                  <mat-icon>{{ u.is_active ? 'block' : 'check_circle_outline' }}</mat-icon>
                </button>
                <button mat-icon-button color="warn" (click)="remove(u)" title="Delete">
                  <mat-icon>delete</mat-icon>
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
          </table>
          <div class="empty-state" *ngIf="!loading && data.length === 0">No users found.</div>
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
export class UserManagementComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  displayedColumns = ['id', 'username', 'email', 'role', 'is_active', 'date_joined', 'actions'];
  data: User[] = [];
  total = 0;
  pageSize = 10;
  pageIndex = 0;
  loading = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.api
      .list<User>('/users/', { page: this.pageIndex + 1, page_size: this.pageSize })
      .subscribe({
        next: (r) => {
          this.data = r.results;
          this.total = r.count;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snack.open('Failed to load users', 'Close', { duration: 3000 });
        },
      });
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.load();
  }

  openDialog(user?: User): void {
    const ref = this.dialog.open(UserDialogComponent, {
      width: '520px',
      data: { user: user ?? null },
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) this.load();
    });
  }

  toggleActive(u: User): void {
    this.api.patch(`/users/${u.id}/`, { is_active: !u.is_active }).subscribe({
      next: () => {
        u.is_active = !u.is_active;
        this.snack.open(`User ${u.is_active ? 'activated' : 'deactivated'}`, 'Close', { duration: 2500 });
      },
      error: () => this.snack.open('Update failed', 'Close', { duration: 3000 }),
    });
  }

  remove(u: User): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete user',
        message: `Delete user "${u.username}"? This cannot be undone.`,
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.api.delete(`/users/${u.id}/`).subscribe({
        next: () => {
          this.snack.open('User deleted', 'Close', { duration: 2500 });
          this.load();
        },
        error: () => this.snack.open('Delete failed', 'Close', { duration: 3000 }),
      });
    });
  }
}

export interface UserDialogData {
  user: User | null;
}

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.user ? 'Edit User' : 'Add User' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid" style="padding-top:8px;">
        <mat-form-field appearance="outline">
          <mat-label>Username</mat-label>
          <input matInput formControlName="username" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>First name</mat-label>
          <input matInput formControlName="first_name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Last name</mat-label>
          <input matInput formControlName="last_name" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Role</mat-label>
          <mat-select formControlName="role">
            <mat-option *ngFor="let r of roles" [value]="r">{{ r }}</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>{{ data.user ? 'New password (leave blank to keep)' : 'Password' }}</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" />
          <mat-hint>Stored with secure password hashing on the server</mat-hint>
        </mat-form-field>
        <mat-checkbox formControlName="is_active">Active account</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
        {{ saving ? 'Saving…' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class UserDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);
  private ref = inject(MatDialogRef<UserDialogComponent>);
  data = inject<UserDialogData>(MAT_DIALOG_DATA);

  roles: Role[] = ['admin', 'guard', 'resident'];
  saving = false;

  form = this.fb.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    first_name: [''],
    last_name: [''],
    role: ['resident' as Role, Validators.required],
    password: [''],
    is_active: [true],
  });

  ngOnInit(): void {
    const u = this.data.user;
    if (u) {
      this.form.patchValue({
        username: u.username,
        email: u.email,
        first_name: u.first_name ?? '',
        last_name: u.last_name ?? '',
        role: u.role,
        is_active: u.is_active,
      });
    }
  }

  save(): void {
    if (this.form.invalid || this.saving) return;
    const v = this.form.value;
    const u = this.data.user;
    if (!u && !v.password) {
      this.snack.open('Password is required for new users', 'Close', { duration: 3000 });
      return;
    }
    const body: Record<string, unknown> = {
      username: v.username,
      email: v.email,
      first_name: v.first_name,
      last_name: v.last_name,
      role: v.role,
      is_active: v.is_active,
    };
    if (v.password) body['password'] = v.password; // write-only on the API
    this.saving = true;
    const req = u ? this.api.patch(`/users/${u.id}/`, body) : this.api.post('/users/', body);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.snack.open('User saved', 'Close', { duration: 2500 });
        this.ref.close(true);
      },
      error: (e) => {
        this.saving = false;
        const detail =
          e?.error?.detail ||
          Object.values(e?.error ?? {})[0] ||
          'Save failed';
        this.snack.open(String(detail), 'Close', { duration: 4000 });
      },
    });
  }
}
