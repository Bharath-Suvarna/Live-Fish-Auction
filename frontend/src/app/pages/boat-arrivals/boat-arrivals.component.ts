import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SocketService } from '../../core/services/socket.service';
import { Boat } from '../../core/models/models';

@Component({
  selector: 'app-boat-arrivals',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <i class="fa-solid fa-ship text-cyan-400"></i> Malpe Boat Arrivals Log
          </h2>
          <p class="text-sm text-slate-400">Daily trawler & deep-sea vessel arrivals at Malpe harbor jetty.</p>
        </div>
        <span class="text-xs font-mono bg-cyan-950 text-cyan-400 px-3 py-1.5 rounded-lg border border-cyan-800">
          Total Today: {{ boats.length }} Boats
        </span>
      </div>

      <div class="glass-card p-5">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-900/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th class="p-3.5">Boat ID</th>
                <th class="p-3.5">Boat Name</th>
                <th class="p-3.5">Owner Name</th>
                <th class="p-3.5">Primary Catch</th>
                <th class="p-3.5">Est. Quantity</th>
                <th class="p-3.5">Arrival Time</th>
                <th class="p-3.5">Harbor Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/60">
              <tr *ngFor="let boat of boats" class="hover:bg-slate-800/40 transition">
                <td class="p-3.5 font-mono text-xs text-cyan-400">{{ boat.boatId }}</td>
                <td class="p-3.5 font-bold text-white flex items-center gap-2">
                  <i class="fa-solid fa-anchor text-slate-500 text-xs"></i> {{ boat.boatName }}
                </td>
                <td class="p-3.5 text-slate-300">{{ boat.ownerName }}</td>
                <td class="p-3.5 font-semibold text-slate-200">{{ boat.catchType }}</td>
                <td class="p-3.5 font-bold text-slate-100">{{ boat.estimatedQuantityKg }} kg</td>
                <td class="p-3.5 text-slate-400 font-mono text-xs">{{ boat.arrivalTime | date:'shortTime' }}</td>
                <td class="p-3.5">
                  <span [ngClass]="{
                    'badge badge-arrived': boat.status === 'arrived',
                    'badge bg-amber-500/20 text-amber-300 border-amber-500/30': boat.status === 'unloading',
                    'badge badge-open': boat.status === 'auctioning',
                    'badge badge-closed': boat.status === 'done'
                  }">
                    {{ boat.status }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class BoatArrivalsComponent implements OnInit, OnDestroy {
  boats: Boat[] = [];
  private subs: Subscription[] = [];

  constructor(private apiService: ApiService, private socketService: SocketService) {}

  ngOnInit(): void {
    this.apiService.getBoats().subscribe(boats => this.boats = boats);

    this.subs.push(
      this.socketService.boatArrived$.subscribe(boat => {
        this.boats.unshift(boat);
      })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
