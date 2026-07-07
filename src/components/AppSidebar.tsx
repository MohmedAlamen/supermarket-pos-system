import { ShoppingCart, Package, BarChart3, Users, LogOut, UserCircle, Truck, Settings, ShoppingBag, Store, CloudUpload, FileText, Building2, Gift, Tag, RotateCcw } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const allItems = [
  { title: "نقطة البيع", url: "/", icon: ShoppingCart, roles: ["admin", "cashier"] },
  { title: "المتاجر", url: "/stores", icon: Building2, roles: ["admin", "cashier"] },
  { title: "المنتجات", url: "/products", icon: Package, roles: ["admin"] },
  { title: "العملاء", url: "/customers", icon: UserCircle, roles: ["admin", "cashier"] },
  { title: "الموردين", url: "/suppliers", icon: Truck, roles: ["admin"] },
  { title: "المشتريات", url: "/purchases", icon: ShoppingBag, roles: ["admin"] },
  { title: "التقارير", url: "/reports", icon: BarChart3, roles: ["admin"] },
  { title: "الفروع", url: "/branches", icon: Store, roles: ["admin"] },
  { title: "فواتير عدم الاتصال", url: "/pending-invoices", icon: CloudUpload, roles: ["admin", "cashier"] },
  { title: "فواتير ZATCA", url: "/zatca", icon: FileText, roles: ["admin"] },
  { title: "الموظفين", url: "/staff", icon: Users, roles: ["admin"] },
  { title: "الإعدادات", url: "/settings", icon: Settings, roles: ["admin"] },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { role, signOut, user } = useAuth();

  const items = allItems.filter((item) => role && item.roles.includes(role));

  return (
    <Sidebar collapsible="icon" side="right">
      <SidebarContent className="pt-4">
        <div className="px-4 pb-4 mb-2 border-b border-border">
          {!collapsed ? (
            <h1 className="text-xl font-bold text-primary">🛒 كاشير</h1>
          ) : (
            <span className="text-xl">🛒</span>
          )}
        </div>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="hover:bg-muted/50"
                      activeClassName="bg-primary/10 text-primary font-semibold"
                    >
                      <item.icon className="ml-2 h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 border-t border-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} className="hover:bg-destructive/10 text-destructive">
              <LogOut className="ml-2 h-5 w-5" />
              {!collapsed && <span>تسجيل الخروج</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
