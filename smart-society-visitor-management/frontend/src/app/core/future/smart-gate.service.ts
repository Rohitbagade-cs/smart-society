import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';

export interface GateStatus {
  gateId: string;
  barrier: 'open' | 'closed' | 'unknown';
  lastEvent: string | null;
}

/**
 * FUTURE HOOK — smart-gate integration (not implemented yet).
 *
 * Planned use: open/close boom barriers and read gate sensors directly from
 * the guard dashboard and entry/exit page, instead of recording movements
 * manually. UI hook point: guard/entry-exit page, beside the Entry/Exit buttons.
 *
 * Integration plan (when hardware/API is available):
 *  1. Point `baseUrl` at the gate controller and add auth in an interceptor.
 *  2. Implement openBarrier()/gateStatus() below against its REST/MQTT API.
 *  3. Set `enabled = true` and wire the entry/exit page hook.
 */
@Injectable({ providedIn: 'root' })
export class SmartGateService {
  /** Flip to true once the gate controller API is connected. */
  readonly enabled = false;

  /** TODO: POST to the gate controller to open the barrier. */
  openBarrier(_gateId: string): Observable<void> {
    return throwError(() => new Error('Smart-gate integration is not connected yet.'));
  }

  /** TODO: GET barrier/sensor status from the gate controller. */
  gateStatus(_gateId: string): Observable<GateStatus> {
    return throwError(() => new Error('Smart-gate integration is not connected yet.'));
  }
}
