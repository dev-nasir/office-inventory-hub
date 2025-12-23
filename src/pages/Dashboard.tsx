import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Users, ClipboardList, TrendingUp, Box, Send, Clock } from 'lucide-react';
import { mockInventoryItems, mockUsers, mockRequests, mockEmployeeInventory } from '@/data/mockData';

export default function Dashboard() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const pendingRequests = mockRequests.filter(r => r.status === 'pending').length;
  const totalItems = mockInventoryItems.reduce((acc, item) => acc + item.quantity, 0);
  const assignedItems = mockInventoryItems.reduce((acc, item) => acc + (item.quantity - item.availableQuantity), 0);
  const employeeCount = mockUsers.filter(u => u.role === 'employee').length;

  // Employee-specific data
  const myInventory = mockEmployeeInventory.filter(inv => inv.employeeId === user?.id);
  const myPendingRequests = mockRequests.filter(r => r.employeeId === user?.id && r.status === 'pending').length;

  const adminStats = [
    {
      title: 'Total Inventory',
      value: totalItems,
      description: 'Items in stock',
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Assigned Items',
      value: assignedItems,
      description: 'Currently with employees',
      icon: TrendingUp,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Employees',
      value: employeeCount,
      description: 'Active users',
      icon: Users,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Pending Requests',
      value: pendingRequests,
      description: 'Awaiting approval',
      icon: ClipboardList,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  const employeeStats = [
    {
      title: 'My Items',
      value: myInventory.length,
      description: 'Assigned to me',
      icon: Box,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Pending Requests',
      value: myPendingRequests,
      description: 'Awaiting approval',
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      title: 'Available Items',
      value: mockInventoryItems.filter(i => i.availableQuantity > 0).length,
      description: 'Can be requested',
      icon: Package,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  const stats = isAdmin ? adminStats : employeeStats;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.name?.split(' ')[0]}!
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin
              ? 'Here\'s an overview of your inventory management system.'
              : 'Here\'s a quick look at your inventory status.'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="shadow-card hover:shadow-elegant transition-shadow duration-300">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="grid gap-6 md:grid-cols-2">
          {isAdmin ? (
            <>
              {/* Recent Requests */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Requests</CardTitle>
                  <CardDescription>Latest employee inventory requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {mockRequests.slice(0, 3).map((request) => (
                      <div
                        key={request.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {request.item?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            by {request.employee?.name}
                          </p>
                        </div>
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
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Low Stock Items */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Inventory Overview</CardTitle>
                  <CardDescription>Items by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['Electronics', 'Accessories', 'Office Supplies'].map((category) => {
                      const items = mockInventoryItems.filter((i) => i.category === category);
                      const total = items.reduce((acc, i) => acc + i.quantity, 0);
                      const available = items.reduce((acc, i) => acc + i.availableQuantity, 0);
                      const percentage = Math.round((available / total) * 100);

                      return (
                        <div key={category} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{category}</span>
                            <span className="text-muted-foreground">
                              {available}/{total} available
                            </span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* My Inventory */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">My Inventory</CardTitle>
                  <CardDescription>Items currently assigned to you</CardDescription>
                </CardHeader>
                <CardContent>
                  {myInventory.length > 0 ? (
                    <div className="space-y-3">
                      {myInventory.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50"
                        >
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Box className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{inv.item?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Qty: {inv.quantity} • {inv.item?.category}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Box className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No items assigned yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                  <CardDescription>Common tasks</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    <button
                      onClick={() => window.location.href = '/dashboard/request'}
                      className="flex items-center gap-3 p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors text-left"
                    >
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Send className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Request Item</p>
                        <p className="text-sm text-muted-foreground">
                          Submit a new inventory request
                        </p>
                      </div>
                    </button>
                    <button
                      onClick={() => window.location.href = '/dashboard/my-inventory'}
                      className="flex items-center gap-3 p-4 rounded-lg bg-accent/5 hover:bg-accent/10 transition-colors text-left"
                    >
                      <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Package className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium">View Inventory</p>
                        <p className="text-sm text-muted-foreground">
                          See all your assigned items
                        </p>
                      </div>
                    </button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
