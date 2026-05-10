import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Calculator, 
  Edit, 
  Trash2, 
  Save,
  FileText,
  Ruler,
  Settings
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface MeasurementTemplate {
  id: string;
  name: string;
  captions: string[];
  columntypes: number[];
  dimensions: [number[], boolean[]];
  user_data_default: string[];
}

interface MeasurementItem {
  id: string;
  type: 'heading' | 'custom' | 'abstract';
  item_nos: string[];
  records: number[][];
  remark: string;
  total: number;
  template_data?: any;
}

interface Measurement {
  id: string;
  caption: string;
  items: MeasurementItem[];
}

interface MeasurementEditorProps {
  scheduleItemId: string;
  scheduleItemCode: string;
  scheduleItemDescription: string;
  onClose?: () => void;
}

export default function MeasurementEditor({ 
  scheduleItemId, 
  scheduleItemCode, 
  scheduleItemDescription,
  onClose 
}: MeasurementEditorProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [newMeasurementCaption, setNewMeasurementCaption] = useState("");
  const [isAddMeasurementOpen, setIsAddMeasurementOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<{ measurementId: string; item?: MeasurementItem } | null>(null);
  const [itemFormData, setItemFormData] = useState<Record<string, any>>({});

  const queryClient = useQueryClient();

  // Fetch measurement templates
  const { data: templates } = useQuery<MeasurementTemplate[]>({
    queryKey: ["/api/estimator/measurements/templates"],
  });

  // Fetch measurements for this schedule item
  const { data: measurements, isLoading } = useQuery<Measurement[]>({
    queryKey: ["/api/estimator/measurements/schedule", scheduleItemId],
    queryFn: async () => {
      const response = await fetch(`/api/estimator/measurements/schedule/${scheduleItemId}`);
      if (!response.ok) throw new Error('Failed to fetch measurements');
      return response.json();
    },
  });

  // Fetch measurement totals
  const { data: totals } = useQuery({
    queryKey: ["/api/estimator/measurements/calculate", scheduleItemId],
    queryFn: async () => {
      const response = await fetch(`/api/estimator/measurements/calculate/${scheduleItemId}`);
      if (!response.ok) throw new Error('Failed to calculate totals');
      return response.json();
    },
  });

  // Create measurement mutation
  const createMeasurementMutation = useMutation({
    mutationFn: async (caption: string) => {
      const response = await fetch('/api/estimator/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleItemId, caption }),
      });
      if (!response.ok) throw new Error('Failed to create measurement');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimator/measurements/schedule", scheduleItemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimator/measurements/calculate", scheduleItemId] });
      setNewMeasurementCaption("");
      setIsAddMeasurementOpen(false);
    },
  });

  // Add measurement item mutation
  const addItemMutation = useMutation({
    mutationFn: async ({ measurementId, type, data }: { measurementId: string; type: string; data: any }) => {
      const response = await fetch(`/api/estimator/measurements/${measurementId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data }),
      });
      if (!response.ok) throw new Error('Failed to add measurement item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimator/measurements/schedule", scheduleItemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimator/measurements/calculate", scheduleItemId] });
      setEditingItem(null);
      setItemFormData({});
    },
  });

  const handleCreateMeasurement = () => {
    if (newMeasurementCaption.trim()) {
      createMeasurementMutation.mutate(newMeasurementCaption);
    }
  };

  const handleAddHeading = (measurementId: string) => {
    const heading = prompt("Enter heading text:");
    if (heading) {
      addItemMutation.mutate({
        measurementId,
        type: 'heading',
        data: { remark: heading }
      });
    }
  };

  const handleAddCustomItem = (measurementId: string, templateId: string) => {
    setEditingItem({ measurementId });
    setSelectedTemplate(templateId);
    
    // Initialize form data based on template
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      const initialData: Record<string, any> = {};
      template.captions.forEach((caption, index) => {
        initialData[`field_${index}`] = template.user_data_default[index] || '';
      });
      setItemFormData(initialData);
    }
  };

  const handleSaveCustomItem = () => {
    if (!editingItem || !selectedTemplate) return;

    const template = templates?.find(t => t.id === selectedTemplate);
    if (!template) return;

    // Convert form data to measurement item format
    const values = template.captions.map((_, index) => itemFormData[`field_${index}`] || '');
    
    addItemMutation.mutate({
      measurementId: editingItem.measurementId,
      type: 'custom',
      data: {
        template_data: {
          templateId: selectedTemplate,
          values
        }
      }
    });
  };

  const renderMeasurementItem = (item: MeasurementItem, measurementId: string) => {
    if (item.type === 'heading') {
      return (
        <div className="bg-muted p-3 rounded font-semibold">
          <FileText className="h-4 w-4 inline mr-2" />
          {item.remark}
        </div>
      );
    }

    if (item.type === 'custom' && item.template_data) {
      const template = templates?.find(t => t.id === item.template_data.templateId);
      if (template) {
        return (
          <div className="border rounded p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium">{template.name}</h4>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm">
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
              {template.captions.map((caption, index) => (
                <div key={index}>
                  <span className="text-muted-foreground">{caption}:</span>
                  <span className="ml-1 font-mono">
                    {item.template_data.values?.[index] || '-'}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-2 pt-2 border-t">
              <span className="text-sm font-medium">Total: </span>
              <span className="font-mono text-lg">{item.total.toFixed(3)}</span>
            </div>
          </div>
        );
      }
    }

    return (
      <div className="border rounded p-3">
        <div className="text-sm text-muted-foreground">
          {item.type} - Total: {item.total.toFixed(3)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Measurements</h2>
          <p className="text-muted-foreground">
            {scheduleItemCode} - {scheduleItemDescription}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddMeasurementOpen} onOpenChange={setIsAddMeasurementOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Measurement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Measurement</DialogTitle>
                <DialogDescription>
                  Create a new measurement group for this schedule item.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="caption">Measurement Caption</Label>
                  <Input
                    id="caption"
                    value={newMeasurementCaption}
                    onChange={(e) => setNewMeasurementCaption(e.target.value)}
                    placeholder="Enter measurement caption"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddMeasurementOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateMeasurement}
                    disabled={!newMeasurementCaption.trim() || createMeasurementMutation.isPending}
                  >
                    {createMeasurementMutation.isPending ? "Creating..." : "Create"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          {onClose && (
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      {totals && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Measurement Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {totals.totalQuantity.toFixed(3)}
                </div>
                <div className="text-sm text-muted-foreground">Total Quantity</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {totals.measurements?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Measurements</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {totals.measurements?.reduce((sum: number, m: any) => sum + m.items.length, 0) || 0}
                </div>
                <div className="text-sm text-muted-foreground">Total Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {templates?.length || 0}
                </div>
                <div className="text-sm text-muted-foreground">Templates Available</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Measurements */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-20 bg-muted animate-pulse rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : measurements && measurements.length > 0 ? (
        <div className="space-y-6">
          {measurements.map((measurement) => (
            <Card key={measurement.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Ruler className="h-5 w-5" />
                    {measurement.caption}
                  </span>
                  <div className="flex gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAddHeading(measurement.id)}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Heading
                    </Button>
                    <Select onValueChange={(templateId) => handleAddCustomItem(measurement.id, templateId)}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Add Item" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {measurement.items.map((item) => (
                    <div key={item.id}>
                      {renderMeasurementItem(item, measurement.id)}
                    </div>
                  ))}
                  
                  {measurement.items.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Ruler className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No measurement items yet. Add items using the buttons above.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Ruler className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No measurements found</h3>
            <p className="text-muted-foreground mb-4">
              Create measurements to calculate quantities for this schedule item.
            </p>
            <Button onClick={() => setIsAddMeasurementOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Measurement
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Custom Item Editor Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Measurement Item</DialogTitle>
            <DialogDescription>
              {selectedTemplate && templates?.find(t => t.id === selectedTemplate)?.name}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTemplate && templates && (
            <div className="space-y-4">
              {(() => {
                const template = templates.find(t => t.id === selectedTemplate);
                if (!template) return null;

                return (
                  <div className="grid grid-cols-2 gap-4">
                    {template.captions.map((caption, index) => (
                      <div key={index}>
                        <Label htmlFor={`field_${index}`}>{caption}</Label>
                        <Input
                          id={`field_${index}`}
                          value={itemFormData[`field_${index}`] || ''}
                          onChange={(e) => setItemFormData(prev => ({
                            ...prev,
                            [`field_${index}`]: e.target.value
                          }))}
                          placeholder={`Enter ${caption.toLowerCase()}`}
                        />
                      </div>
                    ))}
                  </div>
                );
              })()}
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingItem(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveCustomItem}
                  disabled={addItemMutation.isPending}
                >
                  {addItemMutation.isPending ? "Adding..." : "Add Item"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}