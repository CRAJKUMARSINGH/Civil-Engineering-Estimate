import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calculator, 
  FileSpreadsheet, 
  FolderOpen, 
  Upload, 
  Database,
  TrendingUp,
  Building,
  FileText,
  Search,
  Plus,
  Zap,
  ArrowRight,
  BarChart3,
  Users,
  Clock
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface EnhancedStats {
  legacy: {
    estimates: number;
    ssrItems: number;
  };
  projects: {
    totalProjects: number;
    totalValue: number;
  };
  templates: {
    totalTemplates: number;
    categoriesCount: number;
    totalItems: number;
    averageItemsPerTemplate: number;
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
  lastUpdated: string;
}

interface Estimate {
  id: string;
  projectName: string;
  location: string;
  status: string;
  dateCreated: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  location: string;
  client: string;
  totalAmount: number;
  settings: {
    itemCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export default function EnhancedDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch enhanced dashboard statistics
  const { data: enhancedStats, isLoading: statsLoading } = useQuery<EnhancedStats>({
    queryKey: ["/api/dashboard/enhanced-stats"],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/enhanced-stats');
      if (!response.ok) throw new Error('Failed to fetch enhanced stats');
      return response.json();
    },
  });

  // Fetch legacy estimates
  const { data: estimates } = useQuery<Estimate[]>({
    queryKey: ["/api/estimates"],
  });

  // Fetch new projects
  const { data: projects } = useQuery<Project[]>({
    queryKey: ["/api/estimator/projects"],
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const migrateEstimate = async (estimateId: string) => {
    try {
      const response = await fetch(`/api/estimates/${estimateId}/migrate`, {
        method: 'POST',
      });
      
      if (!response.ok) throw new Error('Migration failed');
      
      const result = await response.json();
      if (result.success) {
        alert(`Successfully migrated estimate to project ${result.projectId}`);
        // Refresh data
        window.location.reload();
      }
    } catch (error) {
      console.error('Migration error:', error);
      alert('Failed to migrate estimate');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enhanced GEstimator Dashboard</h1>
          <p className="text-muted-foreground">
            Unified view of legacy estimates and new project system
          </p>
        </div>
        <div className="flex gap-2">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Excel
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="migration">Migration</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Enhanced Statistics Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Legacy System</CardTitle>
                <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {statsLoading ? "..." : (enhancedStats?.legacy.estimates || 0) + (enhancedStats?.legacy.ssrItems || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {enhancedStats?.legacy.estimates || 0} estimates, {enhancedStats?.legacy.ssrItems || 0} SSR items
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Projects</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {statsLoading ? "..." : enhancedStats?.projects.totalProjects || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(enhancedStats?.projects.totalValue || 0)} total value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enhanced SSR</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {statsLoading ? "..." : enhancedStats?.ssr.totalItems || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {enhancedStats?.ssr.categoriesCount || 0} categories, fuzzy search enabled
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {statsLoading ? "..." : 
                    (enhancedStats?.templates.totalTemplates || 0) + 
                    (enhancedStats?.measurements.templatesCount || 0) + 
                    (enhancedStats?.dynamicTemplates.templatesCount || 0)
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Static, measurement & dynamic templates
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Comparison */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  Legacy Estimates
                </CardTitle>
                <CardDescription>
                  Your existing estimates in the original system
                </CardDescription>
              </CardHeader>
              <CardContent>
                {estimates && estimates.length > 0 ? (
                  <div className="space-y-3">
                    {estimates.slice(0, 3).map((estimate) => (
                      <div key={estimate.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{estimate.projectName}</div>
                          <div className="text-sm text-muted-foreground">
                            {estimate.location} • {formatDate(estimate.dateCreated)}
                          </div>
                        </div>
                        <Badge variant={estimate.status === 'draft' ? 'secondary' : 'default'}>
                          {estimate.status}
                        </Badge>
                      </div>
                    ))}
                    {estimates.length > 3 && (
                      <div className="text-center text-sm text-muted-foreground">
                        +{estimates.length - 3} more estimates
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No legacy estimates found</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-green-600" />
                  New Projects
                </CardTitle>
                <CardDescription>
                  Enhanced projects with measurements and analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {projects && projects.length > 0 ? (
                  <div className="space-y-3">
                    {projects.slice(0, 3).map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{project.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {project.location} • {project.settings.itemCount} items
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            {formatCurrency(project.totalAmount)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {projects.length > 3 && (
                      <div className="text-center text-sm text-muted-foreground">
                        +{projects.length - 3} more projects
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Building className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No new projects yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  New Project
                </CardTitle>
                <CardDescription>
                  Create a new project with enhanced features
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Smart Import
                </CardTitle>
                <CardDescription>
                  Import Excel with SSR matching and validation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Enhanced SSR
                </CardTitle>
                <CardDescription>
                  Search SSR database with fuzzy matching
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Dynamic Templates
                </CardTitle>
                <CardDescription>
                  Process Excel templates with formulas
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="migration" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRight className="h-5 w-5" />
                System Migration
              </CardTitle>
              <CardDescription>
                Migrate your legacy estimates to the new enhanced project system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-medium">Legacy Estimates</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {enhancedStats?.legacy.estimates || 0}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-8 w-8 text-muted-foreground" />
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <Building className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <div className="font-medium">Enhanced Projects</div>
                    <div className="text-2xl font-bold text-green-600">
                      {enhancedStats?.projects.totalProjects || 0}
                    </div>
                  </div>
                </div>

                {estimates && estimates.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium">Available for Migration</h3>
                    {estimates.map((estimate) => (
                      <div key={estimate.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{estimate.projectName}</div>
                          <div className="text-sm text-muted-foreground">
                            {estimate.location} • Created {formatDate(estimate.dateCreated)}
                          </div>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => migrateEstimate(estimate.id)}
                        >
                          <ArrowRight className="h-4 w-4 mr-1" />
                          Migrate
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Migration Benefits</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Enhanced measurement templates with calculations</li>
                    <li>• Detailed rate analysis with cost breakdown</li>
                    <li>• Professional Excel export with formatting</li>
                    <li>• SSR integration with fuzzy matching</li>
                    <li>• Template system for reusable estimates</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  System Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Legacy Estimates</span>
                    <span className="font-medium">{enhancedStats?.legacy.estimates || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>New Projects</span>
                    <span className="font-medium">{enhancedStats?.projects.totalProjects || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>SSR Items</span>
                    <span className="font-medium">{enhancedStats?.ssr.totalItems || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Templates</span>
                    <span className="font-medium">
                      {(enhancedStats?.templates.totalTemplates || 0) + 
                       (enhancedStats?.measurements.templatesCount || 0) + 
                       (enhancedStats?.dynamicTemplates.templatesCount || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Value Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Total Project Value</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(enhancedStats?.projects.totalValue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Average SSR Rate</span>
                    <span className="font-medium">
                      {formatCurrency(enhancedStats?.ssr.averageRate || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>SSR Categories</span>
                    <span className="font-medium">{enhancedStats?.ssr.categoriesCount || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Template Items</span>
                    <span className="font-medium">{enhancedStats?.templates.totalItems || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Measurement Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Built-in calculation templates for common construction measurements
                </p>
                <ul className="text-sm space-y-1">
                  <li>• NLBH (No × Length × Breadth × Height)</li>
                  <li>• Steel Table with weight calculations</li>
                  <li>• HVAC ducting calculations</li>
                  <li>• Electrical points counting</li>
                  <li>• Custom formula support</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Rate Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Hierarchical cost breakdown with intelligent categorization
                </p>
                <ul className="text-sm space-y-1">
                  <li>• Material/Labour/Equipment detection</li>
                  <li>• Overhead and profit calculations</li>
                  <li>• Visual cost distribution</li>
                  <li>• Export to Excel with formatting</li>
                  <li>• Historical rate comparison</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-600" />
                  Dynamic Templates
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Process Excel templates with preserved formulas and dependencies
                </p>
                <ul className="text-sm space-y-1">
                  <li>• Formula dependency tracking</li>
                  <li>• Input/output cell detection</li>
                  <li>• Hot reload for template changes</li>
                  <li>• Template validation</li>
                  <li>• Circular dependency detection</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-purple-600" />
                  Enhanced SSR Search
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Intelligent search with fuzzy matching and auto-suggestions
                </p>
                <ul className="text-sm space-y-1">
                  <li>• 90% accuracy fuzzy matching</li>
                  <li>• Typo-tolerant search</li>
                  <li>• Category and year filtering</li>
                  <li>• Similarity scoring</li>
                  <li>• Automatic rate suggestions</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                  Professional Export
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Multi-sheet Excel export with professional formatting
                </p>
                <ul className="text-sm space-y-1">
                  <li>• Schedule with calculations</li>
                  <li>• Rate analysis breakdown</li>
                  <li>• Measurement details</li>
                  <li>• Professional formatting</li>
                  <li>• Company branding support</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-teal-600" />
                  System Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Seamless bridge between legacy and new systems
                </p>
                <ul className="text-sm space-y-1">
                  <li>• One-click estimate migration</li>
                  <li>• Data compatibility maintained</li>
                  <li>• Gradual system transition</li>
                  <li>• Enhanced feature adoption</li>
                  <li>• Unified dashboard view</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}