import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "@/components/AppLayout";
import { BranchProvider } from "@/contexts/BranchContext";
import { StoreProvider } from "@/contexts/StoreContext";
import StoresPage from "./pages/StoresPage";
import POSPage from "./pages/POSPage";
import ProductsPage from "./pages/ProductsPage";
import ReportsPage from "./pages/ReportsPage";
import StaffPage from "./pages/StaffPage";
import CustomersPage from "./pages/CustomersPage";
import SuppliersPage from "./pages/SuppliersPage";
import SettingsPage from "./pages/SettingsPage";
import PurchasesPage from "./pages/PurchasesPage";
import BranchesPage from "./pages/BranchesPage";
import PendingInvoicesPage from "./pages/PendingInvoicesPage";
import ZatcaInvoicesPage from "./pages/ZatcaInvoicesPage";
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
          <StoreProvider>
            <BranchProvider>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/" element={<ProtectedRoute><AppLayout><POSPage /></AppLayout></ProtectedRoute>} />
                <Route path="/stores" element={<ProtectedRoute><AppLayout><StoresPage /></AppLayout></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute requiredRole="admin"><AppLayout><ProductsPage /></AppLayout></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute><AppLayout><CustomersPage /></AppLayout></ProtectedRoute>} />
                <Route path="/suppliers" element={<ProtectedRoute requiredRole="admin"><AppLayout><SuppliersPage /></AppLayout></ProtectedRoute>} />
                <Route path="/purchases" element={<ProtectedRoute requiredRole="admin"><AppLayout><PurchasesPage /></AppLayout></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute requiredRole="admin"><AppLayout><ReportsPage /></AppLayout></ProtectedRoute>} />
                <Route path="/branches" element={<ProtectedRoute requiredRole="admin"><AppLayout><BranchesPage /></AppLayout></ProtectedRoute>} />
                <Route path="/pending-invoices" element={<ProtectedRoute><AppLayout><PendingInvoicesPage /></AppLayout></ProtectedRoute>} />
                <Route path="/zatca" element={<ProtectedRoute requiredRole="admin"><AppLayout><ZatcaInvoicesPage /></AppLayout></ProtectedRoute>} />
                <Route path="/staff" element={<ProtectedRoute requiredRole="admin"><AppLayout><StaffPage /></AppLayout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute requiredRole="admin"><AppLayout><SettingsPage /></AppLayout></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BranchProvider>
          </StoreProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
