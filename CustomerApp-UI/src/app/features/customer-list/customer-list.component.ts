import { CustomerService } from '../../services/customer.service';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Customer } from '../../models/customer.model';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './customer-list.component.html',
  styleUrls: ['./customer-list.component.css']
})
export class CustomerListComponent implements OnInit {
  private customerService = inject(CustomerService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  customers: Customer[] = [];
  allCustomers: Customer[] = []; // Store master list

  // Search filters
  searchTerm: string = '';
  statusFilter: string = '';
  minPrincipal: string = '';
  maxPrincipal: string = '';
  maxInterestRate: string = '';

  lastUpdated: Date | null = null;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalPages: number = 0;
  isLoading: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  private successMessageTimeout: any;

  ngOnInit() {
    // Check if we should force reload (when navigating from add/update)
    const navigation = this.router.getCurrentNavigation();
    const shouldForceReload = navigation?.extras?.state?.['forceReload'] ||
      window.history.state?.forceReload;

    if (shouldForceReload) {
      // Force reload from API
      this.loadCustomers();
      return;
    }

    // Check for cached data first to preserve data across navigation
    const cachedData = this.customerService.getCachedCustomers();
    if (cachedData && cachedData.length > 0) {
      this.allCustomers = cachedData;
      this.customers = cachedData;
      this.updateTotalPages();
      this.lastUpdated = this.customerService.getLastFetchTime();
      // Re-apply filters if any exist
      if (this.searchTerm || this.statusFilter || this.minPrincipal || this.maxPrincipal || this.maxInterestRate) {
        this.searchCustomers();
      }
    } else {
      this.loadCustomers();
    }
  }

  loadCustomers() {
    this.isLoading = true;
    console.log('Loading customers from API...');
    this.customerService.getCustomers().subscribe({
      next: (data) => {
        console.log('Customers loaded successfully:', data?.length);
        this.allCustomers = data || [];
        this.customers = data || []; // Initialize displayed list
        this.updateTotalPages();
        // Re-apply filters if any exist
        if (this.searchTerm || this.statusFilter || this.minPrincipal || this.maxPrincipal || this.maxInterestRate) {
          this.searchCustomers();
        }
        this.isLoading = false;
        this.lastUpdated = new Date();
        this.cdr.detectChanges(); // Ensure UI updates
      },
      error: (err) => {
        console.error('Error loading customers', err);
        this.isLoading = false;
        this.cdr.detectChanges(); // Ensure UI updates on error
      }
    });
  }

  searchCustomers() {
    if (this.allCustomers.length === 0) return;

    this.customers = this.allCustomers.filter(customer => {
      // 1. Text Search (Name, Email, ID)
      const matchesSearch = !this.searchTerm ||
        customer.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        customer.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        customer.id.toString().includes(this.searchTerm);

      // 2. Status Filter
      const matchesStatus = !this.statusFilter ||
        customer.status.toLowerCase() === this.statusFilter.toLowerCase();

      // 3. Min/Max Principal Filter
      let matchesPrincipal = true;
      if (this.minPrincipal) {
        const minValue = parseFloat(this.minPrincipal);
        if (!isNaN(minValue)) {
          matchesPrincipal = matchesPrincipal && customer.principal >= minValue;
        }
      }
      if (this.maxPrincipal) {
        const maxValue = parseFloat(this.maxPrincipal);
        if (!isNaN(maxValue)) {
          matchesPrincipal = matchesPrincipal && customer.principal <= maxValue;
        }
      }

      // 4. Max Interest Rate Filter
      let matchesInterestRate = true;
      if (this.maxInterestRate) {
        const maxValue = parseFloat(this.maxInterestRate);
        if (!isNaN(maxValue)) {
          matchesInterestRate = customer.interestRate <= maxValue;
        }
      }

      return matchesSearch && matchesStatus && matchesPrincipal && matchesInterestRate;
    });

    // Update total pages after filtering
    this.updateTotalPages();
    // Reset to first page when search is performed
    this.currentPage = 1;
  }

  // Pagination methods
  get paginatedCustomers() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return this.customers.slice(startIndex, endIndex);
  }

  updateTotalPages() {
    this.totalPages = Math.ceil(this.customers.length / this.pageSize);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  editCustomer(id: string) {
    this.router.navigate(['/update-customer'], { queryParams: { id: id } });
  }

  deleteCustomer(id: string) {
    if (confirm('Are you sure you want to delete this customer?')) {
      this.customerService.deleteCustomer(id).subscribe({
        next: () => {
          // 1. Log to console to prove the 'next' block is reached
          console.log('%c [SUCCESS] deleteCustomer called successfully', 'background: #27ae60; color: #fff; font-size: 14px; padding: 2px 4px;');
          console.log('Deleted ID:', id);

          // 2. Set the exact success message requested by the user
          this.successMessage = `Record deleted successfully with ID: ${id}`;
          this.errorMessage = '';

          console.log('Success Message set to:', this.successMessage);

          // 3. Update local data (Optimistic UI)
          const targetId = String(id);
          this.allCustomers = this.allCustomers.filter(c => String(c.id) !== targetId);
          this.customers = this.customers.filter(c => String(c.id) !== targetId);

          this.updateTotalPages();

          // boundary check for pagination
          if (this.currentPage > this.totalPages && this.totalPages > 0) {
            this.currentPage = this.totalPages;
          }

          this.lastUpdated = new Date();
          this.customerService.clearCache();

          // 4. Auto-clear timer with cleanup
          if (this.successMessageTimeout) {
            clearTimeout(this.successMessageTimeout);
          }
          this.successMessageTimeout = setTimeout(() => {
            console.log('Clearing success message');
            this.successMessage = '';
            this.cdr.detectChanges();
          }, 5000); // Increased to 5s for better visibility

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
