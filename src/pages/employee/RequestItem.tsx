import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Package, Search, Send, Check, Clock, X, Loader2, Plus, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { InventoryRequest } from '@/types/inventory';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { INVENTORY_CATEGORIES } from '@/lib/constants';
import { categoryFields } from '@/lib/categoryFields';

export default function RequestItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [selectedItem, setSelectedItem] = useState<string | undefined>(undefined);
  const [requestQuantity, setRequestQuantity] = useState('1');
  const [requestNotes, setRequestNotes] = useState('');
  const [urgency, setUrgency] = useState<string>('Normal');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [dialogCategory, setDialogCategory] = useState<string>('all');
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

  // Fetch all inventory items (including out of stock)
  const { data: inventoryItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['available-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch user profile for auto-fill
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch user's requests
  const { data: myRequests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['my-requests', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          item:inventory_items!item_id(*)
        `)
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const categories = INVENTORY_CATEGORIES;


  const requestMutation = useMutation({
    mutationFn: async (vars: { 
      itemId?: string,
      itemName: string,
      quantity: number, 
      notes: string,
      urgency: string,
      expectedDate: string,
      brand: string
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('requests')
        .insert([{
          employee_id: user.id,
          item_id: vars.itemId || null,
          item_name: vars.itemName,
          quantity: vars.quantity,
          notes: vars.notes,
          urgency: vars.urgency,
          expected_date: vars.expectedDate || null,
          brand: vars.brand || null,
          status: 'pending'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      setShowSuccess(true);
      toast.success('Request submitted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit request');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (vars: { 
      id: string,
      itemId?: string,
      itemName: string,
      quantity: number, 
      notes: string,
      urgency: string,
      expectedDate: string,
      brand: string
    }) => {
      const { error } = await supabase
        .from('requests')
        .update({
          item_id: vars.itemId || null,
          item_name: vars.itemName,
          quantity: vars.quantity,
          notes: vars.notes,
          urgency: vars.urgency,
          expected_date: vars.expectedDate || null,
          brand: vars.brand || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', vars.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      setShowSuccess(true);
      toast.success('Request updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update request');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('requests').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      toast.success('Request deleted');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete request');
    },
  });

  const openRequestDialog = (itemId?: string) => {
    setEditingRequestId(null);
    if (itemId) {
      const item = inventoryItems.find(i => i.id === itemId);
      setSelectedItem(itemId);
      setItemName(item?.name || '');
      setDialogCategory(item?.category || 'all');
    } else {
      setSelectedItem(undefined);
      setItemName('');
      setDialogCategory('all');
    }
    setRequestQuantity('1');
    setRequestNotes('');
    setUrgency('Normal');
    setExpectedDate('');
    setBrand('');
    setIsRequestDialogOpen(true);
    setShowSuccess(false);
  };

  const handleSubmitRequest = () => {
    if (!itemName.trim()) {
      toast.error('Please enter an item name');
      return;
    }
    if (!requestNotes.trim()) {
      toast.error('Please provide a purpose/reason for the request');
      return;
    }
    requestMutation.mutate({
      itemId: selectedItem || undefined,
      itemName: itemName.trim(),
      quantity: parseInt(requestQuantity),
      notes: requestNotes,
      urgency,
      expectedDate,
      brand
    });
  };

  const handleEditRequest = (request: any) => {
    setEditingRequestId(request.id);
    setItemName(request.item_name || request.item?.name || '');
    setSelectedItem(request.item_id || undefined);
    setRequestQuantity(String(request.quantity));
    setRequestQuantity(String(request.quantity));
    setRequestNotes(request.notes || '');
    setUrgency(request.urgency || 'Normal');
    setExpectedDate(request.expected_date || '');
    setBrand(request.brand || '');
    setIsRequestDialogOpen(true);
    setShowSuccess(false);
  };

  const handleDeleteRequest = (id: string) => {
    if (confirm('Are you sure you want to delete this request?')) {
      deleteMutation.mutate(id);
    }
  };

  const selectedItemData = selectedItem
    ? inventoryItems.find(item => item.id === selectedItem)
    : null;


  const pendingRequests = myRequests.filter(r => r.status === 'pending');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'approved':
        return <Check className="h-4 w-4 text-success" />;
      case 'rejected':
        return <X className="h-4 w-4 text-destructive" />;
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Request Item</h1>
            <p className="text-muted-foreground">Browse all company items and submit requests</p>
          </div>
          <Button onClick={() => openRequestDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <Card className="shadow-card border-warning/20 bg-warning/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Pending Requests ({pendingRequests.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {pendingRequests.map((request) => (
                  <Badge key={request.id} variant="outline" className="gap-2 py-1.5">
                    <Package className="h-3 w-3" />
                    {request.item?.name || request.item_name}
                    <span className="text-muted-foreground">x{request.quantity}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* My Requests Section */}
        <Card className="shadow-card overflow-hidden">
          <CardHeader className="border-b bg-secondary/10">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Requests</CardTitle>
                <CardDescription>Track and manage your inventory requests</CardDescription>
              </div>
              <Badge variant="outline" className="font-mono">
                {myRequests.length} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {myRequests.length > 0 ? (
              <div className="divide-y divide-border">
                {myRequests.slice(0, 10).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{request.item?.name || request.item_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">
                            Qty: {request.quantity}
                          </p>
                          <span className="text-muted-foreground/30">•</span>
                          <p className="text-xs text-muted-foreground">
                            {new Date(request.created_at || request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block">
                        {getStatusIcon(request.status)}
                      </div>
                      <Badge
                        className={`capitalize px-2.5 py-0.5 ${
                          request.status === 'completed' 
                            ? 'bg-green-100 text-green-800 hover:bg-green-100 border-transparent' 
                            : ''
                        }`}
                        variant={
                          request.status === 'pending'
                            ? 'secondary'
                            : request.status === 'approved'
                            ? 'default'
                            : request.status === 'completed'
                            ? 'outline'
                            : 'destructive'
                        }
                      >
                        {request.status}
                      </Badge>
                      
                      {request.status === 'pending' && (
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={() => handleEditRequest(request)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteRequest(request.id)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 flex flex-col items-center justify-center text-center px-4">
                <div className="h-20 w-20 rounded-full bg-secondary/30 flex items-center justify-center mb-4">
                  <Package className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <h3 className="text-lg font-medium text-foreground">No requests yet</h3>
                <p className="text-muted-foreground text-sm max-w-xs mt-1">
                  You haven't submitted any inventory requests yet. Click the "New Request" button to get started.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-6"
                  onClick={() => openRequestDialog()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Submit Your First Request
                </Button>
              </div>
            )}
          </CardContent>
          {myRequests.length > 10 && (
            <div className="p-3 border-t bg-secondary/5 text-center">
              <p className="text-xs text-muted-foreground">Showing 10 most recent requests</p>
            </div>
          )}
        </Card>

        {/* Request Dialog */}
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogContent className="sm:max-w-3xl">
            {!showSuccess ? (
              <>
                <DialogHeader>
                  <DialogTitle>{editingRequestId ? 'Edit Request' : 'Submit Inventory Request'}</DialogTitle>
                  <DialogDescription>
                    Provide details for your request. All fields marked with * are required.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4 overflow-y-auto max-h-[60vh] px-4">
                  {/* Employee Info (Read Only) */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-secondary/30 rounded-lg text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground block">Employee Name</span>
                      <span className="font-semibold">{profile?.name || 'Loading...'}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground block">Employee ID</span>
                      <span className="font-semibold font-mono truncate block" title={user?.id}>{user?.id?.substring(0, 8)}...</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-muted-foreground block">Department</span>
                      <span className="font-semibold">{profile?.department || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category *</Label>
                        <Select value={dialogCategory} onValueChange={(val) => {
                          setDialogCategory(val);
                          setBrand('');
                        }}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="item-name" className="text-sm">Item Name *</Label>
                      <Input
                        id="item-name"
                        placeholder="Enter the item you need (e.g., Laptop, Mouse, etc.)"
                        value={itemName}
                        onChange={(e) => setItemName(e.target.value)}
                        className="h-10 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Type any item name you need</p>
                    </div>
                  </div>

                  {selectedItemData && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Package className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{selectedItemData.name}</p>
                        <p className="text-[10px] text-muted-foreground">Available Stock: {selectedItemData.available_quantity || selectedItemData.availableQuantity || 0}</p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="brand" className="text-sm">Brand (Optional)</Label>
                      {dialogCategory !== 'all' && (categoryFields[dialogCategory]?.find(f => f.name === 'company' || f.name === 'brand')) ? (
                        <Select value={brand} onValueChange={setBrand}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select Brand" />
                          </SelectTrigger>
                          <SelectContent>
                            {categoryFields[dialogCategory]?.find(f => f.name === 'company' || f.name === 'brand')?.options?.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id="brand"
                          placeholder="e.g. Dell, Apple"
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          className="h-9 text-sm"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="urgency" className="text-sm">Urgency</Label>
                      <Select value={urgency} onValueChange={setUrgency}>
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder="Normal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Normal">Normal</SelectItem>
                          <SelectItem value="Urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity" className="text-sm">Quantity Needed</Label>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        value={requestQuantity}
                        onChange={(e) => setRequestQuantity(e.target.value)}
                        className="h-9 text-[13px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiry" className="text-sm">Expected Date</Label>
                      <Input
                        id="expiry"
                        type="date"
                        value={expectedDate}
                        onChange={(e) => setExpectedDate(e.target.value)}
                        className="h-9 text-[13px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes" className="text-sm">Purpose / Reason *</Label>
                    <div className="relative">
                      <Textarea
                        id="notes"
                        placeholder="Why do you need this item? (Required)"
                        value={requestNotes}
                        onChange={(e) => setRequestNotes(e.target.value)}
                        className="min-h-[80px] text-sm resize-none"
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-2 border-t mt-2">
                  <Button variant="outline" size="sm" onClick={() => setIsRequestDialogOpen(false)}>
                    Cancel
                  </Button>
                  {editingRequestId ? (
                    <Button 
                      onClick={() => {
                         if (!itemName.trim()) {
                            toast.error('Please enter an item name');
                            return;
                          }
                          updateMutation.mutate({
                            id: editingRequestId,
                            itemId: selectedItem || undefined,
                            itemName: itemName.trim(),
                            quantity: parseInt(requestQuantity),
                            notes: requestNotes,
                            urgency,
                            expectedDate,
                            brand
                          });
                      }}
                      disabled={updateMutation.isPending || !itemName.trim()}
                      className="min-w-[120px]"
                      size="sm"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          Update Request
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleSubmitRequest}
                      disabled={requestMutation.isPending || !itemName.trim()}
                      className="min-w-[120px]"
                      size="sm"
                    >
                      {requestMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Submit Request
                        </>
                      )}
                    </Button>
                  )}
                </DialogFooter>
              </>
            ) : (
              <div className="py-12 flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center animate-bounce-subtle">
                  <Check className="h-8 w-8 text-success" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Request Submitted!</h3>
                  <p className="text-muted-foreground text-sm max-w-[280px] mt-2">
                    Your request for <strong>{itemName}</strong> has been sent to the IT administrators for review.
                  </p>
                </div>
                <div className="flex flex-col w-full gap-2 pt-4 px-6">
                  <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                    Close
                  </Button>
                  <Button onClick={() => openRequestDialog()}>
                    Request Another Item
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
