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
import { Check, X, Clock, Package, ClipboardList } from 'lucide-react';
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

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const request = requests.find(r => r.id === id);
      if (!request) throw new Error('Request not found');

      // 1. Update request status
      const { error: requestError } = await supabase
        .from('requests')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', id);
      if (requestError) throw requestError;

      // 2. Create assignment record
      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert([{
          employee_id: request.employee_id,
          item_id: request.item_id,
          quantity: request.quantity,
          status: 'assigned'
        }]);
      if (assignmentError) throw assignmentError;

      // 3. Update inventory quantity
      const { error: inventoryError } = await supabase
        .from('inventory_items')
        .update({
          available_quantity: (request.item.available_quantity || 0) - request.quantity
        })
        .eq('id', request.item_id);
      if (inventoryError) throw inventoryError;

      // 4. Log history
      const { error: historyError } = await supabase
        .from('history')
        .insert({
          action_type: 'approved',
          employee_id: request.employee_id,
          item_id: request.item_id,
          quantity: request.quantity,
          notes: `Request approved by ${user?.email}`
        });
      if (historyError) console.error('History log error:', historyError);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      toast.success('Request approved');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve request');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-requests'] });
      toast.success('Request rejected');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to reject request');
    },
  });

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  const handleApprove = (id: string) => approveMutation.mutate(id);
  const handleReject = (id: string) => rejectMutation.mutate(id);

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
          <TableHead>Employee</TableHead>
          <TableHead>Item</TableHead>
          <TableHead>Quantity</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Notes</TableHead>
          {!showActions && <TableHead>Approver/By</TableHead>}
          {showActions && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.length > 0 ? (
          data.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {request.employee ? getInitials(request.employee.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{request.employee?.name}</p>
                    <p className="text-xs text-muted-foreground">{request.employee?.department}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span>{request.item?.name}</span>
                </div>
              </TableCell>
              <TableCell>{request.quantity}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(request.created_at || request.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell className="max-w-[200px]">
                <p className="truncate text-muted-foreground">{request.notes || '-'}</p>
              </TableCell>
              {!showActions && (
                <TableCell>
                  {request.reviewer ? (
                    <div className="flex items-center gap-2">
                       <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px] bg-secondary text-secondary-foreground">
                          {getInitials(request.reviewer.name || 'Admin')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{request.reviewer.name || 'Admin'}</span>
                    </div>
                  ) : '-'}
                </TableCell>
              )}
              {showActions && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      disabled={approveMutation.isPending}
                      className="text-success hover:text-success hover:bg-success/10"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReject(request.id)}
                      disabled={rejectMutation.isPending}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={showActions ? 6 : 5} className="text-center py-8">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No requests found</p>
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
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{pendingRequests.length}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-success/10 flex items-center justify-center">
                  <Check className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{approvedRequests.length}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <X className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rejectedRequests.length}</p>
                  <p className="text-sm text-muted-foreground">Rejected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests Tabs */}
        <Card className="shadow-card">
          <Tabs defaultValue="pending">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">All Requests</CardTitle>
                  <CardDescription>Manage inventory requests from employees</CardDescription>
                </div>
                <TabsList>
                  <TabsTrigger value="pending" className="gap-2">
                    Pending
                    {pendingRequests.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {pendingRequests.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="rejected">Rejected</TabsTrigger>
                </TabsList>
              </div>
            </CardHeader>
            <CardContent>
              <TabsContent value="pending" className="mt-0">
                <RequestTable data={pendingRequests} showActions />
              </TabsContent>
              <TabsContent value="approved" className="mt-0">
                <RequestTable data={approvedRequests} />
              </TabsContent>
              <TabsContent value="rejected" className="mt-0">
                <RequestTable data={rejectedRequests} />
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
    </DashboardLayout>
  );
}
