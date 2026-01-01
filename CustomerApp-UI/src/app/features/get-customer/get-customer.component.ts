import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/customer.model';

@Component({
    selector: 'app-get-customer',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './get-customer.component.html',
    styleUrls: ['./get-customer.component.css']
})
export class GetCustomerComponent {
    private customerService = inject(CustomerService);
    private router = inject(Router);
    private cdr = inject(ChangeDetectorRef);

    customerId = '';
    customer: Customer | null = null;
    loading = false;
    error = '';
    successMessage = '';
    errorMessage = '';
    private successMessageTimeout: any;

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
        this.successMessage = '';
        this.errorMessage = '';
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
                if (err.status === 404) {
                    this.error = `😞 No Record found With This Id: "${this.customerId}"`;
                } else {
                    this.error = `Error: ${err.message || 'Backend not responding'}`;
                }
                this.loading = false;
                this.cdr.detectChanges();
            }
        });
    }

    editCustomer(id: string) {
        this.router.navigate(['/update-customer'], { queryParams: { id: id } });
    }

    deleteCustomer(id: string) {
        if (confirm('Are you sure you want to delete this customer?')) {
            this.customerService.deleteCustomer(id).subscribe({
                next: () => {
                    console.log('[SUCCESS] deleteCustomer called from GetCustomer');
                    this.successMessage = `Record deleted successfully with ID: ${id}`;
                    this.errorMessage = '';
                    this.customer = null; // Clear the record after deletion
                    this.customerId = '';

                    // Auto-clear timer
                    if (this.successMessageTimeout) {
                        clearTimeout(this.successMessageTimeout);
                    }
                    this.successMessageTimeout = setTimeout(() => {
                        this.successMessage = '';
                        this.cdr.detectChanges();
                    }, 5000);

                    this.cdr.detectChanges();
                },
                error: (err) => {
                    console.error('Error deleting customer', err);
                    this.errorMessage = 'Failed to delete customer.';
                    this.successMessage = '';
                    this.cdr.detectChanges();
                }
            });
        }
    }
}
