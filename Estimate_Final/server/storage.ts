import { type Estimate, type InsertEstimate, type SSRItem, type InsertSSRItem, type SSRFile, type InsertSSRFile, type HierarchicalSSRItem } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Estimates
  getEstimate(id: string): Promise<Estimate | undefined>;
  getAllEstimates(): Promise<Estimate[]>;
  createEstimate(estimate: InsertEstimate): Promise<Estimate>;
  updateEstimate(id: string, estimate: Partial<InsertEstimate>): Promise<Estimate | undefined>;
  deleteEstimate(id: string): Promise<boolean>;
  
  // SSR Items
  getSSRItem(id: string): Promise<SSRItem | undefined>;
  getSSRItemByCode(code: string): Promise<SSRItem | undefined>;
  getAllSSRItems(): Promise<SSRItem[]>;
  getSSRItemsByCategory(category: string): Promise<SSRItem[]>;
  createSSRItem(item: InsertSSRItem): Promise<SSRItem>;
  updateSSRItem(id: string, item: Partial<InsertSSRItem>): Promise<SSRItem | undefined>;
  deleteSSRItem(id: string): Promise<boolean>;
  
  // Hierarchical SSR Items
  getAllHierarchicalSSRItems(): Promise<HierarchicalSSRItem[]>;
  getHierarchicalSSRItem(id: string): Promise<HierarchicalSSRItem | undefined>;
  
  // SSR Files
  getSSRFile(id: string): Promise<SSRFile | undefined>;
  getAllSSRFiles(): Promise<SSRFile[]>;
  createSSRFile(file: InsertSSRFile): Promise<SSRFile>;
  updateSSRFile(id: string, file: Partial<InsertSSRFile>): Promise<SSRFile | undefined>;
  deleteSSRFile(id: string): Promise<boolean>;
  createSSRItemsBatch(items: InsertSSRItem[]): Promise<SSRItem[]>;
}

export class MemStorage implements IStorage {
  private estimates: Map<string, Estimate>;
  private ssrItems: Map<string, SSRItem>;
  private ssrFiles: Map<string, SSRFile>;

  constructor() {
    this.estimates = new Map();
    this.ssrItems = new Map();
    this.ssrFiles = new Map();
    this.initializeSSRData();
  }

  private initializeSSRData() {
    // Initialize with some sample SSR items
    const sampleSSRItems: InsertSSRItem[] = [
      {
        code: "SSR-001",
        description: "Excavation in all types of soil including watering, ramming and dressing complete",
        unit: "cum",
        rate: "150.00",
        category: "Earthwork",
      },
      {
        code: "SSR-002",
        description: "Plain Cement Concrete 1:4:8 (40mm nominal size) including form work, curing complete",
        unit: "cum",
        rate: "4500.00",
        category: "Concrete",
      },
      {
        code: "SSR-003",
        description: "Reinforced Cement Concrete M20 grade including form work and curing complete",
        unit: "cum",
        rate: "6800.00",
        category: "Concrete",
      },
      {
        code: "SSR-004",
        description: "Brick work in cement mortar 1:6 (1 cement: 6 sand) in super structure",
        unit: "sqm",
        rate: "580.00",
        category: "Masonry",
      },
      {
        code: "SSR-005",
        description: "Steel reinforcement for RCC work including cutting, bending, binding complete",
        unit: "kg",
        rate: "65.00",
        category: "Steel",
      },
    ];

    sampleSSRItems.forEach((item) => {
      const id = randomUUID();
      const ssrItem: SSRItem = { 
        ...item,
        id,
        category: item.category || null
      };
      this.ssrItems.set(id, ssrItem);
    });
  }

  // Estimates methods
  async getEstimate(id: string): Promise<Estimate | undefined> {
    return this.estimates.get(id);
  }

  async getAllEstimates(): Promise<Estimate[]> {
    return Array.from(this.estimates.values());
  }

  async createEstimate(insertEstimate: InsertEstimate): Promise<Estimate> {
    const id = randomUUID();
    const estimate: Estimate = {
      id,
      projectName: insertEstimate.projectName,
      location: insertEstimate.location || null,
      engineerName: insertEstimate.engineerName || null,
      referenceNumber: insertEstimate.referenceNumber || null,
      status: insertEstimate.status || "draft",
      excelData: insertEstimate.excelData || null,
      fileName: insertEstimate.fileName || null,
      dateCreated: new Date(),
    };
    this.estimates.set(id, estimate);
    return estimate;
  }

