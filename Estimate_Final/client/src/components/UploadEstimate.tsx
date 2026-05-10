import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileSpreadsheet, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useLocation } from "wouter";

export function UploadEstimate() {
  const [file, setFile] = useState<File | null>(null);
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [engineerName, setEngineerName] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      
      return api.uploadExcel(file, {
        projectName: projectName || file.name.replace(/\.(xlsx|xls)$/i, ''),
        location,
        engineerName,
        referenceNumber,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Estimate Created",
        description: `${data.estimate.projectName} has been uploaded and processed successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/estimates'] });
      setFile(null);
      setProjectName("");
      setLocation("");
      setEngineerName("");
      setReferenceNumber("");
      
      // Navigate to the estimate editor page with the new estimate ID
      navigate(`/estimate/${data.estimate.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload the file. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const uploadedFile = acceptedFiles[0];
      setFile(uploadedFile);
      if (!projectName) {
        setProjectName(uploadedFile.name.replace(/\.(xlsx|xls)$/i, ''));
      }
    }
  }, [projectName]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    maxFiles: 1,
  });

  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate();
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Estimate</CardTitle>
        <CardDescription>Upload an Excel file to create a new estimate</CardDescription>
      </CardHeader>
      <CardContent>
        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-md p-8 text-center cursor-pointer hover-elevate ${
              isDragActive ? 'border-primary bg-accent' : 'border-border'
            }`}
            data-testid="dropzone-upload"
          >
            <input {...getInputProps()} data-testid="input-file" />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium mb-2">
              {isDragActive ? 'Drop the file here' : 'Drag & drop an Excel file here'}
            </p>
            <p className="text-sm text-muted-foreground mb-4">or</p>
            <Button type="button" variant="secondary" data-testid="button-browse">
              Browse Files
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Supported formats: .xlsx, .xls
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-md">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-sm" data-testid="text-filename">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={removeFile}
                data-testid="button-remove-file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4 p-4 border rounded-md bg-muted/30">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  data-testid="input-project-name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g., Mumbai"
                    data-testid="input-location"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="engineerName">Engineer Name</Label>
                  <Input
                    id="engineerName"
                    value={engineerName}
                    onChange={(e) => setEngineerName(e.target.value)}
                    placeholder="Enter engineer name"
                    data-testid="input-engineer"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="referenceNumber">Reference Number</Label>
                <Input
                  id="referenceNumber"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="e.g., EST-2025-001"
                  data-testid="input-reference"
                />
              </div>
            </div>
            
            <Button 
              onClick={handleUpload} 
              className="w-full" 
              data-testid="button-upload"
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Process Estimate'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}