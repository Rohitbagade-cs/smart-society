import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../core/api.service';
import { AiService, SecurityFlag } from '../../core/ai.service';
import { fadeSlideIn } from '../../core/animations';
import { ResidentProfile, VisitRequest } from '../../core/models';
import { ID_PROOF_TYPES, VISITOR_TYPES, extractGates, formatApiError, residentLabel, residentUserId } from '../../core/utils';

@Component({
  selector: 'app-guard-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page" [@fadeSlideIn]>
      <h1 class="page-title">Security Desk</h1>
      <p class="page-subtitle">Register a visitor and raise an access request for the resident</p>

      <mat-card class="mb" *ngIf="flags !== null">
        <mat-card-header>
          <mat-card-title><mat-icon color="warn" style="vertical-align: middle;">warning</mat-icon> Security flags <span class="live-dot" title="Live monitoring"></span></mat-card-title>
          <span class="toolbar-spacer"></span>
          <button mat-stroked-button type="button" (click)="loadBriefing()" [disabled]="briefingLoading">
            <mat-icon>auto_awesome</mat-icon>
            {{ briefingLoading ? 'Writing…' : 'AI briefing' }}
          </button>
          <button mat-icon-button (click)="loadFlags()" aria-label="Refresh flags">
            <mat-icon>refresh</mat-icon>
          </button>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="flags.length === 0" class="empty-state">No suspicious activity detected in the last 7 days.</div>
          <div *ngFor="let f of flags" class="flag flag-{{ f.severity }}">
            <strong>{{ f.title }}</strong>
            <p>{{ f.detail }}</p>
          </div>
          <div *ngIf="briefingLoading" class="briefing"><mat-spinner diameter="24"></mat-spinner></div>
          <div *ngIf="briefing" class="briefing">
            <strong><mat-icon style="vertical-align: middle; font-size: 18px;">auto_awesome</mat-icon> AI briefing</strong>
            <p>{{ briefing }}</p>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card class="mb">
        <mat-card-header>
          <mat-card-title>Register visitor</mat-card-title>
          <span class="toolbar-spacer"></span>
          <button
            mat-stroked-button
            type="button"
            *ngIf="voiceSupported"
            (click)="toggleVoice()"
            [disabled]="parsing"
          >
            <mat-icon>{{ listening ? 'mic' : 'mic_none' }}</mat-icon>
            {{ listening ? 'Listening…' : parsing ? 'Parsing…' : 'Voice fill' }}
          </button>
        </mat-card-header>
        <mat-card-content>
          <p *ngIf="transcript" class="voice-note">Heard: “{{ transcript }}”</p>
          <form [formGroup]="form" (ngSubmit)="submit()" autocomplete="off">
            <h3>Visitor details</h3>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Full name</mat-label>
                <input matInput formControlName="full_name" (blur)="lookupFromHistory()" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Phone</mat-label>
                <input matInput formControlName="phone" (blur)="lookupFromHistory()" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Visitor type</mat-label>
                <mat-select formControlName="visitor_type">
                  <mat-option *ngFor="let t of visitorTypes" [value]="t.value">{{ t.label }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Vehicle number (optional)</mat-label>
                <input matInput formControlName="vehicle_number" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>ID proof type</mat-label>
                <mat-select formControlName="id_proof_type">
                  <mat-option value="">None</mat-option>
                  <mat-option *ngFor="let t of idProofTypes" [value]="t">{{ t }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>ID proof number</mat-label>
                <input matInput formControlName="id_proof_number" />
              </mat-form-field>
            </div>

            <h3 class="mt">Visit details</h3>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Visiting resident (flat)</mat-label>
                <mat-select formControlName="resident">
                  <mat-option *ngFor="let r of residents" [value]="residentId(r)">
                    {{ residentLabel(r) }}
                  </mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Purpose</mat-label>
                <input matInput formControlName="purpose" placeholder="e.g. Personal visit" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Expected at</mat-label>
                <input matInput type="datetime-local" formControlName="expected_at" />
              </mat-form-field>
            </div>

            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving">
                {{ saving ? 'Registering…' : 'Register & request access' }}
              </button>
              <button mat-stroked-button type="button" (click)="autoType()" [disabled]="classifying">
                <mat-icon>auto_awesome</mat-icon>
                {{ classifying ? 'Detecting…' : 'Auto-detect type' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>Recent visit requests</mat-card-title>
          <span class="toolbar-spacer"></span>
          <button mat-button color="primary" (click)="goVerify()">
            Verify visitor <mat-icon>arrow_forward</mat-icon>
          </button>
        </mat-card-header>
        <mat-card-content>
          <div class="recent-filters">
            <mat-form-field appearance="outline" class="recent-search">
              <mat-label>Search visitor / phone</mat-label>
              <input
                matInput
                #recentSearchInput
                placeholder="Name or phone"
                (keyup.enter)="applyRecentFilters(recentSearchInput.value)"
              />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>
            <mat-form-field appearance="outline" class="recent-status">
              <mat-label>Status</mat-label>
              <mat-select [value]="recentStatus" (selectionChange)="onRecentStatusChange($event.value)">
                <mat-option *ngFor="let s of recentStatuses" [value]="s.value">{{ s.label }}</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="applyRecentFilters(recentSearchInput.value)">
              Search
            </button>
            <button mat-button (click)="clearRecentFilters(recentSearchInput)">Clear</button>
            <span class="toolbar-spacer"></span>
            <mat-form-field appearance="outline" class="recent-pagesize">
              <mat-label>Rows</mat-label>
              <mat-select [value]="recentPageSize" (selectionChange)="onRecentPageSizeChange($event.value)">
                <mat-option *ngFor="let n of recentPageSizes" [value]="n">{{ n }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="table-wrap">
            <table mat-table [dataSource]="recent">
              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>ID</th>
                <td mat-cell *matCellDef="let r">{{ r.id }}</td>
              </ng-container>
              <ng-container matColumnDef="visitor">
                <th mat-header-cell *matHeaderCellDef>Visitor</th>
                <td mat-cell *matCellDef="let r">{{ r.visitor?.full_name }}</td>
              </ng-container>
              <ng-container matColumnDef="flat">
                <th mat-header-cell *matHeaderCellDef>Flat</th>
                <td mat-cell *matCellDef="let r">{{ r.resident_flat || '—' }}</td>
              </ng-container>
              <ng-container matColumnDef="purpose">
                <th mat-header-cell *matHeaderCellDef>Purpose</th>
                <td mat-cell *matCellDef="let r">{{ r.purpose }}</td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let r">
                  <span class="status status-{{ r.status }}">{{ r.status }}</span>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="recentCols"></tr>
              <tr mat-row *matRowDef="let row; columns: recentCols"></tr>
            </table>
            <div class="empty-state" *ngIf="recent.length === 0 && !loadingRecent">
              {{ recentSearch || recentStatus ? 'No requests match your filters.' : 'No requests yet.' }}
            </div>
          </div>
          <div class="recent-pager" *ngIf="recentCount > 0">
            <span class="pager-info">
              {{ recentCount }} request{{ recentCount === 1 ? '' : 's' }} · Page {{ recentPage }} of {{ recentTotalPages }}
            </span>
            <button mat-stroked-button (click)="recentPrev()" [disabled]="recentPage <= 1">
              <mat-icon>chevron_left</mat-icon> Prev
            </button>
            <button mat-stroked-button (click)="recentNext()" [disabled]="recentPage >= recentTotalPages">
              Next <mat-icon>chevron_right</mat-icon>
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .recent-filters {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }
      .recent-search {
        flex: 1 1 220px;
        min-width: 180px;
      }
      .recent-status {
        width: 168px;
      }
      .recent-pagesize {
        width: 104px;
      }
      .recent-pager {
        display: flex;
        align-items: center;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 12px;
        flex-wrap: wrap;
      }
      .pager-info {
        font-size: 13px;
        color: var(--text-dim);
        margin-right: auto;
      }
      @media (max-width: 600px) {
        .recent-status,
        .recent-pagesize {
          flex: 1 1 45%;
          width: auto;
        }
      }
      .flag {
        border-left: 4px solid #b0b6d4;
        border-top: 1px solid var(--border);
        border-right: 1px solid var(--border);
        border-bottom: 1px solid var(--border);
        padding: 12px 16px;
        margin-bottom: 10px;
        background: #f6f8fd;
        border-radius: 0 12px 12px 0;
      }
      .flag strong {
        color: #1b1e2e;
        font-size: 14px;
      }
      .flag p {
        margin: 5px 0 0;
        color: #5b6080;
        font-size: 13px;
        line-height: 1.55;
      }
      .flag-high {
        border-left-color: #e53935;
        background: rgba(229, 57, 53, 0.06);
      }
      .flag-medium {
        border-left-color: #fb8c00;
        background: rgba(251, 140, 0, 0.07);
      }
      .flag-low {
        border-left-color: #1e88e5;
        background: rgba(30, 136, 229, 0.06);
      }
      .voice-note {
        font-style: italic;
        color: #5b6080;
        margin: 0 0 8px;
      }
      .briefing {
        margin-top: 12px;
        padding: 12px 14px;
        background: #eef4ff;
        border-radius: 8px;
      }
      .briefing p {
        margin: 6px 0 0;
        white-space: pre-wrap;
      }
    `,
  ],
  animations: [fadeSlideIn],
})
export class GuardDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private lastStatuses = new Map<number, string>();
  private pollInitialized = false;
  defaultGate = 'Main Gate';
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private ai = inject(AiService);
  private snack = inject(MatSnackBar);
  private router = inject(Router);

  visitorTypes = VISITOR_TYPES;
  idProofTypes = ID_PROOF_TYPES;
  residentLabel = residentLabel;
  residentId = residentUserId;

  residents: ResidentProfile[] = [];
  recent: VisitRequest[] = [];
  recentCols = ['id', 'visitor', 'flat', 'purpose', 'status'];
  saving = false;
  loadingRecent = false;
  // Recent-requests table: search / filter / pagination state
  recentPage = 1;
  recentPageSize = 8;
  recentSearch = '';
  recentStatus = '';
  recentCount = 0;
  recentStatuses = [
    { value: '', label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'checked_in', label: 'Checked in' },
    { value: 'checked_out', label: 'Checked out' },
    { value: 'cancelled', label: 'Cancelled' },
  ];
  recentPageSizes = [8, 20, 50];

  // AI: security flags, voice fill, auto type detection
  flags: SecurityFlag[] | null = null;
  briefing: string | null = null;
  briefingLoading = false;
  voiceSupported =
    typeof window !== 'undefined' &&
    !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  listening = false;
  parsing = false;
  transcript = '';
  classifying = false;
  private recognition: any = null;

  form = this.fb.group({
    full_name: ['', Validators.required],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\- ]{7,15}$/)]],
    visitor_type: ['guest', Validators.required],
    vehicle_number: [''],
    id_proof_type: [''],
    id_proof_number: [''],
    resident: [null as number | null, Validators.required],
    purpose: ['', Validators.required],
    expected_at: [this.defaultExpectedAt(), Validators.required],
  });

  /** Default "expected at": 30 minutes from now, formatted for datetime-local. */
  private defaultExpectedAt(): string {
    const d = new Date(Date.now() + 30 * 60_000);
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  ngOnInit(): void {
    this.api.list<ResidentProfile>('/residents/', { page_size: 200 }).subscribe({
      next: (r) => (this.residents = r.results),
      error: () => this.snack.open('Failed to load residents', 'Close', { duration: 3000 }),
    });
    this.api.get('/society/').subscribe({
      next: (res) => (this.defaultGate = extractGates(res)[0]),
    });
    this.loadRecent();
    this.loadFlags();
    // Watch for resident approvals: toast with a one-click check-in action.
    // Baseline is captured immediately so approvals in the first seconds aren't missed.
    this.pollApprovals();
    interval(10000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.pollApprovals());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Poll recent requests; whenever one transitions to "approved" while this
   * page is open, notify the guard with a snackbar that offers one-click check-in.
   */
  private pollApprovals(): void {
    this.api.list<VisitRequest>('/visit-requests/', { page_size: 30 }).subscribe({
      next: (r) => {
        const current = new Map<number, string>();
        for (const req of r.results ?? []) {
          current.set(req.id, req.status);
          const prev = this.lastStatuses.get(req.id);
          if (this.pollInitialized && prev !== 'approved' && req.status === 'approved') {
            this.notifyApproval(req);
          }
        }
        this.lastStatuses = current;
        this.pollInitialized = true;
      },
    });
  }

  private notifyApproval(req: VisitRequest): void {
    const who = req.visitor?.full_name || `request #${req.id}`;
    const flat = req.resident_flat ? ` (${req.resident_flat})` : '';
    const ref = this.snack.open(`Approved: ${who}${flat} may enter`, 'Check in', {
      duration: 12000,
    });
    ref.onAction().subscribe(() => this.quickCheckIn(req.id));
  }

  /** One-click check-in at the default gate, straight from the approval toast. */
  private quickCheckIn(requestId: number): void {
    this.api
      .post('/access-logs/', {
        visit_request_id: requestId,
        gate: this.defaultGate,
        direction: 'in',
      })
      .subscribe({
        next: () => {
          this.snack.open(`Request #${requestId} checked in at ${this.defaultGate}`, 'Close', {
            duration: 3000,
          });
          this.loadRecent();
        },
        error: (e) =>
          this.snack.open(formatApiError(e?.error, 'Check-in failed'), 'Close', {
            duration: 4000,
          }),
      });
  }

  /** Rule-based AI security flags (frequent visitors, after-hours, retries, long stays). */
  loadFlags(): void {
    this.ai.suspicious().subscribe({
      next: (f) => (this.flags = f),
      error: () => (this.flags = []),
    });
  }

  /** Ask the LLM to write a readable briefing over the week's findings. */
  loadBriefing(): void {
    if (this.briefingLoading) return;
    this.briefingLoading = true;
    this.briefing = null;
    this.ai.securityBriefing().subscribe({
      next: (r) => {
        this.briefingLoading = false;
        this.briefing = r.briefing;
      },
      error: (e) => {
        this.briefingLoading = false;
        this.snack.open(formatApiError(e?.error, 'Briefing failed'), 'Close', {
          duration: 6000,
        });
      },
    });
  }

  /** Voice check-in: speech -> transcript -> AI-extracted registration fields. */
  toggleVoice(): void {
    if (this.listening) {
      this.stopVoice();
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      this.snack.open('Voice input is not supported in this browser', 'Close', { duration: 3000 });
      return;
    }
    this.recognition = new SR();
    this.recognition.lang = 'en-IN';
    this.recognition.interimResults = false;
    this.recognition.maxAlternatives = 1;
    this.recognition.onresult = (ev: any) => {
      this.transcript = ev.results[0][0].transcript;
      this.listening = false;
      this.parseTranscript();
    };
    this.recognition.onerror = () => {
      this.listening = false;
      this.snack.open('Voice input failed — try again', 'Close', { duration: 3000 });
    };
    this.recognition.onend = () => (this.listening = false);
    try {
      this.recognition.start();
      this.listening = true;
    } catch {
      this.listening = false;
    }
  }

  private stopVoice(): void {
    try {
      this.recognition?.stop();
    } catch {
      /* already stopped */
    }
    this.listening = false;
  }

  private parseTranscript(): void {
    if (!this.transcript.trim() || this.parsing) return;
    this.parsing = true;
    this.ai.parseVisit(this.transcript).subscribe({
      next: (p) => {
        this.parsing = false;
        if (p.full_name) this.form.patchValue({ full_name: p.full_name });
        if (p.phone) this.form.patchValue({ phone: p.phone });
        if (p.visitor_type) this.form.patchValue({ visitor_type: p.visitor_type });
        if (p.vehicle_number) this.form.patchValue({ vehicle_number: p.vehicle_number });
        if (p.purpose) this.form.patchValue({ purpose: p.purpose });
        if (p.flat) this.matchFlatToResident(p.flat);
        this.snack.open('Form filled from voice note — verify before submitting', 'Close', {
          duration: 3500,
        });
      },
      error: (e) => {
        this.parsing = false;
        this.snack.open(formatApiError(e?.error, 'Could not parse the voice note'), 'Close', {
          duration: 6000,
        });
      },
    });
  }

  /** Match a spoken flat like "B-302" to the resident dropdown. */
  private matchFlatToResident(flat: string): void {
    const norm = flat.replace(/\s+/g, '').toLowerCase();
    const hit = this.residents.find(
      (r) => (r.flat_no || '').replace(/\s+/g, '').toLowerCase() === norm
    );
    if (hit) {
      const id = this.residentId(hit);
      if (id != null) this.form.patchValue({ resident: id });
    }
  }

  /** Auto-fill from history: when the guard tabs out of name/phone, look up
   *  the past visitor and fill their details (type, vehicle, ID proof). */
  lookupFromHistory(): void {
    const name = (this.form.value.full_name || '').trim();
    const phone = (this.form.value.phone || '').trim();
    if (!name && !phone) return;
    this.ai.lookupVisitor(name, phone).subscribe({
      next: (r) => {
        if (!r.found) return;
        const patch: Record<string, unknown> = {};
        if (!this.form.value.full_name && r.full_name) patch['full_name'] = r.full_name;
        if (!this.form.value.phone && r.phone) patch['phone'] = r.phone;
        if (r.visitor_type) patch['visitor_type'] = r.visitor_type;
        if (!this.form.value.vehicle_number && r.vehicle_number)
          patch['vehicle_number'] = r.vehicle_number;
        if (!this.form.value.id_proof_type && r.id_proof_type)
          patch['id_proof_type'] = r.id_proof_type;
        if (!this.form.value.id_proof_number && r.id_proof_number)
          patch['id_proof_number'] = r.id_proof_number;
        if (Object.keys(patch).length) {
          this.form.patchValue(patch);
          this.snack.open(`Details filled from ${r.full_name}'s past visit`, 'Close', {
            duration: 2500,
          });
        }
      },
    });
  }

  /** Auto-detect the visitor type from name + purpose via the AI. */
  autoType(): void {
    const name = this.form.value.full_name || '';
    const purpose = this.form.value.purpose || '';
    const phone = this.form.value.phone || '';
    if (!name && !purpose) {
      this.snack.open('Enter a name or purpose first', 'Close', { duration: 2500 });
      return;
    }
    this.classifying = true;
    this.ai.classifyType(name, purpose, phone).subscribe({
      next: (r) => {
        this.classifying = false;
        this.form.patchValue({ visitor_type: r.visitor_type });
        const how = r.source === 'history' ? 'from past visits' : 'by AI';
        this.snack.open(`Detected type: ${r.visitor_type} (${how})`, 'Close', { duration: 2500 });
      },
      error: (e) => {
        this.classifying = false;
        this.snack.open(formatApiError(e?.error, 'Type detection failed'), 'Close', {
          duration: 5000,
        });
      },
    });
  }

  loadRecent(): void {
    this.loadingRecent = true;
    const params: Record<string, unknown> = {
      page: this.recentPage,
      page_size: this.recentPageSize,
    };
    if (this.recentSearch.trim()) params['search'] = this.recentSearch.trim();
    if (this.recentStatus) params['status'] = this.recentStatus;
    this.api.list<VisitRequest>('/visit-requests/', params).subscribe({
      next: (r) => {
        this.recent = r.results;
        this.recentCount = r.count;
        this.loadingRecent = false;
      },
      error: () => (this.loadingRecent = false),
    });
  }

  get recentTotalPages(): number {
    return Math.max(1, Math.ceil(this.recentCount / this.recentPageSize));
  }

  applyRecentFilters(searchValue: string): void {
    this.recentSearch = searchValue;
    this.recentPage = 1;
    this.loadRecent();
  }

  clearRecentFilters(searchInput: HTMLInputElement): void {
    searchInput.value = '';
    this.recentSearch = '';
    this.recentStatus = '';
    this.recentPage = 1;
    this.loadRecent();
  }

  onRecentStatusChange(value: string): void {
    this.recentStatus = value;
    this.recentPage = 1;
    this.loadRecent();
  }

  onRecentPageSizeChange(value: number): void {
    this.recentPageSize = value;
    this.recentPage = 1;
    this.loadRecent();
  }

  recentPrev(): void {
    if (this.recentPage > 1) {
      this.recentPage--;
      this.loadRecent();
    }
  }

  recentNext(): void {
    if (this.recentPage < this.recentTotalPages) {
      this.recentPage++;
      this.loadRecent();
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving) return;
    const v = this.form.value;
    const body = {
      visitor: {
        full_name: v.full_name,
        phone: v.phone,
        visitor_type: v.visitor_type,
        vehicle_number: v.vehicle_number || undefined,
        id_proof_type: v.id_proof_type || undefined,
        id_proof_number: v.id_proof_number || undefined,
      },
      resident_id: v.resident,
      purpose: v.purpose,
      expected_at: new Date(v.expected_at ?? '').toISOString(),
    };
    this.saving = true;
    this.api.post<VisitRequest>('/visit-requests/', body).subscribe({
      next: (req) => {
        this.saving = false;
        this.snack.open(`Visit request #${req.id} created — awaiting resident approval`, 'Close', {
          duration: 4000,
        });
        this.form.reset({ visitor_type: 'guest', expected_at: this.defaultExpectedAt() });
        this.loadRecent();
      },
      error: (e) => {
        this.saving = false;
        this.snack.open(formatApiError(e?.error, 'Failed to create request'), 'Close', { duration: 5000 });
      },
    });
  }

  goVerify(): void {
    this.router.navigate(['/guard/verify']);
  }
}