  async updateEstimate(id: string, update: Partial<InsertEstimate>): Promise<Estimate | undefined> {
    const existing = this.estimates.get(id);
    if (!existing) return undefined;
    
    const updated: Estimate = { ...existing, ...update };
    this.estimates.set(id, updated);
    return updated;
  }

  async deleteEstimate(id: string): Promise<boolean> {
    return this.estimates.delete(id);
  }

  // SSR Items methods
  async getSSRItem(id: string): Promise<SSRItem | undefined> {
    return this.ssrItems.get(id);
  }

  async getSSRItemByCode(code: string): Promise<SSRItem | undefined> {
    return Array.from(this.ssrItems.values()).find((item) => item.code === code);
  }

  async getAllSSRItems(): Promise<SSRItem[]> {
    return Array.from(this.ssrItems.values());
  }

  async getSSRItemsByCategory(category: string): Promise<SSRItem[]> {
    return Array.from(this.ssrItems.values()).filter(
      (item) => item.category === category
    );
  }

  async createSSRItem(insertItem: InsertSSRItem): Promise<SSRItem> {
    const id = randomUUID();
    const item: SSRItem = {
      id,
      code: insertItem.code,
      description: insertItem.description,
      unit: insertItem.unit,
      rate: insertItem.rate,
      category: insertItem.category || null,
    };
    this.ssrItems.set(id, item);
    return item;
  }

  async updateSSRItem(id: string, update: Partial<InsertSSRItem>): Promise<SSRItem | undefined> {
    const existing = this.ssrItems.get(id);
    if (!existing) return undefined;
    
    const updated: SSRItem = { ...existing, ...update };
    this.ssrItems.set(id, updated);
    return updated;
  }

  async deleteSSRItem(id: string): Promise<boolean> {
    return this.ssrItems.delete(id);
  }

  // Hierarchical SSR Items methods
  async getAllHierarchicalSSRItems(): Promise<HierarchicalSSRItem[]> {
    // Transform regular SSR items to hierarchical format for now
    const items = Array.from(this.ssrItems.values());
    return items.map(item => ({
      ...item,
      level: 0,
      fullDescription: item.description,
      hierarchy: [item.description],
      indentLevel: 0
    }));
  }

  async getHierarchicalSSRItem(id: string): Promise<HierarchicalSSRItem | undefined> {
    const item = this.ssrItems.get(id);
    if (!item) return undefined;
    
    return {
      ...item,
      level: 0,
      fullDescription: item.description,
      hierarchy: [item.description],
      indentLevel: 0
    };
  }

  // SSR Files methods
  async getSSRFile(id: string): Promise<SSRFile | undefined> {
    return this.ssrFiles.get(id);
  }

  async getAllSSRFiles(): Promise<SSRFile[]> {
    return Array.from(this.ssrFiles.values());
  }

  async createSSRFile(insertFile: InsertSSRFile): Promise<SSRFile> {
    const id = randomUUID();
    const file: SSRFile = {
      id,
      fileName: insertFile.fileName,
      originalName: insertFile.originalName,
      fileSize: insertFile.fileSize,
      uploadDate: new Date(),
      description: insertFile.description || null,
      version: insertFile.version || null,
      category: insertFile.category || null,
      sheetNames: insertFile.sheetNames || null,
      itemsCount: insertFile.itemsCount || 0,
      filePath: insertFile.filePath,
      status: insertFile.status || "active",
    };
    this.ssrFiles.set(id, file);
    return file;
  }

  async updateSSRFile(id: string, update: Partial<InsertSSRFile>): Promise<SSRFile | undefined> {
    const existing = this.ssrFiles.get(id);
    if (!existing) return undefined;
    
    const updated: SSRFile = { ...existing, ...update };
    this.ssrFiles.set(id, updated);
    return updated;
  }

  async deleteSSRFile(id: string): Promise<boolean> {
    return this.ssrFiles.delete(id);
  }

  async createSSRItemsBatch(items: InsertSSRItem[]): Promise<SSRItem[]> {
    const createdItems: SSRItem[] = [];
    
    for (const insertItem of items) {
      // Check if item with same code already exists
      const existing = Array.from(this.ssrItems.values()).find(item => item.code === insertItem.code);
      
      if (!existing) {
        const id = randomUUID();
        const item: SSRItem = {
          id,
          code: insertItem.code,
          description: insertItem.description,
          unit: insertItem.unit,
          rate: insertItem.rate,
          category: insertItem.category || null,
        };
        this.ssrItems.set(id, item);
        createdItems.push(item);
      }
    }
    
    return createdItems;
  }
}

export const storage = new MemStorage();