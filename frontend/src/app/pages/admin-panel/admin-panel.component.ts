import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuctionLot, Boat } from '../../core/models/models';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <i class="fa-solid fa-user-shield text-amber-400"></i> Auctioneer Admin Operations
        </h2>
        <p class="text-sm text-slate-400">Manage boat logging, open new fish auction lots, and close completed sales.</p>
      </div>

      <!-- Feedback messages -->
      <div *ngIf="successMsg" class="bg-emerald-950/80 border border-emerald-500/50 p-4 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
        <i class="fa-solid fa-circle-check"></i> {{ successMsg }}
      </div>
      <div *ngIf="errorMsg" class="bg-red-950/80 border border-red-500/50 p-4 rounded-xl text-red-300 text-sm flex items-center gap-2">
        <i class="fa-solid fa-triangle-exclamation"></i> {{ errorMsg }}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <!-- Form 1: Log Boat Arrival -->
        <div class="glass-card p-5 border-cyan-500/20">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <i class="fa-solid fa-ship text-cyan-400"></i> 1. Log New Boat Arrival
          </h3>
          <form (ngSubmit)="logBoat()" class="space-y-4 text-xs">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Boat / Vessel Name</label>
              <input type="text" [(ngModel)]="newBoat.boatName" name="boatName" required
                     class="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                     placeholder="e.g. St. Mary Trawler">
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 font-semibold mb-1">Owner Name</label>
                <input type="text" [(ngModel)]="newBoat.ownerName" name="ownerName"
                       class="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                       placeholder="e.g. Santhosh Suvarna">
              </div>
              <div>
                <label class="block text-slate-300 font-semibold mb-1">Primary Catch</label>
                <select [(ngModel)]="newBoat.catchType" name="catchType" required
                        class="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-400 focus:outline-none">
                  <option *ngFor="let fish of fishTypes" [value]="fish">{{ fish }}</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-slate-300 font-semibold mb-1">Estimated Total Quantity (Kg)</label>
              <input type="number" [(ngModel)]="newBoat.estimatedQuantityKg" name="estQty" required
                     class="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                     placeholder="e.g. 2500">
            </div>

            <button type="submit" class="w-full btn-primary py-2.5 justify-center">
              <i class="fa-solid fa-plus"></i> Broadcast Boat Arrival
            </button>
          </form>
        </div>

        <!-- Form 2: Open Auction Lot -->
        <div class="glass-card p-5 border-emerald-500/20">
          <h3 class="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <i class="fa-solid fa-gavel text-emerald-400"></i> 2. Open New Auction Lot
          </h3>
          <form (ngSubmit)="openLot()" class="space-y-4 text-xs">
            <div>
              <label class="block text-slate-300 font-semibold mb-1">Select Arrived Boat</label>
              <select [(ngModel)]="selectedBoatId" (change)="onBoatSelect()" name="selectedBoat" required
                      class="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-400 focus:outline-none">
                <option value="">-- Choose Boat --</option>
                <option *ngFor="let boat of boats" [value]="boat.boatId">
                  {{ boat.boatName }} ({{ boat.catchType }} - {{ boat.estimatedQuantityKg }}kg)
                </option>
              </select>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-slate-300 font-semibold mb-1">Fish Type</label>
                <select [(ngModel)]="newLot.fishType" name="lotFishType" required
                        class="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-400 focus:outline-none">
                  <option *ngFor="let fish of fishTypes" [value]="fish">{{ fish }}</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-300 font-semibold mb-1">Lot Quantity (Kg)</label>
                <input type="number" [(ngModel)]="newLot.quantityKg" name="lotQty" required
                       class="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                       placeholder="e.g. 500">
              </div>
            </div>

            <div>
              <label class="block text-slate-300 font-semibold mb-1">Starting Floor Price (₹ Total)</label>
              <input type="number" [(ngModel)]="newLot.startingPrice" name="startPrice" required
                     class="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-cyan-400 focus:outline-none"
                     placeholder="e.g. 15000">
            </div>

            <button type="submit" class="w-full btn-primary py-2.5 justify-center">
              <i class="fa-solid fa-bullhorn"></i> Open Bidding Floor
            </button>
          </form>
        </div>

      </div>

      <!-- Active Lots Management Table -->
      <div class="glass-card p-5">
        <h3 class="text-base font-bold text-white mb-4">Active Open Lots (Manual Closing Control)</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th class="p-3">Lot ID</th>
                <th class="p-3">Fish & Boat</th>
                <th class="p-3">Quantity</th>
                <th class="p-3">Current Price</th>
                <th class="p-3">Winning Vendor</th>
                <th class="p-3">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              <tr *ngFor="let lot of activeLots" class="hover:bg-slate-800/30 transition">
                <td class="p-3 font-mono text-cyan-400 font-bold">{{ lot.lotId }}</td>
                <td class="p-3">
                  <div class="font-bold text-white">{{ lot.fishType }}</div>
                  <div class="text-[10px] text-slate-400">{{ lot.boatName }}</div>
                </td>
                <td class="p-3 font-semibold text-slate-200">{{ lot.quantityKg }} kg</td>
                <td class="p-3 font-black text-emerald-400">₹{{ lot.currentPrice }}</td>
                <td class="p-3 text-amber-400 font-bold">{{ lot.winningVendorName || 'No Bids' }}</td>
                <td class="p-3">
                  <button (click)="closeLot(lot.lotId)" class="btn-danger text-[11px] py-1 px-3">
                    <i class="fa-solid fa-flag-checkered"></i> Close Lot
                  </button>
                </td>
              </tr>
              <tr *ngIf="activeLots.length === 0">
                <td colspan="6" class="p-6 text-center text-slate-500 italic">No currently active open lots.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class AdminPanelComponent implements OnInit {
  boats: Boat[] = [];
  activeLots: AuctionLot[] = [];

  fishTypes = ['Mackerel', 'Sardine', 'Prawns', 'Tuna', 'Kingfish', 'Squid', 'Pomfret', 'Seerfish'];
  selectedBoatId: string = '';

  newBoat = {
    boatName: '',
    ownerName: '',
    catchType: 'Mackerel',
    estimatedQuantityKg: 1000
  };

  newLot = {
    boatId: '',
    boatName: '',
    fishType: 'Mackerel',
    quantityKg: 500,
    startingPrice: 10000
  };

  successMsg: string | null = null;
  errorMsg: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.apiService.getBoats().subscribe(boats => this.boats = boats);
    this.apiService.getLots('open').subscribe(lots => this.activeLots = lots);
  }

  onBoatSelect(): void {
    const boat = this.boats.find(b => b.boatId === this.selectedBoatId);
    if (boat) {
      this.newLot.boatId = boat.boatId;
      this.newLot.boatName = boat.boatName;
      this.newLot.fishType = boat.catchType;
    }
  }

  logBoat(): void {
    this.clearMsgs();
    this.apiService.createBoat(this.newBoat).subscribe({
      next: (res) => {
        this.successMsg = `Boat "${res.boatName}" logged successfully! Broadcasted to live harbor dashboard.`;
        this.newBoat = { boatName: '', ownerName: '', catchType: 'Mackerel', estimatedQuantityKg: 1000 };
        this.refresh();
      },
      error: (err) => {
        this.errorMsg = err.error?.error || 'Failed to log boat';
      }
    });
  }

  openLot(): void {
    this.clearMsgs();
    if (!this.newLot.boatId) {
      this.errorMsg = 'Please select a boat first!';
      return;
    }

    this.apiService.createLot(this.newLot).subscribe({
      next: (res) => {
        this.successMsg = `Lot #${res.lotId} opened for live bidding!`;
        this.refresh();
      },
      error: (err) => {
        this.errorMsg = err.error?.error || 'Failed to open lot';
      }
    });
  }

  closeLot(lotId: string): void {
    this.clearMsgs();
    this.apiService.closeLot(lotId).subscribe({
      next: (res) => {
        this.successMsg = `Lot #${res.lotId} closed. Winning bidder: ${res.winningVendorName || 'None'}`;
        this.refresh();
      },
      error: (err) => {
        this.errorMsg = err.error?.error || 'Failed to close lot';
      }
    });
  }

  private clearMsgs(): void {
    this.successMsg = null;
    this.errorMsg = null;
  }
}
