export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  principal: number;
  interestRate: number;
  timePeriod: number;
  status: 'active' | 'inactive' | 'pending' | string;
  joinDate?: string;
  interestAmount?: number;
  totalAmount?: number;
  // Extended fields for Update Customer screen
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  dateOfBirth?: string;
}
