import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/api.service';
import { AppNotification } from '../../core/models';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatPaginatorModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <h1 class="page-title">Notifications</h1>
      <p class="page-subtitle">Visitor request updates and society alerts</p>

      <div class="mb">
        <button mat-stroked-button (click)="markAllRead()" [disabled]="items.length === 0">
          <mat-icon>done_all</mat-icon> Mark all as read
        </button>
      </div>

      <mat-card>
        <mat-list *ngIf="!loading">
          <mat-list-item *ngFor="let n of items" [style.background]="n.is_read ? 'transparent' : '#eef2ff'">
            <mat-icon matListItemIcon [color]="n.is_read ? '' : 'primary'">
              {{ n.is_read ? 'notifications_none' : 'notifications_active' }}
            </mat-icon>
            <div matListItemTitle>{{ n.title }}</div>
            <div matListItemLine>{{ n.message }}</div>
            <div matListItemLine style="font-size:12px; color:#888;">
              {{ n.created_at | date: 'medium' }}
            </div>
            <button
              mat-button
              matListItemMeta
              *ngIf="!n.is_read"
              color="primary"
              (click)="markRead(n)"
            >
              Mark read
            </button>
          </mat-list-item>
        </mat-list>
        <div class="empty-state" *ngIf="!loading && items.length === 0">No notifications.</div>
        <div style="padding:16px;" *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>
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
export class NotificationsComponent implements OnInit {
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  items: AppNotification[] = [];
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
      .list<AppNotification>('/notifications/', { page: this.pageIndex + 1, page_size: this.pageSize })
      .subscribe({
        next: (r) => {
          this.items = r.results;
          this.total = r.count;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
          this.snack.open('Failed to load notifications', 'Close', { duration: 3000 });
        },
      });
  }

  markRead(n: AppNotification): void {
    this.api.patch(`/notifications/${n.id}/`, { is_read: true }).subscribe({
      next: () => (n.is_read = true),
      error: () => this.snack.open('Failed to update notification', 'Close', { duration: 3000 }),
    });
  }

  markAllRead(): void {
    const unread = this.items.filter((n) => !n.is_read);
    if (!unread.length) return;
    let done = 0;
    for (const n of unread) {
      this.api.patch(`/notifications/${n.id}/`, { is_read: true }).subscribe({
        next: () => {
          n.is_read = true;
          if (++done === unread.length) this.snack.open('All marked as read', 'Close', { duration: 2000 });
        },
        error: () => {
          if (++done === unread.length) this.snack.open('Some updates failed', 'Close', { duration: 3000 });
        },
      });
    }
  }

  onPage(e: PageEvent): void {
    this.pageIndex = e.pageIndex;
    this.pageSize = e.pageSize;
    this.load();
  }
}
