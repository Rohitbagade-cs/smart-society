import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="login-wrap">
      <div class="orbs" aria-hidden="true">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>
      <div class="login-art" aria-hidden="true">
        <mat-icon class="lfloat lf-1">shield</mat-icon>
        <mat-icon class="lfloat lf-2">qr_code_2</mat-icon>
        <mat-icon class="lfloat lf-3">fingerprint</mat-icon>
        <mat-icon class="lfloat lf-4">videocam</mat-icon>
        <mat-icon class="lfloat lf-5">key</mat-icon>
        <mat-icon class="lfloat lf-6">badge</mat-icon>
        <svg class="login-skyline" viewBox="0 0 1440 210" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="lskybuild" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a3b0ec"/><stop offset="1" stop-color="#8290dd"/></linearGradient><linearGradient id="lhorizon" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2f6bff"/><stop offset="0.5" stop-color="#00c2a8"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><g><rect x="-20" y="87" width="80" height="123" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="82" y="110" width="103" height="100" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="213" y="85" width="72" height="125" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="294" y="93" width="111" height="117" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="347" y="67" width="4" height="26" fill="#c9d2f5" opacity="0.85"/><circle cx="349" cy="65" r="3.5" fill="#ff5d5d" class="lbeacon"/><rect x="426" y="110" width="125" height="100" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="486" y="84" width="4" height="26" fill="#c9d2f5" opacity="0.85"/><circle cx="488" cy="82" r="3.5" fill="#ff5d5d" class="lbeacon"/><rect x="574" y="91" width="100" height="119" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="622" y="65" width="4" height="26" fill="#c9d2f5" opacity="0.85"/><circle cx="624" cy="63" r="3.5" fill="#ff5d5d" class="lbeacon"/><rect x="682" y="77" width="80" height="133" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="720" y="51" width="4" height="26" fill="#c9d2f5" opacity="0.85"/><circle cx="722" cy="49" r="3.5" fill="#ff5d5d" class="lbeacon"/><rect x="771" y="119" width="81" height="91" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="865" y="119" width="76" height="91" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="901" y="93" width="4" height="26" fill="#c9d2f5" opacity="0.85"/><circle cx="903" cy="91" r="3.5" fill="#ff5d5d" class="lbeacon"/><rect x="968" y="110" width="103" height="100" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="1084" y="109" width="129" height="101" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="1146" y="83" width="4" height="26" fill="#c9d2f5" opacity="0.85"/><circle cx="1148" cy="81" r="3.5" fill="#ff5d5d" class="lbeacon"/><rect x="1232" y="119" width="85" height="91" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="1346" y="134" width="100" height="76" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="1394" y="108" width="4" height="26" fill="#c9d2f5" opacity="0.85"/><circle cx="1396" cy="106" r="3.5" fill="#ff5d5d" class="lbeacon"/><rect x="1456" y="93" width="126" height="117" rx="2" fill="#c9d2f5" opacity="0.85"/><rect x="-10" y="133" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="-10" y="165" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="92" y="124" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="134" y="124" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="134" y="156" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="275" y="99" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="275" y="131" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="275" y="163" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="304" y="139" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="350" y="107" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="350" y="139" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="395" y="107" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="395" y="139" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="436" y="124" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="541" y="156" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="584" y="169" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="624" y="105" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="624" y="137" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="624" y="169" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="664" y="137" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="664" y="169" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="692" y="91" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="752" y="123" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="781" y="165" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="931" y="133" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="1061" y="124" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="1061" y="156" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="1094" y="123" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="1130" y="155" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="1167" y="155" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="1203" y="123" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="1203" y="155" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="1307" y="133" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="1307" y="165" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="1396" y="180" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="1436" y="148" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="1466" y="107" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/><rect x="1501" y="107" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="1501" y="171" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="1537" y="139" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin a"/><rect x="1572" y="139" width="10" height="13" rx="1.5" fill="#aeb9ee" class="lwin b"/></g><g><rect x="-20" y="36" width="121" height="174" rx="2" fill="url(#lskybuild)" opacity="1.0"/><rect x="126" y="87" width="111" height="123" rx="2" fill="url(#lskybuild)" opacity="1.0"/><rect x="179" y="61" width="4" height="26" fill="url(#lskybuild)" opacity="1.0"/><circle cx="181" cy="59" r="3.5" fill="#ff5d5d" class="lbeacon"/><rect x="257" y="60" width="98" height="150" rx="2" fill="url(#lskybuild)" opacity="1.0"/><rect x="379" y="41" width="102" height="169" rx="2" fill="url(#lskybuild)" opacity="1.0"/><rect x="500" y="101" width="103" height="109" rx="2" fill="url(#lskybuild)" opacity="1.0"/><rect x="621" y="82" width="99" height="128" rx="2" fill="url(#lskybuild)" opacity="1.0"/><rect x="668" y="56" width="4" height="26" fill="url(#lskybuild)" opacity="1.0"/><circle cx="670" cy="54" r="3.5" fill="#ff5d5d" class="lbeacon"/><rect x="733" y="106" width="100" height="104" rx="2" fill="url(#lskybuild)" opacity="1.0"/><rect x="860" y="79" width="123" height="131" rx="2" fill="url(#lskybuild)" opacity="1.0"/><rect x="1005" y="31" width="128" height="179" rx="2" fill="url(#lskybuild)" opacity="1.0"/><rect x="1145" y="34" width="120" height="176" rx="2" fill="url(#lskybuild)" opacity="1.0"/><rect x="1273" y="36" width="154" height="174" rx="2" fill="url(#lskybuild)" opacity="1.0"/><rect x="1348" y="10" width="4" height="26" fill="url(#lskybuild)" opacity="1.0"/><circle cx="1350" cy="8" r="3.5" fill="#ff5d5d" class="lbeacon"/><rect x="1451" y="108" width="149" height="102" rx="2" fill="url(#lskybuild)" opacity="1.0"/><rect x="-10" y="146" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="24" y="50" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="24" y="82" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin c"/><rect x="24" y="114" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin b"/><rect x="57" y="82" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin c"/><rect x="57" y="114" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin b"/><rect x="57" y="146" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="91" y="50" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="91" y="114" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin b"/><rect x="136" y="101" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin b"/><rect x="182" y="101" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin b"/><rect x="227" y="165" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin c"/><rect x="267" y="74" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin c"/><rect x="267" y="138" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin a"/><rect x="306" y="74" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin c"/><rect x="306" y="106" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin b"/><rect x="306" y="138" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="306" y="170" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin c"/><rect x="345" y="106" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin b"/><rect x="389" y="151" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin a"/><rect x="430" y="151" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="471" y="119" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin b"/><rect x="471" y="151" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin a"/><rect x="593" y="147" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="631" y="128" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin b"/><rect x="631" y="160" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="670" y="128" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin b"/><rect x="670" y="160" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin a"/><rect x="710" y="128" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin b"/><rect x="710" y="160" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="743" y="120" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin a"/><rect x="870" y="93" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin b"/><rect x="870" y="125" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin a"/><rect x="870" y="157" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin c"/><rect x="939" y="93" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin b"/><rect x="939" y="125" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin a"/><rect x="973" y="125" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="973" y="157" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin c"/><rect x="1015" y="77" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin b"/><rect x="1015" y="109" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin a"/><rect x="1051" y="77" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin b"/><rect x="1051" y="109" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="1087" y="77" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin b"/><rect x="1087" y="141" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin c"/><rect x="1123" y="45" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin c"/><rect x="1123" y="109" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="1155" y="80" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin c"/><rect x="1155" y="112" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin b"/><rect x="1155" y="144" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin a"/><rect x="1188" y="48" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin a"/><rect x="1222" y="80" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin c"/><rect x="1222" y="144" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin a"/><rect x="1255" y="48" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin a"/><rect x="1255" y="144" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="1283" y="114" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin c"/><rect x="1283" y="146" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin b"/><rect x="1316" y="82" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin a"/><rect x="1316" y="114" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin c"/><rect x="1316" y="146" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin b"/><rect x="1350" y="82" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin a"/><rect x="1350" y="114" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin c"/><rect x="1384" y="114" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin c"/><rect x="1384" y="146" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin b"/><rect x="1417" y="50" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin b"/><rect x="1417" y="114" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin c"/><rect x="1461" y="122" width="10" height="13" rx="1.5" fill="#3d4a9e" class="lwin c"/><rect x="1461" y="154" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin b"/><rect x="1547" y="154" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin b"/><rect x="1590" y="122" width="10" height="13" rx="1.5" fill="#4a5fc1" class="lwin c"/></g><rect x="0" y="207" width="1440" height="3" fill="url(#lhorizon)" class="lhorizon"/></svg>
      </div>
      <mat-card class="login-card">
        <mat-card-content>
          <div class="login-brand">
            <div class="brand-mark"><mat-icon>apartment</mat-icon></div>
            <h2>Smart Society</h2>
            <p class="page-subtitle">Visitor Management &amp; Secure Access Control</p>
          </div>

          <div class="login-error" *ngIf="error">{{ error }}</div>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Username</mat-label>
              <input matInput formControlName="username" autocomplete="username" />
              <mat-icon matSuffix>person</mat-icon>
              <mat-error *ngIf="form.controls.username.invalid">Username is required</mat-error>
            </mat-form-field>

            <mat-form-field class="full-width" appearance="outline">
              <mat-label>Password</mat-label>
              <input
                matInput
                [type]="hide ? 'password' : 'text'"
                formControlName="password"
                autocomplete="current-password"
              />
              <button mat-icon-button matSuffix type="button" (click)="hide = !hide" [attr.aria-label]="'Toggle password visibility'">
                <mat-icon>{{ hide ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="form.controls.password.invalid">Password is required</mat-error>
            </mat-form-field>

            <button
              mat-raised-button
              color="primary"
              class="full-width login-btn"
              type="submit"
              [disabled]="form.invalid || loading"
            >
              <mat-spinner *ngIf="loading" diameter="20" style="display:inline-block; margin-right:8px;"></mat-spinner>
              {{ loading ? 'Signing in…' : 'Sign in' }}
            </button>
          </form>

          <p class="page-subtitle mt" style="text-align:center; font-size:12px;">
            JWT-secured sign-in. Accounts are created by the society admin.
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
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
        opacity: 0.32;
        animation: drift 18s ease-in-out infinite alternate;
      }
      .orb-1 {
        width: 480px;
        height: 480px;
        background: radial-gradient(circle, #b9c6ff, transparent 70%);
        top: -120px;
        left: -120px;
      }
      .orb-2 {
        width: 420px;
        height: 420px;
        background: radial-gradient(circle, #a9ecdf, transparent 70%);
        top: 40%;
        right: -140px;
        animation-delay: -6s;
      }
      .orb-3 {
        width: 380px;
        height: 380px;
        background: radial-gradient(circle, #d7c6ff, transparent 70%);
        bottom: -100px;
        left: 30%;
        animation-delay: -12s;
      }
      @keyframes drift {
        from {
          transform: translate(0, 0) scale(1);
        }
        to {
          transform: translate(60px, 40px) scale(1.15);
        }
      }
      /* project-themed animated backdrop: skyline + floating security icons */
      .login-art {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
      }
      .login-skyline {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 210px;
      }
      .lfloat {
        position: absolute;
        color: rgba(47, 107, 255, 0.14);
        animation: lfloaty 9s ease-in-out infinite;
      }
      .lf-1 { top: 10%; left: 7%; font-size: 54px !important; width: 54px !important; height: 54px !important; }
      .lf-2 { top: 64%; left: 11%; font-size: 44px !important; width: 44px !important; height: 44px !important; animation-delay: -2.5s; color: rgba(0, 194, 168, 0.16); }
      .lf-3 { top: 16%; right: 9%; font-size: 48px !important; width: 48px !important; height: 48px !important; animation-delay: -4s; color: rgba(124, 58, 237, 0.13); }
      .lf-4 { top: 58%; right: 7%; font-size: 58px !important; width: 58px !important; height: 58px !important; animation-delay: -1.2s; }
      .lf-5 { top: 38%; left: 4%; font-size: 38px !important; width: 38px !important; height: 38px !important; animation-delay: -6s; color: rgba(0, 194, 168, 0.15); }
      .lf-6 { top: 34%; right: 4%; font-size: 40px !important; width: 40px !important; height: 40px !important; animation-delay: -7.5s; color: rgba(124, 58, 237, 0.12); }
      @keyframes lfloaty {
        0%, 100% { transform: translateY(0) rotate(-6deg); }
        50% { transform: translateY(-26px) rotate(6deg); }
      }
      .lwin { animation: ltwinkle 3.4s ease-in-out infinite; }
      .lwin.b { animation-duration: 4.8s; animation-delay: -1.6s; }
      .lwin.c { animation-duration: 6s; animation-delay: -3s; }
      @keyframes ltwinkle {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      .lbeacon { animation: lbeaconBlink 2.4s steps(2, start) infinite; }
      @keyframes lbeaconBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.15; }
      }
      .lhorizon { filter: drop-shadow(0 0 6px rgba(0, 194, 168, 0.7)); }
      @media (max-width: 720px) {
        .lfloat { display: none; }
        .login-skyline { height: 150px; }
      }
      .login-btn {
        margin-top: 6px;
        padding: 10px 0 !important;
        font-size: 15px !important;
        border-radius: 14px !important;
      }
      .mt {
        margin-top: 18px;
      }
      .login-wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        position: relative;
        background: var(--bg);
      }
      .login-card {
        width: 100%;
        max-width: 420px;
        position: relative;
        z-index: 1;
        padding: 8px;
      }
      .login-brand {
        text-align: center;
        margin-bottom: 24px;
      }
      .login-brand .brand-mark {
        width: 56px;
        height: 56px;
        border-radius: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: var(--primary);
        color: #fff;
        box-shadow: var(--shadow-primary);
        margin-bottom: 14px;
      }
      .login-brand .brand-mark mat-icon {
        font-size: 30px;
        width: 30px;
        height: 30px;
      }
      .login-brand h2 {
        font-size: 22px;
        margin-bottom: 6px;
      }
      .login-error {
        background: var(--danger-bg);
        color: var(--danger);
        border: 1px solid rgba(217, 45, 32, 0.25);
        border-radius: var(--r-sm);
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 500;
        margin-bottom: 16px;
      }
    `,
  ],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  hide = true;
  error = '';

  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.error = '';
    const { username, password } = this.form.value;
    this.auth.login(username ?? '', password ?? '').subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate([this.auth.homeRoute()]);
      },
      error: (e) => {
        this.loading = false;
        this.error =
          e?.error?.detail || e?.error?.non_field_errors?.[0] || 'Login failed. Check your credentials.';
      },
    });
  }
}
