import * as XLSX from 'xlsx';
import { Workbook, Worksheet } from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ExcelTemplateMetadata {
  filename: string;
  filepath: string;
  format: string;
  sheetCount: number;
  lastModified: Date;
  fileSize: number;
  hasFormulas: boolean;
  namedRanges: string[];
}

export interface TemplateConfig {
  INPUT_INDICATORS: {
    fill_color: string;
    prefix: string;
    named_range_pattern: string;
  };
  OUTPUT_INDICATORS: {
    fill_color: string;
    prefix: string;
    named_range_pattern: string;
  };
}

export interface CellInfo {
  reference: string;
  coordinate: string;
  value: any;
  formula?: string;
  validation?: any;
  fillColor?: string;
}

export interface TemplateStructure {
  sheets: Record<string, {
    input_cells: CellInfo[];
    output_cells: CellInfo[];
    formula_cells: CellInfo[];
    data_validation: any[];
  }>;
  input_fields: Record<string, CellInfo>;
  output_fields: Record<string, CellInfo>;
  formulas: Record<string, string>;
  named_ranges: Record<string, string>;
}

export interface FormulaDependency {
  cell: string;
  dependencies: string[];
}

export class DynamicTemplateService {
  private assetsPath: string;
  private templates: Map<string, ExcelTemplateMetadata> = new Map();
  private templateStructures: Map<string, TemplateStructure> = new Map();
  private formulaDependencies: Map<string, FormulaDependency[]> = new Map();
  
  private config: TemplateConfig = {
    INPUT_INDICATORS: {
      fill_color: 'FFFF00', // Yellow
      prefix: 'IN_',
      named_range_pattern: 'INPUT_.*'
    },
    OUTPUT_INDICATORS: {
      fill_color: '90EE90', // Light green
      prefix: 'OUT_',
      named_range_pattern: 'OUTPUT_.*'
    }
  };

  constructor(assetsPath: string = 'Attached_Assets') {
    this.assetsPath = assetsPath;
    this.ensureAssetsDirectory();
  }

  private ensureAssetsDirectory(): void {
    if (!fs.existsSync(this.assetsPath)) {
      fs.mkdirSync(this.assetsPath, { recursive: true });
    }
  }

  /**
   * Scan for Excel templates in the assets directory
   */
  async scanForTemplates(): Promise<ExcelTemplateMetadata[]> {
    const templates: ExcelTemplateMetadata[] = [];
    
    if (!fs.existsSync(this.assetsPath)) {
      return templates;
    }

    const files = fs.readdirSync(this.assetsPath);
    
    for (const file of files) {
      if (file.match(/\.(xlsx|xls)$/i)) {
        try {
          const filepath = path.join(this.assetsPath, file);
          const metadata = await this.extractMetadata(filepath);
          templates.push(metadata);
          this.templates.set(path.parse(file).name, metadata);
        } catch (error) {
          console.error(`Failed to process template ${file}:`, error);
        }
      }
    }

    return templates;
  }

