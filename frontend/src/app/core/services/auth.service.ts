import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { User } from '../models/models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api/auth';
  private currentUserSubject = new BehaviorSubject<User | null>(this.loadStoredUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  private loadStoredUser(): User | null {
    const userJson = localStorage.getItem('malpe_user');
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get token(): string | null {
    return localStorage.getItem('malpe_token');
  }

  login(email: string, requestedRole: string = 'Vendor'): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, { email, requestedRole }).pipe(
      tap(res => {
        if (res.token && res.user) {
          localStorage.setItem('malpe_token', res.token);
          localStorage.setItem('malpe_user', JSON.stringify(res.user));
          this.currentUserSubject.next(res.user);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('malpe_token');
    localStorage.removeItem('malpe_user');
    this.currentUserSubject.next(null);
  }

  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return user ? user.role === role : false;
  }

  isVendorOrAdmin(): boolean {
    const user = this.currentUserValue;
    return user ? (user.role === 'Vendor' || user.role === 'Admin') : false;
  }
}
