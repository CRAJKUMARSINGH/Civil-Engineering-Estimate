import { DashboardStats } from "@/components/DashboardStats";
import { RecentEstimates } from "@/components/RecentEstimates";
import { UploadEstimate } from "@/components/UploadEstimate";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Overview of your construction estimates
          </p>
        </div>
        <div className="flex gap-2">
          <Button data-testid="button-new-estimate">
            <Plus className="h-4 w-4 mr-2" />
            New Estimate
          </Button>
          <Button variant="secondary" data-testid="button-view-templates">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Templates
          </Button>
        </div>
      </div>

      <DashboardStats />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <RecentEstimates />
        </div>
        <div>
          <UploadEstimate />
        </div>
      </div>
    </div>
  );
}
