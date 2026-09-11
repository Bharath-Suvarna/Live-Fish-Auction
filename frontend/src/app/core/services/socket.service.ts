import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { Boat, AuctionLot, Bid, PriceTrend } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket!: Socket;
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$ = this.isConnectedSubject.asObservable();

  // Socket event Subjects
  public stateSync$ = new Subject<{ activeLots: AuctionLot[]; recentBoats: Boat[]; recentTrends: PriceTrend[] }>();
  public boatArrived$ = new Subject<Boat>();
  public lotOpened$ = new Subject<AuctionLot>();
  public bidPlaced$ = new Subject<{ bidId: string; lotId: string; vendorId: string; vendorName: string; bidAmount: number; timestamp: string; currentPrice: number }>();
  public lotClosed$ = new Subject<AuctionLot>();
  public priceTrendUpdate$ = new Subject<PriceTrend>();

  constructor() {
    this.initSocket();
  }

  private initSocket(): void {
    // Connect to /live namespace
    this.socket = io('http://localhost:3000/live', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      console.log('[Socket.io Client] Connected to /live namespace:', this.socket.id);
      this.isConnectedSubject.next(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[Socket.io Client] Disconnected:', reason);
      this.isConnectedSubject.next(false);
    });

    this.socket.on('state:sync', (data) => {
      console.log('[Socket.io Client] Received state:sync:', data);
      this.stateSync$.next(data);
    });

    this.socket.on('boat:arrived', (boat: Boat) => {
      this.boatArrived$.next(boat);
    });

    this.socket.on('lot:opened', (lot: AuctionLot) => {
      this.lotOpened$.next(lot);
    });

    this.socket.on('bid:placed', (bidData: any) => {
      this.bidPlaced$.next(bidData);
    });

    this.socket.on('lot:closed', (lot: AuctionLot) => {
      this.lotClosed$.next(lot);
    });

    this.socket.on('price:trend-update', (trend: PriceTrend) => {
      this.priceTrendUpdate$.next(trend);
    });
  }

  joinLot(lotId: string): void {
    if (this.socket) {
      this.socket.emit('join:lot', lotId);
    }
  }

  leaveLot(lotId: string): void {
    if (this.socket) {
      this.socket.emit('leave:lot', lotId);
    }
  }
}
