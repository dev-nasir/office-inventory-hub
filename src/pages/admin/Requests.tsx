import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Check, X, Clock, Package, ClipboardList, Send, AlertTriangle, Info, Calendar, Zap, MessageSquare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InventoryRequest, RequestStatus } from '@/types/inventory';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function Requests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch requests from Supabase
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select(`
          *,
          employee:profiles!employee_id(id, name, email, department),
          item:inventory_items!item_id(id, name, category, available_quantity),
          reviewer:profiles!reviewed_by(id, name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  // Stats for the header
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');
  const completedRequests = requests.filter(r => r.status === 'completed');

  // Action states
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  
  const [adminComment, setAdminComment] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [itemCondition, setItemCondition] = useState('New');

  const approveMutation = useMutation({
    mutationFn: async (vars: { id: string, comment?: string }) => {
      const { error } = await supabase
        .from('requests')
        .update({
          status: 'approved',
          admin_comment: vars.comment || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', vars.id);
      if (error) throw error;

      // Note: We don't create assignment yet, that's in "Complete"
      // But we might want to decrement stock here to "reserve" it
      const request = requests.find(r => r.id === vars.id);
      if (request && request.item) {
        const { error: invError } = await supabase
          .from('inventory_items')
          .update({
            available_quantity: (request.item.available_quantity || 0) - request.quantity
          })
          .eq('id', request.item_id);
        if (invError) throw invError;
      }

      // 3. Log history
      await supabase.from('history').insert({
        action_type: 'approved',
        employee_id: request.employee_id,
        item_id: request.item_id,
        quantity: request.quantity,
        notes: `Request approved. Comment: ${vars.comment || 'None'}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      toast.success('Request approved and stock reserved');
      setIsApproveDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve request');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (vars: { id: string, reason: string }) => {
      if (!vars.reason.trim()) throw new Error('Rejection reason is mandatory');
      
      const { error } = await supabase
        .from('requests')
        .update({
          status: 'rejected',
          reject_reason: vars.reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', vars.id);

      if (error) throw error;

      // 2. Log history
      const request = requests.find(r => r.id === vars.id);
      if (request) {
        await supabase.from('history').insert({
          action_type: 'rejected',
          employee_id: request.employee_id,
          item_id: request.item_id,
          quantity: request.quantity,
          notes: `Request rejected. Reason: ${vars.reason}`
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      toast.success('Request rejected');
      setIsRejectDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject request');
    },
  });

  const completeMutation = useMutation({
    mutationFn: async (vars: { id: string, condition: string }) => {
      const request = requests.find(r => r.id === vars.id);
      if (!request) throw new Error('Request not found');

      // 1. Create final assignment
      const { error: assignError } = await supabase
        .from('assignments')
        .insert([{
          employee_id: request.employee_id,
          item_id: request.item_id,
          quantity: request.quantity,
          status: 'assigned',
          notes: `Completed by admin. Condition: ${vars.condition}`
        }]);
      if (assignError) throw assignError;

      // 2. Update request status to completed
      const { error: reqError } = await supabase
        .from('requests')
        .update({ status: 'completed' })
        .eq('id', vars.id);
      if (reqError) throw reqError;

      // 3. Log history
      await supabase.from('history').insert({
        action_type: 'completed', // Use the new 'completed' type
        employee_id: request.employee_id,
        item_id: request.item_id,
        quantity: request.quantity,
        notes: `Transfer completed. Condition: ${vars.condition}`
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      toast.success('Request completed and item assigned');
      setIsCompleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to complete request');
    },
  });

  const handleApproveClick = (request: any) => {
    setSelectedRequest(request);
    setAdminComment('');
    setIsApproveDialogOpen(true);
  };

  const handleRejectClick = (request: any) => {
    setSelectedRequest(request);
    setRejectReason('');
    setIsRejectDialogOpen(true);
  };

  const handleCompleteClick = (request: any) => {
    setSelectedRequest(request);
    setItemCondition('New');
    setIsCompleteDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const RequestTable = ({ data, showActions = false }: { data: InventoryRequest[]; showActions?: boolean }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Req ID</TableHead>
          <TableHead>Employee & Dept</TableHead>
          <TableHead>Item & Qty</TableHead>
          <TableHead>Urgency</TableHead>
          <TableHead>Purpose</TableHead>
          <TableHead>Requested Date</TableHead>
          {showActions && <TableHead className="text-right">Actions</TableHead>}
          {!showActions && <TableHead>Status Info</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length > 0 ? (
          data.map((request) => (
            <TableRow key={request.id}>
              <TableCell className="font-mono text-[10px] text-muted-foreground">
                {request.id.substring(0, 8)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/20 text-primary">
                      {request.employee ? getInitials(request.employee.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{request.employee?.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-tight">{request.employee?.department || 'Staff'}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Package className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm font-medium">{request.item?.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground ml-5">
                    Quantity: <span className="text-foreground">{request.quantity}</span>
                    {request.brand && <span> • Brand: <span className="text-foreground">{request.brand}</span></span>}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1.5">
                  {request.urgency === 'Urgent' ? (
                    <Badge variant="destructive" className="h-5 text-[10px] gap-1 px-1.5 font-bold animate-pulse">
                      <Zap className="h-2.5 w-2.5 fill-current" />
                      URGENT
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="h-5 text-[10px] px-1.5 text-muted-foreground font-normal">
                      Normal
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="max-w-[180px]">
                <p className="text-xs text-muted-foreground line-clamp-2" title={request.notes}>
                  {request.notes || '-'}
                </p>
                {request.expected_date && (
                   <p className="text-[9px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                     <Calendar className="h-2.5 w-2.5" />
                     Exp: {new Date(request.expected_date).toLocaleDateString()}
                   </p>
                )}
              </TableCell>
              <TableCell className="text-[11px] text-muted-foreground whitespace-nowrap">
                {new Date(request.created_at || (request as any).createdAt).toLocaleDateString('en-GB', {
                  day: '2-digit', month: 'short', year: 'numeric'
                })}
              </TableCell>
              
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {request.status === 'pending' && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApproveClick(request)}
                          className="h-8 text-success hover:text-success hover:bg-success/10 text-[11px]"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRejectClick(request)}
                          className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10 text-[11px]"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                    {request.status === 'approved' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCompleteClick(request)}
                        className="h-8 text-[11px] bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="h-3 w-3 mr-1" />
                        Complete Step
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
              
              {!showActions && (
                <TableCell>
                  <div className="flex flex-col gap-1">
                    {request.status === 'approved' && (
                      <Badge variant="outline" className="text-success border-success/30 bg-success/5 text-[10px]">
                        Approved by {request.reviewer?.name || 'Admin'}
                      </Badge>
                    )}
                    {request.status === 'rejected' && (
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/5 text-[10px]">
                          Rejected
                        </Badge>
                        <p className="text-[9px] text-muted-foreground italic truncate max-w-[120px]">
                          "{request.reject_reason || request.rejectReason}"
                        </p>
                      </div>
                    )}
                    {request.status === 'completed' && (
                      <Badge variant="outline" className="text-blue-600 border-blue-600/30 bg-blue-50 text-[10px]">
                        Finalized/Completed
                      </Badge>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={showActions ? 7 : 6} className="text-center py-12">
              <ClipboardList className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground font-medium">No requests found here</p>
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory Requests</h1>
          <p className="text-muted-foreground">Review and manage employee inventory requests</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-4">
          <Card className="shadow-card overflow-hidden">
            <div className="p-1 bg-warning" />
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-xl font-bold">{pendingRequests.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card overflow-hidden">
            <div className="p-1 bg-success" />
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Check className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-xl font-bold">{approvedRequests.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card overflow-hidden">
             <div className="p-1 bg-blue-600" />
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Send className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xl font-bold">{completedRequests.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card overflow-hidden">
             <div className="p-1 bg-destructive" />
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <X className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xl font-bold">{rejectedRequests.length}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Tabs */}
        <Card className="shadow-card">
          <Tabs defaultValue="pending">
            <CardHeader className="border-b">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    Request Queue
                  </CardTitle>
                  <CardDescription>Review and manage inventory handovers</CardDescription>
                </div>
                <TabsList className="grid grid-cols-4 min-w-[320px]">
                  <TabsTrigger value="pending" className="text-[11px] h-8">
                    Pending ({pendingRequests.length})
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="text-[11px] h-8">
                    To Complete ({approvedRequests.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed" className="text-[11px] h-8">
                    Completed
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="text-[11px] h-8">
                    Rejected
                  </TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <TabsContent value="pending" className="mt-0">
                <RequestTable data={pendingRequests} showActions />
              </TabsContent>
              <TabsContent value="approved" className="mt-0">
                <RequestTable data={approvedRequests} showActions />
              </TabsContent>
              <TabsContent value="completed" className="mt-0">
                <RequestTable data={completedRequests} />
              </TabsContent>
              <TabsContent value="rejected" className="mt-0">
                <RequestTable data={rejectedRequests} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Action Dialogs */}
        <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-success">
                <Check className="h-5 w-5" />
                Approve Request
              </DialogTitle>
              <DialogDescription>
                Confirm approval for {selectedRequest?.employee?.name}'s request for {selectedRequest?.item?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="comment">Admin Comment (Optional)</Label>
                <Textarea
                  id="comment"
                  placeholder="e.g. Item is ready for pick up at the IT desk."
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 flex gap-3 text-xs text-blue-700">
                <Info className="h-4 w-4 shrink-0" />
                <p>Approving will reserve 1 unit from stock. The final assignment will be recorded during the 'Complete' step.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => approveMutation.mutate({ id: selectedRequest.id, comment: adminComment })}
                disabled={approveMutation.isPending}
                className="bg-success hover:bg-success/90"
              >
                Confirm Approval
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <X className="h-5 w-5" />
                Reject Request
              </DialogTitle>
              <DialogDescription>
                Please provide a reason for rejecting this request. This will be shared with the employee.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reject-reason">Rejection Reason *</Label>
                <Textarea
                  id="reject-reason"
                  placeholder="Mandatory: e.g. This item is currently out of stock or requires manager clearance."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="min-h-[100px] border-destructive/20 focus-visible:ring-destructive"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => rejectMutation.mutate({ id: selectedRequest.id, reason: rejectReason })}
                disabled={rejectMutation.isPending || !rejectReason.trim()}
                variant="destructive"
              >
                Reject Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-600">
                <Send className="h-5 w-5" />
                Complete Handover
              </DialogTitle>
              <DialogDescription>
                Finalize the assignment for {selectedRequest?.employee?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-1 gap-4">
                 <div className="space-y-2">
                  <Label>Handover Date</Label>
                  <Input value={new Date().toLocaleDateString()} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="condition">Item Condition</Label>
                  <Select value={itemCondition} onValueChange={setItemCondition}>
                    <SelectTrigger>
                      <SelectValue placeholder="New" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New">Brand New</SelectItem>
                      <SelectItem value="Good">Used - Good</SelectItem>
                      <SelectItem value="Fair">Used - Fair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-3 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p>This will officially link the item to the employee's inventory profile.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={() => completeMutation.mutate({ id: selectedRequest.id, condition: itemCondition })}
                disabled={completeMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Finalize Handover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
