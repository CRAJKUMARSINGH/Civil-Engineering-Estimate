import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Edit, Trash2, Upload, FileSpreadsheet, Download, TreeDeciduous } from "lucide-react";
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
import { HierarchicalSSRViewer } from "@/components/HierarchicalSSRViewer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SSRItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  rate: string;
  category: string;
}

interface SSRFile {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  uploadDate: string;
  description?: string;
  version?: string;
  category?: string;
  itemsCount: number;
  status: string;
}

const mockSSRItems: SSRItem[] = [
  {
    id: "1",
    code: "SSR-001",
    description: "Excavation in all types of soil",
    unit: "cum",
    rate: "150.00",
    category: "Earthwork",
  },
  {
    id: "2",
    code: "SSR-002",
    description: "Plain Cement Concrete 1:4:8 (40mm nominal size)",
    unit: "cum",
    rate: "4,500.00",
    category: "Concrete",
  },
  {
    id: "3",
    code: "SSR-003",
    description: "Reinforced Cement Concrete M20",
    unit: "cum",
    rate: "6,800.00",
    category: "Concrete",
  },
  {
    id: "4",
    code: "SSR-004",
    description: "Brick work in cement mortar 1:6",
    unit: "sqm",
    rate: "580.00",
    category: "Masonry",
  },
  {
    id: "5",
    code: "SSR-005",
    description: "Steel reinforcement for RCC work",
    unit: "kg",
    rate: "65.00",
    category: "Steel",
  },
  {
    id: "6",
    code: "SSR-006",
    description: "Plastering with cement mortar 1:4",
    unit: "sqm",
    rate: "125.00",
    category: "Finishing",
  },
];

const categories = ["All", "Earthwork", "Concrete", "Masonry", "Steel", "Finishing"];

export default function SSRDatabase() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [ssrFiles, setSSRFiles] = useState<SSRFile[]>([]);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadForm, setUploadForm] = useState({
    description: "",
    version: "",
    category: "",
  });

  const filteredItems = mockSSRItems.filter((item) => {
    const matchesSearch =
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
      
      // Refresh the files list
      await fetchSSRFiles();
      
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

  const fetchSSRFiles = async () => {
    try {
      const response = await fetch("/api/ssr-files");
      if (response.ok) {
        const files = await response.json();
        setSSRFiles(files);
      }
    } catch (error) {
      console.error("Failed to fetch SSR files:", error);
    }
  };

  const downloadSSRFile = async (fileId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/ssr-files/${fileId}/download`);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download file");
    }
  };

  const analyzeBuildingBSR = async () => {
    try {
      setUploadProgress("Analyzing Building BSR structure...");
      // Use the new analyze endpoint
      const response = await fetch("/api/analyze-building-bsr");
      
      if (!response.ok) {
        throw new Error("Analysis failed");
      }
      
      const result = await response.json();
      console.log("Building BSR Analysis Result:", result);
      
      setUploadProgress(`Analysis complete! Found ${result.metadata.totalItems} items with ${result.metadata.maxLevel + 1} hierarchy levels`);
      
      // Show results in console for now
      alert(`Building BSR Analysis Complete!

Total Items: ${result.metadata.totalItems}
Hierarchy Levels: ${result.metadata.maxLevel + 1}
Has Hierarchy: ${result.metadata.hasHierarchy}

Check console for detailed results.`);
      
      setTimeout(() => setUploadProgress(""), 3000);
      
    } catch (error) {
      console.error("Analysis error:", error);
      setUploadProgress(`Analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setTimeout(() => setUploadProgress(""), 3000);
    }
  };

  // Load SSR files on component mount
  useState(() => {
    fetchSSRFiles();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-semibold">SSR Database</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Standard Schedule of Rates for construction items
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={analyzeBuildingBSR}
            data-testid="button-analyze-bsr"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Analyze Building BSR
          </Button>
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-upload-ssr">
                <Upload className="h-4 w-4 mr-2" />
                Upload SSR File
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Upload SSR Excel File</DialogTitle>
                <DialogDescription>
                  Upload a complete Schedule of Rates Excel file to import all items at once.
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
          <Button data-testid="button-add-ssr">
            <Plus className="h-4 w-4 mr-2" />
            Add SSR Item
          </Button>
        </div>
      </div>

      {/* Analysis Progress */}
      {uploadProgress && (
        <Card>
          <CardContent className="pt-6">
            <div className={`text-sm p-3 rounded-lg ${uploadProgress.startsWith("Error") || uploadProgress.includes("failed") ? "bg-red-50 text-red-700 border border-red-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
              {uploadProgress}
            </div>
          </CardContent>
        </Card>
      )}

      {/* SSR Files Section */}
      {ssrFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Uploaded SSR Files
            </CardTitle>
            <CardDescription>
              Manage your uploaded Schedule of Rates files
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ssrFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{file.originalName}</div>
                    <div className="text-sm text-muted-foreground">
                      {file.itemsCount} items • {(file.fileSize / 1024).toFixed(1)} KB
                      {file.version && ` • Version: ${file.version}`}
                      {file.category && ` • ${file.category}`}
                    </div>
                    {file.description && (
                      <div className="text-sm text-muted-foreground mt-1">{file.description}</div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSSRFile(file.id, file.originalName)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="flat" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="flat" className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            Flat View
          </TabsTrigger>
          <TabsTrigger value="hierarchical" className="flex items-center gap-2">
            <TreeDeciduous className="h-4 w-4" />
            Hierarchical View
          </TabsTrigger>
        </TabsList>
        <TabsContent value="flat">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Categories</CardTitle>
                <CardDescription>Filter by category</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? "secondary" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setSelectedCategory(category)}
                    data-testid={`button-category-${category.toLowerCase()}`}
                  >
                    {category}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <div className="lg:col-span-3 space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by code or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>

              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">Code</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-24">Unit</TableHead>
                      <TableHead className="w-32 text-right">Rate (₹)</TableHead>
                      <TableHead className="w-32">Category</TableHead>
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
                            {item.rate}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => console.log('Edit:', item.id)}
                                data-testid={`button-edit-${item.id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => console.log('Delete:', item.id)}
                                data-testid={`button-delete-${item.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No items found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="hierarchical">
          <HierarchicalSSRViewer />
        </TabsContent>
      </Tabs>
    </div>
  );
}