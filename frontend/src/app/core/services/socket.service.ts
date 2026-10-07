import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { Boat, AuctionLot, Bid, PriceTrend } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class SocketService implements OnDestroy {
  private ws: WebSocket | null = null;
  private wsUrl = 'wss://bs7h77n0k8.execute-api.ap-south-1.amazonaws.com/prod';
  private isConnectedSubject = new BehaviorSubject<boolean>(false);
  public isConnected$ = this.isConnectedSubject.asObservable();

  // Socket event Subjects matching original SocketService interface
  public stateSync$ = new Subject<{ activeLots: AuctionLot[]; recentBoats: Boat[]; recentTrends: PriceTrend[] }>();
  public boatArrived$ = new Subject<Boat>();
  public lotOpened$ = new Subject<AuctionLot>();
  public bidPlaced$ = new Subject<{ bidId: string; lotId: string; vendorId: string; vendorName: string; bidAmount: number; timestamp: string; currentPrice: number }>();
  public lotClosed$ = new Subject<AuctionLot>();
  public priceTrendUpdate$ = new Subject<PriceTrend>();

  private reconnectTimer: any = null;
  private pingTimer: any = null;
  private isIntentionallyClosed = false;
  private currentSubscribedLotId: string | null = null;

  constructor(private ngZone: NgZone) {
    this.initWebSocket();
  }

  private initWebSocket(): void {
    this.isIntentionallyClosed = false;
    this.connect();
  }

  private connect(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      console.log('[Native WebSocket Client] Connecting to:', this.wsUrl);
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[Native WebSocket Client] Connected to AWS API Gateway WebSocket');
        this.ngZone.run(() => {
          this.isConnectedSubject.next(true);
        });

        this.startPingInterval();

        // Request state snapshot on connect
        this.send({ action: 'state:sync' });

        // Re-join active lot subscription if reconnected
        if (this.currentSubscribedLotId) {
          this.joinLot(this.currentSubscribedLotId);
        }
      };

      this.ws.onmessage = (event: MessageEvent) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.warn('[Native WebSocket Client] Error:', error);
      };

      this.ws.onclose = (event) => {
        console.warn('[Native WebSocket Client] Disconnected (code: ' + event.code + ', reason: ' + event.reason + ')');
        this.stopPingInterval();
        this.ngZone.run(() => {
          this.isConnectedSubject.next(false);
        });

        if (!this.isIntentionallyClosed) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      console.error('[Native WebSocket Client] Connection initialization error:', err);
      this.scheduleReconnect();
    }
  }

  private handleMessage(rawData: string): void {
    try {
      const msg = JSON.parse(rawData);
      console.log('[Native WebSocket Client] Message received:', msg);

      const event = msg.event;
      const data = msg.data !== undefined ? msg.data : msg;

      this.ngZone.run(() => {
        switch (event) {
          case 'state:sync':
            this.stateSync$.next(data);
            break;
          case 'boat:arrived':
            this.boatArrived$.next(data);
            break;
          case 'lot:opened':
            this.lotOpened$.next(data);
            break;
          case 'bid:placed':
            this.bidPlaced$.next(data);
            break;
          case 'lot:closed':
            this.lotClosed$.next(data);
            break;
          case 'price:trend-update':
            this.priceTrendUpdate$.next(data);
            break;
          case 'pong':
            // Heartbeat response acknowledged
            break;
          default:
            console.log('[Native WebSocket Client] Received unhandled event:', event, data);
            break;
        }
      });
    } catch (e) {
      console.warn('[Native WebSocket Client] Failed to parse message:', rawData);
    }
  }

  private send(payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    } else {
      console.warn('[Native WebSocket Client] Cannot send payload, WebSocket is not open:', payload);
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval();
    // Send ping every 45 seconds to prevent AWS API Gateway 10-minute idle connection timeout
    this.ngZone.runOutsideAngular(() => {
      this.pingTimer = setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ action: 'ping' }));
        }
      }, 45000);
    });
  }

  private stopPingInterval(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ngZone.runOutsideAngular(() => {
      this.reconnectTimer = setTimeout(() => {
        console.log('[Native WebSocket Client] Attempting reconnection...');
        this.connect();
      }, 3000);
    });
  }

  joinLot(lotId: string): void {
    this.currentSubscribedLotId = lotId;
    this.send({ action: 'join:lot', lotId });
  }

  leaveLot(lotId: string): void {
    if (this.currentSubscribedLotId === lotId) {
      this.currentSubscribedLotId = null;
    }
    this.send({ action: 'leave:lot', lotId });
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopPingInterval();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
