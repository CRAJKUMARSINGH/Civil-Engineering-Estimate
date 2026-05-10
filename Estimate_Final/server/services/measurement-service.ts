import { Database } from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';

// Measurement template types
export enum MeasurementType {
  HEADING = 'heading',
  CUSTOM = 'custom', 
  ABSTRACT = 'abstract'
}

export enum MeasurementColumnType {
  MEAS_NO = 1,
  MEAS_L = 2,
  MEAS_DESC = 3,
  MEAS_CUST = 4
}

export interface MeasurementTemplate {
  id: string;
  name: string;
  itemnos_mask: (string | null)[];
  itemnos_mapping: (string | null)[];
  captions: string[];
  columntypes: MeasurementColumnType[];
  captions_udata: string[];
  columntypes_udata: MeasurementColumnType[];
  user_data_default: string[];
  dimensions: [number[], boolean[]];
  total_func: string; // Serialized function
  total_func_item: string; // Serialized function
  cust_funcs: (string | null)[]; // Serialized functions
}

export interface MeasurementItem {
  id: string;
  measurement_id: string;
  type: MeasurementType;
  item_nos: string[];
  records: number[][];
  remark: string;
  item_remarks: string[];
  total: number;
  sort_order: number;
  template_data?: any;
}

export interface Measurement {
  id: string;
  schedule_item_id: string;
  caption: string;
  items: MeasurementItem[];
  sort_order: number;
}

export class MeasurementService {
  private db: Database;
  private dbReady: Promise<void>;
  private templates: Map<string, MeasurementTemplate> = new Map();

