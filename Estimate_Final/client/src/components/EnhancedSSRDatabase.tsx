import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Edit, Trash2, Upload, FileSpreadsheet, Download, TreeDeciduous, Zap, TrendingUp } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useQuery } from "@tanstack/react-query";

interface SSRItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  rate: string | number;
  category: string;
  similarity?: number;
  year?: number;
  source?: string;
}

interface EnhancedStats {
  legacy: {
    estimates: number;
    ssrItems: number;
  };
  projects: {
    totalProjects: number;
    totalValue: number;
  };
  ssr: {
    totalItems: number;
    categoriesCount: number;
    yearsCount: number;
    averageRate: number;
  };
  measurements: {
    templatesCount: number;
  };
  dynamicTemplates: {
    templatesCount: number;
  };
}

export default function EnhancedSSRDatabase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadForm, setUploadForm] = useState({
    description: "",
    version: "",
    category: "",
  });

  // Fetch enhanced dashboard statistics
  const { data: enhancedStats } = useQuery<EnhancedStats>({
    queryKey: ["/api/dashboard/enhanced-stats"],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/enhanced-stats');
      if (!response.ok) throw new Error('Failed to fetch enhanced stats');
      return response.json();
    },
  });

  // Fetch SSR items with enhanced search
  const { data: ssrItems, isLoading } = useQuery<SSRItem[]>({
    queryKey: ["/api/ssr-items/search", searchQuery, selectedCategory],
    queryFn: async () => {
      if (searchQuery.trim()) {
        const params = new URLSearchParams({
          query: searchQuery,
          threshold: '0.6',
          limit: '50'
        });
        
        if (selectedCategory !== "All") {
          params.append('category', selectedCategory);
        }
        
        const response = await fetch(`/api/ssr-items/search?${params}`);
        if (!response.ok) throw new Error('Failed to search SSR items');
        return response.json();
      } else {
        // Fallback to original API for browsing
        const response = await fetch('/api/ssr-items');
        if (!response.ok) throw new Error('Failed to fetch SSR items');
        return response.json();
      }
    },
  });

  const categories = ["All", "Earthwork", "Concrete", "Masonry", "Steel", "Finishing"];

  const filteredItems = ssrItems?.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesCategory;
  }) || [];

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert("Please select an Excel file (.xlsx or .xls)");
      return;
    }

    setIsUploading(true);
    setUploadProgress("Uploading file...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("description", uploadForm.description);
      formData.append("version", uploadForm.version);
      formData.append("category", uploadForm.category);

      const response = await fetch("/api/ssr-files/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const result = await response.json();
      setUploadProgress(`Success! Created ${result.itemsCreated} new SSR items`);
      
      // Reset form
      setUploadForm({ description: "", version: "", category: "" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setTimeout(() => {
        setIsUploadDialogOpen(false);
        setUploadProgress("");
      }, 2000);

    } catch (error) {
      console.error("Upload error:", error);
      setUploadProgress(`Error: ${error instanceof Error ? error.message : "Upload failed"}`);
    } finally {
      setIsUploading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatRate = (rate: string | number) => {
    const numRate = typeof rate === 'string' ? parseFloat(rate.replace(/,/g, '')) : rate;
    return formatCurrency(numRate);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">Enhanced SSR Database</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Standard Schedule of Rates with fuzzy search and smart matching
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload SSR File
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload SSR Excel File</DialogTitle>
                <DialogDescription>
                  Upload a complete Schedule of Rates Excel file with enhanced processing.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">Excel File</Label>
                  <Input
                    id="file"
                    type="file"
                    accept=".xlsx,.xls"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this SSR file..."
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                    disabled={isUploading}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="version">Version (Optional)</Label>
                    <Input
                      id="version"
                      placeholder="e.g., 2024-25"
                      value={uploadForm.version}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, version: e.target.value }))}
                      disabled={isUploading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category (Optional)</Label>
                    <Input
                      id="category"
                      placeholder="e.g., PWD, CPWD"
                      value={uploadForm.category}
                      onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                      disabled={isUploading}
                    />
                  </div>
                </div>
                {uploadProgress && (
                  <div className={`text-sm p-2 rounded ${uploadProgress.startsWith("Error") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                    {uploadProgress}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add SSR Item
          </Button>
        </div>
      </div>

      {/* Enhanced Statistics */}
      {enhancedStats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-600" />
                Legacy System
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {enhancedStats.legacy.estimates + enhancedStats.legacy.ssrItems}
              </div>
              <div className="text-xs text-muted-foreground">
                {enhancedStats.legacy.estimates} estimates, {enhancedStats.legacy.ssrItems} SSR items
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                New Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {enhancedStats.projects.totalProjects}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatCurrency(enhancedStats.projects.totalValue)} total value
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Search className="h-4 w-4 text-purple-600" />
                Enhanced SSR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {enhancedStats.ssr.totalItems}
              </div>
              <div className="text-xs text-muted-foreground">
                {enhancedStats.ssr.categoriesCount} categories, {enhancedStats.ssr.yearsCount} years
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-600" />
                Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {enhancedStats.measurements.templatesCount + enhancedStats.dynamicTemplates.templatesCount}
              </div>
              <div className="text-xs text-muted-foreground">
                {enhancedStats.measurements.templatesCount} measurement, {enhancedStats.dynamicTemplates.templatesCount} dynamic
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Smart SSR Search
          </CardTitle>
          <CardDescription>
            Search with fuzzy matching and intelligent suggestions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by code, description, or keywords (e.g., 'concrete work', 'excavation')..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="text-base"
              />
            </div>
            <div className="w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-background rounded-md"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {searchQuery && (
            <div className="mt-2 text-sm text-muted-foreground">
              Searching with fuzzy matching - results include similar items even with typos
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle>
            SSR Items 
            {filteredItems.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({filteredItems.length} items found)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : (
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Code</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="w-24">Unit</TableHead>
                    <TableHead className="w-32 text-right">Rate (₹)</TableHead>
                    <TableHead className="w-32">Category</TableHead>
                    {searchQuery && <TableHead className="w-24">Match</TableHead>}
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <TableRow key={item.id} className="hover-elevate">
                        <TableCell className="font-mono text-sm">{item.code}</TableCell>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="text-sm">{item.unit}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {formatRate(item.rate)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.category}</Badge>
                          {item.source && item.source !== 'Original' && (
                            <Badge variant="outline" className="ml-1 text-xs">
                              {item.source}
                            </Badge>
                          )}
                        </TableCell>
                        {searchQuery && (
                          <TableCell>
                            {item.similarity && (
                              <div className="flex items-center gap-1">
                                <Progress 
                                  value={item.similarity * 100} 
                                  className="w-12 h-2" 
                                />
                                <span className="text-xs">
                                  {Math.round(item.similarity * 100)}%
                                </span>
                              </div>
                            )}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => console.log('Edit:', item.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => console.log('Delete:', item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={searchQuery ? 7 : 6} className="text-center text-muted-foreground py-8">
                        {searchQuery ? `No items found matching "${searchQuery}"` : "No items found"}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Migration Helper */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            System Integration
          </CardTitle>
          <CardDescription>
            Bridge between legacy estimates and new project system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Migrate Estimates to Projects
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Enhanced Data
            </Button>
            <Button variant="outline">
              <TrendingUp className="h-4 w-4 mr-2" />
              View Analytics
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}