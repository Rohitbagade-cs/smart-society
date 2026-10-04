import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginResponse, Role, User } from './models';

const ACCESS_KEY = 'ssv_access';
const REFRESH_KEY = 'ssv_refresh';
const USER_KEY = 'ssv_user';

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private userSubject = new BehaviorSubject<User | null>(loadUser());
  readonly currentUser$ = this.userSubject.asObservable();

  get currentUser(): User | null {
    return this.userSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.accessToken && !!this.currentUser;
  }

  get accessToken(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  }

  /** POST /api/auth/login/ -> {access, refresh, user} */
  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login/`, { username, password })
      .pipe(
        tap((res) => {
          localStorage.setItem(ACCESS_KEY, res.access);
          localStorage.setItem(REFRESH_KEY, res.refresh);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.userSubject.next(res.user);
        })
      );
  }

  /** POST /api/auth/token/refresh/ -> {access} */
  refresh(): Observable<{ access: string }> {
    const refresh = localStorage.getItem(REFRESH_KEY);
    return this.http
      .post<{ access: string }>(`${environment.apiUrl}/auth/token/refresh/`, { refresh })
      .pipe(tap((res) => localStorage.setItem(ACCESS_KEY, res.access)));
  }

  /** GET /api/auth/me/ — refresh the cached user profile. */
  me(): Observable<User> {
    return this.http.get<User>(`${environment.apiUrl}/auth/me/`).pipe(
      tap((u) => {
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        this.userSubject.next(u);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    this.userSubject.next(null);
    this.router.navigate(['/login']);
  }

  hasRole(...roles: Role[]): boolean {
    const u = this.currentUser;
    return !!u && roles.includes(u.role);
  }

  homeRoute(): string {
    switch (this.currentUser?.role) {
      case 'admin':
        return '/admin';
      case 'guard':
        return '/guard';
      case 'resident':
        return '/resident';
      default:
        return '/login';
    }
  }
}
