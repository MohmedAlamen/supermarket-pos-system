import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import LowStockAlert from "@/components/LowStockAlert";
import BranchSelector from "@/components/BranchSelector";
import OnlineIndicator from "@/components/OnlineIndicator";
import AutoPrintSynced from "@/components/AutoPrintSynced";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center border-b border-border bg-card px-4 gap-2 print:hidden">
            <SidebarTrigger className="mr-2" />
            <BranchSelector />
            <div className="mr-auto flex items-center gap-3">
              <OnlineIndicator />
              <LowStockAlert />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
          <AutoPrintSynced />
        </div>
      </div>
    </SidebarProvider>
  );
}
