import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerService } from '../../services/customer.service';
import { Customer } from '../../models/customer.model';
import { ActivatedRoute, Router } from '@angular/router';
import { map, timeout, catchError, of } from 'rxjs';

@Component({
    selector: 'app-update-customer',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './update-customer.component.html',
    styleUrls: ['./update-customer.component.css']
})
export class UpdateCustomerComponent implements OnInit {
    searchForm: FormGroup;
    updateForm: FormGroup;
    customer: Customer | null = null;
    loading = false;
    saving = false;
    errorMessage = '';
    successMessage = '';
    calculatedInterest = 0;
    totalAmount = 0;
    showConfirmationModal = false;
    hasUnsavedChanges = false;
    isIdProvided = false; // Flag to hide search section

    constructor(
        private fb: FormBuilder,
        private customerService: CustomerService,
        private route: ActivatedRoute,
        private router: Router,
        private cdr: ChangeDetectorRef // Inject ChangeDetectorRef
    ) {
        this.searchForm = this.fb.group({
            customerId: ['', [Validators.required, Validators.pattern('^[0-9]+$')]]
        });

        this.updateForm = this.fb.group({
            fullName: ['', [Validators.required, Validators.minLength(2)]],
            address: ['', [Validators.required]],
            principalAmount: [0, [Validators.required, Validators.min(1000)]],
            interestRate: [0, [Validators.required, Validators.min(0.1)]],
            timePeriod: [0, [Validators.required, Validators.min(1)]]
        });
    }

    ngOnInit(): void {
        console.log('[UpdateCustomer] Component Initialized');

        // Connectivity Probe
        console.log('[UpdateCustomer] Probing backend connectivity...');
        this.customerService.getCustomers().subscribe({
            next: (data) => {
                console.log('[UpdateCustomer] Backend PROBE SUCCESS. Customer count:', data.length);
            },
            error: (err) => {
                console.error('[UpdateCustomer] Backend PROBE FAILED. Is the server running on port 8080?', err);
                alert('Backend Connection Failed! Please check if your Spring Boot server is running on port 8080.');
            }
        });

        this.updateForm.valueChanges.subscribe(() => {
            this.hasUnsavedChanges = true;
            this.calculateInterest();
            this.cdr.markForCheck(); // Trigger detection on form changes
        });

        // Check for query param
        this.route.queryParams.subscribe(params => {
            console.log('[UpdateCustomer] Query Params:', params);
            if (params['id']) {
                this.isIdProvided = true;
                this.searchForm.patchValue({ customerId: params['id'] });
                console.log('[UpdateCustomer] ID found in URL:', params['id']);
                this.loadCustomer();
                this.cdr.markForCheck(); // Trigger detection
            }
        });
    }

    loadCustomer() {
        if (this.searchForm.invalid) {
            this.errorMessage = 'Please enter a valid customer ID';
            this.cdr.markForCheck();
            return;
        }

        const id = this.searchForm.get('customerId')?.value;
        this.loading = true;
        this.errorMessage = '';
        this.customer = null;
        this.successMessage = '';
        this.cdr.markForCheck(); // Update UI for loading state

        // Try to get by ID first
        this.customerService.getCustomerById(id).pipe(
            timeout(3000), // Wait 3s max for direct API
            catchError(() => {
                console.warn('Direct getCustomerById failed/timed out, falling back to getAllCustomers');
                // Fallback: Fetch all customers and find by ID
                return this.customerService.getCustomers().pipe(
                    map(customers => customers.find(c => c.id === id || c.id === id.toString())),
                    catchError(() => of(undefined)) // If even list fails
                );
            })
        ).subscribe({
            next: (customer) => {
                this.loading = false;
                if (customer) {
                    if (!customer.id) {
                        customer.id = id;
                    }
                    this.customer = customer;
                    this.populateForm(customer);
                    this.hasUnsavedChanges = false;
                } else {
                    this.errorMessage = `Customer with ID "${id}" not found.`;
                }
                this.cdr.markForCheck(); // CRITICAL: Update UI
            },
            error: () => {
                this.loading = false;
                this.errorMessage = 'Could not load customer data. Please check your connection.';
                this.cdr.markForCheck(); // CRITICAL: Update UI
            }
        });
    }

    populateForm(customer: Customer) {
        this.updateForm.patchValue({
            fullName: customer.name,
            address: customer.address || '',
            principalAmount: customer.principal,
            interestRate: customer.interestRate,
            timePeriod: customer.timePeriod
        }, { emitEvent: false }); // Don't trigger valueChanges on initial load

        this.calculateInterest();
        console.log('[UpdateCustomer] Form populated. Form valid:', this.updateForm.valid);
        this.cdr.markForCheck();
    }

    calculateInterest() {
        const principal = this.updateForm.get('principalAmount')?.value || 0;
        const rate = this.updateForm.get('interestRate')?.value || 0;
        const time = this.updateForm.get('timePeriod')?.value || 0;

        this.calculatedInterest = principal * (rate / 100) * time;
        this.totalAmount = principal + this.calculatedInterest;
    }

    onSubmit() {
        console.log('[UpdateCustomer] onSubmit called');
        if (this.updateForm.invalid) {
            console.warn('[UpdateCustomer] Form invalid', this.updateForm.errors);
            this.updateForm.markAllAsTouched();
            this.cdr.markForCheck();
            return;
        }

        if (!this.customer) return;

        this.saving = true;
        this.cdr.markForCheck();
        const formValue = this.updateForm.value;
        console.log('[UpdateCustomer] Form Value:', formValue);

        // Merge original customer data with form updates
        // Only override fields that are actually in the form
        const updatedCustomer: Customer = {
            ...this.customer,
            name: formValue.fullName,
            address: formValue.address,
            principal: formValue.principalAmount,
            interestRate: formValue.interestRate,
            timePeriod: formValue.timePeriod,
            // Only update derived fields if necessary, or let backend handle?
            // Usually we shouldn't update 'derived' fields like interestAmount manually unless form logic did it
            // calculateInterest() updates calculatedInterest/totalAmount properties but they are not in formValue
            // We should arguably set them here if backend expects them
        };

        // Ensure ID is set (safety check)
        if (!updatedCustomer.id) {
            updatedCustomer.id = this.customer.id;
        }

        console.log('[UpdateCustomer] Sending Payload:', updatedCustomer);

        this.customerService.updateCustomer(updatedCustomer).subscribe({
            next: () => {
                console.log('[UpdateCustomer] Update success');
                this.saving = false;
                this.successMessage = 'Customer updated successfully!';
                this.hasUnsavedChanges = false;
                this.cdr.markForCheck(); // Critical for UI update

                // Clear cache to ensure all-customers page loads fresh data
                this.customerService.clearCache();

                // Navigate to all-customers page after showing success message for 1.5 seconds
                setTimeout(() => {
                    this.router.navigate(['/all-customers'], { state: { forceReload: true } });
                }, 1500);
            },
            error: (err) => {
                console.error('[UpdateCustomer] Update failed', err);
                this.saving = false;
                this.errorMessage = 'Failed to update customer.';
                this.cdr.markForCheck(); // Critical for UI update
            }
        });
    }

    onCancel() {
        this.router.navigate(['/all-customers']);
    }

    confirmLeave() {
        this.showConfirmationModal = false;
        this.resetForm();
    }

    cancelLeave() {
        this.showConfirmationModal = false;
    }

    resetForm() {
        this.customer = null;
        this.updateForm.reset();
        this.searchForm.reset();
        this.errorMessage = '';
        this.successMessage = '';
        this.hasUnsavedChanges = false;
    }
}
