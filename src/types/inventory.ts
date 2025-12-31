export type UserRole = 'admin' | 'employee';

export type Department = 
  | 'CMS'
  | 'Digital Marketing'
  | 'Management'
  | 'MERN Stack'
  | 'Sales'
  | 'UI/UX';

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'completed';

export type InventoryStatus = 'assigned' | 'returned' | 'available';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department: Department;
  phone?: string;
  address?: string;
  createdAt: string;
  created_at?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  description: string;
  quantity: number;
  availableQuantity: number;
  specifications?: Record<string, any>;
  createdAt: string;
  created_at?: string;
}

export interface EmployeeInventory {
  id: string;
  employeeId: string;
  itemId: string;
  quantity: number;
  assignedDate: string;
  status: InventoryStatus;
  notes?: string;
  item?: InventoryItem;
  employee?: User;
}

export interface InventoryRequest {
  id: string;
  employeeId: string;
  itemId: string;
  quantity: number;
  status: RequestStatus;
  notes?: string;
  createdAt: string;
  created_at?: string;
  reviewedAt?: string;
  reviewed_at?: string;
  reviewedBy?: string;
  reviewed_by?: string;
  item?: InventoryItem;
  itemName?: string;
  item_name?: string;
  category?: string;
  category_name?: string;
  employee?: User;
  urgency?: string;
  expectedDate?: string;
  expected_date?: string;
  adminComment?: string;
  admin_comment?: string;
  rejectReason?: string;
  reject_reason?: string;
  brand?: string;
  reviewer?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface HistoryEntry {
  id: string;
  actionType: 'assigned' | 'returned' | 'requested' | 'approved' | 'rejected';
  employeeId: string;
  itemId: string;
  quantity: number;
  notes?: string;
  createdAt: string;
  item?: InventoryItem;
  employee?: User;
}
