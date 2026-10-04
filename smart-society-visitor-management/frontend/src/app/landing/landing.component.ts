import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../core/auth.service';
import { fadeSlideIn, staggerCards } from '../core/animations';

interface RoleCard {
  icon: string;
  title: string;
  desc: string;
  points: string[];
  accent: string;
}

interface Feature {
  icon: string;
  title: string;
  desc: string;
}

/** "Register" opens this: accounts are provisioned by the society admin. */
@Component({
  selector: 'app-request-access-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="req-dialog">
      <mat-icon class="req-icon">mark_email_read</mat-icon>
      <h2>Request an account</h2>
      <p>
        Accounts for guards and residents are created by your society
        administrator. Contact them to get your login credentials.
      </p>
      <div class="req-actions">
        <button mat-button (click)="close()">Close</button>
        <button mat-raised-button color="primary" (click)="goLogin()">Go to Login</button>
      </div>
    </div>
  `,
  styles: [
    `
      .req-dialog {
        padding: 28px;
        text-align: center;
        max-width: 380px;
      }
      .req-icon {
        font-size: 44px;
        width: 44px;
        height: 44px;
        color: #3f51b5;
      }
      .req-dialog h2 {
        margin: 12px 0 8px;
      }
      .req-dialog p {
        color: #666;
        font-size: 14px;
        line-height: 1.6;
      }
      .req-actions {
        display: flex;
        gap: 8px;
        justify-content: center;
        margin-top: 20px;
      }
    `,
  ],
})
export class RequestAccessDialogComponent {
  private ref = inject(MatDialogRef<RequestAccessDialogComponent>);
  private router = inject(Router);

  close(): void {
    this.ref.close();
  }

  goLogin(): void {
    this.ref.close();
    this.router.navigate(['/login']);
  }
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatDialogModule,
  ],
  animations: [fadeSlideIn, staggerCards],
  template: `
    <div class="landing">
      <!-- ambient background -->
      <div class="orbs" aria-hidden="true">
        <div class="orb orb-1"></div>
        <div class="orb orb-2"></div>
        <div class="orb orb-3"></div>
      </div>

      <!-- nav -->
      <header class="nav" [@fadeSlideIn]>
        <div class="nav-inner">
          <div class="brand">
            <mat-icon>domain</mat-icon>
            <span>Smart Society</span>
          </div>
          <nav class="nav-links">
            <a (click)="scrollTo('roles')">Portals</a>
            <a (click)="scrollTo('features')">Features</a>
            <a (click)="scrollTo('how')">How it works</a>
          </nav>
          <div class="nav-actions">
            <button mat-button class="nav-login" routerLink="/login">Login</button>
            <button mat-raised-button color="accent" (click)="openRegister()">Register</button>
          </div>
        </div>
      </header>

      <!-- hero -->
      <section class="hero">
        <mat-icon class="float-icon fi-1">shield</mat-icon>
        <mat-icon class="float-icon fi-2">qr_code_2</mat-icon>
        <mat-icon class="float-icon fi-3">notifications_active</mat-icon>
        <mat-icon class="float-icon fi-4">verified_user</mat-icon>

        <div class="hero-inner" [@fadeSlideIn]>
          <div class="hero-badge">
            <mat-icon>auto_awesome</mat-icon>
            AI-powered visitor management
          </div>
          <h1>
            Visitor management<br />
            that's
            <span class="rotator">
              <span
                *ngFor="let w of words; let i = index"
                class="rot-word grad-text"
                [class.active]="i === wordIndex"
                >{{ w }}</span
              >
            </span>
          </h1>
          <p class="hero-sub">
            Register visitors in seconds, get resident approvals instantly, and let AI
            watch the gates — secure access control for modern housing societies.
          </p>
          <div class="hero-ctas">
            <button mat-raised-button color="accent" class="cta-big" routerLink="/login">
              <mat-icon>login</mat-icon> Login to dashboard
            </button>
            <button mat-stroked-button class="cta-ghost" (click)="openRegister()">
              Register
            </button>
          </div>
          <div class="hero-stats">
            <div><strong>3</strong><span>role portals</span></div>
            <div><strong>6</strong><span>AI features</span></div>
            <div><strong>100%</strong><span>audit-trailed</span></div>
          </div>
        </div>
        <div class="scroll-hint" (click)="scrollTo('roles')">
          <mat-icon>keyboard_arrow_down</mat-icon>
        </div>
        <svg class="skyline" viewBox="0 0 1440 240" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><defs><linearGradient id="skybuild" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fabec"/><stop offset="1" stop-color="#7c8add"/></linearGradient><linearGradient id="horizonGlow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2f6bff"/><stop offset="0.5" stop-color="#00c2a8"/><stop offset="1" stop-color="#7c3aed"/></linearGradient></defs><g><rect x="-20" y="141" width="90" height="99" rx="2" fill="#c3cdf5" opacity="0.85"/><rect x="-20" y="141" width="90" height="3" fill="#00c2a8" opacity="0.85" class="roofline"/><rect x="89" y="130" width="74" height="110" rx="2" fill="#c3cdf5" opacity="0.85"/><rect x="124" y="100" width="4" height="30" fill="#c3cdf5" opacity="0.85"/><circle cx="126" cy="98" r="4" fill="#ff5d5d" class="beacon"/><rect x="181" y="132" width="73" height="108" rx="2" fill="#c3cdf5" opacity="0.85"/><rect x="215" y="102" width="4" height="30" fill="#c3cdf5" opacity="0.85"/><circle cx="217" cy="100" r="4" fill="#ff5d5d" class="beacon"/><rect x="278" y="136" width="106" height="104" rx="2" fill="#c3cdf5" opacity="0.85"/><rect x="408" y="102" width="129" height="138" rx="2" fill="#c3cdf5" opacity="0.85"/><rect x="408" y="102" width="129" height="3" fill="#00c2a8" opacity="0.85" class="roofline"/><rect x="558" y="155" width="96" height="85" rx="2" fill="#c3cdf5" opacity="0.85"/><rect x="558" y="155" width="96" height="3" fill="#00c2a8" opacity="0.85" class="roofline"/><rect x="674" y="149" width="74" height="91" rx="2" fill="#c3cdf5" opacity="0.85"/><rect x="775" y="103" width="122" height="137" rx="2" fill="#c3cdf5" opacity="0.85"/><rect x="834" y="73" width="4" height="30" fill="#c3cdf5" opacity="0.85"/><circle cx="836" cy="71" r="4" fill="#ff5d5d" class="beacon"/><rect x="775" y="103" width="122" height="3" fill="#00c2a8" opacity="0.85" class="roofline"/><rect x="917" y="90" width="95" height="150" rx="2" fill="#c3cdf5" opacity="0.85"/><rect x="962" y="60" width="4" height="30" fill="#c3cdf5" opacity="0.85"/><circle cx="964" cy="58" r="4" fill="#ff5d5d" class="beacon"/><rect x="917" y="90" width="95" height="3" fill="#00c2a8" opacity="0.85" class="roofline"/><rect x="1023" y="124" width="86" height="116" rx="2" fill="#c3cdf5" opacity="0.85"/><rect x="1064" y="94" width="4" height="30" fill="#c3cdf5" opacity="0.85"/><circle cx="1066" cy="92" r="4" fill="#ff5d5d" class="beacon"/><rect x="1136" y="154" width="117" height="86" rx="2" fill="#c3cdf5" opacity="0.85"/><rect x="1271" y="136" width="73" height="104" rx="2" fill="#c3cdf5" opacity="0.85"/><rect x="1305" y="106" width="4" height="30" fill="#c3cdf5" opacity="0.85"/><circle cx="1307" cy="104" r="4" fill="#ff5d5d" class="beacon"/><rect x="1271" y="136" width="73" height="3" fill="#00c2a8" opacity="0.85" class="roofline"/><rect x="1354" y="148" width="104" height="92" rx="2" fill="#c3cdf5" opacity="0.85"/><rect x="-10" y="187" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="60" y="155" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="60" y="187" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="99" y="176" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="99" y="208" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="191" y="146" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="191" y="178" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="191" y="210" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="244" y="146" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="244" y="210" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="288" y="150" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="288" y="182" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="331" y="150" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="374" y="150" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="374" y="182" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="418" y="116" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="418" y="180" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="454" y="116" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="454" y="148" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="454" y="180" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="491" y="116" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="491" y="180" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="527" y="148" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="527" y="180" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="606" y="201" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="644" y="169" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="644" y="201" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="684" y="195" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="785" y="149" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="785" y="181" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="819" y="117" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="819" y="149" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="819" y="181" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="853" y="149" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="853" y="181" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="887" y="117" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="887" y="181" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="927" y="104" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="964" y="136" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="964" y="168" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="964" y="200" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="1002" y="104" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="1002" y="168" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="1033" y="138" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="1194" y="200" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="1243" y="168" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="1243" y="200" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="1281" y="150" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="1281" y="182" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="1334" y="150" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="1334" y="182" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="1364" y="162" width="10" height="13" rx="1.5" fill="#a9b6ec" class="win tw1"/><rect x="1364" y="194" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/><rect x="1406" y="162" width="10" height="13" rx="1.5" fill="#b7c1f0" class="win tw2"/></g><g><rect x="-20" y="106" width="105" height="134" rx="2" fill="url(#skybuild)" opacity="1.0"/><rect x="107" y="102" width="136" height="138" rx="2" fill="url(#skybuild)" opacity="1.0"/><rect x="268" y="90" width="114" height="150" rx="2" fill="url(#skybuild)" opacity="1.0"/><rect x="399" y="92" width="100" height="148" rx="2" fill="url(#skybuild)" opacity="1.0"/><rect x="447" y="62" width="4" height="30" fill="url(#skybuild)" opacity="1.0"/><circle cx="449" cy="60" r="4" fill="#ff5d5d" class="beacon"/><rect x="511" y="98" width="151" height="142" rx="2" fill="url(#skybuild)" opacity="1.0"/><rect x="679" y="50" width="109" height="190" rx="2" fill="url(#skybuild)" opacity="1.0"/><rect x="679" y="50" width="109" height="3" fill="#00c2a8" opacity="0.85" class="roofline"/><rect x="795" y="62" width="135" height="178" rx="2" fill="url(#skybuild)" opacity="1.0"/><rect x="952" y="107" width="151" height="133" rx="2" fill="url(#skybuild)" opacity="1.0"/><rect x="952" y="107" width="151" height="3" fill="#00c2a8" opacity="0.85" class="roofline"/><rect x="1116" y="87" width="156" height="153" rx="2" fill="url(#skybuild)" opacity="1.0"/><rect x="1283" y="100" width="118" height="140" rx="2" fill="url(#skybuild)" opacity="1.0"/><rect x="1423" y="55" width="127" height="185" rx="2" fill="url(#skybuild)" opacity="1.0"/><rect x="1423" y="55" width="127" height="3" fill="#00c2a8" opacity="0.85" class="roofline"/><rect x="-10" y="120" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw1"/><rect x="-10" y="152" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw3"/><rect x="-10" y="184" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw2"/><rect x="32" y="120" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw1"/><rect x="32" y="152" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw3"/><rect x="32" y="184" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw2"/><rect x="75" y="152" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw3"/><rect x="75" y="184" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw2"/><rect x="117" y="148" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw1"/><rect x="156" y="116" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw2"/><rect x="194" y="148" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw1"/><rect x="194" y="180" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw3"/><rect x="278" y="104" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw3"/><rect x="278" y="168" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw1"/><rect x="278" y="200" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw3"/><rect x="325" y="104" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw3"/><rect x="325" y="136" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw2"/><rect x="325" y="168" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw1"/><rect x="372" y="136" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw2"/><rect x="409" y="106" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw1"/><rect x="409" y="138" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw3"/><rect x="449" y="106" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw1"/><rect x="449" y="170" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw2"/><rect x="489" y="138" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw3"/><rect x="489" y="170" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw2"/><rect x="521" y="112" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw2"/><rect x="554" y="112" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw2"/><rect x="554" y="176" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw3"/><rect x="586" y="112" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw2"/><rect x="586" y="176" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw3"/><rect x="619" y="144" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw1"/><rect x="652" y="176" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw3"/><rect x="689" y="128" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw1"/><rect x="689" y="192" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw2"/><rect x="734" y="96" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw2"/><rect x="734" y="160" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw3"/><rect x="734" y="192" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw2"/><rect x="778" y="128" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw1"/><rect x="805" y="172" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw1"/><rect x="843" y="76" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw1"/><rect x="882" y="140" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw2"/><rect x="882" y="172" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw1"/><rect x="920" y="108" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw3"/><rect x="920" y="140" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw2"/><rect x="962" y="121" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw2"/><rect x="962" y="153" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw1"/><rect x="962" y="185" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw3"/><rect x="995" y="121" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw2"/><rect x="995" y="153" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw1"/><rect x="1028" y="121" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw2"/><rect x="1028" y="153" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw1"/><rect x="1060" y="153" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw1"/><rect x="1060" y="185" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw3"/><rect x="1126" y="101" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw3"/><rect x="1126" y="133" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw2"/><rect x="1126" y="165" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw1"/><rect x="1126" y="197" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw3"/><rect x="1160" y="101" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw3"/><rect x="1160" y="165" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw1"/><rect x="1160" y="197" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw3"/><rect x="1194" y="101" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw3"/><rect x="1194" y="133" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw2"/><rect x="1228" y="133" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw2"/><rect x="1228" y="165" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw1"/><rect x="1228" y="197" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw3"/><rect x="1262" y="101" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw3"/><rect x="1262" y="165" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw1"/><rect x="1293" y="114" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw1"/><rect x="1293" y="146" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw3"/><rect x="1293" y="178" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw2"/><rect x="1342" y="114" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw1"/><rect x="1342" y="146" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw3"/><rect x="1342" y="178" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw2"/><rect x="1391" y="114" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw1"/><rect x="1391" y="178" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw2"/><rect x="1433" y="101" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw1"/><rect x="1433" y="165" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw2"/><rect x="1433" y="197" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw1"/><rect x="1469" y="101" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw1"/><rect x="1504" y="133" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw3"/><rect x="1540" y="69" width="10" height="13" rx="1.5" fill="#3d4a9e" class="win tw2"/><rect x="1540" y="101" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw1"/><rect x="1540" y="133" width="10" height="13" rx="1.5" fill="#4a5fc1" class="win tw3"/><rect x="1540" y="197" width="10" height="13" rx="1.5" fill="#5a6fd0" class="win tw1"/></g><rect x="0" y="237" width="1440" height="3" fill="url(#horizonGlow)" class="horizon"/></svg>
        <svg class="waves" viewBox="0 0 1440 90" preserveAspectRatio="none" aria-hidden="true">
          <path class="wave w1" d="M0,48 C240,90 480,10 720,48 C960,86 1200,20 1440,52 L1440,90 L0,90 Z"/>
          <path class="wave w2" d="M0,60 C260,20 520,80 780,50 C1040,22 1240,70 1440,44 L1440,90 L0,90 Z"/>
        </svg>
      </section>

      <!-- roles -->
      <section class="section" id="roles">
        <h2 [@fadeSlideIn]>One system, <span class="grad-text">three portals</span></h2>
        <p class="section-sub" [@fadeSlideIn]>
          Everyone gets exactly the tools they need — nothing more.
        </p>
        <div class="card-grid roles-grid" [@staggerCards]>
          <mat-card class="anim-card role-card" *ngFor="let r of roles">
            <mat-card-content>
              <div class="role-icon" [style.--accent]="r.accent">
                <mat-icon>{{ r.icon }}</mat-icon>
              </div>
              <h3>{{ r.title }}</h3>
              <p>{{ r.desc }}</p>
              <ul>
                <li *ngFor="let p of r.points"><mat-icon>check</mat-icon>{{ p }}</li>
              </ul>
              <button mat-stroked-button class="role-btn" routerLink="/login">
                Login <mat-icon>arrow_forward</mat-icon>
              </button>
            </mat-card-content>
          </mat-card>
        </div>
      </section>

      <!-- features -->
      <section class="section" id="features">
        <h2 [@fadeSlideIn]>Packed with <span class="grad-text">smart features</span></h2>
        <p class="section-sub" [@fadeSlideIn]>
          From QR passes to an AI security briefing — everything a modern gate needs.
        </p>
        <div class="card-grid features-grid" [@staggerCards]>
          <mat-card class="anim-card feature-card" *ngFor="let f of features">
            <mat-card-content>
              <mat-icon class="feature-icon">{{ f.icon }}</mat-icon>
              <h3>{{ f.title }}</h3>
              <p>{{ f.desc }}</p>
            </mat-card-content>
          </mat-card>
        </div>
      </section>

      <!-- how it works -->
      <section class="section" id="how">
        <h2 [@fadeSlideIn]>How it <span class="grad-text">works</span></h2>
        <div class="steps" [@staggerCards]>
          <div class="step anim-card" *ngFor="let s of steps; let i = index">
            <div class="step-num">{{ i + 1 }}</div>
            <mat-icon>{{ s.icon }}</mat-icon>
            <h3>{{ s.title }}</h3>
            <p>{{ s.desc }}</p>
          </div>
        </div>
      </section>

      <!-- cta -->
      <section class="cta-band" [@fadeSlideIn]>
        <h2>Ready to secure your society?</h2>
        <p>Log in to your portal and put the smart gate to work.</p>
        <button mat-raised-button color="accent" class="cta-big" routerLink="/login">
          <mat-icon>login</mat-icon> Login now
        </button>
      </section>

      <footer class="footer">
        <div class="brand">
          <mat-icon>domain</mat-icon>
          <span>Smart Society</span>
        </div>
        <p>Visitor Management &amp; Secure Access Control · Built with Angular + Django</p>
      </footer>
    </div>
  `,
  styles: [
    `
      .landing {
        background:
          radial-gradient(900px 420px at 8% 0%, rgba(47, 107, 255, 0.1), transparent 60%),
          radial-gradient(800px 420px at 95% 8%, rgba(0, 194, 168, 0.09), transparent 60%),
          radial-gradient(900px 520px at 50% 108%, rgba(124, 58, 237, 0.07), transparent 60%),
          linear-gradient(180deg, #f4f6fe, #edf1fb);
        color: var(--text);
        min-height: 100vh;
        overflow-x: hidden;
        position: relative;
      }

      /* ambient orbs */
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
        opacity: 0.7;
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
        top: 30%;
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

      /* nav */
      .nav {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 10;
        backdrop-filter: blur(14px);
        background: rgba(255, 255, 255, 0.72);
        border-bottom: 1px solid var(--border);
      }
      .nav-inner {
        max-width: 1200px;
        margin: 0 auto;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 24px;
      }
      .brand {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 700;
        font-size: 18px;
      }
      .brand mat-icon {
        color: var(--blue);
      }
      .nav-links {
        display: flex;
        gap: 20px;
        margin-left: 12px;
      }
      .nav-links a {
        color: var(--text-dim);
        cursor: pointer;
        font-size: 14px;
        transition: color 0.2s;
      }
      .nav-links a:hover {
        color: var(--blue-deep);
      }
      .nav-actions {
        margin-left: auto;
        display: flex;
        gap: 8px;
      }
      .nav-login {
        color: var(--blue-deep) !important;
      }

      /* hero */
      .hero {
        position: relative;
        z-index: 1;
        min-height: 94vh;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 120px 20px 300px;
      }
      @media (max-width: 600px) {
        .hero { padding-bottom: 230px; }
        .skyline { height: 170px; }
        .scroll-hint { bottom: 178px !important; }
      }
      .hero-inner {
        max-width: 820px;
      }
      .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 18px;
        border-radius: 30px;
        background: #fff;
        border: 1px solid var(--border);
        color: var(--text-dim);
        box-shadow: var(--shadow-sm);
        font-size: 13px;
        letter-spacing: 0.4px;
        margin-bottom: 24px;
        animation: badgePulse 3s ease-in-out infinite;
      }
      .hero-badge mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: var(--teal-deep);
      }
      @keyframes badgePulse {
        0%,
        100% {
          box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.4);
        }
        50% {
          box-shadow: 0 0 24px 4px rgba(34, 211, 238, 0.28);
        }
      }
      .hero h1 {
        font-size: clamp(40px, 7vw, 76px);
        font-weight: 800;
        line-height: 1.08;
        letter-spacing: -0.03em;
        margin: 0 0 20px;
      }
      .grad-text {
        background: linear-gradient(92deg, #2f6bff, #7c3aed 55%, #00c2a8);
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
      }
      .rotator {
        display: inline-grid;
        text-align: left;
      }
      .rot-word {
        grid-area: 1 / 1;
        opacity: 0;
        transform: translateY(16px);
        transition:
          opacity 0.45s ease,
          transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
        white-space: nowrap;
      }
      .rot-word.active {
        opacity: 1;
        transform: none;
      }
      .hero-sub {
        font-size: 18px;
        line-height: 1.7;
        color: var(--text-dim);
        max-width: 620px;
        margin: 0 auto 32px;
      }
      .hero-ctas {
        display: flex;
        gap: 14px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .cta-big {
        padding: 12px 32px !important;
        font-size: 16px !important;
        border-radius: 30px !important;
      }
      .cta-ghost {
        padding: 12px 32px !important;
        font-size: 16px !important;
        border-radius: 30px !important;
        color: var(--blue-deep) !important;
        border-color: #b9c8f5 !important;
        background: #fff;
      }
      .hero-stats {
        display: flex;
        gap: 48px;
        justify-content: center;
        margin-top: 56px;
      }
      .hero-stats div {
        display: flex;
        flex-direction: column;
      }
      .hero-stats strong {
        font-size: 32px;
        font-weight: 800;
      }
      .hero-stats span {
        font-size: 13px;
        color: var(--text-dim);
      }
      .float-icon {
        position: absolute;
        color: rgba(47, 107, 255, 0.16);
        font-size: 44px !important;
        width: 44px !important;
        height: 44px !important;
        animation: floaty 7s ease-in-out infinite;
      }
      .fi-1 {
        top: 22%;
        left: 8%;
      }
      .fi-2 {
        top: 60%;
        left: 13%;
        animation-delay: -2s;
      }
      .fi-3 {
        top: 26%;
        right: 9%;
        animation-delay: -4s;
      }
      .fi-4 {
        top: 64%;
        right: 12%;
        animation-delay: -5.5s;
      }
      @keyframes floaty {
        0%,
        100% {
          transform: translateY(0) rotate(-4deg);
        }
        50% {
          transform: translateY(-22px) rotate(5deg);
        }
      }
      .scroll-hint {
        position: absolute;
        bottom: 26px;
        left: 50%;
        transform: translateX(-50%);
        color: var(--text-faint);
        cursor: pointer;
        animation: bounce 2s infinite;
      }
      @keyframes bounce {
        0%,
        100% {
          transform: translate(-50%, 0);
        }
        50% {
          transform: translate(-50%, 10px);
        }
      }

      /* sections */
      /* animated smart-city skyline */
      .skyline {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 240px;
        pointer-events: none;
        z-index: 0;
      }
      .hero-inner, .scroll-hint { position: relative; z-index: 1; }
      .scroll-hint { bottom: 248px !important; }
      .win { animation: twinkle 3.2s ease-in-out infinite; }
      .win.tw2 { animation-duration: 4.6s; animation-delay: -1.4s; }
      .win.tw3 { animation-duration: 5.8s; animation-delay: -2.8s; }
      @keyframes twinkle {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.25; }
      }
      .beacon { animation: beaconBlink 2.2s steps(2, start) infinite; }
      @keyframes beaconBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.15; }
      }
      .roofline { animation: roofFlow 5s ease-in-out infinite; }
      @keyframes roofFlow {
        0%, 100% { opacity: 0.35; }
        50% { opacity: 0.95; }
      }
      .horizon { filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.9)); }
      /* drifting neon waves */
      .waves {
        position: absolute;
        left: 0;
        bottom: -2px;
        width: 200%;
        height: 90px;
        z-index: 0;
        pointer-events: none;
        animation: waveDrift 14s linear infinite;
      }
      .wave.w1 { fill: rgba(47, 107, 255, 0.12); }
      .wave.w2 { fill: rgba(0, 194, 168, 0.1); }
      @keyframes waveDrift {
        from { transform: translateX(0); }
        to { transform: translateX(-50%); }
      }

      .section {
        position: relative;
        z-index: 1;
        max-width: 1200px;
        margin: 0 auto;
        padding: 90px 20px 30px;
        text-align: center;
      }
      .section h2 {
        font-size: clamp(28px, 4vw, 44px);
        font-weight: 800;
        letter-spacing: -0.02em;
        margin: 0 0 12px;
      }
      .section-sub {
        color: var(--text-dim);
        font-size: 16px;
        margin: 0 0 44px;
      }
      .card-grid {
        text-align: left;
      }

      /* role cards */
      .roles-grid {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      }

      .role-card {
        position: relative;
        overflow: hidden;
        transition: transform 0.3s var(--ease-spring, cubic-bezier(0.22, 1, 0.36, 1)), box-shadow 0.3s, border-color 0.3s !important;
      }
      .role-card::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #2f6bff, #22d3ee, #7c3aed);
        opacity: 0;
        transition: opacity 0.3s;
      }
      .role-card:hover {
        transform: translateY(-8px);
        border-color: rgba(47, 107, 255, 0.5) !important;
        box-shadow:
          0 20px 44px rgba(47, 107, 255, 0.16),
          0 0 28px rgba(34, 211, 238, 0.18) !important;
      }
      .role-card:hover::before {
        opacity: 1;
      }
      .role-card h3 {
        margin: 14px 0 6px;
        font-size: 20px;
        color: var(--text);
      }
      .role-card p {
        color: var(--text-dim);
        font-size: 14px;
        line-height: 1.6;
      }
      .role-card ul {
        list-style: none;
        padding: 0;
        margin: 14px 0 20px;
      }
      .role-card li {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--text-dim);
        margin-bottom: 8px;
      }
      .role-card li mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #00bfa5;
      }
      .role-icon {
        width: 56px;
        height: 56px;
        border-radius: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: color-mix(in srgb, var(--accent) 18%, transparent);
        border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
      }
      .role-icon mat-icon {
        color: var(--accent);
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      /* feature cards */
      .features-grid {
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      }

      .feature-card h3 {
        margin: 12px 0 6px;
        font-size: 17px;
        color: var(--text);
      }
      .feature-card p {
        color: var(--text-dim);
        font-size: 13.5px;
        line-height: 1.6;
        margin: 0;
      }
      .feature-icon {
        font-size: 32px !important;
        width: 32px !important;
        height: 32px !important;
        color: var(--blue);
      }

      /* steps */
      .steps {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 18px;
        margin-top: 8px;
      }
      .step {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 28px 22px;
        position: relative;
        transition:
          transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
          border-color 0.25s;
      }
      .step:hover {
        transform: translateY(-4px);
        border-color: rgba(47, 107, 255, 0.5);
        box-shadow: 0 12px 30px rgba(47, 107, 255, 0.12);
      }
      .step-num {
        position: absolute;
        top: 16px;
        right: 20px;
        font-size: 40px;
        font-weight: 800;
        color: rgba(47, 107, 255, 0.1);
      }
      .step mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: var(--teal-deep);
      }
      .step h3 {
        margin: 14px 0 8px;
        color: var(--text);
      }
      .step p {
        color: var(--text-dim);
        font-size: 14px;
        line-height: 1.65;
        margin: 0;
      }

      /* cta band */
      .cta-band {
        position: relative;
        z-index: 1;
        max-width: 1000px;
        margin: 90px auto;
        padding: 64px 32px;
        text-align: center;
        border-radius: 24px;
        background: linear-gradient(120deg, #2f6bff, #7c3aed 55%, #00c2a8);
        background-size: 200% 200%;
        animation: bandPan 8s ease infinite;
        box-shadow: 0 24px 70px rgba(47, 107, 255, 0.35);
      }
      @keyframes bandPan {
        0%,
        100% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
      }
      .cta-band h2 {
        margin: 0 0 10px;
        font-size: clamp(26px, 4vw, 40px);
        font-weight: 800;
      }
      .cta-band p {
        color: rgba(255, 255, 255, 0.85);
        margin: 0 0 28px;
      }

      .footer {
        position: relative;
        z-index: 1;
        text-align: center;
        padding: 40px 20px 48px;
        border-top: 1px solid var(--border);
      }
      .footer .brand {
        justify-content: center;
        margin-bottom: 8px;
      }
      .footer p {
        color: var(--text-faint);
        font-size: 13px;
        margin: 0;
      }

      @media (max-width: 720px) {
        .nav-links {
          display: none;
        }
        .float-icon {
          display: none;
        }
        .hero-stats {
          gap: 28px;
        }
        .hero-ctas {
          flex-direction: column;
          align-items: stretch;
        }
      }
    `,
  ],
})
export class LandingComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private dialog = inject(MatDialog);

  words = ['Secure.', 'Smart.', 'Effortless.'];
  wordIndex = 0;
  private timer: ReturnType<typeof setInterval> | null = null;

  roles: RoleCard[] = [
    {
      icon: 'dashboard',
      title: 'Admin',
      desc: 'Complete command over the society — people, data and configuration.',
      points: ['User & role management', 'Daily/monthly reports', 'AI assistant & audit trail'],
      accent: '#7c4dff',
    },
    {
      icon: 'shield',
      title: 'Security Guard',
      desc: 'Everything the gate needs — fast registration and verification.',
      points: ['Visitor registration + voice fill', 'QR & OTP verification', 'Entry/exit logging', 'AI security flags'],
      accent: '#ff4081',
    },
    {
      icon: 'home',
      title: 'Resident',
      desc: 'Your visitors, your call — approve in one tap.',
      points: ['Instant approval requests', 'Visitor history', 'Live notifications'],
      accent: '#00bfa5',
    },
  ];

  features: Feature[] = [
    { icon: 'qr_code_2', title: 'QR Passes', desc: 'Secure, single-use QR gate passes generated per visit.' },
    { icon: 'sms', title: 'OTP Verification', desc: 'Six-digit codes verify every visitor before entry.' },
    { icon: 'smart_toy', title: 'AI Assistant', desc: 'Ask about visitors in plain English — answered from live data.' },
    { icon: 'bar_chart', title: 'Smart Reports', desc: 'Daily & monthly insights with one-click Excel export.' },
    { icon: 'notifications_active', title: 'Live Alerts', desc: 'Approval toasts, security flags and notifications in real time.' },
    { icon: 'history', title: 'Audit Trail', desc: 'Every action logged with actor, timestamp and IP.' },
  ];

  steps = [
    {
      icon: 'app_registration',
      title: 'Guard registers',
      desc: 'Visitor details captured at the desk — by form, voice note, or history auto-fill.',
    },
    {
      icon: 'approval',
      title: 'Resident approves',
      desc: 'Instant notification to the flat. One tap to approve or reject the visit.',
    },
    {
      icon: 'meeting_room',
      title: 'Guard checks in',
      desc: 'QR or OTP verified at the gate; entry and exit logged with timestamp.',
    },
  ];

  ngOnInit(): void {
    // Logged-in users skip the landing and go straight to their portal.
    if (this.auth.isLoggedIn) {
      this.router.navigate([this.auth.homeRoute()]);
      return;
    }
    this.timer = setInterval(() => {
      this.wordIndex = (this.wordIndex + 1) % this.words.length;
    }, 2600);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  scrollTo(id: string): void {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  openRegister(): void {
    this.dialog.open(RequestAccessDialogComponent, { width: '420px' });
  }
}
