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
      <div class="page-head-row">
        <div>
          <h1 class="page-title">Security Desk</h1>
          <p class="page-subtitle">Register a visitor and raise an access request for the resident</p>
        </div>
        <button class="btn btn-secondary" (click)="goVerify()">
          Verify visitor <mat-icon>arrow_forward</mat-icon>
        </button>
      </div>

      <div class="card mb" *ngIf="flags !== null">
        <div class="widget-head">
          <div>
            <div class="widget-title">
              Security flags
              <span class="chip chip-low" style="margin-left:8px">Live</span>
            </div>
            <div class="widget-sub">Rule-based monitoring · last 7 days</div>
          </div>
          <div class="pd-row">
            <button class="btn btn-secondary btn-sm" type="button" (click)="loadBriefing()" [disabled]="briefingLoading">
              <mat-icon>auto_awesome</mat-icon>
              {{ briefingLoading ? 'Writing…' : 'AI briefing' }}
            </button>
            <button class="btn btn-ghost btn-sm" (click)="loadFlags()" aria-label="Refresh flags">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>
        </div>
        <div *ngIf="flags.length === 0" class="empty-state">
          <mat-icon>shield</mat-icon>
          <div class="empty-title">All clear</div>
          <div>No suspicious activity detected in the last 7 days.</div>
        </div>
        <div *ngFor="let f of flags" class="flag-item">
          <span class="sev-dot" [ngClass]="'sev-' + f.severity"></span>
          <div style="flex:1; min-width:0">
            <div class="flag-title">{{ f.title }}</div>
            <div class="flag-detail">{{ f.detail }}</div>
          </div>
          <span class="chip" [ngClass]="'chip-' + f.severity">{{ f.severity }}</span>
        </div>
        <div *ngIf="briefingLoading" class="briefing mt"><mat-spinner diameter="24"></mat-spinner></div>
        <div *ngIf="briefing" class="briefing mt">
          <div class="roofline"><span class="beacon"></span>AI briefing</div>
          <p style="margin:6px 0 0;">{{ briefing }}</p>
        </div>
      </div>

      <div class="card mb">
        <div class="widget-head">
          <div>
            <div class="widget-title">Register visitor</div>
            <div class="widget-sub">Walk-in registration at the gate</div>
          </div>
          <button
            class="btn btn-secondary btn-sm"
            type="button"
            *ngIf="voiceSupported"
            (click)="toggleVoice()"
            [disabled]="parsing"
          >
            <mat-icon>{{ listening ? 'mic' : 'mic_none' }}</mat-icon>
            {{ listening ? 'Listening…' : parsing ? 'Parsing…' : 'Voice fill' }}
          </button>
        </div>
        <p *ngIf="transcript" class="voice-note">Heard: “{{ transcript }}”</p>
        <form [formGroup]="form" (ngSubmit)="submit()" autocomplete="off">
          <div class="section-title" style="margin-top:0">Visitor details</div>
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

          <div class="section-title">Visit details</div>
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
            <button class="btn btn-secondary" type="button" (click)="autoType()" [disabled]="classifying">
              <mat-icon>auto_awesome</mat-icon>
              {{ classifying ? 'Detecting…' : 'Auto-detect type' }}
            </button>
            <button class="btn btn-primary" type="submit" [disabled]="form.invalid || saving">
              {{ saving ? 'Registering…' : 'Register & request access' }}
            </button>
          </div>
        </form>
      </div>

      <div class="card" style="padding:0; overflow:hidden">
        <div class="table-toolbar">
          <div>
            <div class="widget-title">Recent visit requests</div>
            <div class="widget-sub">{{ recentCount }} requests</div>
          </div>
          <span class="toolbar-spacer"></span>
          <label class="search-box">
            <mat-icon>search</mat-icon>
            <input
              #recentSearchInput
              placeholder="Search name or phone…"
              (keyup.enter)="applyRecentFilters(recentSearchInput.value)"
              aria-label="Search requests"
            />
          </label>
          <select class="select-box" [value]="recentStatus" (change)="onRecentStatusChange($any($event.target).value)" aria-label="Status filter">
            <option *ngFor="let s of recentStatuses" [value]="s.value">{{ s.label }}</option>
          </select>
          <select class="select-box" [value]="recentPageSize" (change)="onRecentPageSizeChange(+$any($event.target).value)" aria-label="Rows per page">
            <option *ngFor="let n of recentPageSizes" [value]="n">{{ n }} / page</option>
          </select>
        </div>
        <div class="table-scroll">
          <table class="data-table">
            <thead>
              <tr><th>ID</th><th>Visitor</th><th>Flat</th><th>Purpose</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of recent">
                <td class="cell-sub">#{{ r.id }}</td>
                <td>
                  <div class="cell-main">{{ r.visitor?.full_name }}</div>
                  <div class="cell-sub">{{ r.visitor?.phone }}</div>
                </td>
                <td>{{ r.resident_flat || '—' }}</td>
                <td>{{ r.purpose }}</td>
                <td><span class="chip chip-{{ r.status }}">{{ r.status.replace('_', ' ') }}</span></td>
              </tr>
            </tbody>
          </table>
          <div class="empty-state" *ngIf="recent.length === 0 && !loadingRecent">
            <mat-icon>inbox</mat-icon>
            <div class="empty-title">{{ recentSearch || recentStatus ? 'No requests match your filters.' : 'No requests yet.' }}</div>
          </div>
          <div class="empty-state" *ngIf="loadingRecent"><mat-spinner diameter="32"></mat-spinner></div>
        </div>
        <div class="table-foot" *ngIf="recentCount > 0">
          <span>{{ recentCount }} requests · Page {{ recentPage }} of {{ recentTotalPages }}</span>
          <div class="pager">
            <button (click)="recentPrev()" [disabled]="recentPage <= 1" aria-label="Previous page"><mat-icon>chevron_left</mat-icon></button>
            <button (click)="recentNext()" [disabled]="recentPage >= recentTotalPages" aria-label="Next page"><mat-icon>chevron_right</mat-icon></button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .section-title { font-size: 14px; margin: 20px 0 12px; }
      .section-title:first-of-type { margin-top: 4px; }
      .voice-note { font-style: italic; margin: 0 0 12px; }
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
