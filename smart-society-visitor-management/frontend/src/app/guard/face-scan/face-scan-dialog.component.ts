import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { FaceService } from '../../core/face.service';
import { formatApiError } from '../../core/utils';

export interface FaceScanData {
  /** 'match': identify a visitor at the gate. 'enroll': store a face for a visitor. */
  mode: 'match' | 'enroll';
  visitorId?: number;
  visitorName?: string;
  /** Gate used for one-click check-in after a match. */
  gate?: string;
}

export interface FaceMatch {
  visit_request_id: number;
  visitor_id: number;
  visitor_name: string;
  phone: string;
  visitor_type: string;
  flat: string | null;
  purpose: string;
  expected_at: string;
  confidence: number;
}

@Component({
  selector: 'app-face-scan-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="face-dialog">
      <div class="face-head">
        <div>
          <h2>{{ data.mode === 'match' ? 'Face scan check-in' : 'Enroll face' }}</h2>
          <p class="muted" style="margin:4px 0 0;">
            {{
              data.mode === 'match'
                ? 'Ask the visitor to look at the camera, then scan.'
                : 'Capture ' + (data.visitorName || 'the visitor') + '’s face for faster check-ins next time.'
            }}
          </p>
        </div>
        <button mat-icon-button mat-dialog-close aria-label="Close"><mat-icon>close</mat-icon></button>
      </div>

      <div class="face-stage" *ngIf="!cameraError; else camError">
        <video #video playsinline muted></video>
        <div class="face-hint" *ngIf="!working && !match && !enrolled && !noMatch">
          <mat-icon>face</mat-icon> Position the face inside the frame
        </div>
      </div>
      <ng-template #camError>
        <div class="empty-state">
          <mat-icon>videocam_off</mat-icon>
          <div class="empty-title">Camera unavailable</div>
          <div>{{ cameraError }}</div>
        </div>
      </ng-template>

      <div class="face-status" *ngIf="status || modelsLoading">
        <mat-spinner diameter="20" *ngIf="modelsLoading || working"></mat-spinner>
        <span>{{ modelsLoading ? 'Loading face model (first time takes a few seconds)…' : status }}</span>
      </div>

      <!-- match result -->
      <div class="match-card" *ngIf="match">
        <span class="avatar lg">{{ match.visitor_name.charAt(0).toUpperCase() }}</span>
        <div style="flex:1; min-width:0">
          <div class="timeline-main">{{ match.visitor_name }}</div>
          <div class="timeline-sub">
            {{ match.phone }} · Flat {{ match.flat || '—' }} · {{ match.purpose }}
          </div>
          <div class="timeline-sub">Match confidence: {{ (match.confidence * 100).toFixed(0) }}%</div>
        </div>
        <span class="chip chip-approved">Approved</span>
      </div>
      <div class="empty-state" *ngIf="noMatch" style="padding:20px 8px;">
        <mat-icon>person_search</mat-icon>
        <div class="empty-title">No enrolled face matched</div>
        <div>Register this visitor manually, then enroll their face.</div>
      </div>
      <div class="empty-state" *ngIf="enrolled" style="padding:20px 8px;">
        <mat-icon style="color:var(--success)">check_circle</mat-icon>
        <div class="empty-title">Face enrolled</div>
        <div>Next time, a single scan will identify this visitor.</div>
      </div>

      <div class="form-actions" style="margin-top:16px;">
        <button mat-stroked-button mat-dialog-close>Close</button>
        <button
          mat-raised-button
          color="primary"
          *ngIf="!match && !enrolled && !cameraError"
          (click)="scan()"
          [disabled]="working || modelsLoading"
        >
          <mat-icon>face</mat-icon>
          {{ working ? 'Scanning…' : data.mode === 'match' ? 'Scan & identify' : 'Capture & enroll' }}
        </button>
        <button
          mat-raised-button
          color="primary"
          *ngIf="match"
          (click)="checkIn()"
          [disabled]="checkingIn"
        >
          <mat-icon>login</mat-icon>
          {{ checkingIn ? 'Checking in…' : 'Check in at ' + (data.gate || 'gate') }}
        </button>
      </div>
      <p class="hint" style="margin-top:12px;">
        Only the face fingerprint is stored — never the photo. The guard always confirms before check-in.
      </p>
    </div>
  `,
  styles: [
    `
      .face-dialog { padding: 20px; width: min(480px, 92vw); }
      .face-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; }
      .face-head h2 { font-size: 18px; margin: 0; }
      .face-stage {
        position: relative; border-radius: 14px; overflow: hidden;
        background: #0e1526; aspect-ratio: 4 / 3;
        border: 1px solid var(--border);
      }
      .face-stage video { width: 100%; height: 100%; object-fit: cover; display: block; }
      .face-hint {
        position: absolute; left: 0; right: 0; bottom: 0;
        display: flex; align-items: center; justify-content: center; gap: 8px;
        padding: 10px; color: #fff; font-size: 13px; font-weight: 500;
        background: linear-gradient(transparent, rgba(0, 0, 0, 0.55));
      }
      .face-status { display: flex; align-items: center; gap: 10px; margin-top: 12px; font-size: 13px; color: var(--text-dim); }
      .match-card {
        display: flex; align-items: center; gap: 12px; margin-top: 14px;
        background: var(--surface-2); border: 1px solid var(--border-soft);
        border-radius: 12px; padding: 12px;
      }
    `,
  ],
})
export class FaceScanDialogComponent implements OnInit, OnDestroy {
  private face = inject(FaceService);
  private api = inject(ApiService);
  private dialogRef = inject(MatDialogRef<FaceScanDialogComponent>);
  data: FaceScanData = inject(MAT_DIALOG_DATA);

  @ViewChild('video') video!: ElementRef<HTMLVideoElement>;

  private stream: MediaStream | null = null;
  modelsLoading = true;
  cameraError = '';
  working = false;
  status = '';
  match: FaceMatch | null = null;
  noMatch = false;
  enrolled = false;
  checkingIn = false;

  async ngOnInit(): Promise<void> {
    try {
      await this.face.ensureModels();
    } catch (e) {
      this.cameraError =
        e instanceof Error ? e.message : 'Could not load the face model.';
    } finally {
      this.modelsLoading = false;
    }
    if (!this.cameraError) await this.startCamera();
  }

  private async startCamera(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 } },
        audio: false,
      });
      const v = this.video.nativeElement;
      v.srcObject = this.stream;
      await v.play();
    } catch {
      this.cameraError = 'Camera access was blocked. Allow camera permission and try again.';
    }
  }

  async scan(): Promise<void> {
    if (this.working) return;
    this.working = true;
    this.match = null;
    this.noMatch = false;
    this.enrolled = false;
    try {
      this.status = 'Detecting face…';
      const descriptor = await this.face.descriptorFromVideo(this.video.nativeElement);
      if (!descriptor) {
        this.status = 'No face found — ask the visitor to face the camera and try again.';
        return;
      }
      if (this.data.mode === 'enroll' && this.data.visitorId) {
        this.status = 'Enrolling…';
        await firstValueFrom(
          this.api.post(`/face/enroll/${this.data.visitorId}/`, { descriptor })
        );
        this.enrolled = true;
        this.status = '';
      } else {
        this.status = 'Matching against enrolled faces…';
        const res = await firstValueFrom(
          this.api.post<{ match: FaceMatch | null }>('/face/match/', { descriptor })
        );
        if (res?.match) {
          this.match = res.match;
        } else {
          this.noMatch = true;
        }
        this.status = '';
      }
    } catch (e) {
      this.status = 'Scan failed — ' + formatApiError((e as any)?.error ?? e, 'please try again.');
    } finally {
      this.working = false;
    }
  }

  checkIn(): void {
    if (!this.match || this.checkingIn) return;
    this.checkingIn = true;
    this.api
      .post('/access-logs/', {
        visit_request_id: this.match.visit_request_id,
        gate: this.data.gate || 'Main Gate',
        direction: 'in',
      })
      .subscribe({
        next: () => {
          this.dialogRef.close({ checkedIn: this.match!.visit_request_id });
        },
        error: (e) => {
          this.checkingIn = false;
          this.status = formatApiError(e?.error, 'Check-in failed.');
        },
      });
  }

  ngOnDestroy(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
  }
}
