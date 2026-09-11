import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { AuctionLot, Boat } from '../../core/models/models';

@Component({
  selector: 'app-home-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
      <!-- Boats Arrived Today Live Ticker -->
      <div class="glass-card" style="padding: 0.75rem 1rem;">
        <div class="flex-row flex-gap" style="overflow: hidden;">
          <span class="badge badge-open" style="white-space: nowrap; font-size: 0.75rem; padding: 0.4rem 0.75rem;">
            <span class="pulse-dot"></span> HARBOR TICKER
          </span>
          <div class="ticker-bar" style="width: 100%;">
            <div *ngFor="let boat of boats" class="ticker-item">
              <i class="fa-solid fa-ship" style="color: #00f5d4;"></i>
              <strong style="color: #ffffff;">{{ boat.boatName }}</strong>
              <span style="color: #94a3b8;">({{ boat.catchType }} - {{ boat.estimatedQuantityKg }} kg)</span>
              <span class="badge" style="background: rgba(0,245,212,0.1); color: #00f5d4; font-size: 0.65rem;">{{ boat.status }}</span>
            </div>
            <span *ngIf="boats.length === 0" style="color: #64748b; font-style: italic; font-size: 0.85rem;">No boats logged today yet.</span>
          </div>
        </div>
      </div>

      <!-- Header & Filter Controls -->
      <div class="flex-between" style="flex-wrap: wrap; gap: 1rem;">
        <div>
          <h2 style="font-size: 1.75rem; font-weight: 800; color: #ffffff;">Active Auction Lots</h2>
          <p style="font-size: 0.875rem; color: #94a3b8;">Live prices update instantly. Click any lot to enter bidding floor.</p>
        </div>

        <div style="display: flex; gap: 0.5rem;">
          <button (click)="setFilter('all')" [class.btn-primary]="filter === 'all'" [class.btn-secondary]="filter !== 'all'">
            All Lots ({{ lots.length }})
          </button>
          <button (click)="setFilter('open')" [class.btn-primary]="filter === 'open'" [class.btn-secondary]="filter !== 'open'">
            Open Bidding ({{ openCount }})
          </button>
          <button (click)="setFilter('closed')" [class.btn-primary]="filter === 'closed'" [class.btn-secondary]="filter !== 'closed'">
            Closed ({{ closedCount }})
          </button>
        </div>
      </div>

      <!-- Lots Grid (Structured 3-column responsive layout) -->
      <div class="grid-3">
        <div *ngFor="let lot of filteredLots" class="glass-card lot-card">
          
          <!-- Card Header -->
          <div>
            <div class="lot-header">
              <div>
                <span class="lot-id-badge">{{ lot.lotId }}</span>
                <h3 class="lot-title">{{ lot.fishType }}</h3>
                <p style="font-size: 0.75rem; color: #94a3b8; margin-top: 0.25rem; display: flex; align-items: center; gap: 0.35rem;">
                  <i class="fa-solid fa-ship" style="color: #64748b;"></i> {{ lot.boatName }}
                </p>
              </div>

              <span [class]="lot.status === 'open' ? 'badge badge-open' : 'badge badge-closed'">
                <span *ngIf="lot.status === 'open'" class="pulse-dot"></span>
                {{ lot.status }}
              </span>
            </div>

            <!-- Specs Grid -->
            <div class="grid-2" style="gap: 0.75rem; padding: 0.75rem 0; border-top: 1px solid rgba(255,255,255,0.06); border-bottom: 1px solid rgba(255,255,255,0.06); margin: 0.75rem 0;">
              <div>
                <span style="font-size: 0.7rem; color: #64748b; display: block;">Total Quantity</span>
                <span style="font-size: 0.95rem; font-weight: 700; color: #f8fafc;">{{ lot.quantityKg }} kg</span>
              </div>
              <div>
                <span style="font-size: 0.7rem; color: #64748b; display: block;">Floor Price</span>
                <span style="font-size: 0.95rem; font-weight: 600; color: #94a3b8;">₹{{ lot.startingPrice }}</span>
              </div>
            </div>
          </div>

          <!-- Price & CTA -->
          <div style="margin-top: 1rem;">
            <div class="flex-between" style="margin-bottom: 0.75rem;">
              <div>
                <span style="font-size: 0.65rem; font-weight: 700; color: #64748b; display: block; letter-spacing: 0.05em;">CURRENT HIGHEST BID</span>
                <div class="lot-price-display" [class.price-flash]="flashLotId === lot.lotId">
                  ₹{{ lot.currentPrice }}
                  <span style="font-size: 0.75rem; font-weight: 400; color: #94a3b8;">({{ (lot.currentPrice / lot.quantityKg).toFixed(1) }} ₹/kg)</span>
                </div>
              </div>
              <div *ngIf="lot.winningVendorName" style="text-align: right;">
                <span style="font-size: 0.65rem; color: #64748b; display: block;">TOP BIDDER</span>
                <span style="font-size: 0.8rem; font-weight: 700; color: #ffb703;">{{ lot.winningVendorName }}</span>
              </div>
            </div>

            <a [routerLink]="['/lots', lot.lotId]" class="btn-primary" style="width: 100%; text-align: center;">
              <i class="fa-solid fa-gavel"></i>
              {{ lot.status === 'open' ? 'Enter Bidding Room' : 'View Bid History' }}
            </a>
          </div>

        </div>
      </div>

      <div *ngIf="filteredLots.length === 0" class="glass-card" style="text-align: center; padding: 3rem; color: #64748b;">
        <i class="fa-solid fa-fish" style="font-size: 2.5rem; margin-bottom: 0.75rem;"></i>
        <p style="font-size: 1rem; font-weight: 600;">No auction lots found for selected filter.</p>
      </div>
    </div>
  `
})
export class HomeDashboardComponent implements OnInit, OnDestroy {
  lots: AuctionLot[] = [];
  boats: Boat[] = [];
  filter: 'all' | 'open' | 'closed' = 'open';
  flashLotId: string | null = null;

  private subs: Subscription[] = [];

  constructor(private apiService: ApiService, private socketService: SocketService) {}

  ngOnInit(): void {
    this.fetchData();

    this.subs.push(
      this.socketService.stateSync$.subscribe(sync => {
        if (sync.activeLots) this.lots = sync.activeLots;
        if (sync.recentBoats) this.boats = sync.recentBoats;
      }),
      this.socketService.lotOpened$.subscribe(newLot => {
        this.lots.unshift(newLot);
      }),
      this.socketService.bidPlaced$.subscribe(bidData => {
        const lot = this.lots.find(l => l.lotId === bidData.lotId);
        if (lot) {
          lot.currentPrice = bidData.currentPrice;
          lot.winningVendorName = bidData.vendorName;
          this.flashLotId = bidData.lotId;
          setTimeout(() => this.flashLotId = null, 800);
        }
      }),
      this.socketService.lotClosed$.subscribe(closedLot => {
        const index = this.lots.findIndex(l => l.lotId === closedLot.lotId);
        if (index !== -1) {
          this.lots[index] = closedLot;
        }
      }),
      this.socketService.boatArrived$.subscribe(boat => {
        this.boats.unshift(boat);
      })
    );
  }

  fetchData(): void {
    this.apiService.getLots().subscribe(lots => this.lots = lots);
    this.apiService.getBoats().subscribe(boats => this.boats = boats);
  }

  get filteredLots(): AuctionLot[] {
    if (this.filter === 'all') return this.lots;
    return this.lots.filter(l => l.status === this.filter);
  }

  get openCount(): number {
    return this.lots.filter(l => l.status === 'open').length;
  }

  get closedCount(): number {
    return this.lots.filter(l => l.status === 'closed').length;
  }

  setFilter(f: 'all' | 'open' | 'closed'): void {
    this.filter = f;
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
