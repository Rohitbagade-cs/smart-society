import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../core/api.service';
import { environment } from '../../environments/environment';
import { fadeSlideIn } from '../core/animations';

interface VisitorPass {
  request_id: number;
  society: string;
  visitor_name: string;
  visitor_type: string;
  flat: string | null;
  resident_name: string;
  purpose: string;
  expected_at: string;
  status: string;
  otp_verified: boolean;
}

/**
 * Public visitor pass — opened from the SMS/WhatsApp link guards share:
 * `/pass/<qr_token>`. No login required; the token is the unguessable key.
 * Shows the visitor's QR pass plus visit details, phone-friendly.
 */
@Component({
  selector: 'app-visitor-pass',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatButtonModule, MatSnackBarModule],
  animations: [fadeSlideIn],
  template: `
    <div class="pass-wrap">
      <div class="orbs" aria-hidden="true">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
      </div>

      <div *ngIf="loading" class="pass-loading">
        <mat-spinner diameter="44"></mat-spinner>
        <p>Loading your pass…</p>
      </div>

      <mat-card class="pass-card" *ngIf="pass && !loading" [@fadeSlideIn]>
        <mat-card-content>
          <div class="pass-head">
            <div class="pass-brand">
              <div class="brand-mark"><mat-icon>apartment</mat-icon></div>
              <div>
                <div class="pass-society">{{ pass.society }}</div>
                <div class="pass-sub">Visitor Pass</div>
              </div>
            </div>
            <span class="status status-{{ pass.status }}">{{ pass.status }}</span>
          </div>

          <div class="pass-name">{{ pass.visitor_name }}</div>
          <div class="pass-type">{{ pass.visitor_type }}</div>

          <div class="pass-qr">
            <img [src]="qrSrc" alt="Visitor QR pass" />
            <p><mat-icon>qr_code_scanner</mat-icon> Show this QR at the gate</p>
            <div class="pass-copy-row">
              <button mat-stroked-button (click)="copyLink()">
                <mat-icon>link</mat-icon> Copy pass link
              </button>
              <button mat-stroked-button (click)="copyToken()">
                <mat-icon>qr_code_2</mat-icon> Copy QR token
              </button>
            </div>
          </div>

          <div class="pass-divider" aria-hidden="true"></div>

          <div class="pass-details">
            <div class="pd-row">
              <span><mat-icon>meeting_room</mat-icon> Flat</span>
              <strong>{{ pass.flat || '—' }}</strong>
            </div>
            <div class="pd-row">
              <span><mat-icon>person</mat-icon> Visiting</span>
              <strong>{{ pass.resident_name }}</strong>
            </div>
            <div class="pd-row">
              <span><mat-icon>schedule</mat-icon> Expected</span>
              <strong>{{ pass.expected_at | date: 'MMM d, y, h:mm a' }}</strong>
            </div>
            <div class="pd-row">
              <span><mat-icon>notes</mat-icon> Purpose</span>
              <strong>{{ pass.purpose }}</strong>
            </div>
            <div class="pd-row" *ngIf="pass.otp_verified">
              <span><mat-icon>verified</mat-icon> Verification</span>
              <strong class="ok">OTP verified</strong>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="pass-card pass-invalid" *ngIf="error && !loading" [@fadeSlideIn]>
        <mat-card-content>
          <mat-icon class="invalid-icon">link_off</mat-icon>
          <h2>Pass not available</h2>
          <p>{{ error }}</p>
          <p class="pass-hint">Please ask the guard or resident for a fresh pass link.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .pass-wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
        position: relative;
      }
      .orbs {
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 0;
      }
      .orb {
        position: absolute;
        border-radius: 50%;
        filter: blur(90px);
        opacity: 0.3;
        animation: drift 16s ease-in-out infinite alternate;
      }
      .orb-1 {
        width: 420px;
        height: 420px;
        background: radial-gradient(circle, #7c4dff, transparent 70%);
        top: -120px;
        left: -100px;
      }
      .orb-2 {
        width: 380px;
        height: 380px;
        background: radial-gradient(circle, #ff4081, transparent 70%);
        bottom: -120px;
        right: -100px;
        animation-delay: -8s;
      }
      @keyframes drift {
        from {
          transform: translate(0, 0) scale(1);
        }
        to {
          transform: translate(50px, 36px) scale(1.12);
        }
      }
      .pass-loading {
        text-align: center;
        color: var(--text-dim);
        z-index: 1;
      }
      .pass-loading mat-spinner {
        margin: 0 auto 12px;
      }
      .pass-card {
        width: 100%;
        max-width: 400px;
        z-index: 1;
        overflow: hidden;
        border-top: 4px solid transparent !important;
        border-image: linear-gradient(90deg, var(--violet), var(--pink), var(--teal)) 1 !important;
      }
      .pass-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        margin-bottom: 18px;
      }
      .pass-brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      .brand-mark {
        width: 46px;
        height: 46px;
        border-radius: 15px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--violet), var(--pink));
        box-shadow: 0 6px 18px rgba(124, 77, 255, 0.4);
        flex: none;
      }
      .brand-mark mat-icon {
        color: #fff;
      }
      .pass-society {
        font-weight: 800;
        font-size: 16px;
        letter-spacing: -0.01em;
      }
      .pass-sub {
        font-size: 12px;
        color: var(--text-faint);
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .pass-name {
        font-size: 28px;
        font-weight: 800;
        letter-spacing: -0.02em;
      }
      .pass-type {
        color: var(--text-dim);
        font-size: 14px;
        margin: 2px 0 18px;
      }
      .pass-qr {
        text-align: center;
        background: #f6f8fd;
        border: 1px solid var(--border);
        border-radius: var(--radius-sm);
        padding: 20px 16px 14px;
      }
      .pass-copy-row {
        display: flex;
        gap: 8px;
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 10px;
      }
      .pass-qr img {
        width: 210px;
        max-width: 100%;
        height: auto;
        background: #fff;
        padding: 10px;
        border-radius: 8px;
        box-shadow: var(--shadow-sm);
      }
      .pass-qr p {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        color: var(--text-dim);
        font-size: 13px;
        margin: 12px 0 0;
      }
      .pass-qr p mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--violet);
      }
      .pass-divider {
        height: 2px;
        margin: 20px -24px;
        background-image: linear-gradient(90deg, var(--border) 55%, transparent 45%);
        background-size: 14px 2px;
        position: relative;
      }
      .pass-divider::before,
      .pass-divider::after {
        content: '';
        position: absolute;
        top: -11px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: var(--bg);
        border: 1px solid var(--border);
      }
      .pass-divider::before {
        left: -36px;
      }
      .pass-divider::after {
        right: -36px;
      }
      .pass-details {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .pd-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        font-size: 14px;
      }
      .pd-row span {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: var(--text-dim);
      }
      .pd-row span mat-icon {
        font-size: 19px;
        width: 19px;
        height: 19px;
        color: var(--violet);
      }
      .pd-row strong {
        font-weight: 600;
        text-align: right;
      }
      .pd-row strong.ok {
        color: var(--success);
      }
      .pass-invalid {
        text-align: center;
        padding: 12px;
      }
      .invalid-icon {
        font-size: 52px;
        width: 52px;
        height: 52px;
        color: var(--text-faint);
      }
      .pass-invalid h2 {
        margin: 12px 0 8px;
      }
      .pass-invalid p {
        color: var(--text-dim);
        font-size: 14px;
      }
      .pass-hint {
        font-size: 13px !important;
        margin-top: 12px;
      }
    `,
  ],
})
export class VisitorPassComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  loading = true;
  pass: VisitorPass | null = null;
  error = '';
  qrSrc = '';
  token = '';

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') || '';
    if (!token) {
      this.loading = false;
      this.error = 'No pass token was provided in the link.';
      return;
    }
    this.token = token;
    this.qrSrc = `${environment.apiUrl}/visitor-pass/${token}/qr/`;
    this.api.get<VisitorPass>(`/visitor-pass/${token}/`).subscribe({
      next: (p) => {
        this.pass = p;
        this.loading = false;
      },
      error: (e) => {
        this.loading = false;
        this.error =
          e?.error?.detail || 'This pass link is invalid or has expired.';
      },
    });
  }

  /** Copies the full public pass link (for pasting into the gate's Scan box). */
  copyLink(): void {
    const link = `${window.location.origin}/pass/${this.token}`;
    navigator.clipboard
      .writeText(link)
      .then(() => this.snack.open('Pass link copied', 'Close', { duration: 2500 }))
      .catch(() => this.snack.open('Copy failed', 'Close', { duration: 3000 }));
  }

  /** Copies just the QR token (for pasting into the gate's Scan box). */
  copyToken(): void {
    navigator.clipboard
      .writeText(this.token)
      .then(() => this.snack.open('QR token copied', 'Close', { duration: 2500 }))
      .catch(() => this.snack.open('Copy failed', 'Close', { duration: 3000 }));
  }
}
