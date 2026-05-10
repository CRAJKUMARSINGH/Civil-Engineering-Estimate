import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExcelSheetViewer } from "@/components/ExcelSheetViewer";

interface Sheet {
  id: string;
  name: string;
  type: "info" | "cost" | "measurement" | "other";
}

interface Part {
  partNumber: number;
  costSheet: string;
  measurementSheet: string;
}

interface ExcelData {
  sheetNames: string[];
  parts: Part[];
}

export function EstimateSheetTabs() {
  const [activeSheet, setActiveSheet] = useState("");
  const params = useParams();
  const estimateId = params.id as string;

  const { data: estimate, isLoading, isError } = useQuery({
    queryKey: [`/api/estimates/${estimateId}`],
    queryFn: () => api.getEstimate(estimateId),
    enabled: !!estimateId,
  });

  if (isLoading) {
    return <div>Loading sheets...</div>;
  }

  if (isError || !estimate) {
    return <div>Error loading estimate sheets</div>;
  }

  // Generate sheet data from estimate
  const sheets: Sheet[] = [];
  
  // Add project info tab
  sheets.push({ id: "info", name: "Project Info", type: "info" });
  
  // Add sheets from excelData
  if (estimate.excelData) {
    const excelData = estimate.excelData as ExcelData;
    
    // Add part sheets
    excelData.parts.forEach((part: Part) => {
      sheets.push({
        id: `cost-${part.partNumber}`,
        name: part.costSheet,
        type: "cost"
      });
      sheets.push({
        id: `measurement-${part.partNumber}`,
        name: part.measurementSheet,
        type: "measurement"
      });
    });
    
    // Add other sheets that are not part of parts
    const partSheetNames = new Set([
      ...excelData.parts.map((p: Part) => p.costSheet),
      ...excelData.parts.map((p: Part) => p.measurementSheet)
    ]);
    
    excelData.sheetNames
      .filter((name: string) => !partSheetNames.has(name))
      .forEach((name: string, index: number) => {
        sheets.push({
          id: `other-${index}`,
          name,
          type: "other"
        });
      });
  }

  // Set initial active sheet if not set
  if (!activeSheet && sheets.length > 0) {
    setActiveSheet(sheets[0].id);
  }

  const handleAddPart = () => {
    console.log('Add new part clicked');
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeSheet} onValueChange={setActiveSheet} className="w-full">
        <div className="flex items-center gap-4 overflow-x-auto border-b pb-2">
          <TabsList className="h-auto bg-transparent p-0 gap-2 flex-wrap">
            {sheets.map((sheet) => (
              <TabsTrigger
                key={sheet.id}
                value={sheet.id}
                className="px-4 py-2 rounded-t-lg min-w-32 data-[state=active]:bg-card"
                data-testid={`tab-${sheet.id}`}
              >
                {sheet.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAddPart}
            className="ml-auto"
            data-testid="button-add-part"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Part
          </Button>
        </div>

        {sheets.map((sheet) => (
          <TabsContent key={sheet.id} value={sheet.id} className="mt-4">
            <SheetContent 
              sheet={sheet} 
              estimate={estimate} 
              estimateId={estimateId}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

interface SheetContentProps {
  sheet: Sheet;
  estimate: any;
  estimateId: string;
}

function SheetContent({ sheet, estimate, estimateId }: SheetContentProps) {
  if (sheet.type === "info") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Project Name</label>
              <p className="text-sm text-muted-foreground">{estimate.projectName}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Location</label>
              <p className="text-sm text-muted-foreground">{estimate.location || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Engineer Name</label>
              <p className="text-sm text-muted-foreground">{estimate.engineerName || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Reference Number</label>
              <p className="text-sm text-muted-foreground">{estimate.referenceNumber || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">File Name</label>
              <p className="text-sm text-muted-foreground">{estimate.fileName || 'Not specified'}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <p className="text-sm text-muted-foreground capitalize">{estimate.status}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // For Excel sheets, we need to fetch and display the actual sheet data
  return (
    <Card>
      <CardHeader>
        <CardTitle>{sheet.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <ExcelSheetViewer 
          estimateId={estimateId}
          sheetName={sheet.name}
          sheetType={sheet.type}
        />
      </CardContent>
    </Card>
  );
}