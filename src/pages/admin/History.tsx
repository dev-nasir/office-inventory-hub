import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { Search, ArrowUpRight, ArrowDownLeft, Package, Check, X, Clock, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

const actionConfig = {
  assigned: { label: 'Assigned', icon: ArrowUpRight, color: 'text-success', bgColor: 'bg-success/10' },
  returned: { label: 'Returned', icon: ArrowDownLeft, color: 'text-primary', bgColor: 'bg-primary/10' },
  requested: { label: 'Requested', icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10' },
  approved: { label: 'Approved', icon: Check, color: 'text-success', bgColor: 'bg-success/10' },
  rejected: { label: 'Rejected', icon: X, color: 'text-destructive', bgColor: 'bg-destructive/10' },
};

export default function History() {
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['admin-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('history')
        .select(`
          *,
          employee:profiles!employee_id(id, name, email),
          item:inventory_items!item_id(id, name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
  });

  const filteredHistory = history.filter((entry) => {
    const matchesSearch =
      (entry.employee?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.item?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (entry.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === 'all' || entry.action_type === actionFilter;
    return matchesSearch && matchesAction;
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory History</h1>
          <p className="text-muted-foreground">Track all inventory movements and actions</p>
        </div>

        {/* Filters */}
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee or item..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Action type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="returned">Returned</SelectItem>
                  <SelectItem value="requested">Requested</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Activity Log</CardTitle>
            <CardDescription>{filteredHistory.length} entries found</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                </TableCell>
              </TableRow>
            ) : filteredHistory.length > 0 ? (
              filteredHistory.map((entry) => {
                const config = actionConfig[entry.action_type as keyof typeof actionConfig] || actionConfig.requested;
                const Icon = config.icon;
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${config.bgColor}`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                        <Badge variant="outline">{config.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">
                            {entry.employee ? getInitials(entry.employee.name) : 'S'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{entry.employee?.name || 'System'}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{entry.notes}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{entry.item?.name || 'Deleted Item'}</span>
                      </div>
                    </TableCell>
                    <TableCell>{entry.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(entry.created_at || entry.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <p className="text-muted-foreground">No history found</p>
                  </TableCell>
                </TableRow>
            )}
          </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
