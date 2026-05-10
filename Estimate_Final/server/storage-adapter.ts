import { storage, IStorage } from "./storage";
import { ExcelService } from "./services/excel-service";
import { SSRService } from "./services/ssr-service";
import { TemplateService } from "./services/template-service";
import { ProjectService } from "./services/project-service";
import { MeasurementService } from "./services/measurement-service";
import { AnalysisService } from "./services/analysis-service";
import { DynamicTemplateService } from "./services/dynamic-template-service";

/**
 * Enhanced Storage Adapter that integrates new GEstimator services
 * with existing storage system without breaking compatibility
 */
export class EnhancedStorageAdapter {
  private originalStorage: IStorage;
  private excelService: ExcelService;
  private ssrService: SSRService;
  private templateService: TemplateService;
  private projectService: ProjectService;
  private measurementService: MeasurementService;
  private analysisService: AnalysisService;
  private dynamicTemplateService: DynamicTemplateService;

  constructor() {
    this.originalStorage = storage;
    
    // Initialize new services
    this.excelService = new ExcelService();
    this.ssrService = new SSRService();
    this.templateService = new TemplateService();
    this.projectService = new ProjectService();
    this.measurementService = new MeasurementService();
    this.analysisService = new AnalysisService();
    this.dynamicTemplateService = new DynamicTemplateService();
    
    this.initializeIntegration();
  }

  private async initializeIntegration() {
    // Migrate existing SSR items to new SSR service
    try {
      const existingSSRItems = await this.originalStorage.getAllSSRItems();
      
      if (existingSSRItems.length > 0) {
        const ssrItemsForImport = existingSSRItems.map(item => ({
          code: item.code,
          description: item.description,
          unit: item.unit,
          rate: parseFloat(item.rate.replace(/,/g, '')),
          year: new Date().getFullYear(),
          category: item.category || 'General',
          region: '',
          source: 'Migrated'
        }));

        await this.ssrService.importSSRItems(ssrItemsForImport);
        console.log(`Migrated ${existingSSRItems.length} SSR items to new service`);
      }
    } catch (error) {
      console.error('Error migrating SSR items:', error);
    }
  }

  // Expose original storage methods for backward compatibility
  get original() {
    return this.originalStorage;
  }

  // Expose new services
  get excel() {
    return this.excelService;
  }

  get ssr() {
    return this.ssrService;
  }

  get templates() {
    return this.templateService;
  }

  get projects() {
    return this.projectService;
  }

  get measurements() {
    return this.measurementService;
  }

  get analysis() {
    return this.analysisService;
  }

  get dynamicTemplates() {
    return this.dynamicTemplateService;
  }

  /**
   * Enhanced SSR search with fuzzy matching
   */
  async searchSSRItems(query: string, options: {
    threshold?: number;
    limit?: number;
    category?: string;
    year?: number;
  } = {}) {
    try {
      // Try new SSR service first
      const newResults = await this.ssrService.searchSSRItems(query, options);
      if (newResults.length > 0) {
        return newResults;
      }

      // Fallback to original storage with simple filtering
      const allItems = await this.originalStorage.getAllSSRItems();
      const filtered = allItems.filter(item => 
        item.code.toLowerCase().includes(query.toLowerCase()) ||
        item.description.toLowerCase().includes(query.toLowerCase())
      );

      return filtered.map(item => ({
        ...item,
        rate: parseFloat(item.rate.replace(/,/g, '')),
        year: new Date().getFullYear(),
        region: '',
        source: 'Original',
        similarity: 1.0
      }));
    } catch (error) {
      console.error('Error searching SSR items:', error);
      return [];
    }
  }

