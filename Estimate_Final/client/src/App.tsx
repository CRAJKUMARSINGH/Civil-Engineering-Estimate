import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Estimates from "@/pages/estimates";
import EstimateEditor from "@/pages/estimate-editor";
import SSRDatabase from "@/pages/ssr-database";
import EstimatorDashboard from "@/pages/estimator-dashboard";
import ExcelImporter from "@/components/ExcelImporter";
import EstimatorProjects from "@/pages/estimator-projects";
import MeasurementEditor from "@/components/MeasurementEditor";
import AnalysisEditor from "@/components/AnalysisEditor";
import DynamicTemplateEditor from "@/components/DynamicTemplateEditor";
import EnhancedDashboard from "@/pages/enhanced-dashboard";
import EnhancedSSRDatabase from "@/components/EnhancedSSRDatabase";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/estimates" component={Estimates} />
      <Route path="/estimate/:id" component={EstimateEditor} />
      <Route path="/ssr" component={SSRDatabase} />
      <Route path="/templates" component={Dashboard} />
      <Route path="/settings" component={Dashboard} />
      <Route path="/estimator" component={EstimatorDashboard} />
      <Route path="/estimator/import" component={ExcelImporter} />
      <Route path="/estimator/projects" component={EstimatorProjects} />
      <Route path="/estimator/measurements" component={() => <MeasurementEditor scheduleItemId="demo" scheduleItemCode="DEMO" scheduleItemDescription="Demo Item" />} />
      <Route path="/estimator/analysis" component={() => <AnalysisEditor scheduleItemId="demo" scheduleItemCode="DEMO" scheduleItemDescription="Demo Item" />} />
      <Route path="/estimator/templates/dynamic" component={DynamicTemplateEditor} />
      <Route path="/enhanced" component={EnhancedDashboard} />
      <Route path="/ssr/enhanced" component={EnhancedSSRDatabase} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full">
            <AppSidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
              <header className="flex items-center justify-between p-4 border-b">
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <ThemeToggle />
              </header>
              <main className="flex-1 overflow-auto p-8">
                <Router />
              </main>
            </div>
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
