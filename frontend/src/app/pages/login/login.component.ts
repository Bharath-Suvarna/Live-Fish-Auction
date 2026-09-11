import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-md mx-auto my-10 glass-card p-8 border-cyan-500/20 shadow-2xl">
      <div class="text-center mb-8">
        <div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
          <i class="fa-solid fa-user-shield text-slate-950 text-2xl"></i>
        </div>
        <h2 class="text-2xl font-black text-white">Harbor Auth & Role Portal</h2>
        <p class="text-xs text-slate-400 mt-1">Select your access persona to participate in real-time auctioning.</p>
      </div>

      <!-- Quick Persona Selection Presets -->
      <div class="space-y-2 mb-6">
        <span class="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">Quick Benchmark Roles</span>
        <div class="grid grid-cols-3 gap-2">
          <button type="button" (click)="selectPreset('vendor@malpe.com', 'Vendor')"
                  [ngClass]="selectedRole === 'Vendor' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-slate-900 border-slate-800 text-slate-400'"
                  class="p-2.5 rounded-lg border text-center transition">
            <i class="fa-solid fa-shop block text-sm mb-1"></i>
            <span class="text-[11px] font-bold">Vendor</span>
          </button>
          
          <button type="button" (click)="selectPreset('admin@malpe.harbor', 'Admin')"
                  [ngClass]="selectedRole === 'Admin' ? 'bg-amber-500/20 border-amber-500/50 text-amber-300' : 'bg-slate-900 border-slate-800 text-slate-400'"
                  class="p-2.5 rounded-lg border text-center transition">
            <i class="fa-solid fa-gavel block text-sm mb-1"></i>
            <span class="text-[11px] font-bold">Auctioneer</span>
          </button>

          <button type="button" (click)="selectPreset('viewer@malpe.harbor', 'Viewer')"
                  [ngClass]="selectedRole === 'Viewer' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-slate-900 border-slate-800 text-slate-400'"
                  class="p-2.5 rounded-lg border text-center transition">
            <i class="fa-solid fa-eye block text-sm mb-1"></i>
            <span class="text-[11px] font-bold">Viewer</span>
          </button>
        </div>
      </div>

      <form (ngSubmit)="login()" class="space-y-4 text-xs">
        <div>
          <label class="block text-slate-300 font-semibold mb-1">Email / User Handle</label>
          <input type="email" [(ngModel)]="email" name="email" required
                 class="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium focus:border-cyan-400 focus:outline-none"
                 placeholder="name@malpe.harbor">
        </div>

        <div>
          <label class="block text-slate-300 font-semibold mb-1">Password</label>
          <input type="password" [(ngModel)]="password" name="password" required
                 class="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white font-medium focus:border-cyan-400 focus:outline-none"
                 placeholder="••••••••">
        </div>

        <div *ngIf="errorMsg" class="bg-red-950/80 border border-red-800 text-red-300 p-3 rounded-lg text-xs">
          {{ errorMsg }}
        </div>

        <button type="submit" [disabled]="loading" class="w-full btn-primary py-3 justify-center text-sm font-extrabold">
          <i class="fa-solid fa-right-to-bracket"></i> {{ loading ? 'Authenticating...' : 'Authenticate & Enter' }}
        </button>
      </form>
    </div>
  `
})
export class LoginComponent {
  email: string = 'vendor1@malpe.com';
  password: string = 'password123';
  selectedRole: string = 'Vendor';
  loading: boolean = false;
  errorMsg: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  selectPreset(email: string, role: string): void {
    this.email = email;
    this.selectedRole = role;
  }

  login(): void {
    this.loading = true;
    this.errorMsg = null;

    this.authService.login(this.email, this.selectedRole).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMsg = err.error?.error || 'Login failed';
      }
    });
  }
}
