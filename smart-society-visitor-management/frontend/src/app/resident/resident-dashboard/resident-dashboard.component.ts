import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../core/api.service';
import { VisitRequest } from '../../core/models';
import { visitorTypeLabel } from '../../core/utils';
import { fadeSlideIn } from '../../core/animations';

@Component({
  selector: 'app-resident-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <div class="page" [@fadeSlideIn]>
      <div class="dash-head">
        <div>
          <h1 class="page-title">My Visitors</h1>
          <p class="page-subtitle">Approve or reject visitor access requests</p>
        </div>
        <button mat-raised-button color="primary" routerLink="/resident/invite">
          <mat-icon>person_add</mat-icon> Invite visitor
        </button>
      </div>

      <div *ngIf="loading"><mat-spinner diameter="40"></mat-spinner></div>

      <div class="stats-row" *ngIf="!loading">
        <div class="stat-tile">
          <div class="stat-ic"><mat-icon>pending_actions</mat-icon></div>
          <div>
            <div class="stat-value">{{ pending.length }}</div>
            <div class="stat-label">Pending requests</div>
          </div>
        </div>
        <div class="stat-tile stat-teal">
          <div class="stat-ic"><mat-icon>event_upcoming</mat-icon></div>
          <div>
            <div class="stat-value">{{ upcoming.length }}</div>
            <div class="stat-label">Upcoming visits</div>
          </div>
        </div>
        <div class="stat-tile stat-purple">
          <div class="stat-ic"><mat-icon>calendar_month</mat-icon></div>
          <div>
            <div class="stat-value">{{ monthCount }}</div>
            <div class="stat-label">Visits this month</div>
          </div>
        </div>
      </div>

      <div class="res-sections" *ngIf="!loading">
        <section>
          <h2>Pending requests ({{ pending.length }})</h2>
          <div class="card-grid" *ngIf="pending.length">
            <mat-card *ngFor="let r of pending">
              <mat-card-header>
                <mat-card-title>{{ r.visitor?.full_name }}</mat-card-title>
                <mat-card-subtitle>{{ visitorTypeLabel(r.visitor?.visitor_type) }} · {{ r.visitor?.phone }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p><strong>Purpose:</strong> {{ r.purpose }}</p>
                <p><strong>Expected:</strong> {{ r.expected_at | date: 'medium' }}</p>
                <p *ngIf="r.visitor?.vehicle_number"><strong>Vehicle:</strong> {{ r.visitor?.vehicle_number }}</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button color="primary" (click)="respond(r, 'approve')">
                  <mat-icon>check</mat-icon> Approve
                </button>
                <button mat-stroked-button color="warn" (click)="respond(r, 'reject')">
                  <mat-icon>close</mat-icon> Reject
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
          <div class="empty-state" *ngIf="pending.length === 0">
            No pending requests. New visitor requests from the security desk will appear here.
          </div>
        </section>

        <section>
          <h2>Upcoming approved visits ({{ upcoming.length }})</h2>
          <div class="card-grid" *ngIf="upcoming.length">
            <mat-card *ngFor="let r of upcoming">
              <mat-card-header>
                <mat-card-title>{{ r.visitor?.full_name }}</mat-card-title>
                <mat-card-subtitle>
                  <span class="status status-approved">{{ r.status }}</span>
                  {{ r.otp_verified ? '· OTP verified' : '' }}
                </mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p><strong>Purpose:</strong> {{ r.purpose }}</p>
                <p><strong>Expected:</strong> {{ r.expected_at | date: 'medium' }}</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-stroked-button (click)="sharePass(r)" [disabled]="!r.qr_token">
                  <mat-icon>share</mat-icon> Share pass
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
          <div class="empty-state" *ngIf="upcoming.length === 0">No upcoming visits.</div>
        </section>
      </div>

      <div class="mt">
        <button mat-button color="primary" routerLink="/resident/history">
          View full visitor history <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>
    </div>
  `,
  animations: [fadeSlideIn],
})
export class ResidentDashboardComponent implements OnInit {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  pending: VisitRequest[] = [];
  upcoming: VisitRequest[] = [];
  monthCount = 0;
  loading = true;
  visitorTypeLabel = visitorTypeLabel;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    // Backend scopes /visit-requests/ to the logged-in resident.
    this.api.list<VisitRequest>('/visit-requests/', { page_size: 50 }).subscribe({
      next: (r) => {
        const now = Date.now();
        this.pending = r.results.filter((x) => x.status === 'pending');
        this.upcoming = r.results.filter(
          (x) => x.status === 'approved' && new Date(x.expected_at).getTime() >= now - 24 * 3600 * 1000
        );
        const d = new Date();
        this.monthCount = r.results.filter((x) => {
          const t = new Date(x.created_at || x.expected_at);
          return t.getMonth() === d.getMonth() && t.getFullYear() === d.getFullYear();
        }).length;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Failed to load requests', 'Close', { duration: 3000 });
      },
    });
  }

  /** Copies the public visitor-pass link so the resident can send it to their visitor. */
  sharePass(r: VisitRequest): void {
    if (!r.qr_token) return;
    const url = `${window.location.origin}/pass/${r.qr_token}`;
    navigator.clipboard
      .writeText(url)
      .then(() =>
        this.snack.open('Pass link copied — send it to your visitor', 'Close', {
          duration: 3500,
        })
      )
      .catch(() => this.snack.open('Copy failed', 'Close', { duration: 3000 }));
  }

  respond(req: VisitRequest, action: 'approve' | 'reject'): void {
    const ref = this.dialog.open(RespondDialogComponent, {
      width: '440px',
      data: { action, visitorName: req.visitor?.full_name ?? 'this visitor' },
    });
    ref.afterClosed().subscribe((note: string | false | undefined) => {
      if (note === false || note === undefined) return; // cancelled
      this.api
        .post(`/visit-requests/${req.id}/respond/`, { action, note: note || '' })
        .subscribe({
          next: () => {
            this.snack.open(
              `Request ${action === 'approve' ? 'approved' : 'rejected'}`,
              'Close',
              { duration: 3000 }
            );
            this.load();
          },
          error: (e) =>
            this.snack.open(e?.error?.detail || 'Failed to respond', 'Close', { duration: 3000 }),
        });
    });
  }
}

export interface RespondDialogData {
  action: 'approve' | 'reject';
  visitorName: string;
}

@Component({
  selector: 'app-respond-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.action === 'approve' ? 'Approve' : 'Reject' }} visit — {{ data.visitorName }}
    </h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Note for the security desk (optional)</mat-label>
        <textarea matInput rows="3" [formControl]="note"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancel</button>
      <button
        mat-raised-button
        [color]="data.action === 'approve' ? 'primary' : 'warn'"
        (click)="confirm()"
      >
        Confirm {{ data.action }}
      </button>
    </mat-dialog-actions>
  `,
})
export class RespondDialogComponent {
  private fb = inject(FormBuilder);
  private ref = inject(MatDialogRef<RespondDialogComponent>);
  data = inject<RespondDialogData>(MAT_DIALOG_DATA);

  note = this.fb.control('');

  confirm(): void {
    this.ref.close(this.note.value ?? '');
  }
}
