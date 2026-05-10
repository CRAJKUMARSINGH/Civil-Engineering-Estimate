import { Project, ScheduleItem, Measurement, AnalysisItem } from '../models/estimator';
import { Database } from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';

export class ProjectService {
  private db: Database;
  private dbReady: Promise<void>;

  constructor(dbPath: string = 'data/projects.db') {
    this.db = new Database(dbPath);
    this.dbReady = this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create projects table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            location TEXT DEFAULT '',
            client TEXT DEFAULT '',
            contractor TEXT DEFAULT '',
            engineer TEXT DEFAULT '',
            start_date DATE,
            end_date DATE,
            total_amount REAL DEFAULT 0,
            settings TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create schedule items table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS schedule_items (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            code TEXT NOT NULL,
            description TEXT NOT NULL,
            unit TEXT NOT NULL,
            rate REAL NOT NULL,
            quantity REAL DEFAULT 0,
            amount REAL DEFAULT 0,
            category TEXT DEFAULT '',
            remarks TEXT DEFAULT '',
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create analysis items table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS analysis_items (
            id TEXT PRIMARY KEY,
            schedule_item_id TEXT NOT NULL,
            code TEXT DEFAULT '',
            description TEXT NOT NULL,
            unit TEXT NOT NULL,
            rate REAL NOT NULL,
            quantity REAL DEFAULT 1,
            amount REAL DEFAULT 0,
            type TEXT DEFAULT 'resource',
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (schedule_item_id) REFERENCES schedule_items (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create measurements table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS measurements (
            id TEXT PRIMARY KEY,
            schedule_item_id TEXT NOT NULL,
            caption TEXT NOT NULL,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (schedule_item_id) REFERENCES schedule_items (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create measurement items table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS measurement_items (
            id TEXT PRIMARY KEY,
            measurement_id TEXT NOT NULL,
            type TEXT NOT NULL,
            item_nos TEXT DEFAULT '[]',
            records TEXT DEFAULT '[]',
            remark TEXT DEFAULT '',
            item_remarks TEXT DEFAULT '[]',
            total REAL DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            FOREIGN KEY (measurement_id) REFERENCES measurements (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create indexes
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_schedule_items_project_id ON schedule_items(project_id)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_analysis_items_schedule_item_id ON analysis_items(schedule_item_id)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_measurements_schedule_item_id ON measurements(schedule_item_id)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_measurement_items_measurement_id ON measurement_items(measurement_id)`, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  /**
   * Create a new project
   */
  async createProject(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    await this.dbReady;

    const projectId = uuidv4();

    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO projects 
        (id, name, description, location, client, contractor, engineer, start_date, end_date, total_amount, settings)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        projectId,
        projectData.name,
        projectData.description || '',
        projectData.location || '',
        projectData.client || '',
        projectData.contractor || '',
        projectData.engineer || '',
        projectData.startDate?.toISOString() || null,
        projectData.endDate?.toISOString() || null,
        projectData.totalAmount || 0,
        JSON.stringify(projectData.settings || {})
      ], (err) => {
        if (err) reject(err);
        else resolve(projectId);
      });
    });
  }

  /**
   * Get project by ID with all related data
   */
  async getProjectById(projectId: string): Promise<Project | null> {
    await this.dbReady;

    // Get project info
    const project = await new Promise<any>((resolve, reject) => {
      this.db.get('SELECT * FROM projects WHERE id = ?', [projectId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!project) return null;

    // Get schedule items with analysis and measurements
    const scheduleItems = await this.getScheduleItemsByProjectId(projectId);

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      location: project.location,
      client: project.client,
      contractor: project.contractor,
      engineer: project.engineer,
      startDate: project.start_date ? new Date(project.start_date) : undefined,
      endDate: project.end_date ? new Date(project.end_date) : undefined,
      totalAmount: project.total_amount,
      scheduleItems,
      settings: JSON.parse(project.settings || '{}'),
      createdAt: new Date(project.created_at),
      updatedAt: new Date(project.updated_at)
    };
  }

  /**
   * Get all projects (summary only)
   */
  async getAllProjects(): Promise<Omit<Project, 'scheduleItems'>[]> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT p.*, COUNT(si.id) as item_count
        FROM projects p
        LEFT JOIN schedule_items si ON p.id = si.project_id
        GROUP BY p.id
        ORDER BY p.updated_at DESC
      `, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const projects = rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          location: row.location,
          client: row.client,
          contractor: row.contractor,
          engineer: row.engineer,
          startDate: row.start_date ? new Date(row.start_date) : undefined,
          endDate: row.end_date ? new Date(row.end_date) : undefined,
          totalAmount: row.total_amount,
          settings: {
            ...JSON.parse(row.settings || '{}'),
            itemCount: row.item_count
          },
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        }));

        resolve(projects);
      });
    });
  }

