import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SocketService } from '../../core/services/socket.service';
import { User } from '../../core/models/models';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="glass-card navbar-header">
      <div class="brand-box">
        <div class="brand-icon">
          <i class="fa-solid fa-fish-fins"></i>
        </div>
        <div>
          <h1 style="font-size: 1.25rem; font-weight: 800; color: #ffffff; display: flex; align-items: center; gap: 0.5rem;">
            MALPE HARBOR 
            <span style="font-size: 0.65rem; padding: 0.15rem 0.5rem; background: rgba(0, 245, 212, 0.15); color: #00f5d4; border-radius: 4px; border: 1px solid rgba(0, 245, 212, 0.3);">
              LIVE AUCTION
            </span>
          </h1>
          <p style="font-size: 0.75rem; color: #94a3b8;">Udupi, KA • Real-Time Coastal Bidding & Benchmark System</p>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="nav-links">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
          <i class="fa-solid fa-border-all"></i> Live Lots
        </a>
        <a routerLink="/trends" routerLinkActive="active" class="nav-link">
          <i class="fa-solid fa-chart-line"></i> Price Trends
        </a>
        <a routerLink="/boats" routerLinkActive="active" class="nav-link">
          <i class="fa-solid fa-ship"></i> Boat Arrivals
        </a>
        <a *ngIf="currentUser?.role === 'Admin'" routerLink="/admin" routerLinkActive="active" class="nav-link" style="color: #ffb703;">
          <i class="fa-solid fa-user-shield"></i> Auctioneer Panel
        </a>
      </nav>

      <!-- Status & User Role Widget -->
      <div class="brand-box" style="gap: 1rem;">
        <!-- Socket status indicator -->
        <div class="badge" [style.background]="isConnected ? 'rgba(6, 214, 160, 0.15)' : 'rgba(239, 68, 68, 0.15)'" 
             [style.color]="isConnected ? '#06d6a0' : '#f87171'" style="border: 1px solid rgba(255,255,255,0.1);">
          <span class="pulse-dot" [style.background-color]="isConnected ? '#06d6a0' : '#ef4444'"></span>
          {{ isConnected ? 'SOCKET LIVE' : 'RECONNECTING' }}
        </div>

        <!-- Auth state -->
        <div *ngIf="currentUser; else loginBtn" style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="text-align: right;">
            <p style="font-size: 0.8rem; font-weight: 700; color: #ffffff;">{{ currentUser.name }}</p>
            <span class="badge" style="background: rgba(255, 183, 3, 0.15); color: #ffb703; font-size: 0.65rem;">
              {{ currentUser.role }}
            </span>
          </div>
          <button (click)="logout()" class="btn-secondary" style="padding: 0.4rem 0.75rem;" title="Logout">
            <i class="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>

        <ng-template #loginBtn>
          <a routerLink="/login" class="btn-primary" style="font-size: 0.8rem; padding: 0.5rem 1rem;">
            <i class="fa-solid fa-right-to-bracket"></i> Login / Role
          </a>
        </ng-template>
      </div>
    </header>
  `
})
export class NavbarComponent implements OnInit {
  currentUser: User | null = null;
  isConnected: boolean = false;

  constructor(private authService: AuthService, private socketService: SocketService) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => this.currentUser = user);
    this.socketService.isConnected$.subscribe(status => this.isConnected = status);
  }

  logout(): void {
    this.authService.logout();
  }
}
