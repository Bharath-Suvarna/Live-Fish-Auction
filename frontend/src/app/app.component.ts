import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, NavbarComponent],
  template: `
    <div class="min-h-screen bg-ocean-dark text-slate-100 flex flex-col justify-between">
      <div class="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <app-navbar></app-navbar>
        <main>
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- Benchmark & Architecture Footer -->
      <footer class="mt-12 py-6 border-t border-slate-800 bg-slate-950/80 text-center text-xs text-slate-500">
        <div class="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span class="font-bold text-slate-300">Live Malpe Fish Auction Dashboard</span> • Cloud Architecture Benchmarking Platform
          </div>
          <div class="flex items-center gap-4 text-[11px]">
            <span class="px-2 py-1 rounded bg-slate-800 text-slate-300">EC2 (VM)</span>
            <span class="px-2 py-1 rounded bg-slate-800 text-slate-300">ECS Fargate (Container)</span>
            <span class="px-2 py-1 rounded bg-slate-800 text-slate-300">Lambda (Serverless)</span>
          </div>
        </div>
      </footer>
    </div>
  `
})
export class AppComponent {}
