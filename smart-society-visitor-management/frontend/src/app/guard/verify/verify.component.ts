import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../core/api.service';
import { VisitRequest } from '../../core/models';
import { extractGates, formatApiError, visitorTypeLabel } from '../../core/utils';

@Component({
  selector: 'app-verify',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <div class="page">
      <h1 class="page-title">Verify Visitor</h1>
      <p class="page-subtitle">OTP and QR-code verification for an approved visit request</p>

      <mat-card class="mb">
        <mat-card-content>
          <form [formGroup]="lookupForm" (ngSubmit)="loadRequest()" class="form-grid" style="align-items:end;">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Visit request ID</mat-label>
              <input matInput type="number" formControlName="requestId" />
            </mat-form-field>
            <div class="btn-cell">
              <button mat-raised-button color="primary" type="submit" [disabled]="lookupForm.invalid || loading">
                {{ loading ? 'Loading…' : 'Load request' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <div class="card-grid" *ngIf="request" style="grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));">
        <mat-card>
          <mat-card-header>
            <mat-card-title>Request #{{ request.id }}</mat-card-title>
            <mat-card-subtitle>
              <span class="status status-{{ request.status }}">{{ request.status }}</span>
              · OTP {{ request.otp_verified ? 'verified' : 'not verified' }}
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p><strong>Visitor:</strong> {{ request.visitor?.full_name }} ({{ request.visitor?.phone }})</p>
            <p><strong>Type:</strong> {{ visitorTypeLabel(request.visitor?.visitor_type) }}</p>
            <p><strong>Flat:</strong> {{ request.resident_flat || '—' }} {{ request.resident_username ? '· ' + request.resident_username : '' }}</p>
            <p><strong>Purpose:</strong> {{ request.purpose }}</p>
            <p><strong>Expected:</strong> {{ request.expected_at | date: 'medium' }}</p>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title>OTP verification</mat-card-title></mat-card-header>
          <mat-card-content>
            <button mat-stroked-button color="primary" (click)="sendOtp()" [disabled]="sendingOtp || !request">
              <mat-icon>sms</mat-icon> {{ sendingOtp ? 'Sending…' : 'Send OTP to visitor' }}
            </button>

            <div class="dev-otp-box" *ngIf="devOtp">
              <strong>DEV mode:</strong> the one-time code is <strong>{{ devOtp }}</strong>
              <div style="font-size:12px; color:#8a6d00;">The backend returned this code directly (no SMS gateway in dev).</div>
            </div>

            <form [formGroup]="otpForm" (ngSubmit)="verifyOtp()" class="mt">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Enter OTP</mat-label>
                <input matInput formControlName="otp" maxlength="10" />
              </mat-form-field>
              <button mat-raised-button color="accent" type="submit" [disabled]="otpForm.invalid || verifying">
                {{ verifying ? 'Verifying…' : 'Verify OTP' }}
              </button>
              <p *ngIf="request.otp_verified" style="color:#2e7d32; margin-top:8px;">
                <mat-icon style="vertical-align:middle;">check_circle</mat-icon> OTP verified
              </p>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header><mat-card-title>QR pass</mat-card-title></mat-card-header>
          <mat-card-content>
            <button mat-stroked-button color="primary" (click)="loadQr()" [disabled]="loadingQr">
              <mat-icon>qr_code_2</mat-icon> {{ loadingQr ? 'Loading…' : 'Show QR code' }}
            </button>
            <div class="mt" *ngIf="qrUrl">
              <img [src]="qrUrl" alt="Visitor QR pass" class="qr-img" />
              <p class="page-subtitle" style="font-size:12px;">Scan at the gate to validate this request.</p>
              <button mat-stroked-button (click)="copyToken()" [disabled]="!request?.qr_token">
                <mat-icon>content_copy</mat-icon> Copy QR token
              </button>
              <button mat-stroked-button (click)="copyPassLink()" [disabled]="!request?.qr_token" style="margin-left:8px;">
                <mat-icon>link</mat-icon> Copy pass link
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="empty-state" *ngIf="!request && !loading">
        Enter a visit request ID above to begin verification.
      </div>

      <!-- FUTURE HOOK: facial-recognition panel goes here.
           See core/future/face-recognition.service.ts — render only when
           FaceRecognitionService.enabled is true. -->
      <mat-card class="mt">
        <mat-card-header>
          <mat-card-title>Scan QR pass</mat-card-title>
          <mat-card-subtitle>Simulates a gate scanner — paste the pass link, the QR token, or the full QR JSON</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="scanForm" (ngSubmit)="scanQr()">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Scanned QR content</mat-label>
              <textarea
                matInput
                formControlName="payload"
                rows="3"
                placeholder='{"token": "…", "request_id": 11, "visitor": "…"}'
              ></textarea>
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" [disabled]="scanForm.invalid || scanning">
              {{ scanning ? 'Validating…' : 'Validate pass' }}
            </button>
          </form>

          <div class="mt" *ngIf="scannedRequest">
            <mat-divider></mat-divider>
            <p class="mt">
              <strong>Identified:</strong> {{ scannedRequest.visitor?.full_name }}
              ({{ scannedRequest.visitor?.phone }})
            </p>
            <p>
              <strong>Flat:</strong> {{ scannedRequest.resident_flat || '—' }}
              {{ scannedRequest.resident_username ? '· ' + scannedRequest.resident_username : '' }}
            </p>
            <p>
              <strong>Status:</strong>
              <span class="status status-{{ scannedRequest.status }}">{{ scannedRequest.status }}</span>
            </p>
            <button
              mat-raised-button
              color="accent"
              (click)="checkInScanned()"
              [disabled]="checkingIn || scannedRequest.status !== 'approved'"
            >
              <mat-icon>login</mat-icon> {{ checkingIn ? 'Checking in…' : 'Check in now' }}
            </button>
            <p *ngIf="scannedRequest.status === 'checked_in'" style="color:#2e7d32; margin-top:8px;">
              <mat-icon style="vertical-align:middle;">check_circle</mat-icon> Already checked in.
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class VerifyComponent implements OnDestroy, OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  lookupForm = this.fb.group({ requestId: [null as number | null, Validators.required] });
  otpForm = this.fb.group({ otp: ['', Validators.required] });
  scanForm = this.fb.group({ payload: ['', Validators.required] });

  request: VisitRequest | null = null;
  loading = false;
  visitorTypeLabel = visitorTypeLabel;
  sendingOtp = false;
  verifying = false;
  loadingQr = false;
  devOtp = '';
  qrUrl: string | null = null;
  scanning = false;
  checkingIn = false;
  scannedRequest: VisitRequest | null = null;
  defaultGate = 'Main Gate';

  ngOnInit(): void {
    this.api.get('/society/').subscribe({
      next: (res) => (this.defaultGate = extractGates(res)[0]),
    });
  }

  loadRequest(): void {
    const id = this.lookupForm.value.requestId;
    if (!id) return;
    this.loading = true;
    this.request = null;
    this.devOtp = '';
    if (this.qrUrl) {
      URL.revokeObjectURL(this.qrUrl);
      this.qrUrl = null;
    }
    this.api.get<VisitRequest>(`/visit-requests/${id}/`).subscribe({
      next: (r) => {
        this.request = r;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Visit request not found', 'Close', { duration: 3000 });
      },
    });
  }

  sendOtp(): void {
    if (!this.request) return;
    this.sendingOtp = true;
    this.api.post<{ otp_code?: string }>(`/visit-requests/${this.request.id}/send-otp/`, {}).subscribe({
      next: (res) => {
        this.sendingOtp = false;
        this.devOtp = res?.otp_code ?? '';
        this.snack.open('OTP sent to visitor', 'Close', { duration: 3000 });
      },
      error: (e) => {
        this.sendingOtp = false;
        this.snack.open(e?.error?.detail || 'Failed to send OTP', 'Close', { duration: 3000 });
      },
    });
  }

  verifyOtp(): void {
    if (!this.request || this.otpForm.invalid) return;
    this.verifying = true;
    this.api
      .post(`/otp/verify/`, {
        visit_request_id: this.request.id,
        otp_code: this.otpForm.value.otp,
      })
      .subscribe({
        next: () => {
          this.verifying = false;
          this.snack.open('OTP verified successfully', 'Close', { duration: 3000 });
          this.loadRequest(); // refresh otp_verified flag
        },
        error: (e) => {
          this.verifying = false;
          this.snack.open(e?.error?.detail || 'Invalid OTP', 'Close', { duration: 3000 });
        },
      });
  }

  loadQr(): void {
    if (!this.request) return;
    this.loadingQr = true;
    this.api.getBlob(`/visit-requests/${this.request.id}/qr/`).subscribe({
      next: (blob) => {
        this.loadingQr = false;
        if (this.qrUrl) URL.revokeObjectURL(this.qrUrl);
        this.qrUrl = URL.createObjectURL(blob);
      },
      error: () => {
        this.loadingQr = false;
        this.snack.open('Failed to load QR code', 'Close', { duration: 3000 });
      },
    });
  }

  ngOnDestroy(): void {
    if (this.qrUrl) URL.revokeObjectURL(this.qrUrl);
  }

  /** Copy the request's QR token so it can be pasted into the scanner below. */
  copyToken(): void {
    const token = this.request?.qr_token;
    if (!token) return;
    navigator.clipboard
      .writeText(token)
      .then(() =>
        this.snack.open('QR token copied — paste it into the scanner below', 'Close', {
          duration: 3000,
        })
      )
      .catch(() => this.snack.open('Copy failed', 'Close', { duration: 3000 }));
  }

  /** Copies the public visitor-pass link to share with the visitor (SMS/WhatsApp). */
  copyPassLink(): void {
    const token = this.request?.qr_token;
    if (!token) return;
    const url = `${window.location.origin}/pass/${token}`;
    navigator.clipboard
      .writeText(url)
      .then(() =>
        this.snack.open('Pass link copied — share it with the visitor', 'Close', {
          duration: 3000,
        })
      )
      .catch(() => this.snack.open('Copy failed', 'Close', { duration: 3000 }));
  }

  /**
   * Simulate a gate scanner: paste the QR payload (JSON), extract its token,
   * and ask the backend to validate the pass.
   */
  scanQr(): void {
    const raw = (this.scanForm.value.payload || '').trim();
    if (!raw) return;
    let token = '';
    // Accept a pasted full pass link (…/pass/<token>), the QR JSON, or the bare token.
    const linkMatch = raw.match(/\/pass\/([^/?#\s]+)/);
    if (linkMatch) {
      token = linkMatch[1];
    } else {
      try {
        token = JSON.parse(raw)?.token || '';
      } catch {
        token = raw; // allow pasting just the token itself
      }
    }
    if (!token) {
      this.snack.open('No token found in the scanned content', 'Close', { duration: 3000 });
      return;
    }
    this.scanning = true;
    this.scannedRequest = null;
    this.api.post<VisitRequest>('/visit-requests/scan-qr/', { token }).subscribe({
      next: (r) => {
        this.scanning = false;
        this.scannedRequest = r;
        this.snack.open(`QR valid — request #${r.id} (${r.visitor?.full_name})`, 'Close', {
          duration: 3000,
        });
      },
      error: (e) => {
        this.scanning = false;
        this.snack.open(formatApiError(e?.error, 'QR validation failed'), 'Close', {
          duration: 4000,
        });
      },
    });
  }

  /** One-click check-in for a successfully scanned pass. */
  checkInScanned(): void {
    if (!this.scannedRequest) return;
    this.checkingIn = true;
    this.api
      .post('/access-logs/', {
        visit_request_id: this.scannedRequest.id,
        gate: this.defaultGate,
        direction: 'in',
      })
      .subscribe({
        next: () => {
          this.checkingIn = false;
          const id = this.scannedRequest!.id;
          this.snack.open(`Request #${id} checked in at ${this.defaultGate}`, 'Close', {
            duration: 3000,
          });
          this.scannedRequest = { ...this.scannedRequest!, status: 'checked_in' };
        },
        error: (e) => {
          this.checkingIn = false;
          this.snack.open(formatApiError(e?.error, 'Check-in failed'), 'Close', {
            duration: 4000,
          });
        },
      });
  }
}
