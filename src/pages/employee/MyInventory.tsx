import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Package, Plus, Edit, Trash2, Loader2, RotateCcw, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { categoryFields } from '@/lib/categoryFields';
import { toast } from 'sonner';
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

export default function MyInventory() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [returningItemId, setReturningItemId] = useState<string | null>(null);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const [returnCondition, setReturnCondition] = useState<'Good' | 'Damaged'>('Good');
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    quantity: '',
    condition: 'Good',
  });
  
  // Specifications state (dynamic fields based on category)
  const [specifications, setSpecifications] = useState<Record<string, string>>({});

  // Fetch items created by current user
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['myItems', user?.id],
    queryFn: async () => {
      // 1. Fetch items created by the user
      const { data: createdItems, error: createdError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false });

      if (createdError) throw createdError;

      // 2. Fetch items assigned to the user
      const { data: assignments, error: assignedError } = await supabase
        .from('assignments')
        .select(`
          *,
          item:inventory_items(*)
        `)
        .eq('employee_id', user?.id)
        .eq('status', 'assigned');

      if (assignedError) throw assignedError;

      // Map assigned items to the same structure, avoiding duplicates if they were also created by the user
      const assignedItems = (assignments || [])
        .map(a => ({
          ...a.item,
          is_assigned: true,
          assignment_id: a.id,
          assigned_quantity: a.quantity,
          assigned_date: a.assigned_date
        }))
        .filter(item => !createdItems?.some(ci => ci.id === item.id));

      return [...(createdItems || []), ...assignedItems] as any[];
    },
    enabled: !!user?.id,
  });

  // Create item mutation
  const createMutation = useMutation({
    mutationFn: async (newItem: typeof formData) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([{
          name: newItem.name,
          category: newItem.category,
          description: newItem.description,
          quantity: parseInt(newItem.quantity),
          available_quantity: 0, // Auto-assigned to the employee who created it
          created_by: user?.id,
          specifications: { ...specifications, condition: newItem.condition },
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myItems'] });
      setIsItemDialogOpen(false);
      resetForm();
      setSpecifications({});
      toast.success('Item added successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to add item');
    },
  });

  // Update item mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: typeof formData }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update({
          name: updates.name,
          category: updates.category,
          description: updates.description,
          quantity: parseInt(updates.quantity),
          available_quantity: parseInt(updates.quantity),
          specifications: { ...specifications, condition: updates.condition },
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myItems'] });
      setIsItemDialogOpen(false);
      setEditingItem(null);
      resetForm();
      setSpecifications({});
      toast.success('Item updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update item');
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ['myItems'] });
      setIsDeleteDialogOpen(false);
      setDeletingItemId(null);
      toast.success('Item deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete item');
    },
  });

  // Return item mutation
  const returnMutation = useMutation({
    mutationFn: async ({ id, condition }: { id: string, condition: 'Good' | 'Damaged' }) => {
      const item = items.find(i => i.id === id);
      if (!item) throw new Error('Item not found');

      // Update specifications with condition and return date
      const updatedSpecifications = {
        ...(item.specifications || {}),
        condition: condition,
        returned_at: returnDate
      };

      // 1. Update inventory item
      const { data, error: updateError } = await supabase
        .from('inventory_items')
        .update({
          available_quantity: item.is_assigned 
            ? (item.available_quantity || 0) + (item.assigned_quantity || 1)
            : item.quantity,
          specifications: updatedSpecifications
        })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;

      // 1.b. If it was an assignment, update assignment status
      if (item.is_assigned && item.assignment_id) {
        const { error: assignmentError } = await supabase
          .from('assignments')
          .update({ status: 'returned' })
          .eq('id', item.assignment_id);
        
        if (assignmentError) {
          console.error('Failed to update assignment status:', assignmentError);
        }
      }

      // 2. Add to history
      const { error: historyError } = await supabase
        .from('history')
        .insert({
          action_type: 'returned',
          employee_id: user?.id,
          item_id: id,
          quantity: item.quantity,
          notes: `Returned in ${condition} condition`
        });

      if (historyError) {
        console.error('Failed to log history:', historyError);
        // We don't throw here to avoid failing the whole return process
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myItems'] });
      setIsReturnDialogOpen(false);
      setReturningItemId(null);
      setReturnCondition('Good');
      setReturnDate(new Date().toISOString().split('T')[0]);
      toast.success('Item returned successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to return item');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      description: '',
      quantity: '',
      condition: 'Good',
    });
  };

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        description: item.description || '',
        quantity: item.quantity.toString(),
        condition: (item as any).specifications?.condition || 'Good',
      });
      setSpecifications((item as any).specifications || {});
    } else {
      setEditingItem(null);
      resetForm();
      setSpecifications({});
    }
    setIsItemDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.category || !formData.quantity) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, updates: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: string) => {
    setDeletingItemId(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (deletingItemId) {
      deleteMutation.mutate(deletingItemId);
    }
  };

  const handleReturn = (id: string) => {
    setReturningItemId(id);
    setIsReturnDialogOpen(true);
  };

  const confirmReturn = () => {
    if (returningItemId) {
      returnMutation.mutate({ id: returningItemId, condition: returnCondition });
    }
  };

  const activeItems = items.filter(item => {
    // Item is active if it's assigned to the user (via assignments table)
    // or if it was created by the user and available_quantity is 0
    if (item.is_assigned) return true;
    return (item.availableQuantity ?? (item as any).available_quantity) === 0;
  });
  const returnedItems = items.filter(item => {
    // Only items created by the user can be shown as "returned/in stock" in their own list
    if (item.is_assigned) return false;
    return (item.availableQuantity ?? (item as any).available_quantity) > 0;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Items</h1>
            <p className="text-muted-foreground">Manage your inventory items</p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            New Item
          </Button>
        </div>

        {/* Items Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">All Items</CardTitle>
            <CardDescription>{items.length} items found</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : items.length > 0 ? (
              <div className="space-y-8">
                {/* Active Items Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold">Active Items</h3>
                    <Badge variant="secondary" className="ml-2">
                      {activeItems.length}
                    </Badge>
                  </div>
                  
                  {activeItems.length > 0 ? (
                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeItems.map((item) => (
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
                                <Badge className="bg-amber-100 text-amber-700 border-amber-200">Assigned</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleReturn(item.id)}
                                    title="Return Item"
                                  >
                                    <RotateCcw className="h-4 w-4 text-amber-600" />
                                  </Button>
                                  {!item.is_assigned && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleOpenDialog(item)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                      <p className="text-muted-foreground">No active items</p>
                    </div>
                  )}
                </div>

                {/* Returned Items Section */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <RotateCcw className="h-5 w-5 text-amber-600" />
                    <h3 className="text-lg font-semibold">Returned Items</h3>
                    <Badge variant="secondary" className="ml-2">
                      {returnedItems.length}
                    </Badge>
                  </div>

                  {returnedItems.length > 0 ? (
                    <div className="overflow-x-auto border rounded-lg">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Condition</TableHead>
                            <TableHead>Return Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {returnedItems.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-muted-foreground">{item.name}</p>
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                      {item.description}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="opacity-70">{item.category}</Badge>
                              </TableCell>
                              <TableCell>
                                {item.specifications?.condition === 'Damaged' ? (
                                  <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                                    <AlertCircle className="h-3 w-3" />
                                    Damaged
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                                    Good Condition
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {item.specifications?.returned_at ? new Date(item.specifications.returned_at).toLocaleDateString() : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-muted/20 rounded-lg border border-dashed">
                      <p className="text-muted-foreground">No returned items</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No items yet</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => handleOpenDialog()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Item
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
              <DialogDescription>
                {editingItem ? 'Update the item details' : 'Add a new item to your inventory'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Basic Information Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Item Name *</Label>
                <Input
                  id="name"
                  placeholder="Enter item name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
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
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="condition">Condition *</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => setFormData({ ...formData, condition: value })}
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
              {formData.category && categoryFields[formData.category] && (
                <div className="space-y-4 pt-2 border-t">
                  <p className="text-sm font-semibold">Category-Specific Details</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryFields[formData.category].map((field) => (
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
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter item description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsItemDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the item from your inventory.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Return Confirmation Dialog */}
        <AlertDialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Return Item</AlertDialogTitle>
              <AlertDialogDescription>
                Please specify the condition of the item you are returning.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label className="text-sm font-medium mb-3 block">Item Condition</Label>
              <RadioGroup 
                value={returnCondition} 
                onValueChange={(value) => setReturnCondition(value as 'Good' | 'Damaged')}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem
                    value="Good"
                    id="condition-good"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="condition-good"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <CheckCircle2 className="mb-3 h-6 w-6 text-green-600" />
                    <span className="text-sm font-medium">Good Condition</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem
                    value="Damaged"
                    id="condition-damaged"
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor="condition-damaged"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                  >
                    <AlertCircle className="mb-3 h-6 w-6 text-destructive" />
                    <span className="text-sm font-medium">Damaged</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
            <div className="px-1 py-2">
              <Label htmlFor="return-date" className="text-sm font-medium mb-2 block">Return Date</Label>
              <Input
                id="return-date"
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                className="w-full"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setReturningItemId(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={confirmReturn}
                className="bg-amber-600 hover:bg-amber-700"
                disabled={returnMutation.isPending}
              >
                {returnMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Returning...
                  </>
                ) : 'Confirm Return'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
