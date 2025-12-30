import { Routes } from '@angular/router';
import { CustomerListComponent } from './features/customer-list/customer-list.component';
import { GetCustomerComponent } from './features/get-customer/get-customer.component';
import { UpdateCustomerComponent } from './features/update-customer/update-customer.component';
import { AddCustomerComponent } from './features/add-customer/add-customer.component';
import { AskAgentComponent } from './features/ask-agent/ask-agent.component';

export const routes: Routes = [
  { path: '', redirectTo: 'get-customer-by-id', pathMatch: 'full' },
  { path: 'all-customers', component: CustomerListComponent },
  { path: 'get-customer-by-id', component: GetCustomerComponent },
  { path: 'update-customer', component: UpdateCustomerComponent },
  { path: 'add-customer', component: AddCustomerComponent },
  { path: 'ask-agent', component: AskAgentComponent }
];
