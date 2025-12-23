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

export default function RequestItem() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [requestQuantity, setRequestQuantity] = useState('1');
  const [requestNotes, setRequestNotes] = useState('');

  // Fetch available inventory items
  const { data: inventoryItems = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['available-items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .gt('available_quantity', 0)
        .order('name');
      
      if (error) throw error;
      return data as any[];
    },
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

  const categories = [...new Set(inventoryItems.map(item => item.category))];

  const availableItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const requestMutation = useMutation({
    mutationFn: async (vars: { itemId: string, quantity: number, notes: string }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('requests')
        .insert([{
          employee_id: user.id,
          item_id: vars.itemId,
          quantity: vars.quantity,
          notes: vars.notes,
          status: 'pending'
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      setIsRequestDialogOpen(false);
      toast.success('Request submitted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to submit request');
    },
  });

  const openRequestDialog = (itemId: string) => {
    setSelectedItem(itemId);
    setRequestQuantity('1');
    setRequestNotes('');
    setIsRequestDialogOpen(true);
  };

  const handleSubmitRequest = () => {
    if (!selectedItem) return;
    requestMutation.mutate({
      itemId: selectedItem,
      quantity: parseInt(requestQuantity),
      notes: requestNotes,
    });
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
            <p className="text-muted-foreground">Browse available items and submit requests</p>
          </div>
          <Button onClick={() => openRequestDialog('')}>
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
                  placeholder="Search available items..."
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
                      {item.description}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline">{item.category}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {item.available_quantity || item.availableQuantity} available
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => openRequestDialog(item.id)}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Request
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
                {myRequests.slice(0, 5).map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{request.item?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Qty: {request.quantity} • {new Date(request.created_at || request.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(request.status)}
                      <Badge
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
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Item</DialogTitle>
              <DialogDescription>
                Submit a request for {selectedItemData?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="item">Select Item *</Label>
                <Select 
                  value={selectedItem || ''} 
                  onValueChange={(value) => {
                    setSelectedItem(value);
                    setRequestQuantity('1');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an item to request" />
                  </SelectTrigger>
                  <SelectContent>
                    {inventoryItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.available_quantity || item.availableQuantity} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedItemData && (
                <div className="p-4 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedItemData?.name}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {selectedItemData?.description}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  max={selectedItemData?.available_quantity || selectedItemData?.availableQuantity}
                  value={requestQuantity}
                  onChange={(e) => setRequestQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Reason / Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Why do you need this item?"
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRequestDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitRequest}
                disabled={requestMutation.isPending || !selectedItem}
              >
                {requestMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
