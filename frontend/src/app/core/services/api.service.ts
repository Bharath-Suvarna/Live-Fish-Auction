import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Boat, AuctionLot, Bid, PriceTrend } from '../models/models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.token;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  // Boats
  getBoats(): Observable<Boat[]> {
    return this.http.get<Boat[]>(`${this.baseUrl}/boats`);
  }

  createBoat(boatData: any): Observable<Boat> {
    return this.http.post<Boat>(`${this.baseUrl}/boats`, boatData, { headers: this.getHeaders() });
  }

  // Lots
  getLots(status?: string): Observable<AuctionLot[]> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }
    return this.http.get<AuctionLot[]>(`${this.baseUrl}/lots`, { params });
  }

  getLotById(id: string): Observable<{ lot: AuctionLot; bids: Bid[] }> {
    return this.http.get<{ lot: AuctionLot; bids: Bid[] }>(`${this.baseUrl}/lots/${id}`);
  }

  createLot(lotData: any): Observable<AuctionLot> {
    return this.http.post<AuctionLot>(`${this.baseUrl}/lots`, lotData, { headers: this.getHeaders() });
  }

  closeLot(id: string): Observable<AuctionLot> {
    return this.http.patch<AuctionLot>(`${this.baseUrl}/lots/${id}/close`, {}, { headers: this.getHeaders() });
  }

  placeBid(lotId: string, bidAmount: number): Observable<{ bid: Bid; lot: AuctionLot }> {
    return this.http.post<{ bid: Bid; lot: AuctionLot }>(
      `${this.baseUrl}/lots/${lotId}/bids`, 
      { bidAmount }, 
      { headers: this.getHeaders() }
    );
  }

  // Price Trends
  getPriceTrends(fishType?: string, range?: string): Observable<PriceTrend[]> {
    let params = new HttpParams();
    if (fishType) params = params.set('fishType', fishType);
    if (range) params = params.set('range', range);
    return this.http.get<PriceTrend[]>(`${this.baseUrl}/price-trends`, { params });
  }
}
