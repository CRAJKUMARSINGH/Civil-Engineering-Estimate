import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

export function ProjectMetadataForm() {
  const handleSave = () => {
    console.log('Save project metadata');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Information</CardTitle>
        <CardDescription>Enter the basic details for this estimate</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                placeholder="Enter project name"
                defaultValue="Highway Construction Phase 1"
                data-testid="input-project-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="Enter location"
                defaultValue="Mumbai, Maharashtra"
                data-testid="input-location"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="engineerName">Engineer Name</Label>
              <Input
                id="engineerName"
                placeholder="Enter engineer name"
                defaultValue="Rajkumar Singh"
                data-testid="input-engineer-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referenceNumber">Reference Number</Label>
              <Input
                id="referenceNumber"
                placeholder="Enter reference number"
                defaultValue="EST-2025-001"
                data-testid="input-reference-number"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="secondary" data-testid="button-cancel">
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} data-testid="button-save">
              <Save className="h-4 w-4 mr-2" />
              Save Project
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
