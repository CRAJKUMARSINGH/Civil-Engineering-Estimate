import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileSpreadsheet, 
  Play, 
  Settings,
  Eye,
  Download,
  CheckCircle,
  AlertCircle,
  Info,
  Calculator,
  Zap,
  FileText,
  Layers
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";

interface TemplateMetadata {
  filename: string;
  filepath: string;
  format: string;
  sheetCount: number;
  lastModified: string;
  fileSize: number;
  hasFormulas: boolean;
  namedRanges: string[];
}

interface CellInfo {
  reference: string;
  coordinate: string;
  value: any;
  formula?: string;
  validation?: any;
  fillColor?: string;
}

interface TemplateStructure {
  sheets: Record<string, {
    input_cells: CellInfo[];
    output_cells: CellInfo[];
    formula_cells: CellInfo[];
  }>;
  input_fields: Record<string, CellInfo>;
  output_fields: Record<string, CellInfo>;
  formulas: Record<string, string>;
  named_ranges: Record<string, string>;
}

interface TemplateValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export default function DynamicTemplateEditor() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [isCreateTemplateOpen, setIsCreateTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const queryClient = useQueryClient();

  // Fetch available templates
  const { data: templates, isLoading: templatesLoading } = useQuery<TemplateMetadata[]>({
    queryKey: ["/api/estimator/dynamic-templates"],
    queryFn: async () => {
      const response = await fetch('/api/estimator/dynamic-templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      return response.json();
    },
  });

  // Fetch template structure
  const { data: templateStructure, isLoading: structureLoading } = useQuery<TemplateStructure>({
    queryKey: ["/api/estimator/dynamic-templates", selectedTemplate, "structure"],
    queryFn: async () => {
      const response = await fetch(`/api/estimator/dynamic-templates/${selectedTemplate}/structure`);
      if (!response.ok) throw new Error('Failed to fetch template structure');
      return response.json();
    },
    enabled: !!selectedTemplate,
  });

  // Fetch template validation
  const { data: validation } = useQuery<TemplateValidation>({
    queryKey: ["/api/estimator/dynamic-templates", selectedTemplate, "validate"],
    queryFn: async () => {
      const response = await fetch(`/api/estimator/dynamic-templates/${selectedTemplate}/validate`);
      if (!response.ok) throw new Error('Failed to validate template');
      return response.json();
    },
    enabled: !!selectedTemplate,
  });

  // Process template mutation
  const processTemplateMutation = useMutation({
    mutationFn: async (inputs: Record<string, any>) => {
      const response = await fetch(`/api/estimator/dynamic-templates/${selectedTemplate}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs }),
      });
      if (!response.ok) throw new Error('Failed to process template');
      return response.json();
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async ({ file, templateName }: { file: File; templateName: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('templateName', templateName);
      
      const response = await fetch('/api/estimator/dynamic-templates/create', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Failed to create template');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimator/dynamic-templates"] });
      setIsCreateTemplateOpen(false);
      setNewTemplateName("");
      setUploadedFile(null);
    },
  });

  const onDrop = (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      setNewTemplateName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: false,
  });

  const handleProcessTemplate = () => {
    if (selectedTemplate && Object.keys(inputValues).length > 0) {
      processTemplateMutation.mutate(inputValues);
    }
  };

  const handleCreateTemplate = () => {
    if (uploadedFile && newTemplateName.trim()) {
      createTemplateMutation.mutate({
        file: uploadedFile,
        templateName: newTemplateName
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const renderInputField = (cellRef: string, cellInfo: CellInfo) => {
    const fieldId = `input_${cellRef.replace(/[!:]/g, '_')}`;
    
    return (
      <div key={cellRef} className="space-y-2">
        <Label htmlFor={fieldId}>
          {cellInfo.coordinate}
          {cellInfo.value && typeof cellInfo.value === 'string' && cellInfo.value.startsWith('IN_') && (
            <span className="ml-2 text-sm text-muted-foreground">
              ({cellInfo.value.replace('IN_', '')})
            </span>
          )}
        </Label>
        <Input
          id={fieldId}
          type="number"
          step="0.01"
          value={inputValues[cellRef] || ''}
          onChange={(e) => setInputValues(prev => ({
            ...prev,
            [cellRef]: parseFloat(e.target.value) || 0
          }))}
          placeholder={`Enter value for ${cellInfo.coordinate}`}
        />
        {cellInfo.value && (
          <div className="text-xs text-muted-foreground">
            Current: {cellInfo.value}
          </div>
        )}
      </div>
    );
  };

  const renderOutputField = (cellRef: string, cellInfo: CellInfo, result?: any) => {
    return (
      <div key={cellRef} className="p-3 border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <Label className="font-medium">{cellInfo.coordinate}</Label>
          <Badge variant="secondary">Output</Badge>
        </div>
        <div className="text-lg font-mono">
          {result !== undefined ? result : cellInfo.value || '-'}
        </div>
        {cellInfo.formula && (
          <div className="text-xs text-muted-foreground mt-1">
            Formula: {cellInfo.formula}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dynamic Templates</h1>
          <p className="text-muted-foreground">
            Create and process Excel templates with formula preservation
          </p>
        </div>
        <Dialog open={isCreateTemplateOpen} onOpenChange={setIsCreateTemplateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create Dynamic Template</DialogTitle>
              <DialogDescription>
                Upload an Excel file to create a new dynamic template with input/output detection.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
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
                      Supports .xlsx and .xls files with formulas
                    </p>
                  </div>
                )}
              </div>

              {uploadedFile && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="font-medium">{uploadedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(uploadedFile.size)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Enter template name"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateTemplateOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateTemplate}
                  disabled={!uploadedFile || !newTemplateName.trim() || createTemplateMutation.isPending}
                >
                  {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Template Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Available Templates</CardTitle>
          <CardDescription>
            Select a template to view its structure and process inputs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {templatesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : templates && templates.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templates.map((template) => (
                <Card 
                  key={template.filename}
                  className={`cursor-pointer transition-colors ${
                    selectedTemplate === template.filename.replace(/\.[^/.]+$/, "") 
                      ? 'ring-2 ring-primary' 
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedTemplate(template.filename.replace(/\.[^/.]+$/, ""))}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileSpreadsheet className="h-5 w-5" />
                      {template.filename}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sheets:</span>
                      <span>{template.sheetCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Size:</span>
                      <span>{formatFileSize(template.fileSize)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Formulas:</span>
                      <Badge variant={template.hasFormulas ? "default" : "secondary"}>
                        {template.hasFormulas ? "Yes" : "No"}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Named Ranges:</span>
                      <span>{template.namedRanges.length}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first dynamic template by uploading an Excel file.
              </p>
              <Button onClick={() => setIsCreateTemplateOpen(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Details */}
      {selectedTemplate && (
        <Tabs defaultValue="structure" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="structure">Structure</TabsTrigger>
            <TabsTrigger value="inputs">Inputs</TabsTrigger>
            <TabsTrigger value="outputs">Outputs</TabsTrigger>
            <TabsTrigger value="process">Process</TabsTrigger>
          </TabsList>

          <TabsContent value="structure" className="space-y-4">
            {/* Validation Status */}
            {validation && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {validation.valid ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                    Template Validation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {validation.errors.length > 0 && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <strong>Errors:</strong>
                          {validation.errors.map((error, index) => (
                            <div key={index} className="text-sm">• {error}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {validation.warnings.length > 0 && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          <strong>Warnings:</strong>
                          {validation.warnings.map((warning, index) => (
                            <div key={index} className="text-sm">• {warning}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {validation.valid && validation.errors.length === 0 && validation.warnings.length === 0 && (
                    <Alert>
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        Template is valid and ready for processing.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Structure Overview */}
            {structureLoading ? (
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-muted animate-pulse rounded" />
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ) : templateStructure && (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Layers className="h-4 w-4" />
                      Sheets
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {Object.keys(templateStructure.sheets).length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {Object.keys(templateStructure.sheets).join(', ')}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Settings className="h-4 w-4 text-blue-600" />
                      Input Fields
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {Object.keys(templateStructure.input_fields).length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      User input cells
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4 text-green-600" />
                      Output Fields
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {Object.keys(templateStructure.output_fields).length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Result cells
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Calculator className="h-4 w-4 text-purple-600" />
                      Formulas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {Object.keys(templateStructure.formulas).length}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Calculation cells
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="inputs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Input Fields</CardTitle>
                <CardDescription>
                  Fields marked with yellow background or IN_ prefix for user input
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templateStructure && Object.keys(templateStructure.input_fields).length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(templateStructure.input_fields).map(([cellRef, cellInfo]) =>
                      renderInputField(cellRef, cellInfo)
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No input fields detected in this template.</p>
                    <p className="text-sm">Mark cells with yellow background or IN_ prefix to create inputs.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="outputs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Output Fields</CardTitle>
                <CardDescription>
                  Fields marked with green background or OUT_ prefix for displaying results
                </CardDescription>
              </CardHeader>
              <CardContent>
                {templateStructure && Object.keys(templateStructure.output_fields).length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(templateStructure.output_fields).map(([cellRef, cellInfo]) =>
                      renderOutputField(cellRef, cellInfo)
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No output fields detected in this template.</p>
                    <p className="text-sm">Mark cells with green background or OUT_ prefix to create outputs.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="process" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Process Template
                </CardTitle>
                <CardDescription>
                  Enter input values and process the template to see calculated results
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {templateStructure && Object.keys(templateStructure.input_fields).length > 0 ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {Object.entries(templateStructure.input_fields).map(([cellRef, cellInfo]) =>
                        renderInputField(cellRef, cellInfo)
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleProcessTemplate}
                        disabled={processTemplateMutation.isPending || Object.keys(inputValues).length === 0}
                      >
                        {processTemplateMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Play className="h-4 w-4 mr-2" />
                        )}
                        Process Template
                      </Button>
                      <Button variant="outline" onClick={() => setInputValues({})}>
                        Clear Inputs
                      </Button>
                    </div>

                    {processTemplateMutation.data && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            Results
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {processTemplateMutation.data.success ? (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {Object.entries(templateStructure.output_fields).map(([cellRef, cellInfo]) =>
                                renderOutputField(cellRef, cellInfo, processTemplateMutation.data.results?.[cellRef])
                              )}
                            </div>
                          ) : (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                {processTemplateMutation.data.error}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {processTemplateMutation.error && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          {processTemplateMutation.error.message}
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No input fields available for processing.</p>
                    <p className="text-sm">Add input fields to your template to enable processing.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}