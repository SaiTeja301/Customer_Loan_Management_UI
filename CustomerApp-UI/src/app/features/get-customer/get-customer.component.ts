import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/customer.model';

@Component({
    selector: 'app-get-customer',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './get-customer.component.html',
    styleUrls: ['./get-customer.component.css']
})
export class GetCustomerComponent {
    private customerService = inject(CustomerService);
    private cdr = inject(ChangeDetectorRef);

    customerId = '';
    customer: Customer | null = null;
    loading = false;
    error = '';

    searchCustomer() {
        if (!this.customerId) {
            this.error = 'Please enter a customer ID';
            return;
        }

        if (!/^\d+$/.test(this.customerId)) {
            this.error = 'Customer ID must contain only numbers';
            return;
        }

        this.loading = true;
        this.error = '';
        this.customer = null;
        this.cdr.detectChanges(); // Force update

        this.customerService.getCustomerById(this.customerId).subscribe({
            next: (data) => {
                console.log('Customer data received:', data);
                this.customer = data || null;
                if (!data) {
                    this.error = `😞 No Record found With This Id: "${this.customerId}"`;
                }
                this.loading = false;
                this.cdr.detectChanges(); // Force update after data received
            },
            error: (err) => {
                console.error('Error fetching customer:', err);
                // Show friendly message for 404 (not found) or any other error
                if (err.status === 404) {
                    this.error = `😞 No Record found With This Id: "${this.customerId}"`;
                } else {
                    this.error = `Error: ${err.message || 'Backend not responding'}`;
                }
                this.loading = false;
                this.cdr.detectChanges(); // Force update on error
            }
        });
    }

    calculateInterest(principal: number, rate: number, time: number): number {
        return principal * (rate / 100) * time;
    }

    calculateTotal(principal: number, interest: number): number {
        return principal + interest;
    }

    getStatusClass(status: string): string {
        switch (status.toLowerCase()) {
            case 'completed':
            case 'active':
                return 'bg-success-100 text-success-800';
            case 'processed':
            case 'pending':
                return 'bg-warning-100 text-warning-800';
            case 'inactive':
                return 'bg-error-100 text-error-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    }
}
