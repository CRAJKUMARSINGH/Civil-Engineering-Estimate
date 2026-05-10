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
import { Progress } from "@/components/ui/progress";
import { 
  Plus, 
  Calculator, 
  Edit, 
  Trash2, 
  Save,
  FolderPlus,
  Package,
  TrendingUp,
  PieChart,
  Users,
  Wrench,
  Building
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface AnalysisItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  rate: number;
  quantity: number;
  amount: number;
  type: 'group' | 'resource' | 'sum';
  level: number;
  remarks?: string;
  resource_data?: {
    material_cost?: number;
    labour_cost?: number;
    equipment_cost?: number;
  };
}

interface RateAnalysis {
  schedule_item_id: string;
  total_rate: number;
  material_cost: number;
  labour_cost: number;
  equipment_cost: number;
  overhead_cost: number;
  profit_cost: number;
  items: AnalysisItem[];
}

interface AnalysisEditorProps {
  scheduleItemId: string;
  scheduleItemCode: string;
  scheduleItemDescription: string;
  onClose?: () => void;
}

export default function AnalysisEditor({ 
  scheduleItemId, 
  scheduleItemCode, 
  scheduleItemDescription,
  onClose 
}: AnalysisEditorProps) {
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
  const [groupData, setGroupData] = useState({ description: '', code: '', parentId: '' });
  const [resourceData, setResourceData] = useState({
    code: '',
    description: '',
    unit: 'Each',
    rate: 0,
    quantity: 1,
    parentId: '',
    remarks: ''
  });

  const queryClient = useQueryClient();

  // Fetch analysis items
  const { data: analysisItems, isLoading } = useQuery<AnalysisItem[]>({
    queryKey: ["/api/estimator/analysis", scheduleItemId],
    queryFn: async () => {
      const response = await fetch(`/api/estimator/analysis/${scheduleItemId}`);
      if (!response.ok) throw new Error('Failed to fetch analysis items');
      return response.json();
    },
  });

  // Fetch rate analysis
  const { data: rateAnalysis } = useQuery<RateAnalysis>({
    queryKey: ["/api/estimator/analysis", scheduleItemId, "calculate"],
    queryFn: async () => {
      const response = await fetch(`/api/estimator/analysis/${scheduleItemId}/calculate`);
      if (!response.ok) throw new Error('Failed to calculate rate analysis');
      return response.json();
    },
  });

  // Create analysis group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { description: string; code?: string; parentId?: string }) => {
      const response = await fetch('/api/estimator/analysis/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleItemId, ...data }),
      });
      if (!response.ok) throw new Error('Failed to create analysis group');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimator/analysis", scheduleItemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimator/analysis", scheduleItemId, "calculate"] });
      setGroupData({ description: '', code: '', parentId: '' });
      setIsAddGroupOpen(false);
    },
  });

  // Add resource item mutation
  const addResourceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch('/api/estimator/analysis/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleItemId, ...data }),
      });
      if (!response.ok) throw new Error('Failed to add resource item');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/estimator/analysis", scheduleItemId] });
      queryClient.invalidateQueries({ queryKey: ["/api/estimator/analysis", scheduleItemId, "calculate"] });
      setResourceData({
        code: '',
        description: '',
        unit: 'Each',
        rate: 0,
        quantity: 1,
        parentId: '',
        remarks: ''
      });
      setIsAddResourceOpen(false);
    },
  });

  const handleCreateGroup = () => {
    if (groupData.description.trim()) {
      createGroupMutation.mutate({
        description: groupData.description,
        code: groupData.code || undefined,
        parentId: groupData.parentId || undefined
      });
    }
  };

  const handleAddResource = () => {
    if (resourceData.description.trim()) {
      addResourceMutation.mutate({
        ...resourceData,
        parentId: resourceData.parentId || undefined
      });
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'group': return <FolderPlus className="h-4 w-4" />;
      case 'resource': return <Package className="h-4 w-4" />;
      case 'sum': return <Calculator className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getResourceTypeIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes('labour') || desc.includes('mason') || desc.includes('worker')) {
      return <Users className="h-4 w-4 text-blue-600" />;
    }
    if (desc.includes('equipment') || desc.includes('machinery') || desc.includes('tool')) {
      return <Wrench className="h-4 w-4 text-orange-600" />;
    }
    return <Building className="h-4 w-4 text-green-600" />;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const renderAnalysisItem = (item: AnalysisItem) => {
    const indentStyle = { paddingLeft: `${item.level * 20}px` };
    
    return (
      <TableRow key={item.id} className={item.type === 'group' ? 'bg-muted/50' : ''}>
        <TableCell style={indentStyle}>
          <div className="flex items-center gap-2">
            {getItemIcon(item.type)}
            {item.type === 'resource' && getResourceTypeIcon(item.description)}
            <span className={item.type === 'group' ? 'font-semibold' : ''}>{item.description}</span>
          </div>
        </TableCell>
        <TableCell className="font-mono text-sm">{item.code}</TableCell>
        <TableCell>{item.unit}</TableCell>
        <TableCell className="text-right font-mono">
          {item.type !== 'group' ? item.quantity.toFixed(3) : '-'}
        </TableCell>
        <TableCell className="text-right font-mono">
          {item.type !== 'group' ? formatCurrency(item.rate) : '-'}
        </TableCell>
        <TableCell className="text-right font-mono font-semibold">
          {item.type !== 'group' ? formatCurrency(item.amount) : '-'}
        </TableCell>
        <TableCell>
          <Badge variant={
            item.type === 'group' ? 'secondary' : 
            item.type === 'sum' ? 'default' : 'outline'
          }>
            {item.type}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rate Analysis</h2>
          <p className="text-muted-foreground">
            {scheduleItemCode} - {scheduleItemDescription}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FolderPlus className="h-4 w-4 mr-2" />
                Add Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Analysis Group</DialogTitle>
                <DialogDescription>
                  Create a new group to organize analysis items.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-description">Description *</Label>
                  <Input
                    id="group-description"
                    value={groupData.description}
                    onChange={(e) => setGroupData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., MATERIAL, LABOUR, EQUIPMENT"
                  />
                </div>
                <div>
                  <Label htmlFor="group-code">Code</Label>
                  <Input
                    id="group-code"
                    value={groupData.code}
                    onChange={(e) => setGroupData(prev => ({ ...prev, code: e.target.value }))}
                    placeholder="Optional group code"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddGroupOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreateGroup}
                    disabled={!groupData.description.trim() || createGroupMutation.isPending}
                  >
                    {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddResourceOpen} onOpenChange={setIsAddResourceOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Resource
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Resource Item</DialogTitle>
                <DialogDescription>
                  Add a material, labour, or equipment resource to the analysis.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="resource-code">Code *</Label>
                    <Input
                      id="resource-code"
                      value={resourceData.code}
                      onChange={(e) => setResourceData(prev => ({ ...prev, code: e.target.value }))}
                      placeholder="Resource code"
                    />
                  </div>
                  <div>
                    <Label htmlFor="resource-unit">Unit</Label>
                    <Select 
                      value={resourceData.unit} 
                      onValueChange={(value) => setResourceData(prev => ({ ...prev, unit: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Each">Each</SelectItem>
                        <SelectItem value="Cum">Cum</SelectItem>
                        <SelectItem value="Sqm">Sqm</SelectItem>
                        <SelectItem value="Kg">Kg</SelectItem>
                        <SelectItem value="Tonne">Tonne</SelectItem>
                        <SelectItem value="Day">Day</SelectItem>
                        <SelectItem value="Hour">Hour</SelectItem>
                        <SelectItem value="Ltr">Ltr</SelectItem>
                        <SelectItem value="Nos">Nos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="resource-description">Description *</Label>
                  <Input
                    id="resource-description"
                    value={resourceData.description}
                    onChange={(e) => setResourceData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Resource description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="resource-quantity">Quantity</Label>
                    <Input
                      id="resource-quantity"
                      type="number"
                      step="0.001"
                      value={resourceData.quantity}
                      onChange={(e) => setResourceData(prev => ({ ...prev, quantity: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="resource-rate">Rate (₹)</Label>
                    <Input
                      id="resource-rate"
                      type="number"
                      step="0.01"
                      value={resourceData.rate}
                      onChange={(e) => setResourceData(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="resource-remarks">Remarks</Label>
                  <Input
                    id="resource-remarks"
                    value={resourceData.remarks}
                    onChange={(e) => setResourceData(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Optional remarks"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddResourceOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleAddResource}
                    disabled={!resourceData.code.trim() || !resourceData.description.trim() || addResourceMutation.isPending}
                  >
                    {addResourceMutation.isPending ? "Adding..." : "Add Resource"}
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

      <Tabs defaultValue="analysis" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analysis">Analysis Items</TabsTrigger>
          <TabsTrigger value="summary">Rate Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-4">
          {/* Analysis Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Analysis Breakdown</CardTitle>
              <CardDescription>
                Detailed breakdown of materials, labour, and equipment costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : analysisItems && analysisItems.length > 0 ? (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Rate</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analysisItems.map(renderAnalysisItem)}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calculator className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No analysis items found</h3>
                  <p className="text-muted-foreground mb-4">
                    Start by adding groups and resources to build your rate analysis.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => setIsAddGroupOpen(true)}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      Add Group
                    </Button>
                    <Button onClick={() => setIsAddResourceOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Resource
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          {/* Rate Analysis Summary */}
          {rateAnalysis ? (
            <>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Building className="h-4 w-4 text-green-600" />
                      Material Cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(rateAnalysis.material_cost)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {rateAnalysis.total_rate > 0 ? 
                        `${((rateAnalysis.material_cost / rateAnalysis.total_rate) * 100).toFixed(1)}% of total` : 
                        '0% of total'
                      }
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      Labour Cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {formatCurrency(rateAnalysis.labour_cost)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {rateAnalysis.total_rate > 0 ? 
                        `${((rateAnalysis.labour_cost / rateAnalysis.total_rate) * 100).toFixed(1)}% of total` : 
                        '0% of total'
                      }
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-orange-600" />
                      Equipment Cost
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {formatCurrency(rateAnalysis.equipment_cost)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {rateAnalysis.total_rate > 0 ? 
                        `${((rateAnalysis.equipment_cost / rateAnalysis.total_rate) * 100).toFixed(1)}% of total` : 
                        '0% of total'
                      }
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      Total Rate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {formatCurrency(rateAnalysis.total_rate)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Per unit rate
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Cost Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Direct Costs</span>
                        <span>{formatCurrency(rateAnalysis.material_cost + rateAnalysis.labour_cost + rateAnalysis.equipment_cost)}</span>
                      </div>
                      <Progress 
                        value={((rateAnalysis.material_cost + rateAnalysis.labour_cost + rateAnalysis.equipment_cost) / rateAnalysis.total_rate) * 100} 
                        className="h-2" 
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Overhead (10%)</span>
                        <span>{formatCurrency(rateAnalysis.overhead_cost)}</span>
                      </div>
                      <Progress 
                        value={(rateAnalysis.overhead_cost / rateAnalysis.total_rate) * 100} 
                        className="h-2" 
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Profit (15%)</span>
                        <span>{formatCurrency(rateAnalysis.profit_cost)}</span>
                      </div>
                      <Progress 
                        value={(rateAnalysis.profit_cost / rateAnalysis.total_rate) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Calculator className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No rate analysis available</h3>
                <p className="text-muted-foreground">
                  Add analysis items to generate rate breakdown and cost summary.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}