  constructor(dbPath: string = 'data/measurements.db') {
    this.db = new Database(dbPath);
    this.dbReady = this.initializeDatabase();
    this.loadBuiltInTemplates();
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create measurement templates table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS measurement_templates (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            itemnos_mask TEXT DEFAULT '[]',
            itemnos_mapping TEXT DEFAULT '[]',
            captions TEXT DEFAULT '[]',
            columntypes TEXT DEFAULT '[]',
            captions_udata TEXT DEFAULT '[]',
            columntypes_udata TEXT DEFAULT '[]',
            user_data_default TEXT DEFAULT '[]',
            dimensions TEXT DEFAULT '[[],[]]',
            total_func TEXT DEFAULT '',
            total_func_item TEXT DEFAULT '',
            cust_funcs TEXT DEFAULT '[]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
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
            template_data TEXT DEFAULT '{}',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (measurement_id) REFERENCES measurements (id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  private loadBuiltInTemplates(): void {
    // Load all built-in measurement templates
    this.loadNLBHTemplate();
    this.loadSteelTableTemplate();
    this.loadRectDuctTemplate();
    this.loadRoundDuctTemplate();
    this.loadTableOfPointsTemplate();
  }

  private loadNLBHTemplate(): void {
    const template: MeasurementTemplate = {
      id: 'nlbh_template',
      name: 'Item NLBH',
      itemnos_mask: [null],
      itemnos_mapping: [null],
      captions: ['Description', 'Breakup', 'No', 'L', 'B', 'H', 'Total'],
      columntypes: [
        MeasurementColumnType.MEAS_DESC,
        MeasurementColumnType.MEAS_CUST,
        MeasurementColumnType.MEAS_L,
        MeasurementColumnType.MEAS_L,
        MeasurementColumnType.MEAS_L,
        MeasurementColumnType.MEAS_L,
        MeasurementColumnType.MEAS_CUST
      ],
      captions_udata: [],
      columntypes_udata: [],
      user_data_default: [],
      dimensions: [[200, 150, 80, 80, 80, 80, 100], [true, false, false, false, false, false, false]],
      total_func: `
        function(itemList) {
          let total = [0];
          for (const item of itemList) {
            if (item) {
              total[0] += item.total || 0;
            }
          }
          return [Math.round(total[0] * 1000) / 1000];
        }
      `,
      total_func_item: `
        function(values) {
          const data = values.slice(2, 6);
          const nonzero = data.filter(x => x !== 0);
          let total = 1;
          for (const x of nonzero) {
            total *= x;
          }
          return nonzero.length === 0 ? [0] : [Math.round(total * 1000) / 1000];
        }
      `,
      cust_funcs: [
        null,
        `function(values) {
          const dataStr = values.slice(2, 6);
          let breakup = "[";
          for (const x of dataStr) {
            if (x !== "" && x !== '0') {
              breakup += x + ",";
            } else {
              breakup += ',';
            }
          }
          return breakup.slice(0, -1) + "]";
        }`,
        null, null, null, null,
        `function(values) {
          const data = values.slice(2, 6).map(x => {
            try { return parseFloat(x) || 0; } catch { return 0; }
          });
          const nonzero = data.filter(x => x !== 0);
          let total = 1;
          for (const x of nonzero) {
            total *= x;
          }
          return nonzero.length === 0 ? '0' : String(Math.round(total * 1000) / 1000);
        }`
      ]
    };
    this.templates.set(template.id, template);
  }

  private loadSteelTableTemplate(): void {
    const template: MeasurementTemplate = {
      id: 'steel_table_template',
      name: 'Civil: Table of Steel Bars',
      itemnos_mask: [null],
      itemnos_mapping: [null],
      captions: ['Description', 'N1', 'N2', 'L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6'],
      columntypes: [
        MeasurementColumnType.MEAS_DESC,
        MeasurementColumnType.MEAS_NO,
        MeasurementColumnType.MEAS_NO,
        MeasurementColumnType.MEAS_L,
        MeasurementColumnType.MEAS_L,
        MeasurementColumnType.MEAS_L,
        MeasurementColumnType.MEAS_L,
        MeasurementColumnType.MEAS_L,
        MeasurementColumnType.MEAS_L,
        MeasurementColumnType.MEAS_CUST,
        MeasurementColumnType.MEAS_CUST,
        MeasurementColumnType.MEAS_CUST,
        MeasurementColumnType.MEAS_CUST,
        MeasurementColumnType.MEAS_CUST,
        MeasurementColumnType.MEAS_CUST,
        MeasurementColumnType.MEAS_CUST
      ],
      captions_udata: ['Item 1 Label', 'Item 2 Label', 'Item 3 Label', 'Item 4 Label', 'Item 5 Label', 'Item 6 Label',
        'Item 1 constant', 'Item 2 constant', 'Item 3 constant', 'Item 4 constant', 'Item 5 constant', 'Item 6 constant'],
      columntypes_udata: [
        MeasurementColumnType.MEAS_DESC, MeasurementColumnType.MEAS_DESC, MeasurementColumnType.MEAS_DESC,
        MeasurementColumnType.MEAS_DESC, MeasurementColumnType.MEAS_DESC, MeasurementColumnType.MEAS_DESC,
        MeasurementColumnType.MEAS_L, MeasurementColumnType.MEAS_L, MeasurementColumnType.MEAS_L,
        MeasurementColumnType.MEAS_L, MeasurementColumnType.MEAS_L, MeasurementColumnType.MEAS_L
      ],
      user_data_default: ['8mm', '10mm', '12mm', '16mm', '20mm', '25mm',
        '0.395', '0.616', '0.888', '1.579', '2.467', '3.855'],
      dimensions: [[200, 40, 40, 50, 50, 50, 50, 50, 50, 100, 50, 50, 50, 50, 50, 50],
      [true, false, false, false, false, false, false, false, false, false, false, false, false, false, false, false]],
      total_func: `
        function(itemList, userdata) {
          let total = [0, 0, 0, 0, 0, 0];
          for (const item of itemList) {
            if (item && item.totals) {
              for (let i = 0; i < item.totals.length; i++) {
                total[i] += item.totals[i] || 0;
              }
            }
          }
          let grandtotal = 0;
          for (let i = 0; i < total.length; i++) {
            try {
              grandtotal += total[i] * parseFloat(userdata[6 + i] || 0);
            } catch {}
          }
          return [Math.round(grandtotal * 1000) / 1000];
        }
      `,
      total_func_item: `
        function(values) {
          const n = values[1] * values[2];
          const dataL = values.slice(3, 9);
          return dataL.map(l => Math.round(l * n * 100) / 100);
        }
      `,
      cust_funcs: Array(16).fill(null).map((_, i) => {
        if (i === 9) {
          return `function(values) {
            try {
              if (values[0].includes('Qty B/F')) return '';
              let l = '';
              for (const value of values.slice(3, 9)) {
                if (value !== '' && value !== '0' && value !== '0.0') {
                  l += parseFloat(value) + ',';
                }
              }
              return l.slice(0, -1);
            } catch { return ''; }
          }`;
        } else if (i >= 10) {
          const colIndex = i - 7;
          return `function(values) {
            try {
              const n1 = parseFloat(values[1]) || 0;
              const n2 = parseFloat(values[2]) || 0;
              const l = parseFloat(values[${colIndex}]) || 0;
              return String(Math.round(n1 * n2 * l * 100) / 100);
            } catch { return '0'; }
          }`;
        }
        return null;
      })
    };
    this.templates.set(template.id, template);
  }

  private loadRectDuctTemplate(): void {
    const template: MeasurementTemplate = {
      id: 'rect_duct_template',
      name: 'Elec: A/C Rectangular Ducting',
      itemnos_mask: [null],
      itemnos_mapping: [null],
      captions: ['Description', 'H1(mm)', 'W1(mm)', 'H2(mm)', 'W2(mm)', 'L1(mm)', 'L2(mm)', 'Total'],
      columntypes: [
        MeasurementColumnType.MEAS_DESC,
        MeasurementColumnType.MEAS_NO,
        MeasurementColumnType.MEAS_NO,
        MeasurementColumnType.MEAS_NO,
        MeasurementColumnType.MEAS_NO,
        MeasurementColumnType.MEAS_NO,
        MeasurementColumnType.MEAS_NO,
        MeasurementColumnType.MEAS_CUST
      ],
      captions_udata: [],
      columntypes_udata: [],
      user_data_default: [],
      dimensions: [[300, 80, 80, 80, 80, 80, 80, 100], [true, false, false, false, false, false, false, false]],
      total_func: `
        function(itemList) {
          let total = [0];
          for (const item of itemList) {
            if (item) {
              total[0] += item.total || 0;
            }
          }
          return [Math.round(total[0] * 1000) / 1000];
        }
      `,
      total_func_item: `
        function(values) {
          const data = values.slice(1, 7);
          const total = Math.round((data[0] + data[1] + data[2] + data[3]) * (data[4] + data[5]) / 2000000 * 1000) / 1000;
          return [total];
        }
      `,
      cust_funcs: [
        null, null, null, null, null, null, null,
        `function(values) {
          const data = values.slice(1, 7).map(x => parseFloat(x) || 0);
          const total = Math.round((data[0] + data[1] + data[2] + data[3]) * (data[4] + data[5]) / 2000000 * 1000) / 1000;
          return String(total);
        }`
      ]
    };
    this.templates.set(template.id, template);
  }

  private loadRoundDuctTemplate(): void {
    const template: MeasurementTemplate = {
      id: 'round_duct_template',
      name: 'Elec: A/C Round Ducting',
      itemnos_mask: [null],
      itemnos_mapping: [null],
      captions: ['Description', 'D1(mm)', 'D2(mm)', 'L1(mm)', 'L2(mm)', 'Total'],
      columntypes: [
        MeasurementColumnType.MEAS_DESC,
        MeasurementColumnType.MEAS_NO,
        MeasurementColumnType.MEAS_NO,
        MeasurementColumnType.MEAS_NO,
        MeasurementColumnType.MEAS_NO,
        MeasurementColumnType.MEAS_CUST
      ],
      captions_udata: [],
      columntypes_udata: [],
      user_data_default: [],
      dimensions: [[300, 80, 80, 80, 80, 100], [true, false, false, false, false, false]],
      total_func: `
        function(itemList) {
          let total = [0];
          for (const item of itemList) {
            if (item) {
              total[0] += item.total || 0;
            }
          }
          return [Math.round(total[0] * 1000) / 1000];
        }
      `,
      total_func_item: `
        function(values) {
          const data = values.slice(1, 5);
          const total = Math.round(Math.PI * (data[0] + data[1]) * (data[2] + data[3]) / 4000000 * 1000) / 1000;
          return [total];
        }
      `,
      cust_funcs: [
        null, null, null, null, null,
        `function(values) {
          const data = values.slice(1, 5).map(x => parseFloat(x) || 0);
          const total = Math.round(Math.PI * (data[0] + data[1]) * (data[2] + data[3]) / 4000000 * 1000) / 1000;
          return String(total);
        }`
      ]
    };
    this.templates.set(template.id, template);
  }

  private loadTableOfPointsTemplate(): void {
    const template: MeasurementTemplate = {
      id: 'table_of_points_template',
      name: 'Elec: Table of Points',
      itemnos_mask: [null],
      itemnos_mapping: [null],
      captions: ['Description', 'No', 'Total'],
      columntypes: [
        MeasurementColumnType.MEAS_DESC,
        MeasurementColumnType.MEAS_NO,
        MeasurementColumnType.MEAS_CUST
      ],
      captions_udata: [],
      columntypes_udata: [],
      user_data_default: [],
      dimensions: [[300, 80, 100], [true, false, false]],
      total_func: `
        function(itemList) {
          let total = [0];
          for (const item of itemList) {
            if (item) {
              total[0] += item.total || 0;
            }
          }
          return [Math.round(total[0] * 1000) / 1000];
        }
      `,
      total_func_item: `
        function(values) {
          const no = parseFloat(values[1]) || 0;
          return [no];
        }
      `,
      cust_funcs: [
        null, null,
        `function(values) {
          const no = parseFloat(values[1]) || 0;
          return String(no);
        }`
      ]
    };
    this.templates.set(template.id, template);
  }

  /**
   * Get all available measurement templates
   */
  async getTemplates(): Promise<MeasurementTemplate[]> {
    await this.dbReady;
    return Array.from(this.templates.values());
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<MeasurementTemplate | null> {
    await this.dbReady;
    return this.templates.get(templateId) || null;
  }

  /**
   * Create a new measurement for a schedule item
   */
  async createMeasurement(scheduleItemId: string, caption: string): Promise<string> {
    await this.dbReady;

    const measurementId = uuidv4();

    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO measurements (id, schedule_item_id, caption, sort_order)
        VALUES (?, ?, ?, 0)
      `, [measurementId, scheduleItemId, caption], (err) => {
        if (err) reject(err);
        else resolve(measurementId);
      });
    });
  }

  /**
   * Add measurement item to a measurement
   */
  async addMeasurementItem(
    measurementId: string,
    type: MeasurementType,
    data: {
      item_nos?: string[];
      records?: number[][];
      remark?: string;
      item_remarks?: string[];
      template_data?: any;
    }
  ): Promise<string> {
    await this.dbReady;

    const itemId = uuidv4();
    const { item_nos = [], records = [], remark = '', item_remarks = [], template_data = {} } = data;

    // Calculate total based on type and template
    let total = 0;
    if (type === MeasurementType.CUSTOM && template_data.templateId) {
      const template = this.templates.get(template_data.templateId);
      if (template && template.total_func_item) {
        try {
          const func = new Function('return ' + template.total_func_item)();
          const result = func(template_data.values || []);
          total = Array.isArray(result) ? result[0] || 0 : result || 0;
        } catch (error) {
          console.error('Error calculating total:', error);
        }
      }
    }

    return new Promise((resolve, reject) => {
      this.db.run(`
        INSERT INTO measurement_items 
        (id, measurement_id, type, item_nos, records, remark, item_remarks, total, template_data, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
      `, [
        itemId,
        measurementId,
        type,
        JSON.stringify(item_nos),
        JSON.stringify(records),
        remark,
        JSON.stringify(item_remarks),
        total,
        JSON.stringify(template_data)
      ], (err) => {
        if (err) reject(err);
        else resolve(itemId);
      });
    });
  }

  /**
   * Get measurements for a schedule item
   */
  async getMeasurementsByScheduleItem(scheduleItemId: string): Promise<Measurement[]> {
    await this.dbReady;

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
      const items = await new Promise<any[]>((resolve, reject) => {
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
        schedule_item_id: measurement.schedule_item_id,
        caption: measurement.caption,
        sort_order: measurement.sort_order,
        items: items.map(item => ({
          id: item.id,
          measurement_id: item.measurement_id,
          type: item.type as MeasurementType,
          item_nos: JSON.parse(item.item_nos || '[]'),
          records: JSON.parse(item.records || '[]'),
          remark: item.remark,
          item_remarks: JSON.parse(item.item_remarks || '[]'),
          total: item.total,
          sort_order: item.sort_order,
          template_data: JSON.parse(item.template_data || '{}')
        }))
      });
    }

    return result;
  }

  /**
   * Update measurement item
   */
  async updateMeasurementItem(itemId: string, updates: Partial<MeasurementItem>): Promise<boolean> {
    await this.dbReady;

    const fields = Object.keys(updates).filter(key => key !== 'id');
    if (fields.length === 0) return false;

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => {
      const value = (updates as any)[field];
      if (['item_nos', 'records', 'item_remarks', 'template_data'].includes(field)) {
        return JSON.stringify(value);
      }
      return value;
    });
    values.push(itemId);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE measurement_items SET ${setClause} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Delete measurement
   */
  async deleteMeasurement(measurementId: string): Promise<boolean> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM measurements WHERE id = ?', [measurementId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  /**
   * Delete measurement item
   */
  async deleteMeasurementItem(itemId: string): Promise<boolean> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM measurement_items WHERE id = ?', [itemId], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
      });
    });
  }

  /**
   * Calculate measurement totals for a schedule item
   */
  async calculateMeasurementTotals(scheduleItemId: string): Promise<{ totalQuantity: number; measurements: Measurement[] }> {
    const measurements = await this.getMeasurementsByScheduleItem(scheduleItemId);
    
    let totalQuantity = 0;
    
    for (const measurement of measurements) {
      for (const item of measurement.items) {
        totalQuantity += item.total || 0;
      }
    }

    return {
      totalQuantity: Math.round(totalQuantity * 1000) / 1000,
      measurements
    };
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