  /**
   * Update project
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<boolean> {
    await this.dbReady;

    const fields = Object.keys(updates).filter(key => 
      !['id', 'scheduleItems', 'createdAt', 'updatedAt'].includes(key)
    );
    
    if (fields.length === 0) return false;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
      const value = (updates as any)[field];
      if (field === 'settings') return JSON.stringify(value);
      if (field === 'startDate' || field === 'endDate') return value?.toISOString() || null;
      return value;
    });
    values.push(projectId);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE projects SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Delete project
   */
  async deleteProject(projectId: string): Promise<boolean> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM projects WHERE id = ?', [projectId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  /**
   * Add schedule items to project
   */
  async addScheduleItems(projectId: string, items: ScheduleItem[]): Promise<string[]> {
    await this.dbReady;

    const itemIds: string[] = [];

    try {
      // Start transaction
      await new Promise<void>((resolve, reject) => {
        this.db.run('BEGIN TRANSACTION', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const itemId = uuidv4();
        itemIds.push(itemId);

        // Insert schedule item
        await new Promise<void>((resolve, reject) => {
          this.db.run(`
            INSERT INTO schedule_items 
            (id, project_id, code, description, unit, rate, quantity, amount, category, remarks, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            itemId,
            projectId,
            item.code,
            item.description,
            item.unit,
            item.rate,
            item.quantity || 0,
            item.amount || (item.rate * (item.quantity || 0)),
            item.category || '',
            item.remarks || '',
            i
          ], (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Insert analysis items if any
        if (item.analysisItems && item.analysisItems.length > 0) {
          for (let j = 0; j < item.analysisItems.length; j++) {
            const analysisItem = item.analysisItems[j];
            await new Promise<void>((resolve, reject) => {
              this.db.run(`
                INSERT INTO analysis_items 
                (id, schedule_item_id, code, description, unit, rate, quantity, amount, type, sort_order)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                uuidv4(),
                itemId,
                analysisItem.code || '',
                analysisItem.description,
                analysisItem.unit,
                analysisItem.rate,
                analysisItem.quantity || 1,
                analysisItem.amount || (analysisItem.rate * (analysisItem.quantity || 1)),
                analysisItem.type || 'resource',
                j
              ], (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          }
        }

        // Insert measurements if any
        if (item.measurements && item.measurements.length > 0) {
          for (let j = 0; j < item.measurements.length; j++) {
            const measurement = item.measurements[j];
            const measurementId = uuidv4();

            await new Promise<void>((resolve, reject) => {
              this.db.run(`
                INSERT INTO measurements (id, schedule_item_id, caption, sort_order)
                VALUES (?, ?, ?, ?)
              `, [measurementId, itemId, measurement.caption, j], (err) => {
                if (err) reject(err);
                else resolve();
              });
            });

            // Insert measurement items
            if (measurement.items && measurement.items.length > 0) {
              for (let k = 0; k < measurement.items.length; k++) {
                const measItem = measurement.items[k];
                await new Promise<void>((resolve, reject) => {
                  this.db.run(`
                    INSERT INTO measurement_items 
                    (id, measurement_id, type, item_nos, records, remark, item_remarks, total, sort_order)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `, [
                    uuidv4(),
                    measurementId,
                    measItem.type,
                    JSON.stringify(measItem.itemNos),
                    JSON.stringify(measItem.records),
                    measItem.remark,
                    JSON.stringify(measItem.itemRemarks),
                    measItem.total || 0,
                    k
                  ], (err) => {
                    if (err) reject(err);
                    else resolve();
                  });
                });
              }
            }
          }
        }
      }

      // Update project total amount
      await this.updateProjectTotalAmount(projectId);

      // Commit transaction
      await new Promise<void>((resolve, reject) => {
        this.db.run('COMMIT', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      return itemIds;

    } catch (error) {
      // Rollback transaction
      await new Promise<void>((resolve) => {
        this.db.run('ROLLBACK', () => resolve());
      });
      throw error;
    }
  }

  /**
   * Get schedule items by project ID
   */
  private async getScheduleItemsByProjectId(projectId: string): Promise<ScheduleItem[]> {
    // Get schedule items
    const scheduleItems = await new Promise<any[]>((resolve, reject) => {
      this.db.all(`
        SELECT * FROM schedule_items 
        WHERE project_id = ? 
        ORDER BY sort_order
      `, [projectId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get analysis items for each schedule item
    const result: ScheduleItem[] = [];

    for (const item of scheduleItems) {
      const analysisItems = await new Promise<any[]>((resolve, reject) => {
        this.db.all(`
          SELECT * FROM analysis_items 
          WHERE schedule_item_id = ? 
          ORDER BY sort_order
        `, [item.id], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      const measurements = await this.getMeasurementsByScheduleItemId(item.id);

      result.push({
        id: item.id,
        code: item.code,
        description: item.description,
        unit: item.unit,
        rate: item.rate,
        quantity: item.quantity,
        amount: item.amount,
        category: item.category,
        remarks: item.remarks,
        analysisItems: analysisItems.map(ai => ({
          id: ai.id,
          code: ai.code,
          description: ai.description,
          unit: ai.unit,
          rate: ai.rate,
          quantity: ai.quantity,
          amount: ai.amount,
          type: ai.type as 'group' | 'resource' | 'sum'
        })),
        measurements,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      });
    }

    return result;
  }

  /**
   * Get measurements by schedule item ID
   */
  private async getMeasurementsByScheduleItemId(scheduleItemId: string): Promise<Measurement[]> {
    const measurements = await new Promise<any[]>((resolve, reject) => {
      this.db.all(`
        SELECT * FROM measurements 
        WHERE schedule_item_id = ? 
        ORDER BY sort_order
      `, [scheduleItemId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const result: Measurement[] = [];

    for (const measurement of measurements) {
      const measurementItems = await new Promise<any[]>((resolve, reject) => {
        this.db.all(`
          SELECT * FROM measurement_items 
          WHERE measurement_id = ? 
          ORDER BY sort_order
        `, [measurement.id], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      result.push({
        id: measurement.id,
        caption: measurement.caption,
        items: measurementItems.map(mi => ({
          id: mi.id,
          type: mi.type as 'heading' | 'custom' | 'abstract',
          itemNos: JSON.parse(mi.item_nos || '[]'),
          records: JSON.parse(mi.records || '[]'),
          remark: mi.remark,
          itemRemarks: JSON.parse(mi.item_remarks || '[]'),
          total: mi.total
        }))
      });
    }

    return result;
  }

  /**
   * Update project total amount
   */
  private async updateProjectTotalAmount(projectId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT SUM(amount) as total_amount 
        FROM schedule_items 
        WHERE project_id = ?
      `, [projectId], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        const totalAmount = row?.total_amount || 0;

        this.db.run(`
          UPDATE projects 
          SET total_amount = ?, updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `, [totalAmount, projectId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  /**
   * Search projects
   */
  async searchProjects(query: string): Promise<Omit<Project, 'scheduleItems'>[]> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT p.*, COUNT(si.id) as item_count
        FROM projects p
        LEFT JOIN schedule_items si ON p.id = si.project_id
        WHERE p.name LIKE ? OR p.description LIKE ? OR p.location LIKE ? OR p.client LIKE ?
        GROUP BY p.id
        ORDER BY p.updated_at DESC
      `, [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const projects = rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          location: row.location,
          client: row.client,
          contractor: row.contractor,
          engineer: row.engineer,
          startDate: row.start_date ? new Date(row.start_date) : undefined,
          endDate: row.end_date ? new Date(row.end_date) : undefined,
          totalAmount: row.total_amount,
          settings: {
            ...JSON.parse(row.settings || '{}'),
            itemCount: row.item_count
          },
          createdAt: new Date(row.created_at),
          updatedAt: new Date(row.updated_at)
        }));

        resolve(projects);
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