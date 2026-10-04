import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AiService } from '../../core/ai.service';
import { formatApiError } from '../../core/utils';

interface ChatMsg {
  role: 'user' | 'ai';
  text: string;
}

@Component({
  selector: 'app-ai-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="page" style="max-width: 880px;">
      <h1 class="page-title">AI Assistant</h1>
      <p class="page-subtitle">Ask questions about visitors and access — answered from live society data</p>

      <mat-card>
        <mat-card-content>
          <div class="chat-log">
            <div *ngIf="messages.length === 0" class="empty-state">
              Ask anything, e.g. “How many deliveries came this week?”
            </div>
            <div *ngFor="let m of messages" class="chat-msg" [ngClass]="m.role">
              <div class="bubble">{{ m.text }}</div>
            </div>
            <div *ngIf="thinking" class="chat-msg ai">
              <div class="bubble"><mat-spinner diameter="20"></mat-spinner></div>
            </div>
          </div>

          <div class="chips" *ngIf="messages.length === 0">
            <mat-chip-option *ngFor="let q of examples" (click)="ask(q)">{{ q }}</mat-chip-option>
          </div>

          <form (ngSubmit)="ask()" class="chat-input">
            <mat-form-field appearance="outline" style="flex: 1;">
              <mat-label>Ask about visitors…</mat-label>
              <input matInput [(ngModel)]="draft" name="draft" [disabled]="thinking" autocomplete="off" />
            </mat-form-field>
            <button mat-fab color="primary" type="submit" [disabled]="!draft.trim() || thinking" aria-label="Send">
              <mat-icon>send</mat-icon>
            </button>
          </form>
          <p class="hint" *ngIf="needsKey">
            The backend has no <code>LLM_API_KEY</code> set — configure it as an environment
            variable and restart the backend.
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
      .chat-log {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 55vh;
        overflow-y: auto;
        padding: 4px 2px 12px;
      }
      .chat-msg {
        display: flex;
      }
      .chat-msg.user {
        justify-content: flex-end;
      }
      .bubble {
        max-width: 80%;
        padding: 10px 14px;
        border-radius: 16px;
        background: #f1f3f4;
        white-space: pre-wrap;
      }
      .chat-msg.user .bubble {
        background: #1a73e8;
        color: #fff;
      }
      .chat-input {
        display: flex;
        gap: 10px;
        align-items: center;
        margin-top: 8px;
      }
      .chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;
      }
      .hint {
        color: #b06000;
        margin-top: 8px;
      }
    `,
  ],
})
export class AiChatComponent {
  private ai = inject(AiService);
  private snack = inject(MatSnackBar);

  messages: ChatMsg[] = [];
  draft = '';
  thinking = false;
  needsKey = false;

  examples = [
    'How many deliveries came this week?',
    'Who visited flat B-302 yesterday?',
    'How many visitors are inside right now?',
    'Were there any after-hours entries this week?',
  ];

  ask(preset?: string): void {
    const q = (preset ?? this.draft).trim();
    if (!q || this.thinking) return;
    this.messages.push({ role: 'user', text: q });
    this.draft = '';
    this.thinking = true;
    this.ai.chat(q).subscribe({
      next: (r) => {
        this.thinking = false;
        this.messages.push({ role: 'ai', text: r.answer || '—' });
      },
      error: (e) => {
        this.thinking = false;
        if (e?.status === 503) this.needsKey = true;
        this.snack.open(formatApiError(e?.error, 'AI request failed'), 'Close', {
          duration: 6000,
        });
      },
    });
  }
}
