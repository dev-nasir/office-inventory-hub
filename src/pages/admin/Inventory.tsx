import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, Package, Edit, Trash2, UserPlus, RotateCcw, Loader2, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { exportToCSV } from '@/lib/exportUtils';
import { categoryFields } from '@/lib/categoryFields';
import type { InventoryItem } from '@/types/inventory';

const categories = [
  'Mouse',
  'Keyboard',
  'Mobile',
  'LED/LCD',
  'Type-C Connector',
  'MacBook',
  'Laptop',
  'Data Device',
  'Other',
];

export default function Inventory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [selectedAssignItem, setSelectedAssignItem] = useState<any | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [specifications, setSpecifications] = useState<Record<string, string>>({});
  
  // New/Edit item form state
  const [newItem, setNewItem] = useState({
    name: '',
    category: '',
    description: '',
    quantity: '',
    condition: 'Good',
  });

  // Fetch all inventory items with creator info
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          creator:profiles!created_by(id, name, email, department, role)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  // Create item mutation
  const createMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([{
          name: item.name,
          category: item.category,
          description: item.description,
          quantity: parseInt(item.quantity),
          available_quantity: parseInt(item.quantity),
          created_by: user?.id,
          specifications: { ...specifications, condition: item.condition },
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Item added successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add item');
    },
  });

  // Update item mutation
  const updateMutation = useMutation({
    mutationFn: async (item: typeof newItem) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          name: item.name,
          category: item.category,
          description: item.description,
          quantity: parseInt(item.quantity),
          // If quantity increased, we should adjust available_quantity too
          specifications: { ...specifications, condition: item.condition },
        })
        .eq('id', editingItem)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast.success('Item updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update item');
    },
  });

  // Assign item mutation
  const assignMutation = useMutation({
    mutationFn: async ({ id, employeeId }: { id: string; employeeId: string }) => {
      const item = items.find(i => i.id === id);
      if (!item) throw new Error('Item not found');
      
      const available_qty = item.available_quantity ?? item.availableQuantity ?? 0;
      if (available_qty <= 0) throw new Error('No items available for assignment');

      // 1. Create assignment record
      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert([{
          employee_id: employeeId,
          item_id: id,
          quantity: 1,
          status: 'assigned'
        }]);
      if (assignmentError) throw assignmentError;

      // 2. Update available quantity
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          available_quantity: available_qty - 1
        })
        .eq('id', id);
      if (updateError) throw updateError;

      // 3. Log history
      const { error: historyError } = await supabase
        .from('history')
        .insert({
          action_type: 'assigned',
          employee_id: employeeId,
          item_id: id,
          quantity: 1,
          notes: 'Manually assigned by admin'
        });
      if (historyError) console.error('History log error:', historyError);

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      setIsAssignDialogOpen(false);
      setSelectedAssignItem(null);
      setSelectedEmployeeId('');
      toast.success('Item assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to assign item');
    },
  });

  // Fetch all employees for assignment
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('role', 'employee')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  const resetForm = () => {
    setNewItem({ name: '', category: '', description: '', quantity: '', condition: 'Good' });
    setSpecifications({});
    setEditingItem(null);
  };

  const getStockStatus = (item: any) => {
    const available = item.available_quantity ?? item.availableQuantity ?? 0;

    // If there is any stock available, it's Unassigned
    if (available > 0) {
      return { label: 'Unassigned', variant: 'default' as const };
    }

    // Otherwise, if all units are out, it's Assigned
    return { label: 'Assigned', variant: 'secondary' as const };
  };

  // Delete item mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Item deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete item');
    },
  });

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    
    // Status Filter
    const status = getStockStatus(item).label;
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    
    // Condition Filter
    const condition = item.specifications?.condition || 'Good';
    const matchesCondition = conditionFilter === 'all' || condition === conditionFilter;
    
    // Date Filter
    const returnedAt = item.specifications?.returned_at;
    const matchesDate = !dateFilter || (returnedAt && returnedAt.includes(dateFilter));
    
    return matchesSearch && matchesCategory && matchesStatus && matchesCondition && matchesDate;
  });

  const handleExportCSV = () => {
    const exportData = filteredItems.map(item => ({
      'Item Name': item.name,
      'Category': item.category,
      'Description': item.description || '',
      'Total Quantity': item.quantity,
      'Available Quantity': item.available_quantity || item.availableQuantity,
      'Created By': item.creator?.name || 'System',
      'Creator Email': item.creator?.email || 'N/A',
      'Created At': new Date(item.created_at || item.createdAt).toLocaleDateString(),
      ...(item.specifications || {}) // Flatten specifications into the export data
    }));
    
    exportToCSV(exportData, `inventory_export_${new Date().toISOString().split('T')[0]}`);
    toast.success('Inventory exported successfully');
  };

  const handleAddItem = () => {
    if (!newItem.name || !newItem.category || !newItem.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingItem) {
      updateMutation.mutate(newItem);
    } else {
      createMutation.mutate(newItem);
    }
  };

  const handleEditItem = (item: InventoryItem) => {
    setEditingItem(item.id);
    setNewItem({
      name: item.name,
      category: item.category,
      description: item.description || '',
      quantity: item.quantity.toString(),
      condition: item.specifications?.condition || 'Good',
    });
    setSpecifications(item.specifications || {});
    setIsAddDialogOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(id);
    }
  };


  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
            <p className="text-muted-foreground">Manage and track all inventory items</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleExportCSV}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingItem(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
                <DialogDescription>
                  {editingItem ? 'Update the details of the inventory item' : 'Add a new item to the inventory'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto px-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Item Name *</Label>
                    <Input
                      id="name"
                      placeholder="Enter item name"
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={newItem.category}
                      onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      placeholder="Enter quantity"
                      value={newItem.quantity}
                      onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition *</Label>
                    <Select
                      value={newItem.condition}
                      onValueChange={(value) => setNewItem({ ...newItem, condition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Good">Good Condition</SelectItem>
                        <SelectItem value="Damaged">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dynamic Category-Specific Fields */}
                {newItem.category && categoryFields[newItem.category] && (
                  <div className="space-y-4 pt-4 border-t">
                    <p className="text-sm font-semibold">Category-Specific Details</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {categoryFields[newItem.category].map((field) => (
                        <div key={field.name} className="space-y-2">
                          <Label htmlFor={field.name}>{field.label}</Label>
                          {field.type === 'select' ? (
                            <Select
                              value={specifications[field.name] || ''}
                              onValueChange={(value) => setSpecifications({ ...specifications, [field.name]: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((option) => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.type === 'textarea' ? (
                            <Textarea
                              id={field.name}
                              placeholder={field.placeholder}
                              value={specifications[field.name] || ''}
                              onChange={(e) => setSpecifications({ ...specifications, [field.name]: e.target.value })}
                            />
                          ) : (
                            <Input
                              id={field.name}
                              placeholder={field.placeholder}
                              value={specifications[field.name] || ''}
                              onChange={(e) => setSpecifications({ ...specifications, [field.name]: e.target.value })}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter item description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleAddItem} 
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingItem ? 'Update' : 'Add'} Item
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Assigned">Assigned</SelectItem>
                    <SelectItem value="Unassigned">Unassigned</SelectItem>
                    <SelectItem value="Partially Assigned">Partially Assigned</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={conditionFilter} onValueChange={setConditionFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Conditions</SelectItem>
                    <SelectItem value="Good">Good Condition</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex-1 sm:flex-none sm:w-48">
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full"
                    placeholder="Returned Date"
                  />
                </div>

                <Button 
                  variant="ghost" 
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setStatusFilter('all');
                    setConditionFilter('all');
                    setDateFilter('');
                  }}
                  className="w-full sm:w-auto"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">All Items</CardTitle>
            <CardDescription>{filteredItems.length} items found</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredItems.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Return Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => {
                      const stockStatus = getStockStatus(item);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Package className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{item.name}</p>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell>
                            {item.creator ? (
                              <div>
                                <p className="font-medium text-sm">{item.creator.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">{item.creator.email}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">System</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{item.available_quantity ?? item.availableQuantity}</span>
                            <span className="text-muted-foreground">/{item.quantity}</span>
                          </TableCell>
                          <TableCell>
                            {item.specifications?.condition === 'Damaged' ? (
                              <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                <AlertCircle className="h-3 w-3" />
                                Damaged
                              </Badge>
                            ) : item.specifications?.condition === 'Good' ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="h-3 w-3" />
                                Good
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {item.specifications?.returned_at ? new Date(item.specifications.returned_at).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                  setSelectedAssignItem(item);
                                  setIsAssignDialogOpen(true);
                                }}
                                disabled={(item.available_quantity ?? item.availableQuantity ?? 0) <= 0}
                                title="Assign to Employee"
                              >
                                <UserPlus className="h-4 w-4 text-primary" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleEditItem(item)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteItem(item.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No items found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assign Item Dialog */}
        <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
          setIsAssignDialogOpen(open);
          if (!open) {
            setSelectedAssignItem(null);
            setSelectedEmployeeId('');
          }
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Assign Item</DialogTitle>
              <DialogDescription>
                Assign "{selectedAssignItem?.name}" to an employee.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Select Employee *</Label>
                <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name} ({emp.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => assignMutation.mutate({ id: selectedAssignItem.id, employeeId: selectedEmployeeId })}
                disabled={assignMutation.isPending || !selectedEmployeeId}
              >
                {assignMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Confirm Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
