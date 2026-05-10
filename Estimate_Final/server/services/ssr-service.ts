import { SSRItem, ImportPreviewItem } from '../models/estimator';
import { Database } from 'sqlite3';
import { promisify } from 'util';

// Fuzzy string matching utility (simplified version)
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,     // deletion
        matrix[j - 1][i] + 1,     // insertion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

function calculateSimilarity(str1: string, str2: string): number {
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1.0;
  
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  return (maxLength - distance) / maxLength;
}

export class SSRService {
  private db: Database;
  private dbReady: Promise<void>;

  constructor(dbPath: string = 'data/ssr_database.db') {
    this.db = new Database(dbPath);
    this.dbReady = this.initializeDatabase();
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        // Create SSR items table
        this.db.run(`
          CREATE TABLE IF NOT EXISTS ssr_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT NOT NULL,
            description TEXT NOT NULL,
            unit TEXT NOT NULL,
            rate REAL NOT NULL,
            year INTEGER NOT NULL,
            category TEXT NOT NULL,
            region TEXT DEFAULT '',
            source TEXT DEFAULT 'DSR',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
        });

        // Create indexes for better search performance
        this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_ssr_description 
          ON ssr_items(description)
        `);

        this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_ssr_code 
          ON ssr_items(code)
        `);

        this.db.run(`
          CREATE INDEX IF NOT EXISTS idx_ssr_category_year 
          ON ssr_items(category, year)
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  }

  /**
   * Import SSR items from data array
   */
  async importSSRItems(items: Omit<SSRItem, 'id'>[]): Promise<{ imported: number; errors: string[] }> {
    await this.dbReady;
    
    const errors: string[] = [];
    let imported = 0;

    const insertStmt = this.db.prepare(`
      INSERT OR REPLACE INTO ssr_items 
      (code, description, unit, rate, year, category, region, source)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const item of items) {
      try {
        await new Promise<void>((resolve, reject) => {
          insertStmt.run([
            item.code,
            item.description,
            item.unit,
            item.rate,
            item.year,
            item.category,
            item.region || '',
            item.source || 'DSR'
          ], (err) => {
            if (err) reject(err);
            else {
              imported++;
              resolve();
            }
          });
        });
      } catch (error) {
        errors.push(`Failed to import item ${item.code}: ${error}`);
      }
    }

    insertStmt.finalize();
    return { imported, errors };
  }

  /**
   * Search SSR items by description with fuzzy matching
   */
  async searchSSRItems(
    query: string, 
    options: {
      threshold?: number;
      limit?: number;
      category?: string;
      year?: number;
    } = {}
  ): Promise<Array<SSRItem & { similarity: number }>> {
    await this.dbReady;

    const { threshold = 0.6, limit = 10, category, year } = options;

    // Build SQL query with optional filters
    let sql = 'SELECT * FROM ssr_items WHERE 1=1';
    const params: any[] = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (year) {
      sql += ' AND year = ?';
      params.push(year);
    }

    sql += ' ORDER BY rate DESC LIMIT 100'; // Get more items for fuzzy matching

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        // Calculate similarity scores
        const results = rows
          .map(row => ({
            ...row,
            similarity: calculateSimilarity(query, row.description)
          }))
          .filter(item => item.similarity >= threshold)
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, limit);

        resolve(results);
      });
    });
  }

  /**
   * Match imported items to SSR database
   */
  async matchImportedItemsToSSR(
    importedItems: ImportPreviewItem[],
    options: {
      threshold?: number;
      autoApplyBestMatch?: boolean;
    } = {}
  ): Promise<{
    matches: Array<ImportPreviewItem & { ssrMatches: Array<SSRItem & { similarity: number }> }>;
    statistics: {
      totalItems: number;
      matchedItems: number;
      matchRate: number;
      averageConfidence: number;
    };
  }> {
    const { threshold = 0.75, autoApplyBestMatch = false } = options;
    
    const matches: Array<ImportPreviewItem & { ssrMatches: Array<SSRItem & { similarity: number }> }> = [];
    let totalConfidence = 0;
    let matchedItems = 0;

    for (const item of importedItems) {
      const ssrMatches = await this.searchSSRItems(item.description, {
        threshold: threshold * 0.8, // Lower threshold for search to get more candidates
        limit: 5
      });

      const itemWithMatches = {
        ...item,
        ssrMatches
      };

      if (ssrMatches.length > 0) {
        matchedItems++;
        totalConfidence += ssrMatches[0].similarity;

        // Auto-apply best match if requested and confidence is high
        if (autoApplyBestMatch && ssrMatches[0].similarity >= threshold) {
          const bestMatch = ssrMatches[0];
          itemWithMatches.ssrMatch = {
            code: bestMatch.code,
            description: bestMatch.description,
            confidence: bestMatch.similarity,
            rate: bestMatch.rate
          };
          
          // Update rate if SSR rate is available
          if (bestMatch.rate > 0) {
            itemWithMatches.rate = bestMatch.rate;
          }
        }
      }

      matches.push(itemWithMatches);
    }

    const statistics = {
      totalItems: importedItems.length,
      matchedItems,
      matchRate: importedItems.length > 0 ? (matchedItems / importedItems.length) * 100 : 0,
      averageConfidence: matchedItems > 0 ? totalConfidence / matchedItems : 0
    };

    return { matches, statistics };
  }

  /**
   * Get SSR items by category and year
   */
  async getSSRItemsByCategory(
    category: string, 
    year?: number,
    limit: number = 100
  ): Promise<SSRItem[]> {
    await this.dbReady;

    let sql = 'SELECT * FROM ssr_items WHERE category = ?';
    const params: any[] = [category];

    if (year) {
      sql += ' AND year = ?';
      params.push(year);
    }

    sql += ' ORDER BY code LIMIT ?';
    params.push(limit);

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows: any[]) => {
        if (err) reject(err);
        else resolve(rows as SSRItem[]);
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
        'SELECT DISTINCT category FROM ssr_items ORDER BY category',
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.category));
        }
      );
    });
  }

  /**
   * Get available years
   */
  async getYears(): Promise<number[]> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.all(
        'SELECT DISTINCT year FROM ssr_items ORDER BY year DESC',
        (err, rows: any[]) => {
          if (err) reject(err);
          else resolve(rows.map(row => row.year));
        }
      );
    });
  }

  /**
   * Get SSR statistics
   */
  async getStatistics(): Promise<{
    totalItems: number;
    categoriesCount: number;
    yearsCount: number;
    averageRate: number;
  }> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.get(`
        SELECT 
          COUNT(*) as totalItems,
          COUNT(DISTINCT category) as categoriesCount,
          COUNT(DISTINCT year) as yearsCount,
          AVG(rate) as averageRate
        FROM ssr_items
      `, (err, row: any) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  /**
   * Update SSR item
   */
  async updateSSRItem(id: string, updates: Partial<SSRItem>): Promise<boolean> {
    await this.dbReady;

    const fields = Object.keys(updates).filter(key => key !== 'id');
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const values = fields.map(field => (updates as any)[field]);
    values.push(id);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE ssr_items SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else resolve(this.changes > 0);
        }
      );
    });
  }

  /**
   * Delete SSR item
   */
  async deleteSSRItem(id: string): Promise<boolean> {
    await this.dbReady;

    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM ssr_items WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes > 0);
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