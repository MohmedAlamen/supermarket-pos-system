import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import POSPage from "./pages/POSPage";
import ProductsPage from "./pages/ProductsPage";
import ReportsPage from "./pages/ReportsPage";
import StaffPage from "./pages/StaffPage";
import CustomersPage from "./pages/CustomersPage";
import SuppliersPage from "./pages/SuppliersPage";
import SettingsPage from "./pages/SettingsPage";
import PurchasesPage from "./pages/PurchasesPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<ProtectedRoute><AppLayout><POSPage /></AppLayout></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute requiredRole="admin"><AppLayout><ProductsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><AppLayout><CustomersPage /></AppLayout></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute requiredRole="admin"><AppLayout><SuppliersPage /></AppLayout></ProtectedRoute>} />
            <Route path="/purchases" element={<ProtectedRoute requiredRole="admin"><AppLayout><PurchasesPage /></AppLayout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute requiredRole="admin"><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>} />
            <Route path="/staff" element={<ProtectedRoute requiredRole="admin"><AppLayout><StaffPage /></AppLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute requiredRole="admin"><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
