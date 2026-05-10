import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, CheckCircle2, Clock, FolderOpen } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
}

function StatCard({ title, value, icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, '-')}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export function DashboardStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Total Estimates"
        value="24"
        icon={<FileSpreadsheet className="h-5 w-5" />}
      />
      <StatCard
        title="Approved"
        value="12"
        icon={<CheckCircle2 className="h-5 w-5" />}
      />
      <StatCard
        title="In Progress"
        value="8"
        icon={<Clock className="h-5 w-5" />}
      />
      <StatCard
        title="Templates"
        value="4"
        icon={<FolderOpen className="h-5 w-5" />}
      />
    </div>
  );
}
