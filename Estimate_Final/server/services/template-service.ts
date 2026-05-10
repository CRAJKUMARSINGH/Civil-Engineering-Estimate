import { Template, ScheduleItem } from '../models/estimator';
import { Database } from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';

export class TemplateService {
  private db: Database;
  private dbReady: Promise<void>;

  constructor(dbPath: string = 'data/templates.db') {
    this.db = new Database(dbPath);
    this.dbReady = this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create templates table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            description TEXT DEFAULT '',
            category TEXT DEFAULT 'general',
            metadata TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create template items table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS template_items (
            id TEXT PRIMARY KEY,
            template_id TEXT NOT NULL,
            code TEXT NOT NULL,
            description TEXT NOT NULL,
            unit TEXT NOT NULL,
            rate REAL NOT NULL,
            quantity REAL DEFAULT 0,
            category TEXT DEFAULT '',
            remarks TEXT DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (template_id) REFERENCES templates (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create indexes
        this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_template_category 
          ON templates(category)
        `);

        this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_template_items_template_id 
          ON template_items(template_id)
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  /**
   * Save schedule items as a template
   */
  async saveItemsAsTemplate(
    items: ScheduleItem[],
    name: string,
    description: string = '',
    category: string = 'general',
    metadata: Record<string, any> = {}
  ): Promise<{ success: boolean; templateId?: string; error?: string }> {
    await this.dbReady;

    const templateId = uuidv4();

    try {
      // Start transaction
      await new Promise<void>((resolve, reject) => {
        this.db.run('BEGIN TRANSACTION', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Insert template
      await new Promise<void>((resolve, reject) => {
        this.db.run(`
          INSERT INTO templates (id, name, description, category, metadata)
          VALUES (?, ?, ?, ?, ?)
        `, [templateId, name, description, category, JSON.stringify(metadata)], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Insert template items
      const insertItemStmt = this.db.prepare(`
        INSERT INTO template_items 
        (id, template_id, code, description, unit, rate, quantity, category, remarks, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await new Promise<void>((resolve, reject) => {
          insertItemStmt.run([
            uuidv4(),
            templateId,
            item.code,
            item.description,
            item.unit,
            item.rate,
            item.quantity || 0,
            item.category || '',
            item.remarks || '',
            i
          ], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      insertItemStmt.finalize();

      // Commit transaction
      await new Promise<void>((resolve, reject) => {
        this.db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return { success: true, templateId };

    } catch (error) {
      // Rollback transaction
      await new Promise<void>((resolve) => {
        this.db.run('ROLLBACK', () => resolve());
      });

      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create schedule items from template
   */
  async createFromTemplate(templateId: string): Promise<ScheduleItem[]> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT * FROM template_items 
        WHERE template_id = ? 
        ORDER BY sort_order
      `, [templateId], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const scheduleItems: ScheduleItem[] = rows.map(row => ({
          code: row.code,
          description: row.description,
          unit: row.unit,
          rate: row.rate,
          quantity: row.quantity,
          amount: row.rate * row.quantity,
          category: row.category,
          remarks: row.remarks,
          analysisItems: [],
          measurements: []
        }));

        resolve(scheduleItems);
      });
    });
  }

  /**
   * Get all templates
   */
  async getAllTemplates(): Promise<Template[]> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT t.*, COUNT(ti.id) as item_count
        FROM templates t
        LEFT JOIN template_items ti ON t.id = ti.template_id
        GROUP BY t.id
        ORDER BY t.created_at DESC
      `, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const templates: Template[] = rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          category: row.category,
          items: [], // Items loaded separately when needed
          metadata: {
            ...JSON.parse(row.metadata || '{}'),
            itemCount: row.item_count
          },
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        }));

        resolve(templates);
      });
    });
  }

  /**
   * Get template by ID with items
   */
  async getTemplateById(templateId: string): Promise<Template | null> {
    await this.dbReady;

    // Get template info
    const template = await new Promise<any>((resolve, reject) => {
      this.db.get(`
        SELECT * FROM templates WHERE id = ?
      `, [templateId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!template) return null;

    // Get template items
    const items = await this.createFromTemplate(templateId);

    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      items,
      metadata: JSON.parse(template.metadata || '{}'),
      createdAt: new Date(template.created_at),
      updatedAt: new Date(template.updated_at)
    };
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<Template[]> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT t.*, COUNT(ti.id) as item_count
        FROM templates t
        LEFT JOIN template_items ti ON t.id = ti.template_id
        WHERE t.category = ?
        GROUP BY t.id
        ORDER BY t.name
      `, [category], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const templates: Template[] = rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          category: row.category,
          items: [],
          metadata: {
            ...JSON.parse(row.metadata || '{}'),
            itemCount: row.item_count
          },
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        }));

        resolve(templates);
      });
    });
  }

  /**
   * Search templates by name or description
   */
  async searchTemplates(query: string): Promise<Template[]> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT t.*, COUNT(ti.id) as item_count
        FROM templates t
        LEFT JOIN template_items ti ON t.id = ti.template_id
        WHERE t.name LIKE ? OR t.description LIKE ?
        GROUP BY t.id
        ORDER BY t.name
      `, [`%${query}%`, `%${query}%`], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const templates: Template[] = rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          category: row.category,
          items: [],
          metadata: {
            ...JSON.parse(row.metadata || '{}'),
            itemCount: row.item_count
          },
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        }));

        resolve(templates);
      });
    });
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string, 
    updates: Partial<Pick<Template, 'name' | 'description' | 'category' | 'metadata'>>
  ): Promise<boolean> {
    await this.dbReady;

    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return false;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
      const value = (updates as any)[field];
      return field === 'metadata' ? JSON.stringify(value) : value;
    });
    values.push(templateId);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE templates SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM templates WHERE id = ?', [templateId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  /**
   * Get available categories
   */
  async getCategories(): Promise<string[]> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT DISTINCT category FROM templates ORDER BY category',
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.category));
        }
      );
    });
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(
    templateId: string, 
    newName: string,
    newDescription?: string
  ): Promise<{ success: boolean; templateId?: string; error?: string }> {
    const originalTemplate = await this.getTemplateById(templateId);
    
    if (!originalTemplate) {
      return { success: false, error: 'Template not found' };
    }

    return this.saveItemsAsTemplate(
      originalTemplate.items,
      newName,
      newDescription || `Copy of ${originalTemplate.description}`,
      originalTemplate.category,
      { ...originalTemplate.metadata, originalTemplateId: templateId }
    );
  }

  /**
   * Get template statistics
   */
  async getStatistics(): Promise<{
    totalTemplates: number;
    categoriesCount: number;
    totalItems: number;
    averageItemsPerTemplate: number;
  }> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(DISTINCT t.id) as totalTemplates,
          COUNT(DISTINCT t.category) as categoriesCount,
          COUNT(ti.id) as totalItems,
          CASE 
            WHEN COUNT(DISTINCT t.id) > 0 
            THEN CAST(COUNT(ti.id) AS REAL) / COUNT(DISTINCT t.id)
            ELSE 0 
          END as averageItemsPerTemplate
        FROM templates t
        LEFT JOIN template_items ti ON t.id = ti.template_id
      `, (err, row: any) => {
        if (err) reject(err);
        else resolve(row);
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