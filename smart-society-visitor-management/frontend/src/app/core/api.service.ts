import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Paginated } from './models';

/**
 * Thin typed wrapper over the Django REST API.
 * Auth headers are attached by tokenInterceptor; paths are relative to the API root (e.g. '/users/').
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  private paramsOf(params?: Record<string, unknown>): HttpParams {
    let p = new HttpParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v === undefined || v === null || v === '') continue;
        p = p.set(k, String(v));
      }
    }
    return p;
  }

  list<T>(path: string, params?: Record<string, unknown>): Observable<Paginated<T>> {
    return this.http.get<Paginated<T>>(`${this.base}${path}`, { params: this.paramsOf(params) });
  }

  get<T>(path: string, params?: Record<string, unknown>): Observable<T> {
    return this.http.get<T>(`${this.base}${path}`, { params: this.paramsOf(params) });
  }

  post<T>(path: string, body: unknown): Observable<T> {
    return this.http.post<T>(`${this.base}${path}`, body);
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(`${this.base}${path}`, body);
  }

  patch<T>(path: string, body: unknown): Observable<T> {
    return this.http.patch<T>(`${this.base}${path}`, body);
  }

  delete(path: string): Observable<void> {
    return this.http.delete<void>(`${this.base}${path}`);
  }

  /** For binary endpoints such as GET /visit-requests/{id}/qr/ (returns a PNG). */
  getBlob(path: string): Observable<Blob> {
    return this.http.get(`${this.base}${path}`, { responseType: 'blob' });
  }
}
