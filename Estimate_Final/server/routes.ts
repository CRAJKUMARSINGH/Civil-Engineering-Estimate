import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { enhancedStorage } from "./storage-adapter";
import multer from "multer";
import { ExcelHandler } from "./excel-handler";
import { SSRFileHandler } from "./ssr-file-handler";
import { type SSRItem, type HierarchicalSSRItem } from "@shared/schema";
import { fromError } from "zod-validation-error";
import { 
  ProjectSchema, 
  ScheduleItemSchema, 
  TemplateSchema,
  ImportPreviewItemSchema,
  ExcelAnalysisSchema,
  SSRItemSchema
} from "./models/estimator";
import { createProxyMiddleware } from 'http-proxy-middleware';

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(app: Express): Promise<Server> {
  // SSR Items endpoints
  app.get("/api/ssr-items", async (req, res) => {
    try {
      const items = await storage.getAllSSRItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SSR items" });
    }
  });

  app.get("/api/ssr-items/:id", async (req, res) => {
    try {
      const item = await storage.getSSRItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "SSR item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SSR item" });
    }
  });

  app.get("/api/ssr-items/code/:code", async (req, res) => {
    try {
      const item = await storage.getSSRItemByCode(req.params.code);
      if (!item) {
        return res.status(404).json({ error: "SSR item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SSR item" });
    }
  });

  app.get("/api/ssr-items/category/:category", async (req, res) => {
    try {
      const items = await storage.getSSRItemsByCategory(req.params.category);
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SSR items by category" });
    }
  });

  app.post("/api/ssr-items", async (req, res) => {
    try {
      const result = SSRItemSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromError(result.error).toString() });
      }
      
      const item = await storage.createSSRItem(result.data);
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create SSR item" });
    }
  });

  // Hierarchical SSR Items endpoints
  app.get("/api/hierarchical-ssr-items", async (req, res) => {
    try {
      // This would require modifying the storage to support hierarchical items
      // For now, we'll transform regular SSR items to hierarchical format
      const items = await storage.getAllSSRItems();
      
      // Transform to hierarchical format (simplified for now)
      const hierarchicalItems: HierarchicalSSRItem[] = items.map(item => ({
        ...item,
        level: 0,
        fullDescription: item.description,
        hierarchy: [item.description],
        indentLevel: 0
      }));
      
      res.json(hierarchicalItems);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hierarchical SSR items" });
    }
  });

  app.get("/api/hierarchical-ssr-items/:id", async (req, res) => {
    try {
      const item = await storage.getSSRItem(req.params.id);
      if (!item) {
        return res.status(404).json({ error: "SSR item not found" });
      }
      
      // Transform to hierarchical format
      const hierarchicalItem: HierarchicalSSRItem = {
        ...item,
        level: 0,
        fullDescription: item.description,
        hierarchy: [item.description],
        indentLevel: 0
      };
      
      res.json(hierarchicalItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch hierarchical SSR item" });
    }
  });

  // SSR Files endpoints
  app.get("/api/ssr-files", async (req, res) => {
    try {
      const files = await storage.getAllSSRFiles();
      res.json(files);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SSR files" });
    }
  });

  app.get("/api/ssr-files/:id", async (req, res) => {
    try {
      const file = await storage.getSSRFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "SSR file not found" });
      }
      res.json(file);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch SSR file" });
    }
  });

  app.post("/api/ssr-files/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Validate file type
      if (!req.file.originalname.match(/\.(xlsx|xls)$/i)) {
        return res.status(400).json({ error: "Only Excel files (.xlsx, .xls) are allowed" });
      }

      // Validate file format
      const validation = SSRFileHandler.validateSSRFile(req.file.buffer);
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: "Invalid SSR file format", 
          details: validation.errors 
        });
      }

      // Parse the SSR file
      const ssrData = SSRFileHandler.parseSSRFile(req.file.buffer);
      
      // Save file to disk
      const filePath = SSRFileHandler.saveFile(req.file.buffer, req.file.originalname);

      // Create SSR file record
      const ssrFile = await storage.createSSRFile({
        fileName: req.file.originalname,
        originalName: req.file.originalname,
        fileSize: req.file.size,
        description: req.body.description || null,
        version: req.body.version || null,
        category: req.body.category || null,
        sheetNames: ssrData.sheetNames,
        itemsCount: ssrData.items.length,
        filePath: filePath,
        status: "active",
      });

      // Save all SSR items from the file
      const createdItems = await storage.createSSRItemsBatch(ssrData.items);

      res.status(201).json({
        file: ssrFile,
        itemsCreated: createdItems.length,
        itemsSkipped: ssrData.items.length - createdItems.length,
        metadata: ssrData.metadata,
        hierarchicalItems: ssrData.hierarchicalItems,
        message: `Successfully uploaded SSR file with ${createdItems.length} new items`
      });

    } catch (error) {
      console.error("SSR file upload error:", error);
      res.status(500).json({ error: "Failed to process SSR file" });
    }
  });

  app.get("/api/ssr-files/:id/download", async (req, res) => {
    try {
      const file = await storage.getSSRFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "SSR file not found" });
      }

      const fileInfo = SSRFileHandler.getFileInfo(file.filePath);
      if (!fileInfo.exists) {
        return res.status(404).json({ error: "Physical file not found" });
      }

      const buffer = SSRFileHandler.loadSSRFile(file.filePath);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);

    } catch (error) {
      console.error("SSR file download error:", error);
      res.status(500).json({ error: "Failed to download SSR file" });
    }
  });

  app.delete("/api/ssr-files/:id", async (req, res) => {
    try {
      const file = await storage.getSSRFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "SSR file not found" });
      }

      // Delete physical file
      SSRFileHandler.deleteSSRFile(file.filePath);

      // Delete from database
      const deleted = await storage.deleteSSRFile(req.params.id);
      
      if (deleted) {
        res.json({ message: "SSR file deleted successfully" });
      } else {
        res.status(500).json({ error: "Failed to delete SSR file" });
      }

    } catch (error) {
      console.error("SSR file deletion error:", error);
      res.status(500).json({ error: "Failed to delete SSR file" });
    }
  });

  app.get("/api/ssr-files/:id/export", async (req, res) => {
    try {
      const file = await storage.getSSRFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "SSR file not found" });
      }

      // Get all SSR items (you might want to filter by file or category)
      const allItems = await storage.getAllSSRItems();
      
      // Export to Excel
      const buffer = SSRFileHandler.exportToExcel(allItems, `${file.fileName}_export`);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${file.fileName}_export.xlsx"`);
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);

    } catch (error) {
      console.error("SSR file export error:", error);
      res.status(500).json({ error: "Failed to export SSR file" });
    }
  });

  // Building BSR Analysis endpoint
  app.get("/api/ssr-files/:id/analyze", async (req, res) => {
    try {
      const file = await storage.getSSRFile(req.params.id);
      if (!file) {
        return res.status(404).json({ error: "SSR file not found" });
      }

      const fileInfo = SSRFileHandler.getFileInfo(file.filePath);
      if (!fileInfo.exists) {
        return res.status(404).json({ error: "Physical file not found" });
      }

      const buffer = SSRFileHandler.loadSSRFile(file.filePath);
      
      // Parse with hierarchical detection
      const ssrData = SSRFileHandler.parseHierarchicalSSR(buffer);
      
      res.json({
        fileId: file.id,
        fileName: file.fileName,
        metadata: ssrData.metadata,
        sampleHierarchy: ssrData.hierarchicalItems.slice(0, 10), // First 10 items as sample
        message: "Building BSR analysis completed"
      });

    } catch (error) {
      console.error("SSR file analysis error:", error);
      res.status(500).json({ error: "Failed to analyze SSR file" });
    }
  });

  // Estimates endpoints
  app.get("/api/estimates", async (req, res) => {
    try {
      const estimates = await storage.getAllEstimates();
      res.json(estimates);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch estimates" });
    }
  });

  app.get("/api/estimates/:id", async (req, res) => {
    try {
      const estimate = await storage.getEstimate(req.params.id);
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }
      res.json(estimate);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch estimate" });
    }
  });

  app.post("/api/estimates", async (req, res) => {
    try {
      const result = insertEstimateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromError(result.error).toString() });
      }
      
      const estimate = await storage.createEstimate(result.data);
      res.status(201).json(estimate);
    } catch (error) {
      res.status(500).json({ error: "Failed to create estimate" });
    }
  });

  // Excel file upload and parsing
  app.post("/api/excel/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const excelData = ExcelHandler.parseExcelFile(req.file.buffer);
      const parts = ExcelHandler.findPartSheets(excelData.sheetNames);

      // Save the Excel file to disk for later retrieval
      const filePath = SSRFileHandler.saveFile(req.file.buffer, req.file.originalname);

      // Extract all sheet data
      const sheetsData: Record<string, any> = {};
      excelData.sheetNames.forEach(sheetName => {
        const sheetData = ExcelHandler.getSheetData(excelData.workbook, sheetName);
        sheetsData[sheetName] = sheetData;
      });

      // Create estimate with parsed data
      const estimate = await storage.createEstimate({
        projectName: req.body.projectName || "Untitled Project",
        location: req.body.location || "",
        engineerName: req.body.engineerName || "",
        referenceNumber: req.body.referenceNumber || "",
        status: "draft",
        fileName: req.file.originalname,
        excelData: {
          sheetNames: excelData.sheetNames,
          parts: parts,
          filePath: filePath,
          sheetsData: sheetsData,
        },
      });

      res.status(201).json({
        estimate,
        sheetNames: excelData.sheetNames,
        parts,
      });
    } catch (error) {
      console.error("Excel upload error:", error);
      res.status(500).json({ error: "Failed to process Excel file" });
    }
  });

  // Insert SSR item into Excel
  app.post("/api/excel/:estimateId/insert-ssr", async (req, res) => {
    try {
      const { estimateId } = req.params;
      const { ssrItemId, partNumber, insertAtRow } = req.body;

      if (!ssrItemId || partNumber === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get estimate and SSR item
      const estimate = await storage.getEstimate(estimateId);
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }

      const ssrItem = await storage.getSSRItem(ssrItemId);
      if (!ssrItem) {
        return res.status(404).json({ error: "SSR item not found" });
      }

      // Parse the Excel data from estimate
      if (!estimate.excelData) {
        return res.status(400).json({ error: "No Excel data found in estimate" });
      }

      const parts = (estimate.excelData as any).parts || [];
      const part = parts.find((p: any) => p.partNumber === partNumber);
      
      if (!part) {
        return res.status(404).json({ error: `Part ${partNumber} not found` });
      }

      // For this endpoint to fully work, we would need to store the actual Excel buffer
      // For now, return the information about what would be inserted
      res.json({
        message: "SSR item insertion prepared",
        ssrItem,
        part,
        serialNumberAssigned: insertAtRow || "auto",
        note: "Full Excel manipulation requires the original file buffer to be stored"
      });

    } catch (error) {
      console.error("SSR insertion error:", error);
      res.status(500).json({ error: "Failed to insert SSR item" });
    }
  });

  // Download Excel with SSR items
  app.get("/api/excel/:estimateId/download", async (req, res) => {
    try {
      const { estimateId } = req.params;
      const estimate = await storage.getEstimate(estimateId);
      
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }

      // For a complete implementation, we would:
      // 1. Retrieve the stored Excel buffer
      // 2. Apply all SSR insertions
      // 3. Return the modified file
      
      res.json({
        message: "Excel download endpoint",
        estimate,
        note: "Full implementation requires file storage system"
      });

    } catch (error) {
      console.error("Excel download error:", error);
      res.status(500).json({ error: "Failed to download Excel file" });
    }
  });

  // Get Excel sheet data for an estimate
  app.get("/api/estimates/:id/sheets/:sheetName", async (req, res) => {
    try {
      const { id: estimateId, sheetName } = req.params;
      
      const estimate = await storage.getEstimate(estimateId);
      if (!estimate) {
        return res.status(404).json({ error: "Estimate not found" });
      }

      const excelData = estimate.excelData as any;
      
      // Try to get data from stored sheets data first
      if (excelData?.sheetsData?.[sheetName]) {
        const sheetData = excelData.sheetsData[sheetName];
        
        // Convert array of objects to table format
        if (sheetData.length > 0) {
          const headers = Object.keys(sheetData[0]);
          const data = sheetData.map((row: any, index: number) => ({
            ...row,
            _rowIndex: index
          }));
          
          return res.json({
            sheetName,
            headers,
            data,
            metadata: {
              estimateId,
              sheetName,
              rowCount: data.length,
              lastModified: new Date().toISOString()
            }
          });
        }
      }

      // Try to load from file if available
      if (excelData?.filePath) {
        try {
          const buffer = SSRFileHandler.loadSSRFile(excelData.filePath);
          const workbook = ExcelHandler.parseExcelFile(buffer);
          const sheetData = ExcelHandler.getSheetData(workbook.workbook, sheetName);
          
          if (sheetData.length > 0) {
            const headers = Object.keys(sheetData[0]);
            const data = sheetData.map((row: any, index: number) => ({
              ...row,
              _rowIndex: index
            }));
            
            return res.json({
              sheetName,
              headers,
              data,
              metadata: {
                estimateId,
                sheetName,
                rowCount: data.length,
                lastModified: new Date().toISOString()
              }
            });
          }
        } catch (fileError) {
          console.error("Error loading Excel file:", fileError);
        }
      }

      // Fallback to mock data if no real data available
      const mockSheetData = {
        sheetName,
        headers: ["S.No", "Description", "Unit", "Quantity", "Rate", "Amount"],
        data: [
          {
            "S.No": 1,
            "Description": `Data from ${sheetName}`,
            "Unit": "cum",
            "Quantity": "0.00",
            "Rate": "0.00",
            "Amount": "0.00",
            _rowIndex: 0
          }
        ],
        metadata: {
          estimateId,
          sheetName,
          rowCount: 1,
          lastModified: new Date().toISOString(),
          note: "Mock data - original Excel file not found"
        }
      };

      res.json(mockSheetData);

    } catch (error) {
      console.error("Sheet data fetch error:", error);
      res.status(500).json({ error: "Failed to fetch sheet data" });
    }
  });

  // Test Building BSR file access
  app.get("/api/test-building-bsr", async (req, res) => {
    try {
      const filePath = "attached_assets/Building_BSR_2022 28.09.22_1762051625314.xlsx";
      const fs = require('fs');
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Building BSR file not found" });
      }

      const stats = fs.statSync(filePath);
      
      res.json({
        message: "Building BSR file found",
        filePath,
        fileSize: stats.size,
        lastModified: stats.mtime,
      });

    } catch (error: any) {
      console.error("Building BSR test error:", error);
      res.status(500).json({ error: "Failed to access Building BSR file", details: error.message });
    }
  });

  // Analyze Building BSR file structure
  app.get("/api/analyze-building-bsr", async (req, res) => {
    try {
      const filePath = "attached_assets/Building_BSR_2022 28.09.22_1762051625314.xlsx";
      const fs = require('fs');
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Building BSR file not found" });
      }

      // Try to parse it hierarchically
      const buffer = fs.readFileSync(filePath);
      const result = SSRFileHandler.parseHierarchicalSSR(buffer);
      
      res.json({
        message: "Building BSR analysis completed",
        metadata: result.metadata,
        sampleItems: result.hierarchicalItems.slice(0, 5), // First 5 items
        hierarchyLevels: result.metadata.maxLevel,
        hasHierarchy: result.metadata.hasHierarchy,
      });

    } catch (error) {
      console.error("Building BSR analysis error:", error);
      res.status(500).json({ 
        error: "Failed to analyze Building BSR file", 
        details: error.message,
        stack: error.stack 
      });
    }
  });

  // ========== ENHANCED ESTIMATOR API ROUTES (INTEGRATED) ==========

  // Enhanced SSR Search (extends existing SSR functionality)
  app.get("/api/ssr-items/search", async (req, res) => {
    try {
      const { query, threshold, limit, category, year } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const results = await enhancedStorage.searchSSRItems(query, {
        threshold: threshold ? parseFloat(threshold as string) : 0.6,
        limit: limit ? parseInt(limit as string) : 10,
        category: category as string,
        year: year ? parseInt(year as string) : undefined
      });
      
      res.json(results);
    } catch (error) {
      console.error("Enhanced SSR search error:", error);
      res.status(500).json({ error: "Failed to search SSR items" });
    }
  });

  // Enhanced Excel Import (integrates with existing Excel handling)
  app.post("/api/excel/enhanced-import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { sheetName, enableSSRMatching, ssrThreshold } = req.body;
      
      const result = await enhancedStorage.importExcelWithSSRMatching(req.file.buffer, req.file.originalname, {
        sheetName,
        enableSSRMatching: enableSSRMatching === 'true',
        ssrThreshold: parseFloat(ssrThreshold) || 0.75
      });
      
      res.json(result);
    } catch (error) {
      console.error("Enhanced Excel import error:", error);
      res.status(500).json({ error: "Failed to import Excel file" });
    }
  });

  // Create Project from Excel (new functionality)
  app.post("/api/projects/from-excel", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { projectName, description, location, client, sheetName, selectedRows, enableSSRMatching } = req.body;
      
      if (!projectName) {
        return res.status(400).json({ error: "Project name is required" });
      }

      const result = await enhancedStorage.createProjectFromExcel(
        req.file.buffer,
        req.file.originalname,
        { name: projectName, description, location, client },
        {
          sheetName,
          selectedRows: selectedRows ? JSON.parse(selectedRows) : undefined,
          enableSSRMatching: enableSSRMatching === 'true'
        }
      );
      
      res.json(result);
    } catch (error) {
      console.error("Create project from Excel error:", error);
      res.status(500).json({ error: "Failed to create project from Excel" });
    }
  });

  // Enhanced Dashboard Stats (extends existing functionality)
  app.get("/api/dashboard/enhanced-stats", async (req, res) => {
    try {
      const stats = await enhancedStorage.getDashboardStatistics();
      res.json(stats);
    } catch (error) {
      console.error("Enhanced dashboard stats error:", error);
      res.status(500).json({ error: "Failed to fetch enhanced dashboard statistics" });
    }
  });

  // Migrate Estimate to Project (bridge old and new systems)
  app.post("/api/estimates/:id/migrate", async (req, res) => {
    try {
      const result = await enhancedStorage.migrateEstimateToProject(req.params.id);
      res.json(result);
    } catch (error) {
      console.error("Migrate estimate error:", error);
      res.status(500).json({ error: "Failed to migrate estimate to project" });
    }
  });

  // Export Project to Excel (new functionality)
  app.get("/api/projects/:id/export", async (req, res) => {
    try {
      const { includeAnalysis, includeMeasurements, template } = req.query;
      
      const buffer = await enhancedStorage.exportProjectToExcel(req.params.id, {
        includeAnalysis: includeAnalysis === 'true',
        includeMeasurements: includeMeasurements === 'true',
        template: template as string
      });
      
      const filename = `project_${req.params.id}_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } catch (error) {
      console.error("Export project error:", error);
      res.status(500).json({ error: "Failed to export project" });
    }
  });

  // Excel Analysis and Import Routes
  app.post("/api/estimator/excel/analyze", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const analysis = await enhancedStorage.excel.analyzeExcelFile(req.file.buffer, req.file.originalname);
      res.json(analysis);
    } catch (error) {
      console.error("Excel analysis error:", error);
      res.status(500).json({ error: "Failed to analyze Excel file" });
    }
  });

  app.post("/api/estimator/excel/preview", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { sheetName } = req.body;
      const previewItems = await enhancedStorage.excel.previewImport(req.file.buffer, sheetName);
      
      // Apply SSR matching if requested
      if (req.body.enableSSRMatching) {
        const matchResult = await enhancedStorage.ssr.matchImportedItemsToSSR(previewItems, {
          threshold: parseFloat(req.body.ssrThreshold) || 0.75,
          autoApplyBestMatch: req.body.autoApplyBestMatch === 'true'
        });
        
        res.json({
          items: matchResult.matches,
          statistics: matchResult.statistics
        });
      } else {
        res.json({ items: previewItems });
      }
    } catch (error) {
      console.error("Excel preview error:", error);
      res.status(500).json({ error: "Failed to preview Excel import" });
    }
  });

  app.post("/api/estimator/excel/import", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { sheetName, selectedRows, projectId, saveAsTemplate, templateName } = req.body;
      
      // Get preview items
      const previewItems = await enhancedStorage.excel.previewImport(req.file.buffer, sheetName);
      
      // Filter selected items
      let selectedItems = previewItems;
      if (selectedRows && Array.isArray(selectedRows)) {
        selectedItems = previewItems.filter(item => selectedRows.includes(item.rowNumber));
      }
      
      // Convert to schedule items
      const scheduleItems = enhancedStorage.excel.convertToScheduleItems(selectedItems);
      
      // Add to project if specified
      if (projectId) {
        const itemIds = await enhancedStorage.projects.addScheduleItems(projectId, scheduleItems);
        
        if (saveAsTemplate && templateName) {
          await enhancedStorage.templates.saveItemsAsTemplate(
            scheduleItems,
            templateName,
            `Template created from ${req.file.originalname}`,
            'imported'
          );
        }
        
        res.json({
          success: true,
          itemsImported: itemIds.length,
          itemIds,
          templateSaved: saveAsTemplate && templateName
        });
      } else {
        // Return items for further processing
        res.json({
          success: true,
          items: scheduleItems,
          itemsCount: scheduleItems.length
        });
      }
    } catch (error) {
      console.error("Excel import error:", error);
      res.status(500).json({ error: "Failed to import Excel file" });
    }
  });

  // Project Management Routes
  app.get("/api/estimator/projects", async (req, res) => {
    try {
      const { search } = req.query;
      
      if (search && typeof search === 'string') {
        const projects = await enhancedStorage.projects.searchProjects(search);
        res.json(projects);
      } else {
        const projects = await enhancedStorage.projects.getAllProjects();
        res.json(projects);
      }
    } catch (error) {
      console.error("Projects fetch error:", error);
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/estimator/projects/:id", async (req, res) => {
    try {
      const project = await enhancedStorage.projects.getProjectById(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Project fetch error:", error);
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/estimator/projects", async (req, res) => {
    try {
      const result = ProjectSchema.omit({ id: true, createdAt: true, updatedAt: true }).safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: fromError(result.error).toString() });
      }
      
      const projectId = await projectService.createProject(result.data);
      const project = await projectService.getProjectById(projectId);
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Project creation error:", error);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.put("/api/estimator/projects/:id", async (req, res) => {
    try {
      const updates = ProjectSchema.partial().parse(req.body);
      const success = await projectService.updateProject(req.params.id, updates);
      
      if (success) {
        const project = await projectService.getProjectById(req.params.id);
        res.json(project);
      } else {
        res.status(404).json({ error: "Project not found" });
      }
    } catch (error) {
      console.error("Project update error:", error);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/estimator/projects/:id", async (req, res) => {
    try {
      const success = await projectService.deleteProject(req.params.id);
      if (success) {
        res.json({ message: "Project deleted successfully" });
      } else {
        res.status(404).json({ error: "Project not found" });
      }
    } catch (error) {
      console.error("Project deletion error:", error);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  app.post("/api/estimator/projects/:id/items", async (req, res) => {
    try {
      const items = ScheduleItemSchema.array().parse(req.body.items);
      const itemIds = await projectService.addScheduleItems(req.params.id, items);
      
      res.json({
        success: true,
        itemsAdded: itemIds.length,
        itemIds
      });
    } catch (error) {
      console.error("Add items error:", error);
      res.status(500).json({ error: "Failed to add items to project" });
    }
  });

  // Template Management Routes
  app.get("/api/estimator/templates", async (req, res) => {
    try {
      const { category, search } = req.query;
      
      if (search && typeof search === 'string') {
        const templates = await templateService.searchTemplates(search);
        res.json(templates);
      } else if (category && typeof category === 'string') {
        const templates = await templateService.getTemplatesByCategory(category);
        res.json(templates);
      } else {
        const templates = await templateService.getAllTemplates();
        res.json(templates);
      }
    } catch (error) {
      console.error("Templates fetch error:", error);
      res.status(500).json({ error: "Failed to fetch templates" });
    }
  });

  app.get("/api/estimator/templates/:id", async (req, res) => {
    try {
      const template = await templateService.getTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Template fetch error:", error);
      res.status(500).json({ error: "Failed to fetch template" });
    }
  });

  app.post("/api/estimator/templates", async (req, res) => {
    try {
      const { name, description, category, items } = req.body;
      
      if (!name || !items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Name and items are required" });
      }
      
      const scheduleItems = ScheduleItemSchema.array().parse(items);
      const result = await templateService.saveItemsAsTemplate(
        scheduleItems,
        name,
        description || '',
        category || 'general'
      );
      
      if (result.success) {
        const template = await templateService.getTemplateById(result.templateId!);
        res.status(201).json(template);
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Template creation error:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.post("/api/estimator/templates/:id/apply", async (req, res) => {
    try {
      const items = await templateService.createFromTemplate(req.params.id);
      res.json({ items });
    } catch (error) {
      console.error("Template apply error:", error);
      res.status(500).json({ error: "Failed to apply template" });
    }
  });

  app.post("/api/estimator/templates/:id/duplicate", async (req, res) => {
    try {
      const { name, description } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }
      
      const result = await templateService.duplicateTemplate(req.params.id, name, description);
      
      if (result.success) {
        const template = await templateService.getTemplateById(result.templateId!);
        res.json(template);
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Template duplication error:", error);
      res.status(500).json({ error: "Failed to duplicate template" });
    }
  });

  app.delete("/api/estimator/templates/:id", async (req, res) => {
    try {
      const success = await templateService.deleteTemplate(req.params.id);
      if (success) {
        res.json({ message: "Template deleted successfully" });
      } else {
        res.status(404).json({ error: "Template not found" });
      }
    } catch (error) {
      console.error("Template deletion error:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // SSR Management Routes (Enhanced)
  app.get("/api/estimator/ssr/search", async (req, res) => {
    try {
      const { query, threshold, limit, category, year } = req.query;
      
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Search query is required" });
      }
      
      const results = await ssrService.searchSSRItems(query, {
        threshold: threshold ? parseFloat(threshold as string) : 0.6,
        limit: limit ? parseInt(limit as string) : 10,
        category: category as string,
        year: year ? parseInt(year as string) : undefined
      });
      
      res.json(results);
    } catch (error) {
      console.error("SSR search error:", error);
      res.status(500).json({ error: "Failed to search SSR items" });
    }
  });

  app.get("/api/estimator/ssr/categories", async (req, res) => {
    try {
      const categories = await ssrService.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("SSR categories error:", error);
      res.status(500).json({ error: "Failed to fetch SSR categories" });
    }
  });

  app.get("/api/estimator/ssr/years", async (req, res) => {
    try {
      const years = await ssrService.getYears();
      res.json(years);
    } catch (error) {
      console.error("SSR years error:", error);
      res.status(500).json({ error: "Failed to fetch SSR years" });
    }
  });

  app.get("/api/estimator/ssr/statistics", async (req, res) => {
    try {
      const stats = await ssrService.getStatistics();
      res.json(stats);
    } catch (error) {
      console.error("SSR statistics error:", error);
      res.status(500).json({ error: "Failed to fetch SSR statistics" });
    }
  });

  // Export Routes
  app.post("/api/estimator/export/excel", async (req, res) => {
    try {
      const { scheduleItems, projectInfo, options } = req.body;
      
      if (!scheduleItems || !Array.isArray(scheduleItems)) {
        return res.status(400).json({ error: "Schedule items are required" });
      }
      
      const items = ScheduleItemSchema.array().parse(scheduleItems);
      const buffer = await excelService.exportToExcel(items, projectInfo, options);
      
      const filename = `estimate_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', buffer.length);
      
      res.send(buffer);
    } catch (error) {
      console.error("Excel export error:", error);
      res.status(500).json({ error: "Failed to export to Excel" });
    }
  });

  // Measurement Management Routes
  app.get("/api/estimator/measurements/templates", async (req, res) => {
    try {
      const templates = await measurementService.getTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Measurement templates error:", error);
      res.status(500).json({ error: "Failed to fetch measurement templates" });
    }
  });

  app.get("/api/estimator/measurements/templates/:id", async (req, res) => {
    try {
      const template = await measurementService.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error) {
      console.error("Measurement template error:", error);
      res.status(500).json({ error: "Failed to fetch measurement template" });
    }
  });

  app.post("/api/estimator/measurements", async (req, res) => {
    try {
      const { scheduleItemId, caption } = req.body;
      
      if (!scheduleItemId || !caption) {
        return res.status(400).json({ error: "Schedule item ID and caption are required" });
      }
      
      const measurementId = await measurementService.createMeasurement(scheduleItemId, caption);
      res.status(201).json({ id: measurementId });
    } catch (error) {
      console.error("Create measurement error:", error);
      res.status(500).json({ error: "Failed to create measurement" });
    }
  });

  app.post("/api/estimator/measurements/:id/items", async (req, res) => {
    try {
      const { type, data } = req.body;
      
      const itemId = await measurementService.addMeasurementItem(req.params.id, type, data);
      res.status(201).json({ id: itemId });
    } catch (error) {
      console.error("Add measurement item error:", error);
      res.status(500).json({ error: "Failed to add measurement item" });
    }
  });

  app.get("/api/estimator/measurements/schedule/:scheduleItemId", async (req, res) => {
    try {
      const measurements = await measurementService.getMeasurementsByScheduleItem(req.params.scheduleItemId);
      res.json(measurements);
    } catch (error) {
      console.error("Get measurements error:", error);
      res.status(500).json({ error: "Failed to fetch measurements" });
    }
  });

  app.get("/api/estimator/measurements/calculate/:scheduleItemId", async (req, res) => {
    try {
      const result = await measurementService.calculateMeasurementTotals(req.params.scheduleItemId);
      res.json(result);
    } catch (error) {
      console.error("Calculate measurements error:", error);
      res.status(500).json({ error: "Failed to calculate measurement totals" });
    }
  });

  // Analysis Management Routes
  app.post("/api/estimator/analysis/groups", async (req, res) => {
    try {
      const { scheduleItemId, description, code, parentId } = req.body;
      
      if (!scheduleItemId || !description) {
        return res.status(400).json({ error: "Schedule item ID and description are required" });
      }
      
      const groupId = await analysisService.createAnalysisGroup(scheduleItemId, description, code, parentId);
      res.status(201).json({ id: groupId });
    } catch (error) {
      console.error("Create analysis group error:", error);
      res.status(500).json({ error: "Failed to create analysis group" });
    }
  });

  app.post("/api/estimator/analysis/resources", async (req, res) => {
    try {
      const { scheduleItemId, ...data } = req.body;
      
      if (!scheduleItemId) {
        return res.status(400).json({ error: "Schedule item ID is required" });
      }
      
      const resourceId = await analysisService.addResourceItem(scheduleItemId, data);
      res.status(201).json({ id: resourceId });
    } catch (error) {
      console.error("Add resource item error:", error);
      res.status(500).json({ error: "Failed to add resource item" });
    }
  });

  app.post("/api/estimator/analysis/sums", async (req, res) => {
    try {
      const { scheduleItemId, description, parentId } = req.body;
      
      if (!scheduleItemId || !description) {
        return res.status(400).json({ error: "Schedule item ID and description are required" });
      }
      
      const sumId = await analysisService.addSumItem(scheduleItemId, description, parentId);
      res.status(201).json({ id: sumId });
    } catch (error) {
      console.error("Add sum item error:", error);
      res.status(500).json({ error: "Failed to add sum item" });
    }
  });

  app.get("/api/estimator/analysis/:scheduleItemId", async (req, res) => {
    try {
      const items = await analysisService.getAnalysisItems(req.params.scheduleItemId);
      res.json(items);
    } catch (error) {
      console.error("Get analysis items error:", error);
      res.status(500).json({ error: "Failed to fetch analysis items" });
    }
  });

  app.get("/api/estimator/analysis/:scheduleItemId/hierarchy", async (req, res) => {
    try {
      const hierarchy = await analysisService.getAnalysisHierarchy(req.params.scheduleItemId);
      res.json(hierarchy);
    } catch (error) {
      console.error("Get analysis hierarchy error:", error);
      res.status(500).json({ error: "Failed to fetch analysis hierarchy" });
    }
  });

  app.get("/api/estimator/analysis/:scheduleItemId/calculate", async (req, res) => {
    try {
      const rateAnalysis = await analysisService.calculateRateAnalysis(req.params.scheduleItemId);
      res.json(rateAnalysis);
    } catch (error) {
      console.error("Calculate rate analysis error:", error);
      res.status(500).json({ error: "Failed to calculate rate analysis" });
    }
  });

  app.post("/api/estimator/analysis/:scheduleItemId/import", async (req, res) => {
    try {
      const { analysisData } = req.body;
      
      if (!Array.isArray(analysisData)) {
        return res.status(400).json({ error: "Analysis data must be an array" });
      }
      
      const importedIds = await analysisService.importAnalysisFromData(req.params.scheduleItemId, analysisData);
      res.json({ importedIds, count: importedIds.length });
    } catch (error) {
      console.error("Import analysis error:", error);
      res.status(500).json({ error: "Failed to import analysis data" });
    }
  });

  app.get("/api/estimator/analysis/:scheduleItemId/export", async (req, res) => {
    try {
      const analysisData = await analysisService.exportAnalysisData(req.params.scheduleItemId);
      res.json(analysisData);
    } catch (error) {
      console.error("Export analysis error:", error);
      res.status(500).json({ error: "Failed to export analysis data" });
    }
  });

  // Dynamic Template Routes
  app.get("/api/estimator/dynamic-templates", async (req, res) => {
    try {
      const templates = await dynamicTemplateService.scanForTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Scan templates error:", error);
      res.status(500).json({ error: "Failed to scan for templates" });
    }
  });

  app.get("/api/estimator/dynamic-templates/list", async (req, res) => {
    try {
      const templateNames = dynamicTemplateService.listTemplates();
      res.json(templateNames);
    } catch (error) {
      console.error("List templates error:", error);
      res.status(500).json({ error: "Failed to list templates" });
    }
  });

  app.get("/api/estimator/dynamic-templates/:name/info", async (req, res) => {
    try {
      const info = dynamicTemplateService.getTemplateInfo(req.params.name);
      if (!info) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(info);
    } catch (error) {
      console.error("Get template info error:", error);
      res.status(500).json({ error: "Failed to get template info" });
    }
  });

  app.get("/api/estimator/dynamic-templates/:name/structure", async (req, res) => {
    try {
      const structure = await dynamicTemplateService.analyzeTemplateStructure(req.params.name);
      res.json(structure);
    } catch (error) {
      console.error("Analyze template structure error:", error);
      res.status(500).json({ error: "Failed to analyze template structure" });
    }
  });

  app.get("/api/estimator/dynamic-templates/:name/inputs", async (req, res) => {
    try {
      const inputs = await dynamicTemplateService.getInputFields(req.params.name);
      res.json(inputs);
    } catch (error) {
      console.error("Get input fields error:", error);
      res.status(500).json({ error: "Failed to get input fields" });
    }
  });

  app.get("/api/estimator/dynamic-templates/:name/outputs", async (req, res) => {
    try {
      const outputs = await dynamicTemplateService.getOutputFields(req.params.name);
      res.json(outputs);
    } catch (error) {
      console.error("Get output fields error:", error);
      res.status(500).json({ error: "Failed to get output fields" });
    }
  });

  app.post("/api/estimator/dynamic-templates/:name/process", async (req, res) => {
    try {
      const { inputs } = req.body;
      
      if (!inputs || typeof inputs !== 'object') {
        return res.status(400).json({ error: "Inputs object is required" });
      }
      
      const result = await dynamicTemplateService.processUserInput(req.params.name, inputs);
      res.json(result);
    } catch (error) {
      console.error("Process template error:", error);
      res.status(500).json({ error: "Failed to process template" });
    }
  });

  app.get("/api/estimator/dynamic-templates/:name/validate", async (req, res) => {
    try {
      const validation = await dynamicTemplateService.validateTemplate(req.params.name);
      res.json(validation);
    } catch (error) {
      console.error("Validate template error:", error);
      res.status(500).json({ error: "Failed to validate template" });
    }
  });

  app.get("/api/estimator/dynamic-templates/:name/export", async (req, res) => {
    try {
      const structure = await dynamicTemplateService.exportTemplateStructure(req.params.name);
      
      const filename = `${req.params.name}_structure.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      res.json(structure);
    } catch (error) {
      console.error("Export template structure error:", error);
      res.status(500).json({ error: "Failed to export template structure" });
    }
  });

  app.post("/api/estimator/dynamic-templates/create", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { templateName } = req.body;
      if (!templateName) {
        return res.status(400).json({ error: "Template name is required" });
      }

      // Save uploaded file temporarily
      const tempPath = `temp_${Date.now()}_${req.file.originalname}`;
      require('fs').writeFileSync(tempPath, req.file.buffer);

      try {
        const result = await dynamicTemplateService.createTemplateFromFile(tempPath, templateName);
        
        // Clean up temp file
        require('fs').unlinkSync(tempPath);
        
        res.json(result);
      } catch (error) {
        // Clean up temp file on error
        try { require('fs').unlinkSync(tempPath); } catch {}
        throw error;
      }
    } catch (error) {
      console.error("Create template error:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  // Statistics and Dashboard Routes
  app.get("/api/estimator/dashboard/stats", async (req, res) => {
    try {
      const [projectStats, templateStats, ssrStats, measurementTemplates, dynamicTemplates] = await Promise.all([
        projectService.getAllProjects().then(projects => ({
          totalProjects: projects.length,
          totalValue: projects.reduce((sum, p) => sum + p.totalAmount, 0)
        })),
        templateService.getStatistics(),
        ssrService.getStatistics(),
        measurementService.getTemplates().then(templates => ({ count: templates.length })),
        dynamicTemplateService.scanForTemplates().then(templates => ({ count: templates.length }))
      ]);
      
      res.json({
        projects: projectStats,
        templates: templateStats,
        ssr: ssrStats,
        measurements: measurementTemplates,
        dynamicTemplates: dynamicTemplates,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  // Proxy to Streamlit application
  app.use('/streamlit', createProxyMiddleware({
    target: 'http://localhost:8501',
    changeOrigin: true,
    pathRewrite: {
      '^/streamlit': '', // Remove /streamlit prefix when forwarding
    },
    logLevel: 'debug'
  }));

  const httpServer = createServer(app);
  return httpServer;
}