import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowUpRight, ArrowDownLeft, Package, Check, X, Clock, History as HistoryIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

const actionConfig = {
  assigned: { label: 'Assigned', icon: ArrowUpRight, color: 'text-success', bgColor: 'bg-success/10' },
  returned: { label: 'Returned', icon: ArrowDownLeft, color: 'text-primary', bgColor: 'bg-primary/10' },
  requested: { label: 'Requested', icon: Clock, color: 'text-warning', bgColor: 'bg-warning/10' },
  approved: { label: 'Approved', icon: Check, color: 'text-success', bgColor: 'bg-success/10' },
  rejected: { label: 'Rejected', icon: X, color: 'text-destructive', bgColor: 'bg-destructive/10' },
};

export default function EmployeeHistory() {
  const { user } = useAuth();
  const [actionFilter, setActionFilter] = useState<string>('all');

  const { data: history = [], isLoading } = useQuery({
    queryKey: ['employee-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('history')
        .select(`
          *,
          item:inventory_items!item_id(id, name)
        `)
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  const filteredHistory = history.filter(
    entry => actionFilter === 'all' || entry.action_type === actionFilter
  );

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My History</h1>
            <p className="text-muted-foreground">View your inventory activity history</p>
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filter by action" />
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

        {/* Stats Summary */}
        <div className="grid gap-4 sm:grid-cols-4">
          {Object.entries(actionConfig).slice(0, 4).map(([key, config]) => {
            const count = history.filter(h => h.action_type === key).length;
            const Icon = config.icon;
            return (
              <Card key={key} className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{count}</p>
                      <p className="text-sm text-muted-foreground">{config.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Timeline */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">Activity Timeline</CardTitle>
            <CardDescription>{filteredHistory.length} entries</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredHistory.length > 0 ? (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />

                <div className="space-y-6">
                  {filteredHistory.map((entry, index) => {
                    const config = actionConfig[entry.action_type as keyof typeof actionConfig] || actionConfig.requested;
                    const Icon = config.icon;
                    return (
                      <div key={entry.id} className="relative flex gap-4 animate-slide-up" style={{ animationDelay: `${index * 50}ms` }}>
                        {/* Timeline dot */}
                        <div className={`relative z-10 h-12 w-12 rounded-full ${config.bgColor} flex items-center justify-center shrink-0`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 pb-6">
                          <div className="p-4 rounded-lg bg-secondary/50">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline">{config.label}</Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(entry.created_at || entry.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <Package className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium">{entry.item?.name || 'Deleted Item'}</span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  Quantity: {entry.quantity}
                                </p>
                                {entry.notes && (
                                  <p className="text-sm text-muted-foreground mt-2 italic text-xs">
                                    "{entry.notes}"
                                  </p>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                {new Date(entry.created_at || entry.createdAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <HistoryIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No history entries found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
