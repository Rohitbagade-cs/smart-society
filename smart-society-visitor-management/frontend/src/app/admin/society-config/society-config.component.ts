import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../core/api.service';
import { Society } from '../../core/models';

@Component({
  selector: 'app-society-config',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page">
      <h1 class="page-title">Society Configuration</h1>
      <p class="page-subtitle">Singleton settings shared by every module</p>

      <mat-card>
        <mat-card-content>
          <div *ngIf="loading"><mat-spinner diameter="36"></mat-spinner></div>
          <form [formGroup]="form" (ngSubmit)="save()" *ngIf="!loading" class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Society name</mat-label>
              <input matInput formControlName="name" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>City</mat-label>
              <input matInput formControlName="city" />
            </mat-form-field>
            <mat-form-field appearance="outline" style="grid-column: 1 / -1;">
              <mat-label>Address</mat-label>
              <textarea matInput rows="2" formControlName="address"></textarea>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Total flats</mat-label>
              <input matInput type="number" formControlName="total_flats" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Gates (comma separated)</mat-label>
              <input matInput formControlName="gates" placeholder="Main Gate, Service Gate" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Contact email</mat-label>
              <input matInput type="email" formControlName="contact_email" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Contact phone</mat-label>
              <input matInput formControlName="contact_phone" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Visiting hours start</mat-label>
              <input matInput type="time" formControlName="visiting_hours_start" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Visiting hours end</mat-label>
              <input matInput type="time" formControlName="visiting_hours_end" />
            </mat-form-field>
            <mat-checkbox formControlName="otp_enabled">OTP verification enabled</mat-checkbox>
            <mat-checkbox formControlName="qr_enabled">QR code passes enabled</mat-checkbox>
          </form>
          <div class="form-actions" *ngIf="!loading">
            <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving">
              {{ saving ? 'Saving…' : 'Save configuration' }}
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class SocietyConfigComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private snack = inject(MatSnackBar);

  societyId: number | null = null;
  loading = true;
  saving = false;

  form = this.fb.group({
    name: ['', Validators.required],
    address: [''],
    city: [''],
    total_flats: [0],
    gates: ['Main Gate'],
    contact_email: ['', Validators.email],
    contact_phone: [''],
    visiting_hours_start: ['08:00'],
    visiting_hours_end: ['22:00'],
    otp_enabled: [true],
    qr_enabled: [true],
  });

  ngOnInit(): void {
    // GET /api/society/ returns the singleton (object, or single-item list — handle both).
    this.api.get<unknown>('/society/').subscribe({
      next: (res) => {
        const s = this.unwrap(res);
        if (s) {
          this.societyId = s.id;
          this.form.patchValue({
            name: s.name ?? '',
            address: s.address ?? '',
            city: s.city ?? '',
            total_flats: s.total_flats ?? 0,
            gates: s.gates ?? 'Main Gate',
            contact_email: s.contact_email ?? '',
            contact_phone: s.contact_phone ?? '',
            visiting_hours_start: String(s.visiting_hours_start ?? '08:00').slice(0, 5),
            visiting_hours_end: String(s.visiting_hours_end ?? '22:00').slice(0, 5),
            otp_enabled: s.otp_enabled ?? true,
            qr_enabled: s.qr_enabled ?? true,
          });
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snack.open('Failed to load society configuration', 'Close', { duration: 3000 });
      },
    });
  }

  private unwrap(res: unknown): Society | null {
    if (!res) return null;
    const r = res as { results?: Society[] };
    if (Array.isArray(res)) return (res as Society[])[0] ?? null;
    if (r.results) return r.results[0] ?? null;
    return res as Society;
  }

  save(): void {
    if (this.form.invalid || this.saving || this.societyId === null) return;
    this.saving = true;
    this.api.patch<Society>(`/society/${this.societyId}/`, this.form.value).subscribe({
      next: () => {
        this.saving = false;
        this.snack.open('Configuration saved', 'Close', { duration: 2500 });
      },
      error: () => {
        this.saving = false;
        this.snack.open('Save failed', 'Close', { duration: 3000 });
      },
    });
  }
}
