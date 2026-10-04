import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../core/api.service';
import { AccessLog, Direction, VisitRequest } from '../../core/models';
import { formatApiError, toISODate } from '../../core/utils';

@Component({
  selector: 'app-entry-exit',
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
    MatTooltipModule,
  ],
  template: `
    <div class="page">
      <h1 class="page-title">Entry / Exit</h1>
      <p class="page-subtitle">Record gate movements for approved, verified visit requests</p>

      <!-- FUTURE HOOK: smart-gate barrier controls go here (Open barrier button,
           live barrier status). See core/future/smart-gate.service.ts — render only
           when SmartGateService.enabled is true. -->
      <mat-card class="mb">
        <mat-card-content>
          <form [formGroup]="form" class="form-grid" style="align-items:end;">
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Visit request (approved / checked-in)</mat-label>
              <mat-select formControlName="visit_request_id">
                <mat-option *ngFor="let r of activeRequests" [value]="r.id">
                  #{{ r.id }} · {{ r.visitor?.full_name }} · {{ r.resident_flat || 'Flat —' }}
                  · {{ r.status }}{{ r.otp_verified ? ' · OTP ✓' : '' }}
                </mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Gate</mat-label>
              <mat-select formControlName="gate">
                <mat-option *ngFor="let g of gates" [value]="g">{{ g }}</mat-option>
              </mat-select>
            </mat-form-field>
            <div class="btn-cell">
              <button
                mat-raised-button
                color="primary"
                type="button"
                (click)="record('in')"
                [disabled]="form.invalid || busy || !canEnter(selectedRequest)"
                matTooltip="Visitor must be approved first"
              >
                <mat-icon>login</mat-icon> Entry (In)
              </button>
              <button
                mat-raised-button
                color="accent"
                type="button"
                (click)="record('out')"
                [disabled]="form.invalid || busy || !canExit(selectedRequest)"
                matTooltip="Visitor must be checked in first"
              >
                <mat-icon>logout</mat-icon> Exit (Out)
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header><mat-card-title>Today's movements</mat-card-title></mat-card-header>
        <mat-card-content>
          <div class="table-wrap">
            <table mat-table [dataSource]="todayLogs">
              <ng-container matColumnDef="timestamp">
                <th mat-header-cell *matHeaderCellDef>Time</th>
                <td mat-cell *matCellDef="let l">{{ l.timestamp | date: 'shortTime' }}</td>
              </ng-container>
              <ng-container matColumnDef="visitor_name">
                <th mat-header-cell *matHeaderCellDef>Visitor</th>
                <td mat-cell *matCellDef="let l">{{ l.visitor_name || '#' + l.visit_request }}</td>
              </ng-container>
              <ng-container matColumnDef="gate">
                <th mat-header-cell *matHeaderCellDef>Gate</th>
                <td mat-cell *matCellDef="let l">{{ l.gate }}</td>
              </ng-container>
              <ng-container matColumnDef="direction">
                <th mat-header-cell *matHeaderCellDef>Direction</th>
                <td mat-cell *matCellDef="let l">
                  <mat-icon [color]="l.direction === 'in' ? 'primary' : 'accent'">
                    {{ l.direction === 'in' ? 'login' : 'logout' }}
                  </mat-icon>
                  {{ l.direction === 'in' ? 'Entry' : 'Exit' }}
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="logCols"></tr>
              <tr mat-row *matRowDef="let row; columns: logCols"></tr>
            </table>
            <div class="empty-state" *ngIf="todayLogs.length === 0">No movements recorded today.</div>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class EntryExitComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  activeRequests: VisitRequest[] = [];
  gates: string[] = ['Main Gate'];
  todayLogs: AccessLog[] = [];
  logCols = ['timestamp', 'visitor_name', 'gate', 'direction'];
  busy = false;

  form = this.fb.group({
    visit_request_id: [null as number | null, Validators.required],
    gate: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadRequests();

    this.api.get<{ gates?: string }>('/society/').subscribe({
      next: (res) => {
        const s = this.unwrapSociety(res);
        const raw = s?.gates || 'Main Gate';
        this.gates = String(raw).split(',').map((g) => g.trim()).filter(Boolean);
        this.form.patchValue({ gate: this.gates[0] });
      },
    });

    this.loadToday();
  }

  /** Requests eligible for a gate movement: approved (entry) or checked-in (exit). */
  private loadRequests(): void {
    forkJoin([
      this.api.list<VisitRequest>('/visit-requests/', { page_size: 100, status: 'approved' }),
      this.api.list<VisitRequest>('/visit-requests/', { page_size: 100, status: 'checked_in' }),
    ]).subscribe({
      next: ([a, b]) => (this.activeRequests = [...a.results, ...b.results]),
      error: () =>
        this.snack.open('Failed to load visit requests', 'Close', { duration: 3000 }),
    });
  }

  get selectedRequest(): VisitRequest | null {
    const id = this.form.value.visit_request_id;
    return this.activeRequests.find((r) => r.id === id) ?? null;
  }

  canEnter(req: VisitRequest | null): boolean {
    return !!req && (req.status === 'approved' || (req.otp_verified && req.status === 'pending'));
  }

  canExit(req: VisitRequest | null): boolean {
    return !!req && req.status === 'checked_in';
  }

  private unwrapSociety(res: unknown): { gates?: string } | null {
    if (!res) return null;
    if (Array.isArray(res)) return (res as { gates?: string }[])[0] ?? null;
    const r = res as { results?: { gates?: string }[]; gates?: string };
    if (r.results) return r.results[0] ?? null;
    return r;
  }

  loadToday(): void {
    this.api
      .list<AccessLog>('/access-logs/', { page_size: 50, date: toISODate(new Date()) })
      .subscribe({ next: (r) => (this.todayLogs = r.results) });
  }

  record(direction: Direction): void {
    if (this.form.invalid || this.busy) return;
    const { visit_request_id, gate } = this.form.value;
    this.busy = true;
    this.api
      .post<AccessLog>('/access-logs/', { visit_request_id, gate, direction })
      .subscribe({
        next: () => {
          this.busy = false;
          this.snack.open(
            `${direction === 'in' ? 'Entry' : 'Exit'} recorded at ${gate}`,
            'Close',
            { duration: 3000 }
          );
          this.form.patchValue({ visit_request_id: null });
          this.loadRequests();
          this.loadToday();
        },
        error: (e) => {
          this.busy = false;
          this.snack.open(formatApiError(e?.error, 'Failed to record movement'), 'Close', {
            duration: 4000,
          });
        },
      });
  }
}
