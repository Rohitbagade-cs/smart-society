import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

export interface AiChatReply {
  answer: string;
}

export interface ParsedVisit {
  full_name: string | null;
  visitor_type: string | null;
  phone: string | null;
  flat: string | null;
  purpose: string | null;
  vehicle_number: string | null;
}

export interface SecurityFlag {
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
}

export interface VisitorLookup {
  found: boolean;
  full_name?: string;
  phone?: string;
  visitor_type?: string;
  vehicle_number?: string | null;
  id_proof_type?: string | null;
  id_proof_number?: string | null;
}

/** Client for the backend AI endpoints (POST /api/ai/...). */
@Injectable({ providedIn: 'root' })
export class AiService {
  private api = inject(ApiService);

  /** Ask-your-data chatbot (admin). */
  chat(question: string): Observable<AiChatReply> {
    return this.api.post<AiChatReply>('/ai/chat/', { question });
  }

  /** Parse a guard's spoken note into registration fields. */
  parseVisit(transcript: string): Observable<ParsedVisit> {
    return this.api.post<ParsedVisit>('/ai/parse-visit/', { transcript });
  }

  /** Classify name + purpose into a visitor-type key. */
  classifyType(
    name: string,
    purpose: string,
    phone = ''
  ): Observable<{ visitor_type: string; source: 'history' | 'ai' }> {
    return this.api.post<{ visitor_type: string; source: 'history' | 'ai' }>(
      '/ai/classify-type/',
      { name, purpose, phone }
    );
  }

  /** Rule-based security flags (no LLM needed). */
  suspicious(): Observable<SecurityFlag[]> {
    return this.api.get<SecurityFlag[]>('/ai/suspicious/');
  }

  /** Look up a past visitor by name/phone to auto-fill their details. */
  lookupVisitor(name: string, phone: string): Observable<VisitorLookup> {
    return this.api.post<VisitorLookup>('/ai/lookup-visitor/', { name, phone });
  }

  /** LLM-written security briefing over the week's findings. */
  securityBriefing(): Observable<{ briefing: string }> {
    return this.api.post<{ briefing: string }>('/ai/security-briefing/', {});
  }
}
