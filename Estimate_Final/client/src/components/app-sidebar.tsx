import { Home, FileSpreadsheet, Database, FileText, Settings, Calculator, Upload, Building, Ruler, TrendingUp, Zap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
  },
  {
    title: "All Estimates",
    url: "/estimates",
    icon: FileSpreadsheet,
  },
  {
    title: "SSR Database",
    url: "/ssr",
    icon: Database,
  },
  {
    title: "Templates",
    url: "/templates",
    icon: FileText,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

const estimatorItems = [
  {
    title: "GEstimator",
    url: "/estimator",
    icon: Calculator,
  },
  {
    title: "Excel Import",
    url: "/estimator/import",
    icon: Upload,
  },
  {
    title: "Projects",
    url: "/estimator/projects",
    icon: Building,
  },
  {
    title: "Measurements",
    url: "/estimator/measurements",
    icon: Ruler,
  },
  {
    title: "Rate Analysis",
    url: "/estimator/analysis",
    icon: TrendingUp,
  },
  {
    title: "Dynamic Templates",
    url: "/estimator/templates/dynamic",
    icon: Zap,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Estimator G</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>GEstimator Pro</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {estimatorItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url || location.startsWith(item.url)}>
                    <Link href={item.url} data-testid={`link-${item.title.toLowerCase().replace(/\s/g, '-')}`}>
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
