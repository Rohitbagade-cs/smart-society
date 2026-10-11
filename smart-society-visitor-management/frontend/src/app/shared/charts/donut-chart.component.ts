import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface DonutDatum {
  label: string;
  value: number;
}

interface DonutSeg extends DonutDatum {
  color: string;
  dasharray: string;
  offset: string;
  finalOffset: number;
}

/** Quiet-premium palette: blue, teal, violet, amber, slate. No neon. */
const PALETTE = ['#2f6bff', '#00c2a8', '#7c5cff', '#f59e0b', '#64748b', '#38bdf8', '#a78bfa'];

/**
 * Animated SVG donut chart (no external dependency).
 * Segments draw themselves via stroke-dashoffset transition on load.
 *
 * Usage: <app-donut-chart [data]="[{label:'Guest', value: 10}]" title="By visitor type" centerLabel="total"></app-donut-chart>
 */
@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-title" *ngIf="title">{{ title }}</div>
    <svg
      *ngIf="segments.length; else empty"
      class="donut-svg"
      viewBox="0 0 200 200"
      role="img"
      [attr.aria-label]="title || 'Donut chart'"
    >
      <circle cx="100" cy="100" [attr.r]="radius" fill="none" stroke="#e9edf7" [attr.stroke-width]="stroke" />
      <g transform="rotate(-90 100 100)">
        <circle
          *ngFor="let s of segments"
          class="donut-seg"
          cx="100"
          cy="100"
          [attr.r]="radius"
          fill="none"
          [attr.stroke]="s.color"
          [attr.stroke-width]="stroke"
          [attr.stroke-dasharray]="s.dasharray"
          [attr.stroke-dashoffset]="s.offset"
        >
          <title>{{ s.label }}: {{ s.value }}</title>
        </circle>
      </g>
      <text x="100" y="98" class="donut-center">{{ total }}</text>
      <text x="100" y="116" class="donut-center-label">{{ centerLabel }}</text>
    </svg>
    <div class="chart-legend" *ngIf="segments.length">
      <span *ngFor="let s of segments">
        <span class="dot" [style.background]="s.color"></span>{{ s.label }} ({{ s.value }})
      </span>
    </div>
    <ng-template #empty>
      <div class="empty-state">No data yet.</div>
    </ng-template>
  `,
})
export class DonutChartComponent implements OnChanges {
  @Input() data: DonutDatum[] = [];
  @Input() title = '';
  @Input() centerLabel = 'total';

  radius = 74;
  stroke = 26;
  total = 0;
  segments: DonutSeg[] = [];

  ngOnChanges(): void {
    const total = this.data.reduce((a, d) => a + d.value, 0);
    this.total = total;
    if (!total) {
      this.segments = [];
      return;
    }
    const c = 2 * Math.PI * this.radius;
    let acc = 0;
    const built: DonutSeg[] = this.data.map((d, i) => {
      const frac = d.value / total;
      const len = Math.max(frac * c - 2, 0.5); // 2px gap between segments
      const seg: DonutSeg = {
        ...d,
        color: PALETTE[i % PALETTE.length],
        dasharray: `${len} ${c - len}`,
        offset: `${c}`, // start hidden…
        finalOffset: -acc,
      };
      acc += frac * c;
      return seg;
    });
    this.segments = built;
    // …then animate to the real offsets on the next frame.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.segments = this.segments.map((s) => ({ ...s, offset: `${s.finalOffset}` }));
      });
    });
  }
}
