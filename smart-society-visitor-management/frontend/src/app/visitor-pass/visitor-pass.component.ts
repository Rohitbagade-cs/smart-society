import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../core/api.service';
import { FaceService } from '../core/face.service';
import { environment } from '../../environments/environment';
import { fadeSlideIn } from '../core/animations';
import { ID_PROOF_TYPES, VISITOR_TYPES, formatApiError } from '../core/utils';

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
  face_enrolled?: boolean;
}

/**
 * Public visitor pass — opened from the SMS/WhatsApp link guards share:
 * `/pass/<qr_token>`. No login required; the token is the unguessable key.
 * Shows the visitor's QR pass plus visit details, phone-friendly.
 */
@Component({
  selector: 'app-visitor-pass',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatButtonModule, MatSnackBarModule],
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

      <mat-card class="pass-card" *ngIf="pass && !loading && !showEnroll && !enrollDone" [@fadeSlideIn]>
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

      <!-- Self-enrollment wizard: 1 details → 2 more details (optional) → 3 face -->
      <mat-card class="pass-card enroll-card" *ngIf="showEnroll && !loading" [@fadeSlideIn]>
        <mat-card-content>
          <div class="roofline"><span class="beacon"></span>Complete your gate pass</div>

          <div class="stepper">
            <div class="step" [class.active]="enrollStep === 1" [class.done]="enrollStep > 1">
              <span class="dot">1</span><span>Details</span>
            </div>
            <div class="step-sep"></div>
            <div class="step" [class.active]="enrollStep === 2" [class.done]="enrollStep > 2">
              <span class="dot">2</span><span>More info</span>
            </div>
            <div class="step-sep"></div>
            <div class="step" [class.active]="enrollStep === 3">
              <span class="dot">3</span><span>Face</span>
            </div>
          </div>

          <!-- STEP 1: basic details -->
          <div *ngIf="enrollStep === 1">
            <h2 style="font-size:18px; margin:6px 0 4px;">Your details</h2>
            <p class="muted" style="font-size:13px; margin:0 0 12px;">
              Fill this once — at the gate you'll just scan your face, no paperwork.
            </p>
            <label class="field-label">Full name *</label>
            <input class="text-input" [(ngModel)]="enroll.full_name" placeholder="Your name" style="margin-bottom:10px;" />
            <label class="field-label">Phone *</label>
            <input class="text-input" [(ngModel)]="enroll.phone" placeholder="10-digit mobile number" style="margin-bottom:10px;" />
            <label class="field-label">Visitor type</label>
            <select class="text-input" [(ngModel)]="enroll.visitor_type" style="margin-bottom:14px;">
              <option *ngFor="let t of visitorTypes" [value]="t.value">{{ t.label }}</option>
            </select>
            <div class="wizard-actions">
              <button class="btn btn-ghost" type="button" (click)="enrollStep = 2">
                <mat-icon>add</mat-icon> Add more details
              </button>
              <button class="btn btn-primary" type="button" (click)="enrollStep = 3" [disabled]="!canContinueStep1">
                Continue <mat-icon>arrow_forward</mat-icon>
              </button>
            </div>
          </div>

          <!-- STEP 2: additional details (all optional) -->
          <div *ngIf="enrollStep === 2">
            <h2 style="font-size:18px; margin:6px 0 4px;">Additional details</h2>
            <p class="muted" style="font-size:13px; margin:0 0 12px;">
              Optional — helps the guard identify you faster.
            </p>
            <label class="field-label">Vehicle (optional)</label>
            <input class="text-input" [(ngModel)]="enroll.vehicle_number" placeholder="KA 01 AB 1234" style="margin-bottom:10px;" />
            <label class="field-label">ID proof (optional)</label>
            <select class="text-input" [(ngModel)]="enroll.id_proof_type" style="margin-bottom:10px;">
              <option value="">None</option>
              <option *ngFor="let t of idProofTypes" [value]="t">{{ t }}</option>
            </select>
            <div *ngIf="enroll.id_proof_type" style="margin-bottom:10px;">
              <label class="field-label">ID proof number (optional)</label>
              <input class="text-input" [(ngModel)]="enroll.id_proof_number" placeholder="e.g. Aadhaar / DL number" />
            </div>
            <div class="wizard-actions">
              <button class="btn btn-ghost" type="button" (click)="enrollStep = 1">
                <mat-icon>arrow_back</mat-icon> Back
              </button>
              <button class="btn btn-primary" type="button" (click)="enrollStep = 3" [disabled]="!canContinueStep1">
                Continue <mat-icon>arrow_forward</mat-icon>
              </button>
            </div>
          </div>

          <!-- STEP 3: face -->
          <div *ngIf="enrollStep === 3">
            <h2 style="font-size:18px; margin:6px 0 4px;">Your face</h2>
            <p class="muted" style="font-size:13px; margin:0 0 12px;">
              Take a clear front-facing selfie — the guard will match it at the gate.
            </p>
            <label class="field-label">Your photo *</label>
            <div class="selfie-cam" *ngIf="cameraOpen; else selfiePick">
              <video #selfieVideo playsinline muted></video>
              <div class="selfie-cam-actions">
                <button class="btn btn-ghost btn-sm" type="button" (click)="closeCamera()">Cancel</button>
                <button class="btn btn-primary btn-sm" type="button" (click)="captureFromCamera()">
                  <mat-icon>photo_camera</mat-icon> Capture
                </button>
              </div>
              <div class="face-check" *ngIf="cameraError">
                <mat-icon style="color:var(--danger)">error</mat-icon><span>{{ cameraError }}</span>
              </div>
            </div>
            <ng-template #selfiePick>
              <label class="selfie-pick">
                <input type="file" accept="image/*" capture="user" (change)="onPhoto($event)" hidden />
                <img *ngIf="photoPreview" [src]="photoPreview" alt="Your selfie preview" />
                <span *ngIf="!photoPreview"><mat-icon>photo_camera</mat-icon> Take a selfie</span>
              </label>
              <button class="btn btn-ghost btn-sm" type="button" (click)="openCamera()" style="margin-top:8px;">
                <mat-icon>videocam</mat-icon> Use camera instead
              </button>
            </ng-template>
            <div class="face-check" *ngIf="faceChecked">
              <mat-icon [style.color]="faceOk ? 'var(--success)' : 'var(--danger)'">
                {{ faceOk ? 'check_circle' : 'error' }}
              </mat-icon>
              <span>{{ faceOk ? 'Face detected — good to go.' : 'No face found — try a clearer front-facing photo.' }}</span>
            </div>
            <div class="face-diag" *ngIf="faceError || faceDiag.length">
              <div *ngIf="faceError" class="face-diag-err">Error: {{ faceError }}</div>
              <div *ngFor="let d of faceDiag">{{ d }}</div>
              <div *ngIf="face.backend">render backend: {{ face.backend }}</div>
            </div>

            <p class="hint" style="margin:12px 0;">
              By submitting, you agree to store a face fingerprint (not your photo) for faster entry.
            </p>
            <div class="wizard-actions">
              <button class="btn btn-ghost" type="button" (click)="enrollStep = 1">
                <mat-icon>arrow_back</mat-icon> Back
              </button>
              <button
                mat-raised-button
                color="primary"
                class="btn btn-primary"
                (click)="submitEnroll()"
                [disabled]="submitting || !canSubmitEnroll"
              >
                <mat-icon>how_to_reg</mat-icon>
                {{ submitting ? 'Submitting…' : 'Submit & activate pass' }}
              </button>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="pass-card" *ngIf="enrollDone && !loading" [@fadeSlideIn] style="margin-top:16px;">
        <mat-card-content style="text-align:center; padding:28px 20px;">
          <mat-icon style="font-size:48px; width:48px; height:48px; color:var(--success);">check_circle</mat-icon>
          <h2 style="margin:12px 0 6px;">You're all set!</h2>
          <p class="muted" style="margin:0 0 16px;">At the gate, just look at the camera — the guard will check you in with a face scan.</p>
          <button class="btn btn-ghost" type="button" (click)="viewPass()">
            <mat-icon>qr_code_2</mat-icon> View my pass
          </button>
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
        background: radial-gradient(circle, #b9c6ff, transparent 70%);
        top: -120px;
        left: -100px;
      }
      .orb-2 {
        width: 380px;
        height: 380px;
        background: radial-gradient(circle, #a9ecdf, transparent 70%);
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
        border-top: 4px solid var(--primary) !important;
      }
      .enroll-card { max-width: 560px; }
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
        background: var(--primary);
        box-shadow: var(--shadow-primary);
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
      .selfie-pick {
        display: flex; align-items: center; justify-content: center;
        min-height: 120px; border: 1.5px dashed var(--border); border-radius: 12px;
        background: var(--surface-2); cursor: pointer; overflow: hidden;
        color: var(--text-dim); font-weight: 600; font-size: 14px;
        transition: border-color 0.16s;
      }
      .selfie-pick:hover { border-color: var(--primary); }
      .selfie-pick img { width: 100%; max-height: 260px; object-fit: cover; display: block; }
      .selfie-pick span { display: inline-flex; align-items: center; gap: 8px; padding: 20px; }
      .face-check { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-size: 13px; font-weight: 500; }
      .face-diag { margin-top: 8px; font-size: 11px; line-height: 1.6; color: var(--text-muted, #8a93a6);
        background: #f4f6fb; border: 1px dashed var(--border); border-radius: 8px; padding: 8px 10px; }
      .face-diag-err { color: var(--danger); font-weight: 600; }
      .stepper { display: flex; align-items: center; gap: 8px; margin: 10px 0 4px; }
      .step { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
        color: var(--text-muted, #8a93a6); }
      .step .dot { width: 22px; height: 22px; border-radius: 50%; display: inline-flex;
        align-items: center; justify-content: center; font-size: 11px;
        background: #eef1f7; color: var(--text-muted, #8a93a6); }
      .step.active { color: var(--primary); }
      .step.active .dot { background: var(--primary); color: #fff; }
      .step.done .dot { background: var(--success); color: #fff; }
      .step-sep { flex: 1; height: 1px; background: var(--border); }
      .wizard-actions { display: flex; justify-content: space-between; align-items: center;
        gap: 10px; margin-top: 6px; }
      .selfie-cam { border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: #0e1526; }
      .selfie-cam video { width: 100%; max-height: 300px; object-fit: cover; display: block; }
      .selfie-cam-actions { display: flex; justify-content: flex-end; gap: 8px; padding: 10px; background: var(--surface); }
    `,
  ],
})
export class VisitorPassComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  face = inject(FaceService);
  private snack = inject(MatSnackBar);

  @ViewChild('selfieVideo') selfieVideo!: ElementRef<HTMLVideoElement>;
  private camStream: MediaStream | null = null;
  cameraOpen = false;
  cameraError = '';
  faceError = '';
  faceDiag: string[] = [];
  enrollStep = 1;

  get canContinueStep1(): boolean {
    return !!(this.enroll.full_name?.trim() && this.enroll.phone?.trim());
  }

  loading = true;
  pass: VisitorPass | null = null;
  error = '';
  qrSrc = '';
  token = '';

  visitorTypes = VISITOR_TYPES;
  idProofTypes = ID_PROOF_TYPES;

  // self-enrollment state
  enroll = {
    full_name: '',
    phone: '',
    visitor_type: 'guest',
    vehicle_number: '',
    id_proof_type: '',
    id_proof_number: '',
  };
  photoPreview: string | null = null;
  private descriptor: number[] | null = null;
  faceChecked = false;
  faceOk = false;
  submitting = false;
  enrollDone = false;

  /** Show the self-enrollment card for approved passes without a stored face. */
  get showEnroll(): boolean {
    return !!this.pass && this.pass.status === 'approved' && !this.pass.face_enrolled && !this.enrollDone;
  }

  get canSubmitEnroll(): boolean {
    return (
      this.enroll.full_name.trim().length > 1 &&
      /^[0-9+\- ]{7,15}$/.test(this.enroll.phone.trim()) &&
      this.faceOk &&
      !!this.descriptor
    );
  }

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
        if (p?.visitor_name) this.enroll.full_name = p.visitor_name;
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

  /** Visitor picks a selfie file: preview it and check that a face is detectable. */
  onPhoto(ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => this.analysePhoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  /** In-browser camera (desktop-friendly): live preview inside the page. */
  async openCamera(): Promise<void> {
    this.cameraOpen = true;
    this.cameraError = '';
    try {
      this.camStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      // Wait a tick so the *ngIf video element exists.
      setTimeout(async () => {
        const v = this.selfieVideo?.nativeElement;
        if (v && this.camStream) {
          v.srcObject = this.camStream;
          await v.play().catch(() => undefined);
        }
      }, 50);
    } catch {
      this.cameraError = 'Camera was blocked — allow permission or upload a photo instead.';
    }
  }

  closeCamera(): void {
    this.camStream?.getTracks().forEach((t) => t.stop());
    this.camStream = null;
    this.cameraOpen = false;
  }

  /** Snapshot the live preview and analyse it like an uploaded photo. */
  captureFromCamera(): void {
    const v = this.selfieVideo?.nativeElement;
    if (!v || !v.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    canvas.getContext('2d')?.drawImage(v, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    this.closeCamera();
    this.analysePhoto(dataUrl);
  }

  private analysePhoto(dataUrl: string): void {
    this.photoPreview = dataUrl;
    this.faceChecked = false;
    this.faceOk = false;
    this.faceError = '';
    this.faceDiag = [];
    this.descriptor = null;
    const img = new Image();
    img.onload = async () => {
      try {
        const desc = await this.face.descriptorFromImage(img, (m) =>
          this.faceDiag.push(m),
        );
        this.faceChecked = true;
        this.faceOk = !!desc;
        this.descriptor = desc;
        if (!desc) this.snack.open('No face found in that photo — try again', 'Close', { duration: 3000 });
      } catch (e: any) {
        console.error('[face] photo analysis failed:', e);
        this.faceChecked = true;
        this.faceOk = false;
        this.faceError = e?.message || String(e);
        this.snack.open('Could not analyse the photo — ' + this.faceError, 'Close', { duration: 6000 });
      }
    };
    img.src = dataUrl;
  }

  ngOnDestroy(): void {
    this.closeCamera();
  }

  /** After a successful enrollment, let the visitor view their pass QR. */
  viewPass(): void {
    this.enrollDone = false;
    window.scrollTo({ top: 0 });
  }

  /** Submit self-enrollment: details + face descriptor, keyed by the pass token. */
  submitEnroll(): void {
    if (!this.canSubmitEnroll || this.submitting) return;
    this.submitting = true;
    this.api
      .post<{ completed: boolean }>(`/visitor-pass/${this.token}/complete/`, {
        full_name: this.enroll.full_name.trim(),
        phone: this.enroll.phone.trim(),
        visitor_type: this.enroll.visitor_type,
        vehicle_number: this.enroll.vehicle_number.trim(),
        id_proof_type: this.enroll.id_proof_type,
        id_proof_number: this.enroll.id_proof_number.trim(),
        descriptor: this.descriptor,
      })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.enrollDone = true;
          if (this.pass) this.pass.face_enrolled = true;
          this.snack.open('Gate pass activated!', 'Close', { duration: 3000 });
        },
        error: (e) => {
          this.submitting = false;
          this.snack.open(formatApiError(e?.error, 'Could not submit your details.'), 'Close', {
            duration: 5000,
          });
        },
      });
  }
}
