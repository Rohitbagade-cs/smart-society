import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

/**
 * FUTURE HOOK — facial recognition (not implemented yet).
 *
 * Planned use: at the gate, capture a visitor's photo and match it against
 * enrolled faces (frequent visitors, staff, watchlist) for one-tap check-in
 * or alerts. UI hook point: guard/verify page, beside the QR scanner panel.
 *
 * Integration plan (when a provider is chosen):
 *  1. Implement enrollFace() / verifyFace() against the provider SDK
 *     (e.g. AWS Rekognition, Azure Face, or an on-device model).
 *  2. Set `enabled = true` and wire the verify page hook below.
 *  3. Store only face embeddings/tokens — never raw photos — per policy.
 */
@Injectable({ providedIn: 'root' })
export class FaceRecognitionService {
  /** Flip to true once a provider SDK is integrated. */
  readonly enabled = false;

  /** Enroll a face for a known visitor. TODO: implement with provider SDK. */
  enrollFace(_visitorId: number, _photo: Blob): Observable<{ faceToken: string }> {
    return throwError(() => new Error('Face recognition is not integrated yet.'));
  }

  /** Verify a gate photo against enrolled faces. TODO: implement with provider SDK. */
  verifyFace(
    _photo: Blob
  ): Observable<{ matchVisitorId: number | null; confidence: number }> {
    return throwError(() => new Error('Face recognition is not integrated yet.'));
  }
}
