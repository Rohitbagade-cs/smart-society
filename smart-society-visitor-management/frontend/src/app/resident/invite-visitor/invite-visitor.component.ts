import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { AuthService } from '../../core/auth.service';
import { VisitRequest } from '../../core/models';
import { VISITOR_TYPES, formatApiError } from '../../core/utils';
import { fadeSlideIn } from '../../core/animations';

/**
 * Resident "Invite visitor" page — the pre-authorization flow.
 *
 * The resident registers an expected visitor ahead of time. Because the
 * resident IS the approver, the request is created already approved and a
 * shareable gate-pass link is returned immediately. At the gate the guard
 * scans the visitor's QR and checks them straight in — no manual approval
 * round-trip — and the resident gets an "arrived" notification.
 */
@Component({
  selector: 'app-invite-visitor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page" @fadeSlideIn>
      <h1>Invite a visitor</h1>
      <p class="muted">
        Pre-register someone who's coming over. You'll get a gate-pass link to
        share with them — at the gate the guard scans it and they're checked
        straight in, already approved by you.
      </p>

      <mat-card class="form-card" *ngIf="!created">
        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="grid">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Visitor name</mat-label>
              <input matInput formControlName="full_name" required />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Phone</mat-label>
              <input matInput formControlName="phone" required />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Visitor type</mat-label>
              <mat-select formControlName="visitor_type">
                <mat-option *ngFor="let t of visitorTypes" [value]="t.value">
                  {{ t.label }}
                </mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Expected at</mat-label>
              <input matInput type="datetime-local" formControlName="expected_at" required />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="span2">
              <mat-label>Purpose of visit</mat-label>
              <input matInput formControlName="purpose" required placeholder="e.g. Dinner" />
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="span2">
              <mat-label>Vehicle number (optional)</mat-label>
              <input matInput formControlName="vehicle_number" placeholder="e.g. MH12AB1234" />
            </mat-form-field>
          </div>
          <div class="form-actions">
            <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving">
              <mat-icon>person_add</mat-icon>
              {{ saving ? 'Creating…' : 'Create invitation' }}
            </button>
          </div>
        </form>
      </mat-card>

      <mat-card class="form-card success" *ngIf="created">
        <mat-card-header>
          <mat-icon mat-card-avatar class="ok">check_circle</mat-icon>
          <mat-card-title>Invitation created</mat-card-title>
          <mat-card-subtitle>
            {{ created.visitor?.full_name }} · expected
            {{ created.expected_at | date: 'medium' }}
          </mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <p class="muted">
            This visit is <strong>already approved</strong> — you invited them.
            Share this gate-pass link with your visitor:
          </p>
          <div class="link-row">
            <code class="link">{{ passLink }}</code>
            <button mat-raised-button color="primary" (click)="copyLink()">
              <mat-icon>content_copy</mat-icon> Copy pass link
            </button>
          </div>
          <p class="muted small">
            At the gate the guard scans the QR from this link and checks your
            visitor in. You'll get a notification when they arrive.
          </p>
        </mat-card-content>
        <mat-card-actions>
          <button mat-button color="primary" (click)="reset()">Invite another</button>
          <button mat-button routerLink="/resident">Back to dashboard</button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .page { max-width: 720px; margin: 0 auto; }
      .muted { color: var(--text-muted, #666); }
      .small { font-size: 0.85rem; }
      .form-card { padding: 8px; }
      .grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 4px;
      }
      .span2 { grid-column: span 2; }
      .form-actions { margin-top: 12px; }
      .success .ok { color: #2e7d32; font-size: 40px; width: 40px; height: 40px; }
      .link-row {
        display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
        margin: 12px 0;
      }
      .link {
        flex: 1; min-width: 220px;
        padding: 10px 12px; border-radius: 8px;
        background: rgba(0,0,0,0.05);
        word-break: break-all; font-size: 0.85rem;
      }
      @media (max-width: 600px) { .grid { grid-template-columns: 1fr; } .span2 { grid-column: span 1; } }
    `,
  ],
  animations: [fadeSlideIn],
})
export class InviteVisitorComponent {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);

  visitorTypes = VISITOR_TYPES;
  saving = false;
  created: VisitRequest | null = null;
  passLink = '';

  form = this.fb.group({
    full_name: ['', Validators.required],
    phone: ['', Validators.required],
    visitor_type: ['guest', Validators.required],
    expected_at: ['', Validators.required],
    purpose: ['', Validators.required],
    vehicle_number: [''],
  });

  submit(): void {
    if (this.form.invalid || this.saving) return;
    const me = this.auth.currentUser;
    if (!me) {
      this.snack.open('Not signed in', 'Close', { duration: 3000 });
      return;
    }
    const v = this.form.value;
    const body = {
      visitor: {
        full_name: v.full_name,
        phone: v.phone,
        visitor_type: v.visitor_type,
        vehicle_number: v.vehicle_number || undefined,
      },
      // The backend forces resident_id to the caller for residents;
      // this is sent only because the serializer requires the field.
      resident_id: me.id,
      purpose: v.purpose,
      expected_at: new Date(v.expected_at ?? '').toISOString(),
    };
    this.saving = true;
    this.api.post<VisitRequest>('/visit-requests/', body).subscribe({
      next: (req) => {
        this.saving = false;
        this.created = req;
        this.passLink = `${window.location.origin}/pass/${req.qr_token}`;
        this.snack.open('Invitation created — share the pass link', 'Close', {
          duration: 4000,
        });
      },
      error: (e) => {
        this.saving = false;
        this.snack.open(formatApiError(e?.error, 'Failed to create invitation'), 'Close', {
          duration: 5000,
        });
      },
    });
  }

  copyLink(): void {
    navigator.clipboard
      .writeText(this.passLink)
      .then(() =>
        this.snack.open('Pass link copied — send it to your visitor', 'Close', {
          duration: 3500,
        })
      )
      .catch(() => this.snack.open('Copy failed', 'Close', { duration: 3000 }));
  }

  reset(): void {
    this.created = null;
    this.passLink = '';
    this.form.reset({ visitor_type: 'guest' });
  }
}
