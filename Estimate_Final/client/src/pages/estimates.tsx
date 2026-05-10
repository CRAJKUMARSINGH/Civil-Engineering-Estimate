import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Plus, Edit, Copy, Download, Trash2, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Estimate as EstimateType } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Estimates() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: estimates = [], isLoading } = useQuery<EstimateType[]>({
    queryKey: ['/api/estimates'],
    queryFn: () => api.getEstimates(),
  });

  const filteredEstimates = estimates.filter((estimate) => {
    const matchesSearch = estimate.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (estimate.location && estimate.location.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === "all" || estimate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">All Estimates</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage and view all project estimates
          </p>
        </div>
        <Link href="/dashboard">
          <Button data-testid="button-create-estimate">
            <Plus className="h-4 w-4 mr-2" />
            Upload Estimate
          </Button>
        </Link>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search estimates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Parts</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Loading estimates...</p>
                </TableCell>
              </TableRow>
            ) : filteredEstimates.length > 0 ? (
              filteredEstimates.map((estimate) => {
                const excelData = estimate.excelData as any;
                const parts = excelData?.parts?.length || 0;
                const dateStr = new Date(estimate.dateCreated).toLocaleDateString('en-IN');
                
                return (
                  <TableRow key={estimate.id} className="hover-elevate">
                    <TableCell className="font-medium" data-testid={`text-project-${estimate.id}`}>
                      {estimate.projectName}
                    </TableCell>
                    <TableCell className="text-sm">{estimate.location || '-'}</TableCell>
                    <TableCell className="text-sm">{dateStr}</TableCell>
                    <TableCell className="text-sm">{parts}</TableCell>
                    <TableCell className="font-mono text-sm">-</TableCell>
                    <TableCell>
                      <Badge variant="default" className="capitalize">
                        {estimate.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Link href={`/estimate/${estimate.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            data-testid={`button-edit-${estimate.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
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
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No estimates found. Upload an Excel file to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
