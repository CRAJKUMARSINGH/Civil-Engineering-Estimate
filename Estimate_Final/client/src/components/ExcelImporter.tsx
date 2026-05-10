import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Eye,
  Settings,
  Database
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";

interface ExcelAnalysis {
  filename: string;
  sheets: Array<{
    name: string;
    maxRow: number;
    maxColumn: number;
    dataRows: number;
    hasHeaders: boolean;
    recommendedForImport: boolean;
  }>;
  totalSheets: number;
  recommendedSheet?: string;
  fileSize: number;
  success: boolean;
  errors: string[];
}

interface ImportPreviewItem {
  rowNumber: number;
  code: string;
  description: string;
  unit: string;
  rate: number;
  quantity: number;
  category?: string;
  remarks: string;
  selected: boolean;
  validationErrors: string[];
  ssrMatch?: {
    code: string;
    description: string;
    confidence: number;
    rate: number;
  };
}

interface ImportSettings {
  enableSSRMatching: boolean;
  ssrThreshold: number;
  autoApplyBestMatch: boolean;
  saveAsTemplate: boolean;
  templateName: string;
  projectId?: string;
}

export default function ExcelImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<ExcelAnalysis | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [previewItems, setPreviewItems] = useState<ImportPreviewItem[]>([]);
  const [settings, setSettings] = useState<ImportSettings>({
    enableSSRMatching: true,
    ssrThreshold: 0.75,
    autoApplyBestMatch: false,
    saveAsTemplate: false,
    templateName: "",
  });
  const [currentStep, setCurrentStep] = useState<'upload' | 'analyze' | 'preview' | 'import'>('upload');

  // Analyze Excel file
  const analyzeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/estimator/excel/analyze', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze Excel file');
      }
      
      return response.json() as Promise<ExcelAnalysis>;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      if (data.recommendedSheet) {
        setSelectedSheet(data.recommendedSheet);
      }
      setCurrentStep('analyze');
    },
  });

  // Preview import
  const previewMutation = useMutation({
    mutationFn: async ({ file, sheetName, settings }: { file: File; sheetName: string; settings: ImportSettings }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', sheetName);
      formData.append('enableSSRMatching', settings.enableSSRMatching.toString());
      formData.append('ssrThreshold', settings.ssrThreshold.toString());
      formData.append('autoApplyBestMatch', settings.autoApplyBestMatch.toString());
      
      const response = await fetch('/api/estimator/excel/preview', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to preview import');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setPreviewItems(data.items || []);
      setCurrentStep('preview');
    },
  });

  // Import items
  const importMutation = useMutation({
    mutationFn: async ({ file, sheetName, selectedRows, settings }: { 
      file: File; 
      sheetName: string; 
      selectedRows: number[];
      settings: ImportSettings;
    }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sheetName', sheetName);
      formData.append('selectedRows', JSON.stringify(selectedRows));
      formData.append('saveAsTemplate', settings.saveAsTemplate.toString());
      if (settings.templateName) {
        formData.append('templateName', settings.templateName);
      }
      if (settings.projectId) {
        formData.append('projectId', settings.projectId);
      }
      
      const response = await fetch('/api/estimator/excel/import', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Failed to import items');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setCurrentStep('import');
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      setSettings(prev => ({
        ...prev,
        templateName: file.name.replace(/\.[^/.]+$/, "") // Remove extension
      }));
      analyzeMutation.mutate(file);
    }
  }, [analyzeMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  const handlePreview = () => {
    if (file && selectedSheet) {
      previewMutation.mutate({ file, sheetName: selectedSheet, settings });
    }
  };

  const handleImport = () => {
    if (file && selectedSheet) {
      const selectedRows = previewItems
        .filter(item => item.selected)
        .map(item => item.rowNumber);
      
      importMutation.mutate({ file, sheetName: selectedSheet, selectedRows, settings });
    }
  };

  const toggleItemSelection = (rowNumber: number) => {
    setPreviewItems(prev => 
      prev.map(item => 
        item.rowNumber === rowNumber 
          ? { ...item, selected: !item.selected }
          : item
      )
    );
  };

  const selectAllItems = (selected: boolean) => {
    setPreviewItems(prev => 
      prev.map(item => ({ ...item, selected }))
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStepProgress = () => {
    switch (currentStep) {
      case 'upload': return 25;
      case 'analyze': return 50;
      case 'preview': return 75;
      case 'import': return 100;
      default: return 0;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Excel Import</h1>
          <p className="text-muted-foreground">
            Import BOQ and estimates from Excel files with SSR matching
          </p>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Import Progress</span>
              <span>{getStepProgress()}%</span>
            </div>
            <Progress value={getStepProgress()} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span className={currentStep === 'upload' ? 'text-primary' : ''}>Upload</span>
              <span className={currentStep === 'analyze' ? 'text-primary' : ''}>Analyze</span>
              <span className={currentStep === 'preview' ? 'text-primary' : ''}>Preview</span>
              <span className={currentStep === 'import' ? 'text-primary' : ''}>Import</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={currentStep} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload" disabled={currentStep !== 'upload'}>Upload File</TabsTrigger>
          <TabsTrigger value="analyze" disabled={!analysis}>Analyze</TabsTrigger>
          <TabsTrigger value="preview" disabled={previewItems.length === 0}>Preview</TabsTrigger>
          <TabsTrigger value="import" disabled={previewItems.length === 0}>Import</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upload Excel File</CardTitle>
              <CardDescription>
                Select an Excel file (.xlsx or .xls) containing your BOQ or estimate data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                }`}
              >
                <input {...getInputProps()} />
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                {isDragActive ? (
                  <p className="text-lg">Drop the Excel file here...</p>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg">Drag & drop an Excel file here, or click to select</p>
                    <p className="text-sm text-muted-foreground">
                      Supports .xlsx and .xls files up to 10MB
                    </p>
                  </div>
                )}
              </div>

              {file && (
                <div className="mt-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                    {analyzeMutation.isPending && (
                      <div className="ml-auto">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {analyzeMutation.error && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {analyzeMutation.error.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analyze" className="space-y-4">
          {analysis && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>File Analysis</CardTitle>
                  <CardDescription>
                    Review the Excel file structure and select a sheet to import
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{analysis.totalSheets}</div>
                      <div className="text-sm text-muted-foreground">Sheets</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {(analysis.fileSize / 1024 / 1024).toFixed(1)}MB
                      </div>
                      <div className="text-sm text-muted-foreground">File Size</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {analysis.sheets.filter(s => s.recommendedForImport).length}
                      </div>
                      <div className="text-sm text-muted-foreground">Recommended</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {analysis.sheets.reduce((sum, s) => sum + s.dataRows, 0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Total Rows</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Select Sheet to Import</Label>
                    <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a sheet" />
                      </SelectTrigger>
                      <SelectContent>
                        {analysis.sheets.map((sheet) => (
                          <SelectItem key={sheet.name} value={sheet.name}>
                            <div className="flex items-center gap-2">
                              <span>{sheet.name}</span>
                              {sheet.recommendedForImport && (
                                <Badge variant="secondary" className="text-xs">
                                  Recommended
                                </Badge>
                              )}
                              <span className="text-xs text-muted-foreground">
                                ({sheet.dataRows} rows)
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Import Settings */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Import Settings
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="enableSSR"
                          checked={settings.enableSSRMatching}
                          onCheckedChange={(checked) =>
                            setSettings(prev => ({ ...prev, enableSSRMatching: !!checked }))
                          }
                        />
                        <Label htmlFor="enableSSR" className="flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          Enable SSR Matching
                        </Label>
                      </div>

                      {settings.enableSSRMatching && (
                        <div className="ml-6 space-y-3">
                          <div className="space-y-2">
                            <Label>Matching Threshold: {settings.ssrThreshold}</Label>
                            <input
                              type="range"
                              min="0.5"
                              max="1"
                              step="0.05"
                              value={settings.ssrThreshold}
                              onChange={(e) =>
                                setSettings(prev => ({ ...prev, ssrThreshold: parseFloat(e.target.value) }))
                              }
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Loose (50%)</span>
                              <span>Strict (100%)</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="autoApply"
                              checked={settings.autoApplyBestMatch}
                              onCheckedChange={(checked) =>
                                setSettings(prev => ({ ...prev, autoApplyBestMatch: !!checked }))
                              }
                            />
                            <Label htmlFor="autoApply">Auto-apply best matches</Label>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="saveTemplate"
                          checked={settings.saveAsTemplate}
                          onCheckedChange={(checked) =>
                            setSettings(prev => ({ ...prev, saveAsTemplate: !!checked }))
                          }
                        />
                        <Label htmlFor="saveTemplate">Save as template</Label>
                      </div>

                      {settings.saveAsTemplate && (
                        <div className="ml-6">
                          <Label>Template Name</Label>
                          <Input
                            value={settings.templateName}
                            onChange={(e) =>
                              setSettings(prev => ({ ...prev, templateName: e.target.value }))
                            }
                            placeholder="Enter template name"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex gap-2">
                    <Button onClick={handlePreview} disabled={!selectedSheet || previewMutation.isPending}>
                      {previewMutation.isPending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      Preview Import
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Import Preview</CardTitle>
              <CardDescription>
                Review and select items to import. Items with validation errors are highlighted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllItems(true)}
                    >
                      Select All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAllItems(false)}
                    >
                      Deselect All
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {previewItems.filter(item => item.selected).length} of {previewItems.length} selected
                    </span>
                  </div>
                  <Button onClick={handleImport} disabled={importMutation.isPending}>
                    {importMutation.isPending ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Import Selected
                  </Button>
                </div>

                <div className="border rounded-lg">
                  <div className="max-h-96 overflow-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="w-12 p-2"></th>
                          <th className="text-left p-2">Code</th>
                          <th className="text-left p-2">Description</th>
                          <th className="text-left p-2">Unit</th>
                          <th className="text-right p-2">Rate</th>
                          <th className="text-right p-2">Qty</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewItems.map((item) => (
                          <tr
                            key={item.rowNumber}
                            className={`border-t ${
                              item.validationErrors.length > 0 ? 'bg-red-50' : ''
                            }`}
                          >
                            <td className="p-2">
                              <Checkbox
                                checked={item.selected}
                                onCheckedChange={() => toggleItemSelection(item.rowNumber)}
                              />
                            </td>
                            <td className="p-2 font-mono text-sm">{item.code}</td>
                            <td className="p-2">
                              <div className="max-w-xs truncate" title={item.description}>
                                {item.description}
                              </div>
                              {item.ssrMatch && (
                                <div className="text-xs text-green-600 mt-1">
                                  SSR Match: {(item.ssrMatch.confidence * 100).toFixed(0)}%
                                </div>
                              )}
                            </td>
                            <td className="p-2">{item.unit}</td>
                            <td className="p-2 text-right font-mono">
                              {formatCurrency(item.rate)}
                              {item.ssrMatch && item.ssrMatch.rate !== item.rate && (
                                <div className="text-xs text-blue-600">
                                  SSR: {formatCurrency(item.ssrMatch.rate)}
                                </div>
                              )}
                            </td>
                            <td className="p-2 text-right">{item.quantity}</td>
                            <td className="p-2">
                              {item.validationErrors.length > 0 ? (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Errors
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Valid
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-600" />
              <h3 className="text-lg font-medium mb-2">Import Completed Successfully!</h3>
              <p className="text-muted-foreground mb-4">
                Your Excel data has been imported and is ready to use.
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Import Another File
                </Button>
                <Button>
                  View Projects
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}