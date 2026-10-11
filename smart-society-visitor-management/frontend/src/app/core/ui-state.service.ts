import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type DateRangeKey = 'today' | 'last7d' | 'last30d';

export interface DateRangeOption {
  key: DateRangeKey;
  label: string;
}

/**
 * Shared UI state for the shell: the top-bar date-range filter.
 * The admin dashboard subscribes and re-queries when it changes.
 */
@Injectable({ providedIn: 'root' })
export class UiStateService {
  readonly options: DateRangeOption[] = [
    { key: 'today', label: 'Today' },
    { key: 'last7d', label: 'Last 7 days' },
    { key: 'last30d', label: 'Last 30 days' },
  ];

  private range$ = new BehaviorSubject<DateRangeKey>('last7d');
  readonly dateRange$ = this.range$.asObservable();

  get dateRange(): DateRangeKey {
    return this.range$.value;
  }

  setDateRange(key: DateRangeKey): void {
    if (key !== this.range$.value) this.range$.next(key);
  }

  /** [startISO, endISO] inclusive bounds for the current range. */
  bounds(): { from: string; to: string; days: number } {
    const to = new Date();
    const from = new Date();
    const days = this.range$.value === 'today' ? 1 : this.range$.value === 'last30d' ? 30 : 7;
    from.setDate(to.getDate() - (days - 1));
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { from: iso(from), to: iso(to), days };
  }
}