  /**
   * Enhanced Excel import with SSR matching
   */
  async importExcelWithSSRMatching(buffer: Buffer, filename: string, options: {
    sheetName?: string;
    enableSSRMatching?: boolean;
    ssrThreshold?: number;
  } = {}) {
    try {
      // Analyze Excel file
      const analysis = await this.excelService.analyzeExcelFile(buffer, filename);
      
      if (!analysis.success) {
        return { success: false, errors: analysis.errors };
      }

      // Preview import
      const previewItems = await this.excelService.previewImport(
        buffer, 
        options.sheetName || analysis.recommendedSheet
      );

      // Apply SSR matching if enabled
      if (options.enableSSRMatching) {
        const matchResult = await this.ssrService.matchImportedItemsToSSR(previewItems, {
          threshold: options.ssrThreshold || 0.75,
          autoApplyBestMatch: true
        });

        return {
          success: true,
          analysis,
          items: matchResult.matches,
          statistics: matchResult.statistics
        };
      }

      return {
        success: true,
        analysis,
        items: previewItems
      };
    } catch (error) {
      console.error('Error importing Excel with SSR matching:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create project from Excel import
   */
  async createProjectFromExcel(
    buffer: Buffer, 
    filename: string, 
    projectData: {
      name: string;
      description?: string;
      location?: string;
      client?: string;
    },
    options: {
      sheetName?: string;
      selectedRows?: number[];
      enableSSRMatching?: boolean;
    } = {}
  ) {
    try {
      // Import Excel data
      const importResult = await this.importExcelWithSSRMatching(buffer, filename, {
        sheetName: options.sheetName,
        enableSSRMatching: options.enableSSRMatching
      });

      if (!importResult.success) {
        return importResult;
      }

      // Filter selected items
      let selectedItems = importResult.items;
      if (options.selectedRows && options.selectedRows.length > 0) {
        selectedItems = importResult.items.filter(item => 
          options.selectedRows!.includes(item.rowNumber)
        );
      }

      // Convert to schedule items
      const scheduleItems = this.excelService.convertToScheduleItems(selectedItems);

      // Create project
      const projectId = await this.projectService.createProject({
        name: projectData.name,
        description: projectData.description || '',
        location: projectData.location || '',
        client: projectData.client || '',
        contractor: '',
        engineer: '',
        totalAmount: 0,
        scheduleItems: [],
        settings: {
          importedFrom: filename,
          importDate: new Date().toISOString()
        }
      });

      // Add schedule items to project
      const itemIds = await this.projectService.addScheduleItems(projectId, scheduleItems);

      return {
        success: true,
        projectId,
        itemsImported: itemIds.length,
        importStatistics: importResult.statistics
      };
    } catch (error) {
      console.error('Error creating project from Excel:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get comprehensive dashboard statistics
   */
  async getDashboardStatistics() {
    try {
      const [
        originalEstimates,
        originalSSRItems,
        projects,
        templates,
        ssrStats,
        measurementTemplates,
        dynamicTemplates
      ] = await Promise.all([
        this.originalStorage.getAllEstimates(),
        this.originalStorage.getAllSSRItems(),
        this.projectService.getAllProjects(),
        this.templateService.getStatistics(),
        this.ssrService.getStatistics(),
        this.measurementService.getTemplates(),
        this.dynamicTemplateService.scanForTemplates()
      ]);

      return {
        legacy: {
          estimates: originalEstimates.length,
          ssrItems: originalSSRItems.length
        },
        projects: {
          totalProjects: projects.length,
          totalValue: projects.reduce((sum, p) => sum + p.totalAmount, 0)
        },
        templates: templates,
        ssr: ssrStats,
        measurements: {
          templatesCount: measurementTemplates.length
        },
        dynamicTemplates: {
          templatesCount: dynamicTemplates.length
        },
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting dashboard statistics:', error);
      return {
        legacy: { estimates: 0, ssrItems: 0 },
        projects: { totalProjects: 0, totalValue: 0 },
        templates: { totalTemplates: 0, categoriesCount: 0, totalItems: 0, averageItemsPerTemplate: 0 },
        ssr: { totalItems: 0, categoriesCount: 0, yearsCount: 0, averageRate: 0 },
        measurements: { templatesCount: 0 },
        dynamicTemplates: { templatesCount: 0 },
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Export project to Excel with professional formatting
   */
  async exportProjectToExcel(projectId: string, options: {
    includeAnalysis?: boolean;
    includeMeasurements?: boolean;
    template?: string;
  } = {}) {
    try {
      const project = await this.projectService.getProjectById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      return await this.excelService.exportToExcel(
        project.scheduleItems,
        {
          name: project.name,
          location: project.location,
          client: project.client,
          contractor: project.contractor,
          engineer: project.engineer
        },
        options
      );
    } catch (error) {
      console.error('Error exporting project to Excel:', error);
      throw error;
    }
  }

  /**
   * Migrate existing estimate to new project format
   */
  async migrateEstimateToProject(estimateId: string) {
    try {
      const estimate = await this.originalStorage.getEstimate(estimateId);
      if (!estimate) {
        throw new Error('Estimate not found');
      }

      // Create new project from estimate
      const projectId = await this.projectService.createProject({
        name: estimate.projectName,
        description: `Migrated from estimate ${estimateId}`,
        location: estimate.location || '',
        client: '',
        contractor: '',
        engineer: estimate.engineerName || '',
        totalAmount: 0,
        scheduleItems: [],
        settings: {
          migratedFrom: estimateId,
          migrationDate: new Date().toISOString(),
          originalReferenceNumber: estimate.referenceNumber
        }
      });

      return { success: true, projectId };
    } catch (error) {
      console.error('Error migrating estimate to project:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Create singleton instance
export const enhancedStorage = new EnhancedStorageAdapter();