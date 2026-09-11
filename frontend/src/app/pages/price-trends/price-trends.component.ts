import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { PriceTrend } from '../../core/models/models';

import { 
  Chart, 
  LineController, 
  LineElement, 
  PointElement, 
  LinearScale, 
  Title, 
  CategoryScale, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js';

Chart.register(
  LineController, 
  LineElement, 
  PointElement, 
  LinearScale, 
  Title, 
  CategoryScale, 
  Tooltip, 
  Legend, 
  Filler
);

@Component({
  selector: 'app-price-trends',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-chart-line text-cyan-400"></i> Malpe Fish Price Trends
          </h2>
          <p class="text-sm text-slate-400">Aggregated every 5–10 minutes matching harbor auction cadence.</p>
        </div>

        <!-- Fish Filter & Range Controls -->
        <div class="flex flex-wrap items-center gap-3">
          <select [(ngModel)]="selectedFish" (change)="loadTrends()" class="bg-slate-900 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:border-cyan-400 focus:outline-none">
            <option value="">All Catch Types</option>
            <option *ngFor="let fish of fishTypes" [value]="fish">{{ fish }}</option>
          </select>

          <select [(ngModel)]="selectedRange" (change)="loadTrends()" class="bg-slate-900 border border-slate-700 text-white text-xs font-semibold px-3 py-2 rounded-lg focus:border-cyan-400 focus:outline-none">
            <option value="recent">Recent (50 samples)</option>
            <option value="all">Full Day (200 samples)</option>
          </select>
        </div>
      </div>

      <!-- Chart Canvas Card -->
      <div class="glass-card p-6 border-cyan-500/20">
        <div class="h-[400px] relative">
          <canvas #chartCanvas></canvas>
        </div>
      </div>

      <!-- Historical Data Table -->
      <div class="glass-card p-5">
        <h3 class="text-base font-bold text-white mb-4">Historical Aggregation Audit Table</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th class="p-3">Time</th>
                <th class="p-3">Fish Type</th>
                <th class="p-3">Average ₹/kg</th>
                <th class="p-3">Min / Max ₹/kg</th>
                <th class="p-3">Samples</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              <tr *ngFor="let trend of trends" class="hover:bg-slate-800/30 transition">
                <td class="p-3 text-slate-300 font-mono">{{ trend.timestamp | date:'mediumTime' }}</td>
                <td class="p-3 font-bold text-white">{{ trend.fishType }}</td>
                <td class="p-3 font-black text-cyan-400">₹{{ trend.avgPricePerKg }}</td>
                <td class="p-3 text-slate-400">₹{{ trend.minPrice || '-' }} - ₹{{ trend.maxPrice || '-' }}</td>
                <td class="p-3 text-slate-400 font-mono">{{ trend.sampleCount || 1 }} lots</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class PriceTrendsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;

  trends: PriceTrend[] = [];
  fishTypes: string[] = ['Mackerel', 'Sardine', 'Prawns', 'Tuna', 'Kingfish', 'Squid', 'Pomfret', 'Seerfish'];
  selectedFish: string = '';
  selectedRange: string = 'recent';
  chart!: Chart;

  private subs: Subscription[] = [];

  constructor(private apiService: ApiService, private socketService: SocketService) {}

  ngOnInit(): void {
    // Listen to real-time trend updates
    this.subs.push(
      this.socketService.priceTrendUpdate$.subscribe(newTrend => {
        if (!this.selectedFish || newTrend.fishType === this.selectedFish) {
          this.trends.unshift(newTrend);
          this.updateChart();
        }
      })
    );
  }

  ngAfterViewInit(): void {
    this.initChart();
    this.loadTrends();
  }

  loadTrends(): void {
    this.apiService.getPriceTrends(this.selectedFish, this.selectedRange).subscribe(trends => {
      this.trends = trends;
      this.updateChart();
    });
  }

  initChart(): void {
    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: []
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } }
          },
          tooltip: {
            backgroundColor: '#0f172a',
            titleColor: '#00f5d4',
            bodyColor: '#f8fafc',
            borderColor: 'rgba(0, 245, 212, 0.3)',
            borderWidth: 1
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b' }
          },
          y: {
            grid: { color: 'rgba(255, 255, 255, 0.05)' },
            ticks: { color: '#64748b' },
            title: { display: true, text: 'Price (₹ / kg)', color: '#94a3b8' }
          }
        }
      }
    });
  }

  updateChart(): void {
    if (!this.chart) return;

    // Group trends by fishType
    const sorted = [...this.trends].reverse();
    const times = Array.from(new Set(sorted.map(t => new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))));

    const colors = ['#00f5d4', '#ffb703', '#ff006e', '#06d6a0', '#3a86ff', '#8338ec', '#ffbe0b', '#fb5607'];
    const groups: { [key: string]: number[] } = {};

    sorted.forEach(t => {
      if (!groups[t.fishType]) groups[t.fishType] = [];
      groups[t.fishType].push(t.avgPricePerKg);
    });

    const datasets = Object.keys(groups).map((fish, index) => ({
      label: `${fish} (₹/kg)`,
      data: groups[fish],
      borderColor: colors[index % colors.length],
      backgroundColor: colors[index % colors.length] + '20',
      tension: 0.3,
      fill: true,
      pointRadius: 4
    }));

    this.chart.data.labels = times;
    this.chart.data.datasets = datasets;
    this.chart.update();
  }

  ngOnDestroy(): void {
    if (this.chart) this.chart.destroy();
    this.subs.forEach(s => s.unsubscribe());
  }
}
