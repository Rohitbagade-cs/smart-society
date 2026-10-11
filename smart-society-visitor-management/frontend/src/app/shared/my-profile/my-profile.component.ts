import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { formatApiError } from '../../core/utils';
import { fadeSlideIn } from '../../core/animations';

interface MeProfile {
  id: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: string;
  date_joined?: string;
  resident_profile?: {
    flat_no: string;
    wing?: string;
    floor?: number;
    phone?: string;
    family_members?: number;
  } | null;
  guard_profile?: {
    shift?: string;
    gate?: string;
    phone?: string;
  } | null;
}

/**
 * "My Profile" page — shared by resident, guard and admin portals.
 * View + self-service edit of the user's own information.
 * Writes go to PATCH /api/auth/me/ (whitelisted fields only; the role-aware
 * sections render from whichever profile (resident/guard) the user has).
 */
@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  animations: [fadeSlideIn],
  template: `
    <div class="page" [@fadeSlideIn]>
      <h1 class="page-title">My Profile</h1>
      <p class="page-subtitle">{{ subtitle }}</p>

      <div *ngIf="loading" class="profile-loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <mat-card *ngIf="!loading && profile" class="profile-card">
        <mat-card-content>
          <div class="profile-head">
            <div class="avatar">{{ initial }}</div>
            <div class="profile-id">
              <h2>{{ displayName }}</h2>
              <div class="profile-badges">
                <span class="flat-badge" *ngIf="isResident">
                  <mat-icon>apartment</mat-icon>
                  Flat {{ profile.resident_profile?.flat_no || '—' }}
                </span>
                <span class="flat-badge gate-badge" *ngIf="isGuard">
                  <mat-icon>location_on</mat-icon>
                  {{ profile.guard_profile?.gate || '—' }}
                </span>
                <span class="role-chip">{{ roleLabel }}</span>
              </div>
            </div>
            <span class="toolbar-spacer"></span>
            <button *ngIf="!editing" mat-stroked-button (click)="startEdit()">
              <mat-icon>edit</mat-icon> Edit profile
            </button>
          </div>

          <mat-divider></mat-divider>

          <!-- view mode -->
          <div *ngIf="!editing" class="detail-grid">
            <div class="detail"><span>Username</span><strong>{{ profile.username }}</strong></div>
            <div class="detail"><span>Full name</span><strong>{{ displayName }}</strong></div>
            <div class="detail"><span>Email</span><strong>{{ profile.email || '—' }}</strong></div>
            <div class="detail"><span>Phone</span><strong>{{ phone || '—' }}</strong></div>
            <ng-container *ngIf="isResident">
              <div class="detail"><span>Flat number</span><strong>{{ profile.resident_profile?.flat_no || '—' }}</strong></div>
              <div class="detail"><span>Wing</span><strong>{{ profile.resident_profile?.wing || '—' }}</strong></div>
              <div class="detail"><span>Floor</span><strong>{{ profile.resident_profile?.floor ?? '—' }}</strong></div>
              <div class="detail"><span>Family members</span><strong>{{ profile.resident_profile?.family_members ?? '—' }}</strong></div>
            </ng-container>
            <ng-container *ngIf="isGuard">
              <div class="detail"><span>Shift</span><strong>{{ shiftLabel }}</strong></div>
              <div class="detail"><span>Gate</span><strong>{{ profile.guard_profile?.gate || '—' }}</strong></div>
            </ng-container>
            <div class="detail"><span>Member since</span><strong>{{ profile.date_joined | date: 'mediumDate' }}</strong></div>
          </div>

          <!-- edit mode -->
          <form *ngIf="editing" [formGroup]="form" (ngSubmit)="save()" class="mt">
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>First name</mat-label>
                <input matInput formControlName="first_name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Last name</mat-label>
                <input matInput formControlName="last_name" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" />
                <mat-error *ngIf="form.controls.email.invalid">Enter a valid email</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Phone</mat-label>
                <input matInput formControlName="phone" />
              </mat-form-field>
              <ng-container *ngIf="isResident">
                <mat-form-field appearance="outline">
                  <mat-label>Flat number</mat-label>
                  <input matInput formControlName="flat_no" />
                  <mat-error *ngIf="form.controls.flat_no.invalid">Flat number is required</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Wing</mat-label>
                  <input matInput formControlName="wing" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Floor</mat-label>
                  <input matInput type="number" min="0" formControlName="floor" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Family members</mat-label>
                  <input matInput type="number" min="1" formControlName="family_members" />
                </mat-form-field>
              </ng-container>
              <ng-container *ngIf="isGuard">
                <mat-form-field appearance="outline">
                  <mat-label>Shift</mat-label>
                  <mat-select formControlName="shift">
                    <mat-option value="morning">Morning</mat-option>
                    <mat-option value="evening">Evening</mat-option>
                    <mat-option value="night">Night</mat-option>
                  </mat-select>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Gate</mat-label>
                  <input matInput formControlName="gate" />
                </mat-form-field>
              </ng-container>
            </div>
            <div class="form-actions">
              <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid || saving">
                {{ saving ? 'Saving…' : 'Save changes' }}
              </button>
              <button mat-stroked-button type="button" (click)="cancelEdit()" [disabled]="saving">
                Cancel
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .profile-loading {
        display: flex;
        justify-content: center;
        padding: 60px 0;
      }
      .profile-card {
        max-width: 860px;
      }
      .profile-head {
        display: flex;
        align-items: center;
        gap: 18px;
        margin-bottom: 18px;
        flex-wrap: wrap;
      }
      .avatar {
        width: 68px;
        height: 68px;
        border-radius: 22px;
        flex: none;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28px;
        font-weight: 800;
        color: #fff;
        background: var(--grad-brand);
        box-shadow: var(--shadow-primary);
      }
      .profile-id h2 {
        margin: 0 0 8px;
        font-size: 22px;
      }
      .profile-badges {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
      }
      .flat-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border-radius: 999px;
        background: var(--grad-brand);
        color: #fff;
        font-size: 13px;
        font-weight: 700;
        box-shadow: var(--shadow-primary);
      }
      .flat-badge.gate-badge {
        background: var(--grad-teal);
        box-shadow: 0 1px 2px rgba(16, 24, 40, 0.06), 0 8px 20px -6px rgba(0, 194, 168, 0.5);
      }
      .flat-badge mat-icon {
        font-size: 17px;
        width: 17px;
        height: 17px;
      }
      .role-chip {
        display: inline-flex;
        align-items: center;
        padding: 6px 14px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        background: var(--primary-soft);
        color: var(--primary-ink);
        border: 1px solid rgba(47, 107, 255, 0.22);
      }
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 6px 28px;
        margin-top: 18px;
      }
      .detail {
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 12px 0;
        border-bottom: 1px solid var(--border-soft);
      }
      .detail span {
        font-size: 11.5px;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        color: var(--text-faint);
        font-weight: 600;
      }
      .detail strong {
        font-size: 14.5px;
        color: var(--text);
        font-weight: 600;
      }
      @media (max-width: 600px) {
        .profile-head .mat-mdc-stroked-button {
          width: 100%;
        }
      }
    `,
  ],
})
export class MyProfileComponent implements OnInit {
  private api = inject(ApiService);
  private fb = inject(FormBuilder);
  private toast = inject(ToastService);

