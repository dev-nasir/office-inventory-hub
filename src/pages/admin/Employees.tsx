import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Users, Package, Eye, Loader2, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportToCSV } from '@/lib/exportUtils';
import { toast } from 'sonner';
import type { User, Department } from '@/types/inventory';

const departments: (Department | 'all')[] = [
  'all',
  'CMS',
  'Digital Marketing',
  'Management',
  'MERN Stack',
  'Sales',
  'UI/UX',
];

export default function Employees() {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<Department | 'all'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  // Fetch all employees (users with role 'employee')
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'employee')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as User[];
    },
  });

  // Fetch assignments count
  const { data: assignmentsData = [] } = useQuery({
    queryKey: ['assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('employee_id, id')
        .eq('status', 'assigned');

      if (error) throw error;
      return data;
    },
  });

  // Fetch selected employee's assignments
  const { data: selectedEmployeeInventory = [] } = useQuery({
    queryKey: ['employeeInventory', selectedEmployee],
    queryFn: async () => {
      if (!selectedEmployee) return [];
      
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          item:inventory_items(*)
        `)
        .eq('employee_id', selectedEmployee)
        .eq('status', 'assigned');

      if (error) throw error;
      return data;
    },
    enabled: !!selectedEmployee,
  });

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = 
      emp.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = 
      departmentFilter === 'all' || emp.department === departmentFilter;

    return matchesSearch && matchesDepartment;
  });

  const handleExportCSV = () => {
    const exportData = filteredEmployees.map(emp => ({
      'Full Name': emp.name || 'Unnamed',
      'Email': emp.email,
      'Department': emp.department || 'N/A',
      'Phone': emp.phone || 'N/A',
      'Address': emp.address || 'N/A',
      'Items Assigned': getEmployeeInventoryCount(emp.id),
      'Joined Date': new Date(emp.created_at || emp.createdAt).toLocaleDateString()
    }));
    
    exportToCSV(exportData, `employees_export_${new Date().toISOString().split('T')[0]}`);
    toast.success('Employee list exported successfully');
  };

  const getEmployeeInventoryCount = (employeeId: string) => {
    return assignmentsData.filter(a => a.employee_id === employeeId).length;
  };

  const getInitials = (name: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const selectedEmployeeData = selectedEmployee
    ? employees.find(e => e.id === selectedEmployee)
    : null;

  const employeesWithInventory = new Set(assignmentsData.map(a => a.employee_id)).size;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Employee Management</h1>
            <p className="text-muted-foreground">View employees and their assigned inventory</p>
          </div>
          <Button variant="outline" onClick={handleExportCSV}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{employees.length}</p>
                  <p className="text-sm text-muted-foreground">Total Employees</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{assignmentsData.length}</p>
                  <p className="text-sm text-muted-foreground">Items Assigned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{employeesWithInventory}</p>
                  <p className="text-sm text-muted-foreground">With Inventory</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="w-full md:w-64">
                <Label className="text-xs text-muted-foreground mb-1 block">Filter by Department</Label>
                <Select
                  value={departmentFilter}
                  onValueChange={(value) => setDepartmentFilter(value as Department | 'all')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept === 'all' ? 'All Departments' : dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">All Employees</CardTitle>
            <CardDescription>{filteredEmployees.length} employees found</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredEmployees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Assigned Items</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEmployees.map((employee) => {
                      const inventoryCount = getEmployeeInventoryCount(employee.id);
                      return (
                        <TableRow key={employee.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {getInitials(employee.name || '')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{employee.name || 'Unnamed'}</p>
                                <p className="text-sm text-muted-foreground">{employee.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{employee.department || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {employee.phone || '-'}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{inventoryCount}</span>
                            <span className="text-muted-foreground"> items</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(employee.created_at || employee.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedEmployee(employee.id)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No employees found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employee Detail Dialog */}
        <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Employee Details</DialogTitle>
              <DialogDescription>
                View employee information and assigned inventory
              </DialogDescription>
            </DialogHeader>
            {selectedEmployeeData && (
              <div className="space-y-6">
                {/* Employee Info */}
                <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                      {getInitials(selectedEmployeeData.name || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-lg font-semibold">{selectedEmployeeData.name || 'Unnamed'}</h3>
                    <p className="text-muted-foreground">{selectedEmployeeData.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">
                        {selectedEmployeeData.department || 'N/A'}
                      </Badge>
                      {selectedEmployeeData.phone && (
                        <Badge variant="secondary" className="font-mono">
                          {selectedEmployeeData.phone}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {selectedEmployeeData.address && (
                  <div className="p-4 rounded-lg bg-secondary/30 border">
                    <h4 className="text-sm font-semibold mb-1">Office / Home Address</h4>
                    <p className="text-sm text-muted-foreground">{selectedEmployeeData.address}</p>
                  </div>
                )}

                {/* Assigned Inventory */}
                <div>
                  <h4 className="font-semibold mb-3">Assigned Inventory</h4>
                  {selectedEmployeeInventory.length > 0 ? (
                    <div className="space-y-2">
                      {selectedEmployeeInventory.map((inv: any) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Package className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{inv.item?.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Qty: {inv.quantity} • {inv.item?.category}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(inv.assigned_date).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      No items assigned to this employee
                    </p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