  /**
   * Extract metadata from Excel file
   */
  private async extractMetadata(filepath: string): Promise<ExcelTemplateMetadata> {
    const stats = fs.statSync(filepath);
    const buffer = fs.readFileSync(filepath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const hasFormulas = this.checkForFormulas(workbook);
    const namedRanges = this.extractNamedRanges(workbook);

    return {
      filename: path.basename(filepath),
      filepath,
      format: path.extname(filepath).toLowerCase(),
      sheetCount: workbook.SheetNames.length,
      lastModified: stats.mtime,
      fileSize: stats.size,
      hasFormulas,
      namedRanges
    };
  }

  /**
   * Check if workbook contains formulas
   */
  private checkForFormulas(workbook: Workbook): boolean {
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = worksheet[cellAddress];
          
          if (cell && cell.f) {
            return true;
          }
        }
      }
    }
    return false;
  }

  /**
   * Extract named ranges from workbook
   */
  private extractNamedRanges(workbook: Workbook): string[] {
    const namedRanges: string[] = [];
    
    if (workbook.Workbook && workbook.Workbook.Names) {
      for (const name of workbook.Workbook.Names) {
        if (name.Name) {
          namedRanges.push(name.Name);
        }
      }
    }
    
    return namedRanges;
  }

  /**
   * Analyze template structure
   */
  async analyzeTemplateStructure(templateName: string): Promise<TemplateStructure> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    // Check if already analyzed
    if (this.templateStructures.has(templateName)) {
      return this.templateStructures.get(templateName)!;
    }

    const buffer = fs.readFileSync(template.filepath);
    const workbook = XLSX.read(buffer, { type: 'buffer' });

    const structure: TemplateStructure = {
      sheets: {},
      input_fields: {},
      output_fields: {},
      formulas: {},
      named_ranges: {}
    };

    // Extract named ranges
    structure.named_ranges = this.extractNamedRangesWithValues(workbook);

    // Analyze each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const sheetAnalysis = this.analyzeSheet(worksheet, sheetName);
      structure.sheets[sheetName] = sheetAnalysis;

      // Aggregate input and output fields
      for (const inputCell of sheetAnalysis.input_cells) {
        structure.input_fields[inputCell.reference] = inputCell;
      }

      for (const outputCell of sheetAnalysis.output_cells) {
        structure.output_fields[outputCell.reference] = outputCell;
      }

      for (const formulaCell of sheetAnalysis.formula_cells) {
        if (formulaCell.formula) {
          structure.formulas[formulaCell.reference] = formulaCell.formula;
        }
      }
    }

    // Build formula dependencies
    this.buildFormulaDependencies(templateName, structure);

    // Cache the structure
    this.templateStructures.set(templateName, structure);

    return structure;
  }

  /**
   * Extract named ranges with their values
   */
  private extractNamedRangesWithValues(workbook: Workbook): Record<string, string> {
    const namedRanges: Record<string, string> = {};
    
    if (workbook.Workbook && workbook.Workbook.Names) {
      for (const name of workbook.Workbook.Names) {
        if (name.Name && name.Ref) {
          namedRanges[name.Name] = name.Ref;
        }
      }
    }
    
    return namedRanges;
  }

  /**
   * Analyze individual sheet
   */
  private analyzeSheet(worksheet: Worksheet, sheetName: string) {
    const sheetInfo = {
      input_cells: [] as CellInfo[],
      output_cells: [] as CellInfo[],
      formula_cells: [] as CellInfo[],
      data_validation: [] as any[]
    };

    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');

    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellAddress];

        if (!cell || cell.v === undefined) continue;

        const cellRef = `${sheetName}!${cellAddress}`;
        const cellInfo: CellInfo = {
          reference: cellRef,
          coordinate: cellAddress,
          value: cell.v,
          formula: cell.f,
          fillColor: this.getCellFillColor(cell)
        };

        // Check for input indicators
        if (this.isInputCell(cell, cellInfo)) {
          sheetInfo.input_cells.push(cellInfo);
        }
        // Check for output indicators
        else if (this.isOutputCell(cell, cellInfo)) {
          sheetInfo.output_cells.push(cellInfo);
        }

        // Check for formulas
        if (cell.f) {
          sheetInfo.formula_cells.push(cellInfo);
        }
      }
    }

    return sheetInfo;
  }

  /**
   * Check if cell is an input cell
   */
  private isInputCell(cell: any, cellInfo: CellInfo): boolean {
    // Check fill color
    if (cellInfo.fillColor === this.config.INPUT_INDICATORS.fill_color) {
      return true;
    }

    // Check value prefix
    if (typeof cell.v === 'string' && cell.v.startsWith(this.config.INPUT_INDICATORS.prefix)) {
      return true;
    }

    return false;
  }

  /**
   * Check if cell is an output cell
   */
  private isOutputCell(cell: any, cellInfo: CellInfo): boolean {
    // Check fill color
    if (cellInfo.fillColor === this.config.OUTPUT_INDICATORS.fill_color) {
      return true;
    }

    // Check value prefix
    if (typeof cell.v === 'string' && cell.v.startsWith(this.config.OUTPUT_INDICATORS.prefix)) {
      return true;
    }

    return false;
  }

  /**
   * Get cell fill color (simplified - XLSX doesn't preserve all formatting)
   */
  private getCellFillColor(cell: any): string | undefined {
    // XLSX library has limited style support
    // This is a simplified implementation
    if (cell.s && cell.s.fill && cell.s.fill.fgColor) {
      return cell.s.fill.fgColor.rgb;
    }
    return undefined;
  }

  /**
   * Build formula dependencies graph
   */
  private buildFormulaDependencies(templateName: string, structure: TemplateStructure): void {
    const dependencies: FormulaDependency[] = [];

    for (const [cellRef, formula] of Object.entries(structure.formulas)) {
      const deps = this.extractDependencies(formula, cellRef);
      dependencies.push({
        cell: cellRef,
        dependencies: deps
      });
    }

    this.formulaDependencies.set(templateName, dependencies);
  }

  /**
   * Extract cell dependencies from formula
   */
  private extractDependencies(formula: string, currentCell: string): string[] {
    const dependencies: string[] = [];
    
    // Simple regex to match cell references (A1, Sheet1!A1, etc.)
    const cellPattern = /(?:([A-Za-z_][A-Za-z0-9_]*)\!)?([A-Z]+[0-9]+)/g;
    let match;

    const currentSheet = currentCell.split('!')[0];

    while ((match = cellPattern.exec(formula)) !== null) {
      const sheetName = match[1] || currentSheet;
      const cellCoord = match[2];
      const fullRef = `${sheetName}!${cellCoord}`;
      
      if (fullRef !== currentCell) {
        dependencies.push(fullRef);
      }
    }

    return dependencies;
  }

  /**
   * Calculate execution order for formulas
   */
  calculateExecutionOrder(templateName: string): string[] {
    const dependencies = this.formulaDependencies.get(templateName);
    if (!dependencies) {
      return [];
    }

    // Simple topological sort
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: string[] = [];

    const visit = (cell: string) => {
      if (visiting.has(cell)) {
        // Circular dependency detected
        console.warn(`Circular dependency detected involving ${cell}`);
        return;
      }
      
      if (visited.has(cell)) {
        return;
      }

      visiting.add(cell);

      const cellDeps = dependencies.find(d => d.cell === cell);
      if (cellDeps) {
        for (const dep of cellDeps.dependencies) {
          visit(dep);
        }
      }

      visiting.delete(cell);
      visited.add(cell);
      result.push(cell);
    };

    for (const dep of dependencies) {
      visit(dep.cell);
    }

    return result;
  }

  /**
   * Process user input and recalculate template
   */
  async processUserInput(
    templateName: string,
    inputs: Record<string, any>
  ): Promise<{ success: boolean; results?: Record<string, any>; error?: string }> {
    try {
      const template = this.templates.get(templateName);
      if (!template) {
        return { success: false, error: `Template ${templateName} not found` };
      }

      const structure = await this.analyzeTemplateStructure(templateName);
      
      // Load workbook
      const buffer = fs.readFileSync(template.filepath);
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // Update input cells
      for (const [cellRef, value] of Object.entries(inputs)) {
        const [sheetName, cellCoord] = cellRef.split('!');
        const worksheet = workbook.Sheets[sheetName];
        
        if (worksheet) {
          worksheet[cellCoord] = { v: value, t: typeof value === 'number' ? 'n' : 's' };
        }
      }

      // Get execution order
      const executionOrder = this.calculateExecutionOrder(templateName);

      // Recalculate formulas (simplified - would need full formula engine)
      const results: Record<string, any> = {};
      
      for (const cellRef of executionOrder) {
        const formula = structure.formulas[cellRef];
        if (formula) {
          // This is a placeholder - would need full Excel formula evaluation
          results[cellRef] = `CALCULATED: ${formula}`;
        }
      }

      // Extract output values
      for (const [cellRef, cellInfo] of Object.entries(structure.output_fields)) {
        const [sheetName, cellCoord] = cellRef.split('!');
        const worksheet = workbook.Sheets[sheetName];
        const cell = worksheet[cellCoord];
        
        if (cell) {
          results[cellRef] = cell.v;
        }
      }

      return { success: true, results };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get template information
   */
  getTemplateInfo(templateName: string): ExcelTemplateMetadata | null {
    return this.templates.get(templateName) || null;
  }

  /**
   * List all available templates
   */
  listTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get input fields for a template
   */
  async getInputFields(templateName: string): Promise<Record<string, CellInfo>> {
    const structure = await this.analyzeTemplateStructure(templateName);
    return structure.input_fields;
  }

  /**
   * Get output fields for a template
   */
  async getOutputFields(templateName: string): Promise<Record<string, CellInfo>> {
    const structure = await this.analyzeTemplateStructure(templateName);
    return structure.output_fields;
  }

  /**
   * Create a new template from existing Excel file
   */
  async createTemplateFromFile(
    filePath: string,
    templateName: string
  ): Promise<{ success: boolean; templateId?: string; error?: string }> {
    try {
      const targetPath = path.join(this.assetsPath, `${templateName}.xlsx`);
      
      // Copy file to assets directory
      fs.copyFileSync(filePath, targetPath);
      
      // Extract metadata
      const metadata = await this.extractMetadata(targetPath);
      this.templates.set(templateName, metadata);

      // Analyze structure
      await this.analyzeTemplateStructure(templateName);

      return { success: true, templateId: templateName };

    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Export template structure as JSON
   */
  async exportTemplateStructure(templateName: string): Promise<any> {
    const structure = await this.analyzeTemplateStructure(templateName);
    const dependencies = this.formulaDependencies.get(templateName) || [];
    const executionOrder = this.calculateExecutionOrder(templateName);

    return {
      template_name: templateName,
      structure,
      dependencies,
      execution_order: executionOrder,
      exported_at: new Date().toISOString()
    };
  }

  /**
   * Validate template structure
   */
  async validateTemplate(templateName: string): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const structure = await this.analyzeTemplateStructure(templateName);

      // Check for input fields
      if (Object.keys(structure.input_fields).length === 0) {
        warnings.push('No input fields detected. Consider marking cells with yellow background or IN_ prefix.');
      }

      // Check for output fields
      if (Object.keys(structure.output_fields).length === 0) {
        warnings.push('No output fields detected. Consider marking cells with green background or OUT_ prefix.');
      }

      // Check for circular dependencies
      const dependencies = this.formulaDependencies.get(templateName) || [];
      const visited = new Set<string>();
      const visiting = new Set<string>();

      const checkCircular = (cell: string): boolean => {
        if (visiting.has(cell)) {
          errors.push(`Circular dependency detected involving ${cell}`);
          return true;
        }
        
        if (visited.has(cell)) {
          return false;
        }

        visiting.add(cell);
        
        const cellDeps = dependencies.find(d => d.cell === cell);
        if (cellDeps) {
          for (const dep of cellDeps.dependencies) {
            if (checkCircular(dep)) {
              return true;
            }
          }
        }

        visiting.delete(cell);
        visited.add(cell);
        return false;
      };

      for (const dep of dependencies) {
        checkCircular(dep.cell);
      }

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown validation error');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
}