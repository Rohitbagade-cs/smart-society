import { Component } from '@angular/core';
import { Routes, RouterLink } from '@angular/router';
import { roleGuard } from './core/role.guard';
import { LoginComponent } from './login/login.component';
import { AppShellComponent } from './shared/app-shell/app-shell.component';
import { AdminDashboardComponent } from './admin/admin-dashboard/admin-dashboard.component';
import { UserManagementComponent } from './admin/user-management/user-management.component';
import { VisitorRecordsComponent } from './admin/visitor-records/visitor-records.component';
import { ReportsComponent } from './admin/reports/reports.component';
import { SocietyConfigComponent } from './admin/society-config/society-config.component';
import { AuditLogComponent } from './admin/audit-log/audit-log.component';
import { AiChatComponent } from './admin/ai-chat/ai-chat.component';
import { SecurityFlagsComponent } from './admin/security-flags/security-flags.component';
import { GuardDashboardComponent } from './guard/guard-dashboard/guard-dashboard.component';
import { VerifyComponent } from './guard/verify/verify.component';
import { EntryExitComponent } from './guard/entry-exit/entry-exit.component';
import { DailyLogComponent } from './guard/daily-log/daily-log.component';
import { ResidentDashboardComponent } from './resident/resident-dashboard/resident-dashboard.component';
import { InviteVisitorComponent } from './resident/invite-visitor/invite-visitor.component';
import { MyProfileComponent } from './shared/my-profile/my-profile.component';
import { VisitorHistoryComponent } from './resident/visitor-history/visitor-history.component';
import { NotificationsComponent } from './resident/notifications/notifications.component';
import { LandingComponent } from './landing/landing.component';
import { VisitorPassComponent } from './visitor-pass/visitor-pass.component';

/** Shown for unknown URLs. */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="page" style="text-align:center; padding-top: 10vh;">
      <h1>404</h1>
      <p>The page you are looking for does not exist.</p>
      <a routerLink="/">Go home</a>
    </div>
  `,
})
export class NotFoundComponent {}

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  // Public visitor pass (opened from the SMS/WhatsApp link) — no login.
  { path: 'pass/:token', component: VisitorPassComponent },

  {
    path: 'admin',
    component: AppShellComponent,
    canActivate: [roleGuard],
    data: { roles: ['admin'] },
    children: [
      { path: '', component: AdminDashboardComponent },
      { path: 'users', component: UserManagementComponent },
      { path: 'visitors', component: VisitorRecordsComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'society', component: SocietyConfigComponent },
      { path: 'flags', component: SecurityFlagsComponent },
      { path: 'audit', component: AuditLogComponent },
      { path: 'ai-chat', component: AiChatComponent },
      { path: 'profile', component: MyProfileComponent },
    ],
  },
  {
    path: 'guard',
    component: AppShellComponent,
    canActivate: [roleGuard],
    data: { roles: ['guard', 'admin'] },
    children: [
      { path: '', component: GuardDashboardComponent },
      { path: 'verify', component: VerifyComponent },
      { path: 'entry-exit', component: EntryExitComponent },
      { path: 'daily-log', component: DailyLogComponent },
      { path: 'notifications', component: NotificationsComponent },
      { path: 'profile', component: MyProfileComponent },
    ],
  },
  {
    path: 'resident',
    component: AppShellComponent,
    canActivate: [roleGuard],
    data: { roles: ['resident'] },
    children: [
      { path: '', component: ResidentDashboardComponent },
      { path: 'invite', component: InviteVisitorComponent },
      { path: 'history', component: VisitorHistoryComponent },
      { path: 'profile', component: MyProfileComponent },
      { path: 'notifications', component: NotificationsComponent },
    ],
  },

  { path: '', component: LandingComponent },
  { path: '**', component: NotFoundComponent },
];
