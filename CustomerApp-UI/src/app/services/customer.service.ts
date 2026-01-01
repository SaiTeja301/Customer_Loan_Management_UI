import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, map, tap } from 'rxjs';
import { Customer } from '../models/customer.model';
import { environment } from '../../environments/environment';
import { ApiEndpoints } from '../enums/api-endpoints';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private apiUrl = `${environment.baseUrl}/${ApiEndpoints.BASE_ROUTE}`;

  // Cache for customer data to persist across route navigation
  private customersCache$ = new BehaviorSubject<Customer[] | null>(null);
  private lastFetchTime: Date | null = null;

  constructor(private http: HttpClient) { }

  // Get cached customers (returns null if no cache)
  getCachedCustomers(): Customer[] | null {
    return this.customersCache$.getValue();
  }

  // Get last fetch time
  getLastFetchTime(): Date | null {
    return this.lastFetchTime;
  }

  // Clear cache (call after add/update/delete)
  clearCache(): void {
    this.customersCache$.next(null);
    this.lastFetchTime = null;
  }

  getCustomers(): Observable<Customer[]> {
    return this.http.get<any[]>(`${this.apiUrl}${ApiEndpoints.GET_ALL}`).pipe(
      map(vos => vos.map(vo => this.mapVoToCustomer(vo))),
      tap(customers => {
        this.customersCache$.next(customers);
        this.lastFetchTime = new Date();
      })
    );
  }

  getCustomerById(id: string): Observable<Customer | undefined> {
    return this.http.get<any>(`${this.apiUrl}${ApiEndpoints.GET_BY_ID}${id}`).pipe(
      map(vo => this.mapVoToCustomer(vo))
    );
  }

  updateCustomer(updatedCustomer: Customer): Observable<Customer | null> {
    const payload = {
      customerName: updatedCustomer.name,
      customerAddress: updatedCustomer.address,
      principalAmount: updatedCustomer.principal,
      interestRate: updatedCustomer.interestRate,
      time: updatedCustomer.timePeriod
    };

    const url = `${this.apiUrl}${ApiEndpoints.UPDATE_BY_ID}${updatedCustomer.id}`;

    console.log('Update API Call URL:', url);
    console.log('Update Payload:', payload);

    return this.http.put(url, payload, { responseType: 'text' }).pipe(
      map(() => updatedCustomer),
      tap(() => this.clearCache())
    );
  }

  addCustomer(customer: any): Observable<any> {
    const payload = {
      customerName: customer.name,
      customerAddress: customer.address,
      principalAmount: customer.principal,
      rate: customer.interestRate,
      time: customer.timePeriod
    };
    // API returns text/plain response, not JSON
    return this.http.post(`${this.apiUrl}${ApiEndpoints.INSERT}`, payload, { responseType: 'text' }).pipe(
      tap(() => this.clearCache())
    );
  }

  deleteCustomer(id: string): Observable<boolean> {
    console.log('Delete API Call URL:', `${this.apiUrl}${ApiEndpoints.DELETE_BY_ID}${id}`);
    // API returns text/plain response, not JSON
    return this.http.delete(`${this.apiUrl}${ApiEndpoints.DELETE_BY_ID}${id}`, { responseType: 'text' }).pipe(
      map(() => true),
      tap(() => this.clearCache())
    );
  }

  askAgent(question: string): Observable<{ answer: string, timestamp: string }> {
    const payload = { question };
    return this.http.post<{ answer: string, timestamp: string }>(`${this.apiUrl}${ApiEndpoints.ASK_AGENT}`, payload);
  }

  private mapVoToCustomer(vo: any): Customer {
    return {
      id: vo.customerId,
      name: vo.customerName,
      email: '', // Not in backend
      phone: '', // Not in backend
      principal: parseFloat(vo.principalAmount),
      interestRate: parseFloat(vo.rate),
      timePeriod: parseFloat(vo.time),
      interestAmount: parseFloat(vo.rateofInterstAmount),
      totalAmount: parseFloat(vo.totalAmount),
      status: 'active', // Default
      joinDate: new Date().toISOString().split('T')[0], // Default
      address: vo.customerAddress,
      city: '', // Not in backend
      state: '', // Not in backend
      zipCode: '', // Not in backend
      dateOfBirth: '' // Not in backend
    };
  }
}
