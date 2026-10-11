import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface GroupedBarDatum {
  label: string;
  approved: number;
  rejected: number;
}

interface BarGeom {
  x: number;
  y: number;
  w: number;
  h: number;
  delay: number;
  fill: string;
}

interface GroupGeom {
  label: string;
  approved: BarGeom;
  rejected: BarGeom;
  cx: number;
}

/**
 * Grouped SVG bar chart: approved (blue) vs rejected (red) per day.
 * Pure inline SVG — no external chart library.
 */
@Component({
  selector: 'app-grouped-bar-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-title" *ngIf="title">{{ title }}</div>
    <svg
      *ngIf="groups.length; else empty"
      class="bar-svg"
      [attr.viewBox]="'0 0 ' + width + ' ' + height"
      role="img"
      [attr.aria-label]="title || 'Visitor traffic chart'"
    >
      <g *ngFor="let t of gridTicks">
        <line class="grid-line" x1="36" [attr.x2]="width - 8" [attr.y1]="t.y" [attr.y2]="t.y" />
        <text class="axis-label" x="30" [attr.y]="t.y + 4" text-anchor="end">{{ t.v }}</text>
      </g>
      <g *ngFor="let g of groups">
        <rect class="bar" [attr.x]="g.approved.x" [attr.y]="g.approved.y" [attr.width]="g.approved.w"
              [attr.height]="g.approved.h" rx="4" [attr.fill]="g.approved.fill"
              [style.animation-delay.ms]="g.approved.delay">
          <title>{{ g.label }} — approved: {{ g.approvedVal }}</title>
        </rect>
        <rect class="bar" [attr.x]="g.rejected.x" [attr.y]="g.rejected.y" [attr.width]="g.rejected.w"
              [attr.height]="g.rejected.h" rx="4" [attr.fill]="g.rejected.fill"
              [style.animation-delay.ms]="g.rejected.delay">
          <title>{{ g.label }} — rejected: {{ g.rejectedVal }}</title>
        </rect>
        <text class="bar-label" [attr.x]="g.cx" [attr.y]="height - 8">{{ g.label }}</text>
      </g>
    </svg>
    <div class="chart-legend-row" *ngIf="groups.length">
      <span><span class="dot" style="background:#2F6BFF"></span>Approved</span>
      <span><span class="dot" style="background:#F04438"></span>Rejected</span>
    </div>
    <ng-template #empty>
      <div class="empty-state">No traffic data yet.</div>
    </ng-template>
  `,
})
export class GroupedBarChartComponent implements OnChanges {
  @Input() data: GroupedBarDatum[] = [];
  @Input() title = '';

  width = 640;
  height = 260;
  groups: (GroupGeom & { approvedVal: number; rejectedVal: number })[] = [];
  gridTicks: { y: number; v: number }[] = [];

  ngOnChanges(): void {
    const padL = 40;
    const padR = 8;
    const padT = 16;
    const padB = 30;
    const n = this.data.length;
    if (!n) {
      this.groups = [];
      return;
    }
    const max = Math.max(...this.data.flatMap((d) => [d.approved, d.rejected]), 1);
    const plotW = this.width - padL - padR;
    const plotH = this.height - padT - padB;
    const slot = plotW / n;
    const pairW = Math.min(56, slot * 0.6);
    const barW = pairW / 2 - 3;

    // nice grid ticks
    const step = Math.max(1, Math.ceil(max / 4));
    this.gridTicks = [];
    for (let v = 0; v <= max + step; v += step) {
      if (v > max * 1.05 && v !== 0) continue;
      this.gridTicks.push({ v, y: padT + plotH - (v / (max * 1.05)) * plotH });
    }

    this.groups = this.data.map((d, i) => {
      const mk = (value: number, fill: string, left: boolean, delay: number): BarGeom => {
        const h = Math.max(value > 0 ? 3 : 0, (value / (max * 1.05)) * plotH);
        const cx = padL + slot * i + slot / 2;
        return {
          x: left ? cx - barW - 3 : cx + 3,
          y: padT + plotH - h,
          w: barW,
          h,
          delay,
          fill,
        };
      };
      return {
        label: d.label,
        approvedVal: d.approved,
        rejectedVal: d.rejected,
        approved: mk(d.approved, '#2F6BFF', true, i * 70),
        rejected: mk(d.rejected, '#F04438', false, i * 70 + 60),
        cx: padL + slot * i + slot / 2,
      };
    });
  }
}
