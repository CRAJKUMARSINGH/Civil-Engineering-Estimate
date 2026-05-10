import { Button } from "@/components/ui/button";
import { Save, Download, ArrowLeft } from "lucide-react";
import { Link, useParams } from "wouter";
import { EstimateSheetTabs } from "@/components/EstimateSheetTabs";
import { ExcelTableWithSSR } from "@/components/ExcelTableWithSSR";
import { ProjectMetadataForm } from "@/components/ProjectMetadataForm";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function EstimateEditor() {
  const params = useParams();
  const estimateId = params.id as string;

  const { data: estimate, isLoading, isError } = useQuery({
    queryKey: [`/api/estimates/${estimateId}`],
    queryFn: () => api.getEstimate(estimateId),
    enabled: !!estimateId,
  });

  if (isLoading) {
    return <div>Loading estimate...</div>;
  }

  if (isError || !estimate) {
    return <div>Error loading estimate</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href="/estimates">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">{estimate.projectName}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {estimate.referenceNumber} • {estimate.location}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" data-testid="button-save">
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button data-testid="button-download">
            <Download className="h-4 w-4 mr-2" />
            Download Excel
          </Button>
        </div>
      </div>

      <ProjectMetadataForm />

      <EstimateSheetTabs />

      <ExcelTableWithSSR />
    </div>
  );
}