  profile: MeProfile | null = null;
  loading = true;
  editing = false;
  saving = false;

  form = this.fb.group({
    first_name: [''],
    last_name: [''],
    email: ['', Validators.email],
    phone: [''],
    flat_no: ['', Validators.required],
    wing: [''],
    floor: [0],
    family_members: [1],
    shift: ['morning'],
    gate: [''],
  });

  ngOnInit(): void {
    this.load();
  }

  get isResident(): boolean {
    return this.profile?.role === 'resident';
  }

  get isGuard(): boolean {
    return this.profile?.role === 'guard';
  }

  get roleLabel(): string {
    switch (this.profile?.role) {
      case 'resident':
        return 'Resident';
      case 'guard':
        return 'Security Guard';
      case 'admin':
        return 'Administrator';
      default:
        return this.profile?.role || '';
    }
  }

  get subtitle(): string {
    if (this.isResident)
      return 'Your resident information — keep it up to date so the guard desk can reach the right flat.';
    if (this.isGuard) return 'Your duty profile — shift and gate assignment.';
    return 'Your administrator account details.';
  }

  get displayName(): string {
    const p = this.profile;
    if (!p) return '';
    const full = `${p.first_name || ''} ${p.last_name || ''}`.trim();
    return full || p.username;
  }

  get initial(): string {
    return (this.displayName.charAt(0) || '?').toUpperCase();
  }

  get phone(): string {
    const p = this.profile;
    return p?.resident_profile?.phone || p?.guard_profile?.phone || p?.phone || '';
  }

  get shiftLabel(): string {
    const s = this.profile?.guard_profile?.shift;
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : '—';
  }

  load(): void {
    this.loading = true;
    this.api.get<MeProfile>('/auth/me/').subscribe({
      next: (p) => {
        this.profile = p;
        this.loading = false;
        // Flat number is only required for residents — admins and guards
        // don't have a flat field, so the validator must not block them.
        const flatCtrl = this.form.get('flat_no');
        if (this.isResident) {
          flatCtrl?.addValidators(Validators.required);
        } else {
          flatCtrl?.clearValidators();
        }
        flatCtrl?.updateValueAndValidity();
        this.resetForm();
      },
      error: (e) => {
        this.loading = false;
        this.toast.error(formatApiError(e, 'Could not load your profile.'));
      },
    });
  }

  startEdit(): void {
    this.resetForm();
    this.editing = true;
  }

  cancelEdit(): void {
    this.resetForm();
    this.editing = false;
  }

  save(): void {
    if (this.form.invalid || this.saving) return;
    this.saving = true;
    const v = this.form.value;
    // Send only the fields relevant to this user's role.
    const payload: Record<string, unknown> = {
      first_name: v.first_name,
      last_name: v.last_name,
      email: v.email,
      phone: v.phone,
    };
    if (this.isResident) {
      Object.assign(payload, {
        flat_no: v.flat_no,
        wing: v.wing,
        floor: v.floor,
        family_members: v.family_members,
      });
    }
    if (this.isGuard) {
      Object.assign(payload, { shift: v.shift, gate: v.gate });
    }
    this.api.patch<MeProfile>('/auth/me/', payload).subscribe({
      next: (p) => {
        this.profile = p;
        this.saving = false;
        this.editing = false;
        this.toast.success('Profile updated.');
      },
      error: (e) => {
        this.saving = false;
        this.toast.error(formatApiError(e, 'Could not save your profile.'));
      },
    });
  }

  private resetForm(): void {
    const p = this.profile;
    const rp = p?.resident_profile;
    const gp = p?.guard_profile;
    this.form.reset({
      first_name: p?.first_name || '',
      last_name: p?.last_name || '',
      email: p?.email || '',
      phone: this.phone,
      flat_no: rp?.flat_no || '',
      wing: rp?.wing || '',
      floor: rp?.floor ?? 0,
      family_members: rp?.family_members ?? 1,
      shift: gp?.shift || 'morning',
      gate: gp?.gate || '',
    });
  }
}
