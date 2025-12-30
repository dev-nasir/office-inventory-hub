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
import { Package, Search, Send, Check, Clock, X, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { InventoryRequest } from '@/types/inventory';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { INVENTORY_CATEGORIES } from '@/lib/constants';
import { categoryFields } from '@/lib/categoryFields';

export default function RequestItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | undefined>(undefined);
  const [requestQuantity, setRequestQuantity] = useState('1');
  const [requestNotes, setRequestNotes] = useState('');
  const [dialogSearch, setDialogSearch] = useState('');
  const [urgency, setUrgency] = useState<string>('Normal');
  const [expectedDate, setExpectedDate] = useState<string>('');
  const [brand, setBrand] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [dialogCategory, setDialogCategory] = useState<string>('all');

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

  const availableItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const requestMutation = useMutation({
    mutationFn: async (vars: { 
      itemId: string, 
      quantity: number, 
      notes: string,
      urgency: string,
      expectedDate?: string,
      brand?: string
    }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('requests')
        .insert([{
          employee_id: user.id,
          item_id: vars.itemId,
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

  const openRequestDialog = (itemId?: string) => {
    if (itemId) {
      const item = inventoryItems.find(i => i.id === itemId);
      setSelectedItem(itemId);
      setDialogCategory(item?.category || 'all');
    } else {
      setSelectedItem(undefined);
      setDialogCategory('all');
    }
    setDialogSearch('');
    setRequestQuantity('1');
    setRequestNotes('');
    setUrgency('Normal');
    setExpectedDate('');
    setBrand('');
    setIsRequestDialogOpen(true);
    setShowSuccess(false);
  };

  const handleSubmitRequest = () => {
    if (!selectedItem) {
      toast.error('Please select an item');
      return;
    }
    if (!requestNotes.trim()) {
      toast.error('Please provide a purpose/reason for the request');
      return;
    }
    requestMutation.mutate({
      itemId: selectedItem,
      quantity: parseInt(requestQuantity),
      notes: requestNotes,
      urgency: urgency,
      expectedDate: expectedDate || undefined,
      brand: brand || undefined,
    });
  };

  const selectedItemData = selectedItem
    ? inventoryItems.find(item => item.id === selectedItem)
    : null;

  const filteredItemsForDialog = inventoryItems.filter(item => {
    const matchesCategory = dialogCategory === 'all' || item.category === dialogCategory;
    const matchesSearch = item.name.toLowerCase().includes(dialogSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const pendingRequests = myRequests.filter(r => r.status === 'pending');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'approved':
        return <Check className="h-4 w-4 text-success" />;
      case 'rejected':
        return <X className="h-4 w-4 text-destructive" />;
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
                    {request.item?.name}
                    <span className="text-muted-foreground">x{request.quantity}</span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search and browse all items..."
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
          </CardContent>
        </Card>

        {/* Available Items Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {availableItems.map((item) => (
            <Card key={item.id} className="shadow-card hover:shadow-elegant transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{item.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {item.description || 'No description provided'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Badge variant="outline">{item.category}</Badge>
                      <Badge 
                        variant={(item.available_quantity || item.availableQuantity) > 0 ? 'secondary' : 'destructive'}
                        className="font-normal"
                      >
                        {(item.available_quantity || item.availableQuantity) > 0 
                          ? `${item.available_quantity || item.availableQuantity} in stock` 
                          : 'Out of stock'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full mt-4"
                  variant={(item.available_quantity || item.availableQuantity) > 0 ? 'default' : 'outline'}
                  onClick={() => openRequestDialog(item.id)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Request Item
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {availableItems.length === 0 && !itemsLoading && (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">No items match your search</p>
            </CardContent>
          </Card>
        )}

        {itemsLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* My Recent Requests */}
        {myRequests.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">My Requests</CardTitle>
              <CardDescription>Track your inventory requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myRequests.slice(0, 10).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm sm:text-base">{request.item?.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Qty: {request.quantity} • {new Date(request.created_at || request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <Badge
                        className="capitalize"
                        variant={
                          request.status === 'pending'
                            ? 'secondary'
                            : request.status === 'approved'
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Request Dialog */}
        <Dialog open={isRequestDialogOpen} onOpenChange={setIsRequestDialogOpen}>
          <DialogContent className="sm:max-w-3xl">
            {!showSuccess ? (
              <>
                <DialogHeader>
                  <DialogTitle>Submit Inventory Request</DialogTitle>
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
                          setSelectedItem(undefined);
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
                      <div className="space-y-2">
                        <Label htmlFor="item-search">Search Item</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="item-search"
                            placeholder="Type to filter..."
                            value={dialogSearch}
                            onChange={(e) => setDialogSearch(e.target.value)}
                            className="pl-9 h-9 text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="item" className="text-sm">Item Name *</Label>
                      <Select 
                        value={selectedItem || ''} 
                        onValueChange={(value) => {
                          if (!value || value === '_no_items' || value === '_loading') return;
                          setSelectedItem(value);
                          const item = inventoryItems.find(i => i.id === value);
                          if (item) {
                            setDialogCategory(item.category);
                            setDialogSearch('');
                          }
                          setRequestQuantity('1');
                        }}
                      >
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder={itemsLoading ? "Loading items..." : "Choose an item..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {itemsLoading ? (
                            <SelectItem value="_loading" disabled>
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Loading inventory...</span>
                              </div>
                            </SelectItem>
                          ) : filteredItemsForDialog.length > 0 ? (
                            filteredItemsForDialog.map((item) => (
                              <SelectItem key={item.id} value={item.id}>
                                {item.name} (Stock: {item.available_quantity || item.availableQuantity || 0})
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="_no_items" disabled>
                              No items found matching criteria
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
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
                  <Button 
                    onClick={handleSubmitRequest}
                    disabled={requestMutation.isPending || !selectedItem}
                    className="min-w-[120px]"
                    size="sm"
                  >
                    {requestMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit Request
                  </Button>
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
                    Your request for <strong>{selectedItemData?.name}</strong> has been sent to the IT administrators for review.
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
