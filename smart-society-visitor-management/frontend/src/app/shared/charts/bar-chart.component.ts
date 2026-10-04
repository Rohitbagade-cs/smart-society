import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface BarDatum {
  label: string;
  value: number;
}

interface BarGeom extends BarDatum {
  x: number;
  y: number;
  w: number;
  h: number;
  delay: number;
}

/**
 * Animated SVG bar chart (no external dependency).
 * Bars grow from the baseline with a staggered spring; hover brightens.
 *
 * Usage: <app-bar-chart [data]="[{label:'Mon', value: 12}, ...]" title="Entries this week"></app-bar-chart>
 */
@Component({
  selector: 'app-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-title" *ngIf="title">{{ title }}</div>
    <svg
      *ngIf="bars.length; else empty"
      class="bar-svg"
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      role="img"
      [attr.aria-label]="title || 'Bar chart'"
    >
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#a66bff" />
          <stop offset="100%" stop-color="#ff4081" />
        </linearGradient>
      </defs>
      <g *ngFor="let b of bars">
        <rect
          class="bar"
          [attr.x]="b.x"
          [attr.y]="b.y"
          [attr.width]="b.w"
          [attr.height]="b.h"
          rx="5"
          [style.animation-delay.ms]="b.delay"
        >
          <title>{{ b.label }}: {{ b.value }}</title>
        </rect>
        <text class="bar-value" [attr.x]="b.x + b.w / 2" [attr.y]="b.y - 8">{{ b.value }}</text>
        <text class="bar-label" [attr.x]="b.x + b.w / 2" [attr.y]="height - 8">{{ b.label }}</text>
      </g>
    </svg>
    <ng-template #empty>
      <div class="empty-state">No data yet.</div>
    </ng-template>
  `,
})
export class BarChartComponent implements OnChanges {
  @Input() data: BarDatum[] = [];
  @Input() title = '';

  width = 560;
  height = 240;
  bars: BarGeom[] = [];

  ngOnChanges(): void {
    const padL = 8;
    const padR = 8;
    const padT = 28;
    const padB = 30;
    const n = this.data.length;
    if (!n) {
      this.bars = [];
      return;
    }
    const max = Math.max(...this.data.map((d) => d.value), 1);
    const plotW = this.width - padL - padR;
    const plotH = this.height - padT - padB;
    const slot = plotW / n;
    const barW = Math.min(44, slot * 0.55);
    this.bars = this.data.map((d, i) => {
      const h = Math.max(2, (d.value / max) * plotH);
      return {
        ...d,
        w: barW,
        h,
        x: padL + slot * i + (slot - barW) / 2,
        y: padT + (plotH - h),
        delay: i * 90,
      };
    });
  }
}
