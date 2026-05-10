import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Copy, Download, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface Estimate {
  id: string;
  projectName: string;
  dateCreated: string;
  status: "draft" | "submitted" | "approved";
  excelData: {
    sheetNames: string[];
    parts: { partNumber: number; costSheet: string; measurementSheet: string }[];
  } | null;
  fileName: string | null;
}

const statusColors = {
  draft: "default",
  submitted: "secondary",
  approved: "default",
} as const;

export function RecentEstimates() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: estimates = [], isLoading, isError } = useQuery({
    queryKey: ['/api/estimates'],
    queryFn: api.getEstimates,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Estimates</CardTitle>
          <CardDescription>Loading estimates...</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Estimates</CardTitle>
          <CardDescription>Error loading estimates</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Failed to load estimates. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Estimates</CardTitle>
        <CardDescription>View and manage your project estimates</CardDescription>
      </CardHeader>
      <CardContent>
        {estimates.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No estimates found. Upload an Excel file to create your first estimate.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Date Created</TableHead>
                  <TableHead>Parts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((estimate) => (
                  <TableRow key={estimate.id} className="hover-elevate">
                    <TableCell className="font-medium" data-testid={`text-project-${estimate.id}`}>
                      {estimate.projectName}
                      {estimate.fileName && (
                        <p className="text-xs text-muted-foreground mt-1">{estimate.fileName}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(estimate.dateCreated).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      {estimate.excelData?.parts.length || 0} parts
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[estimate.status]} className="capitalize">
                        {estimate.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/estimate/${estimate.id}`)}
                          data-testid={`button-edit-${estimate.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => console.log('Duplicate:', estimate.id)}
                          data-testid={`button-duplicate-${estimate.id}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => console.log('Download:', estimate.id)}
                          data-testid={`button-download-${estimate.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => console.log('Delete:', estimate.id)}
                          data-testid={`button-delete-${estimate.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}