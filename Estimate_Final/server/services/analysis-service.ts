import { Database } from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';

export enum AnalysisItemType {
  GROUP = 'group',
  RESOURCE = 'resource',
  SUM = 'sum'
}

export interface AnalysisItem {
  id: string;
  schedule_item_id: string;
  parent_id?: string;
  code: string;
  description: string;
  unit: string;
  rate: number;
  quantity: number;
  amount: number;
  type: AnalysisItemType;
  sort_order: number;
  level: number;
  remarks?: string;
  resource_data?: {
    material_cost?: number;
    labour_cost?: number;
    equipment_cost?: number;
    overhead_percentage?: number;
    profit_percentage?: number;
  };
}

export interface RateAnalysis {
  schedule_item_id: string;
  total_rate: number;
  material_cost: number;
  labour_cost: number;
  equipment_cost: number;
  overhead_cost: number;
  profit_cost: number;
  items: AnalysisItem[];
}

export class AnalysisService {
  private db: Database;
  private dbReady: Promise<void>;

  constructor(dbPath: string = 'data/analysis.db') {
    this.db = new Database(dbPath);
    this.dbReady = this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create analysis items table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS analysis_items (
            id TEXT PRIMARY KEY,
            schedule_item_id TEXT NOT NULL,
            parent_id TEXT,
            code TEXT NOT NULL,
            description TEXT NOT NULL,
            unit TEXT NOT NULL,
            rate REAL NOT NULL,
            quantity REAL DEFAULT 1,
            amount REAL DEFAULT 0,
            type TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            level INTEGER DEFAULT 0,
            remarks TEXT DEFAULT '',
            resource_data TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (schedule_item_id) REFERENCES schedule_items (id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES analysis_items (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create rate analysis summary table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS rate_analysis (
            id TEXT PRIMARY KEY,
            schedule_item_id TEXT NOT NULL UNIQUE,
            total_rate REAL DEFAULT 0,
            material_cost REAL DEFAULT 0,
            labour_cost REAL DEFAULT 0,
            equipment_cost REAL DEFAULT 0,
            overhead_cost REAL DEFAULT 0,
            profit_cost REAL DEFAULT 0,
            overhead_percentage REAL DEFAULT 0,
            profit_percentage REAL DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (schedule_item_id) REFERENCES schedule_items (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create indexes
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_analysis_items_schedule_item_id ON analysis_items(schedule_item_id)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_analysis_items_parent_id ON analysis_items(parent_id)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_rate_analysis_schedule_item_id ON rate_analysis(schedule_item_id)`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  /**
   * Create analysis group
   */
  async createAnalysisGroup(
    scheduleItemId: string,
    description: string,
    code?: string,
    parentId?: string
  ): Promise<string> {
    await this.dbReady;

    const groupId = uuidv4();
    const level = parentId ? await this.getItemLevel(parentId) + 1 : 0;

    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO analysis_items 
        (id, schedule_item_id, parent_id, code, description, unit, rate, quantity, amount, type, level, sort_order)
        VALUES (?, ?, ?, ?, ?, '', 0, 1, 0, ?, ?, 0)
      `, [
        groupId,
        scheduleItemId,
        parentId || null,
        code || '',
        description,
        AnalysisItemType.GROUP,
        level
      ], (err) => {
        if (err) reject(err);
        else resolve(groupId);
      });
    });
  }

  /**
   * Add resource item to analysis
   */
  async addResourceItem(
    scheduleItemId: string,
    data: {
      code: string;
      description: string;
      unit: string;
      rate: number;
      quantity: number;
      parentId?: string;
      remarks?: string;
      resource_data?: any;
    }
  ): Promise<string> {
    await this.dbReady;

    const itemId = uuidv4();
    const amount = data.rate * data.quantity;
    const level = data.parentId ? await this.getItemLevel(data.parentId) + 1 : 0;

    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO analysis_items 
        (id, schedule_item_id, parent_id, code, description, unit, rate, quantity, amount, type, level, remarks, resource_data, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        itemId,
        scheduleItemId,
        data.parentId || null,
        data.code,
        data.description,
        data.unit,
        data.rate,
        data.quantity,
        amount,
        AnalysisItemType.RESOURCE,
        level,
        data.remarks || '',
        JSON.stringify(data.resource_data || {})
      ], (err) => {
        if (err) reject(err);
        else resolve(itemId);
      });
    });
  }

  /**
   * Add sum item to analysis
   */
  async addSumItem(
    scheduleItemId: string,
    description: string,
    parentId?: string
  ): Promise<string> {
    await this.dbReady;

    const itemId = uuidv4();
    const level = parentId ? await this.getItemLevel(parentId) + 1 : 0;

    // Calculate sum of child items
    const childrenSum = await this.calculateChildrenSum(parentId || scheduleItemId);

    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO analysis_items 
        (id, schedule_item_id, parent_id, code, description, unit, rate, quantity, amount, type, level, sort_order)
        VALUES (?, ?, ?, '', ?, '', ?, 1, ?, ?, ?, 0)
      `, [
        itemId,
        scheduleItemId,
        parentId || null,
        description,
        childrenSum,
        childrenSum,
        AnalysisItemType.SUM,
        level
      ], (err) => {
        if (err) reject(err);
        else resolve(itemId);
      });
    });
  }

  /**
   * Get analysis items for a schedule item
   */
  async getAnalysisItems(scheduleItemId: string): Promise<AnalysisItem[]> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM analysis_items 
        WHERE schedule_item_id = ? 
        ORDER BY sort_order, level, id
      `, [scheduleItemId], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const items: AnalysisItem[] = rows.map(row => ({
          id: row.id,
          schedule_item_id: row.schedule_item_id,
          parent_id: row.parent_id,
          code: row.code,
          description: row.description,
          unit: row.unit,
          rate: row.rate,
          quantity: row.quantity,
          amount: row.amount,
          type: row.type as AnalysisItemType,
          sort_order: row.sort_order,
          level: row.level,
          remarks: row.remarks,
          resource_data: JSON.parse(row.resource_data || '{}')
        }));

        resolve(items);
      });
    });
  }

  /**
   * Get hierarchical analysis structure
   */
  async getAnalysisHierarchy(scheduleItemId: string): Promise<AnalysisItem[]> {
    const items = await this.getAnalysisItems(scheduleItemId);
    return this.buildHierarchy(items);
  }

  private buildHierarchy(items: AnalysisItem[]): AnalysisItem[] {
    const itemMap = new Map<string, AnalysisItem & { children?: AnalysisItem[] }>();
    const rootItems: AnalysisItem[] = [];

    // Create map of all items
    items.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] });
    });

    // Build hierarchy
    items.forEach(item => {
      const itemWithChildren = itemMap.get(item.id)!;
      
      if (item.parent_id) {
        const parent = itemMap.get(item.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(itemWithChildren);
        }
      } else {
        rootItems.push(itemWithChildren);
      }
    });

    return rootItems;
  }

  /**
   * Calculate rate analysis for a schedule item
   */
  async calculateRateAnalysis(scheduleItemId: string): Promise<RateAnalysis> {
    await this.dbReady;

    const items = await this.getAnalysisItems(scheduleItemId);
    
    let materialCost = 0;
    let labourCost = 0;
    let equipmentCost = 0;
    let totalDirectCost = 0;

    // Calculate costs by category
    for (const item of items) {
      if (item.type === AnalysisItemType.RESOURCE) {
        const resourceData = item.resource_data || {};
        const itemAmount = item.amount;

        // Categorize based on resource type or code patterns
        if (this.isMaterialItem(item)) {
          materialCost += itemAmount;
        } else if (this.isLabourItem(item)) {
          labourCost += itemAmount;
        } else if (this.isEquipmentItem(item)) {
          equipmentCost += itemAmount;
        }

        totalDirectCost += itemAmount;
      }
    }

    // Get overhead and profit percentages (default values)
    const overheadPercentage = 10; // 10%
    const profitPercentage = 15; // 15%

    const overheadCost = (totalDirectCost * overheadPercentage) / 100;
    const profitCost = ((totalDirectCost + overheadCost) * profitPercentage) / 100;
    const totalRate = totalDirectCost + overheadCost + profitCost;

    // Save rate analysis summary
    await this.saveRateAnalysisSummary(scheduleItemId, {
      total_rate: totalRate,
      material_cost: materialCost,
      labour_cost: labourCost,
      equipment_cost: equipmentCost,
      overhead_cost: overheadCost,
      profit_cost: profitCost,
      overhead_percentage: overheadPercentage,
      profit_percentage: profitPercentage
    });

    return {
      schedule_item_id: scheduleItemId,
      total_rate: Math.round(totalRate * 100) / 100,
      material_cost: Math.round(materialCost * 100) / 100,
      labour_cost: Math.round(labourCost * 100) / 100,
      equipment_cost: Math.round(equipmentCost * 100) / 100,
      overhead_cost: Math.round(overheadCost * 100) / 100,
      profit_cost: Math.round(profitCost * 100) / 100,
      items
    };
  }

  private isMaterialItem(item: AnalysisItem): boolean {
    const materialKeywords = ['material', 'cement', 'steel', 'brick', 'sand', 'aggregate', 'concrete', 'paint', 'tile'];
    const description = item.description.toLowerCase();
    const code = item.code.toLowerCase();
    
    return materialKeywords.some(keyword => 
      description.includes(keyword) || code.includes(keyword)
    );
  }

  private isLabourItem(item: AnalysisItem): boolean {
    const labourKeywords = ['labour', 'labor', 'mason', 'carpenter', 'plumber', 'electrician', 'worker', 'skilled', 'unskilled'];
    const description = item.description.toLowerCase();
    const code = item.code.toLowerCase();
    
    return labourKeywords.some(keyword => 
      description.includes(keyword) || code.includes(keyword)
    );
  }

  private isEquipmentItem(item: AnalysisItem): boolean {
    const equipmentKeywords = ['equipment', 'machinery', 'tool', 'crane', 'excavator', 'mixer', 'vibrator', 'pump'];
    const description = item.description.toLowerCase();
    const code = item.code.toLowerCase();
    
    return equipmentKeywords.some(keyword => 
      description.includes(keyword) || code.includes(keyword)
    );
  }

  private async saveRateAnalysisSummary(scheduleItemId: string, data: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT OR REPLACE INTO rate_analysis 
        (id, schedule_item_id, total_rate, material_cost, labour_cost, equipment_cost, overhead_cost, profit_cost, overhead_percentage, profit_percentage, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [
        uuidv4(),
        scheduleItemId,
        data.total_rate,
        data.material_cost,
        data.labour_cost,
        data.equipment_cost,
        data.overhead_cost,
        data.profit_cost,
        data.overhead_percentage,
        data.profit_percentage
      ], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Update analysis item
   */
  async updateAnalysisItem(itemId: string, updates: Partial<AnalysisItem>): Promise<boolean> {
    await this.dbReady;

    const fields = Object.keys(updates).filter(key => !['id', 'schedule_item_id'].includes(key));
    if (fields.length === 0) return false;

    // Recalculate amount if rate or quantity changed
    if ('rate' in updates || 'quantity' in updates) {
      const currentItem = await this.getAnalysisItemById(itemId);
      if (currentItem) {
        const newRate = updates.rate ?? currentItem.rate;
        const newQuantity = updates.quantity ?? currentItem.quantity;
        updates.amount = newRate * newQuantity;
      }
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
      const value = (updates as any)[field];
      return field === 'resource_data' ? JSON.stringify(value) : value;
    });
    values.push(itemId);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE analysis_items SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Delete analysis item
   */
  async deleteAnalysisItem(itemId: string): Promise<boolean> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM analysis_items WHERE id = ?', [itemId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  /**
   * Import analysis from Excel or other source
   */
  async importAnalysisFromData(
    scheduleItemId: string,
    analysisData: Array<{
      code?: string;
      description: string;
      unit?: string;
      rate?: number;
      quantity?: number;
      type?: string;
      level?: number;
    }>
  ): Promise<string[]> {
    await this.dbReady;

    const importedIds: string[] = [];
    const groupStack: string[] = []; // Stack to track parent groups

    for (const data of analysisData) {
      const level = data.level || 0;
      
      // Adjust group stack based on level
      while (groupStack.length > level) {
        groupStack.pop();
      }

      const parentId = groupStack.length > 0 ? groupStack[groupStack.length - 1] : undefined;

      if (data.type === 'group' || (!data.rate && !data.quantity)) {
        // Create group
        const groupId = await this.createAnalysisGroup(
          scheduleItemId,
          data.description,
          data.code,
          parentId
        );
        groupStack.push(groupId);
        importedIds.push(groupId);
      } else if (data.type === 'sum' || data.description.toLowerCase().includes('total')) {
        // Create sum item
        const sumId = await this.addSumItem(
          scheduleItemId,
          data.description,
          parentId
        );
        importedIds.push(sumId);
      } else {
        // Create resource item
        const resourceId = await this.addResourceItem(scheduleItemId, {
          code: data.code || '',
          description: data.description,
          unit: data.unit || 'Each',
          rate: data.rate || 0,
          quantity: data.quantity || 1,
          parentId
        });
        importedIds.push(resourceId);
      }
    }

    return importedIds;
  }

  /**
   * Export analysis to structured format
   */
  async exportAnalysisData(scheduleItemId: string): Promise<any[]> {
    const items = await this.getAnalysisItems(scheduleItemId);
    
    return items.map(item => ({
      code: item.code,
      description: item.description,
      unit: item.unit,
      rate: item.rate,
      quantity: item.quantity,
      amount: item.amount,
      type: item.type,
      level: item.level,
      remarks: item.remarks,
      resource_data: item.resource_data
    }));
  }

  private async getItemLevel(itemId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT level FROM analysis_items WHERE id = ?', [itemId], (err, row: any) => {
        if (err) reject(err);
        else resolve(row?.level || 0);
      });
    });
  }

  private async calculateChildrenSum(parentId: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT SUM(amount) as total 
        FROM analysis_items 
        WHERE parent_id = ? AND type = ?
      `, [parentId, AnalysisItemType.RESOURCE], (err, row: any) => {
        if (err) reject(err);
        else resolve(row?.total || 0);
      });
    });
  }

  private async getAnalysisItemById(itemId: string): Promise<AnalysisItem | null> {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM analysis_items WHERE id = ?', [itemId], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        resolve({
          id: row.id,
          schedule_item_id: row.schedule_item_id,
          parent_id: row.parent_id,
          code: row.code,
          description: row.description,
          unit: row.unit,
          rate: row.rate,
          quantity: row.quantity,
          amount: row.amount,
          type: row.type as AnalysisItemType,
          sort_order: row.sort_order,
          level: row.level,
          remarks: row.remarks,
          resource_data: JSON.parse(row.resource_data || '{}')
        });
      });
    });
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}