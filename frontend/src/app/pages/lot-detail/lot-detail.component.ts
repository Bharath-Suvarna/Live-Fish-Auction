import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { AuthService } from '../../core/services/auth.service';
import { AuctionLot, Bid, User } from '../../core/models/models';

@Component({
  selector: 'app-lot-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div *ngIf="lot" class="space-y-6">
      <!-- Breadcrumb Nav -->
      <div class="flex items-center gap-2 text-xs text-slate-400">
        <a routerLink="/" class="hover:text-cyan-400">Home</a>
        <i class="fa-solid fa-chevron-right text-[10px]"></i>
        <span class="text-slate-200">Lot #{{ lot.lotId }}</span>
      </div>

      <!-- Lot Main Header Card -->
      <div class="glass-card p-6 border-cyan-500/20">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-cyan-400 bg-cyan-950 px-2.5 py-1 rounded border border-cyan-800">
                {{ lot.lotId }}
              </span>
              <span [class]="lot.status === 'open' ? 'badge badge-open' : 'badge badge-closed'">
                <span *ngIf="lot.status === 'open'" class="pulse-dot"></span>
                {{ lot.status }}
              </span>
            </div>
            <h1 class="text-3xl font-extrabold text-white mt-2">{{ lot.fishType }}</h1>
            <p class="text-sm text-slate-300 flex items-center gap-2 mt-1">
              <i class="fa-solid fa-ship text-cyan-400"></i> Arrived on <strong>{{ lot.boatName }}</strong>
            </p>
          </div>

          <!-- Price Header -->
          <div class="bg-slate-900/80 p-4 rounded-xl border border-slate-800 text-right min-w-[200px]">
            <span class="text-xs text-slate-400 block font-semibold">LIVE HIGHEST BID</span>
            <div class="text-3xl font-black text-cyan-400 mt-1" [ngClass]="{'price-flash': flashPrice}">
              ₹{{ lot.currentPrice }}
            </div>
            <span class="text-xs text-slate-400">
              ({{ (lot.currentPrice / lot.quantityKg).toFixed(1) }} ₹/kg)
            </span>
          </div>
        </div>

        <!-- Specifications Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div class="bg-slate-800/40 p-3 rounded-lg">
            <span class="text-slate-400 block">Total Weight</span>
            <span class="text-base font-bold text-white">{{ lot.quantityKg }} kg</span>
          </div>
          <div class="bg-slate-800/40 p-3 rounded-lg">
            <span class="text-slate-400 block">Opening Price</span>
            <span class="text-base font-bold text-slate-300">₹{{ lot.startingPrice }}</span>
          </div>
          <div class="bg-slate-800/40 p-3 rounded-lg">
            <span class="text-slate-400 block">Current Winning Vendor</span>
            <span class="text-base font-bold text-amber-400 truncate block">
              {{ lot.winningVendorName || 'No bids yet' }}
            </span>
          </div>
          <div class="bg-slate-800/40 p-3 rounded-lg">
            <span class="text-slate-400 block">Auction Opened</span>
            <span class="text-base font-bold text-slate-300">
              {{ lot.startTime | date:'shortTime' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Main Section: Bidding Form & Feed -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Bidding Control (For Vendors / Admin) -->
        <div class="lg:col-span-1 space-y-4">
          <div class="glass-card p-5 border-emerald-500/20">
            <h3 class="text-lg font-bold text-white mb-3 flex items-center gap-2">
              <i class="fa-solid fa-gavel text-emerald-400"></i> Place Real-Time Bid
            </h3>

            <!-- Role check alert -->
            <div *ngIf="!currentUser" class="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-300 mb-4">
              <i class="fa-solid fa-lock"></i> Please <a routerLink="/login" class="underline font-bold">login as a Vendor</a> to participate in live bidding.
            </div>

            <div *ngIf="currentUser && currentUser.role === 'Viewer'" class="bg-blue-500/10 border border-blue-500/30 p-3 rounded-lg text-xs text-blue-300 mb-4">
              <i class="fa-solid fa-eye"></i> You are currently viewing in <strong>Viewer mode</strong>. Switch to Vendor role to bid.
            </div>

            <div *ngIf="lot.status === 'closed'" class="bg-red-500/10 border border-red-500/30 p-3 rounded-lg text-xs text-red-300 mb-4">
              <i class="fa-solid fa-ban"></i> Bidding is closed for this lot.
            </div>

            <form *ngIf="isVendorOrAdmin && lot.status === 'open'" (ngSubmit)="submitBid()" class="space-y-4">
              <div>
                <label class="block text-xs font-semibold text-slate-300 mb-1">Your Bid Amount (₹)</label>
                <div class="relative">
                  <span class="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                  <input type="number" [(ngModel)]="customBidAmount" name="customBid"
                         [min]="lot.currentPrice + 1"
                         class="w-full pl-8 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white font-bold text-lg focus:border-cyan-400 focus:outline-none" 
                         placeholder="Enter amount">
                </div>
              </div>

              <!-- Quick Increment Buttons -->
              <div>
                <span class="text-[11px] text-slate-400 block mb-1.5 font-semibold">QUICK INCREMENT</span>
                <div class="grid grid-cols-3 gap-2">
                  <button type="button" (click)="addIncrement(10)" class="btn-secondary text-xs py-2 text-center">
                    +₹10
                  </button>
                  <button type="button" (click)="addIncrement(50)" class="btn-secondary text-xs py-2 text-center">
                    +₹50
                  </button>
                  <button type="button" (click)="addIncrement(100)" class="btn-secondary text-xs py-2 text-center">
                    +₹100
                  </button>
                </div>
              </div>

              <!-- Error feedback -->
              <div *ngIf="bidError" class="text-xs text-red-400 bg-red-950/60 p-2.5 rounded border border-red-800">
                {{ bidError }}
              </div>

              <!-- Submit button -->
              <button type="submit" [disabled]="submitting" class="w-full btn-primary py-3 justify-center text-sm font-extrabold">
                <i class="fa-solid fa-bolt"></i> {{ submitting ? 'Transmitting Bid...' : 'Submit Instant Bid' }}
              </button>
            </form>
          </div>
        </div>

        <!-- Real-Time Bid Feed -->
        <div class="lg:col-span-2 glass-card p-5">
          <div class="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <h3 class="text-lg font-bold text-white flex items-center gap-2">
              <i class="fa-solid fa-list-ol text-cyan-400"></i> Real-Time Bid Audit Feed
            </h3>
            <span class="text-xs text-slate-400 font-mono">{{ bids.length }} bids logged</span>
          </div>

          <div class="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            <div *ngFor="let bid of bids; let first = first" 
                 class="p-3.5 rounded-xl transition-all flex items-center justify-between"
                 [ngClass]="first ? 'bg-cyan-950/40 border border-cyan-500/40 shadow-[0_0_15px_rgba(0,245,212,0.1)]' : 'bg-slate-900/60 border border-slate-800'">
              
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
                     [ngClass]="first ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-300'">
                  <i class="fa-solid fa-user-tag text-xs"></i>
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-sm text-white">{{ bid.vendorName }}</span>
                    <span *ngIf="first" class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 bg-cyan-900/60 px-2 py-0.5 rounded">
                      HIGHEST
                    </span>
                  </div>
                  <span class="text-xs text-slate-400">{{ bid.timestamp | date:'mediumTime' }}</span>
                </div>
              </div>

              <div class="text-right">
                <div class="text-lg font-black" [ngClass]="first ? 'text-cyan-400' : 'text-slate-200'">
                  ₹{{ bid.bidAmount }}
                </div>
                <span class="text-[10px] text-slate-400 font-mono">
                  ₹{{ (bid.bidAmount / (lot.quantityKg || 1)).toFixed(1) }}/kg
                </span>
              </div>
            </div>

            <div *ngIf="bids.length === 0" class="text-center py-10 text-slate-500 text-sm">
              <i class="fa-solid fa-clock-rotate-left text-3xl mb-2 text-slate-700"></i>
              <p>No bids placed yet on this lot. Be the first!</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  `
})
export class LotDetailComponent implements OnInit, OnDestroy {
  lotId!: string;
  lot: AuctionLot | null = null;
  bids: Bid[] = [];
  currentUser: User | null = null;
  customBidAmount: number = 0;
  bidError: string | null = null;
  submitting: boolean = false;
  flashPrice: boolean = false;

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private apiService: ApiService,
    private socketService: SocketService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.currentUserValue;

    this.route.params.subscribe(params => {
      this.lotId = params['id'];
      this.loadLotData();

      // Join Socket room for this lot
      this.socketService.joinLot(this.lotId);
    });

    // Listen to real-time bids for this lot
    this.subs.push(
      this.socketService.bidPlaced$.subscribe(bidData => {
        if (bidData.lotId === this.lotId && this.lot) {
          this.lot.currentPrice = bidData.currentPrice;
          this.lot.winningVendorName = bidData.vendorName;
          
          this.bids.unshift({
            bidId: bidData.bidId,
            lotId: bidData.lotId,
            vendorId: bidData.vendorId,
            vendorName: bidData.vendorName,
            bidAmount: bidData.bidAmount,
            timestamp: bidData.timestamp
          });

          this.flashPrice = true;
          setTimeout(() => this.flashPrice = false, 800);

          // Update min bid recommendation
          if (this.customBidAmount <= this.lot.currentPrice) {
            this.customBidAmount = this.lot.currentPrice + 10;
          }
        }
      })
    );
  }

  loadLotData(): void {
    this.apiService.getLotById(this.lotId).subscribe(({ lot, bids }) => {
      this.lot = lot;
      this.bids = bids;
      this.customBidAmount = lot.currentPrice + 10;
    });
  }

  get isVendorOrAdmin(): boolean {
    return this.authService.isVendorOrAdmin();
  }

  addIncrement(amount: number): void {
    if (this.lot) {
      this.customBidAmount = Math.max(this.customBidAmount, this.lot.currentPrice) + amount;
    }
  }

  submitBid(): void {
    if (!this.lot) return;
    this.bidError = null;

    if (this.customBidAmount <= this.lot.currentPrice) {
      this.bidError = `Bid must be higher than current price ₹${this.lot.currentPrice}`;
      return;
    }

    this.submitting = true;
    this.apiService.placeBid(this.lotId, this.customBidAmount).subscribe({
      next: (res) => {
        this.submitting = false;
        // Success: socket broadcast will handle UI update
      },
      error: (err) => {
        this.submitting = false;
        this.bidError = err.error?.error || 'Failed to submit bid';
      }
    });
  }

  ngOnDestroy(): void {
    if (this.lotId) {
      this.socketService.leaveLot(this.lotId);
    }
    this.subs.forEach(s => s.unsubscribe());
  }
}
