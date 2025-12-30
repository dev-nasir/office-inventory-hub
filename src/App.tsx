import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { toast } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/admin/Inventory";
import Employees from "./pages/admin/Employees";
import Requests from "./pages/admin/Requests";
import History from "./pages/admin/History";
import MyInventory from "./pages/employee/MyInventory";
import RequestItem from "./pages/employee/RequestItem";
import EmployeeHistory from "./pages/employee/EmployeeHistory";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (adminOnly && user.role !== 'admin') {
    toast.error("Access Denied: Administrative privileges required.");
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/auth" element={<Auth />} />
      
      {/* Protected Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/dashboard/inventory" element={<ProtectedRoute adminOnly><Inventory /></ProtectedRoute>} />
      <Route path="/dashboard/employees" element={<ProtectedRoute adminOnly><Employees /></ProtectedRoute>} />
      <Route path="/dashboard/requests" element={<ProtectedRoute adminOnly><Requests /></ProtectedRoute>} />
      <Route path="/dashboard/history" element={<ProtectedRoute><History /></ProtectedRoute>} />
      
      {/* Employee Routes */}
      <Route path="/dashboard/my-inventory" element={<ProtectedRoute><MyInventory /></ProtectedRoute>} />
      <Route path="/dashboard/request" element={<ProtectedRoute><RequestItem /></ProtectedRoute>} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
