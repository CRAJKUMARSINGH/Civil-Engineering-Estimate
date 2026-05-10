import * as XLSX from 'xlsx';
import { Workbook, Worksheet } from 'xlsx';
import { ExcelAnalysis, ImportPreviewItem, ScheduleItem } from '../models/estimator';
import { Decimal } from 'decimal.js';

export class ExcelService {
  private requiredColumns = ['Code', 'Description', 'Unit', 'Rate', 'Quantity'];
  private optionalColumns = ['Category', 'Remarks'];

  /**
   * Analyze Excel file structure and return metadata
   */
  async analyzeExcelFile(buffer: Buffer, filename: string): Promise<ExcelAnalysis> {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      const analysis: ExcelAnalysis = {
        filename,
        sheets: [],
        totalSheets: workbook.SheetNames.length,
        recommendedSheet: undefined,
        fileSize: buffer.length,
        success: true,
        errors: []
      };

      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const sheetInfo = this.analyzeWorksheet(worksheet, sheetName);
        analysis.sheets.push(sheetInfo);

        // Determine recommended sheet
        if (!analysis.recommendedSheet) {
          const keywords = ['schedule', 'boq', 'estimate', 'item', 'abs'];
          if (keywords.some(keyword => sheetName.toLowerCase().includes(keyword))) {
            analysis.recommendedSheet = sheetName;
          }
        }
      }

      // If no recommended sheet found, use first sheet with data
      if (!analysis.recommendedSheet && analysis.sheets.length > 0) {
        const sheetWithData = analysis.sheets.find(sheet => sheet.dataRows > 0);
        if (sheetWithData) {
          analysis.recommendedSheet = sheetWithData.name;
        }
      }

      return analysis;
    } catch (error) {
      return {
        filename,
        sheets: [],
        totalSheets: 0,
        fileSize: buffer.length,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Analyze individual worksheet structure
   */
  private analyzeWorksheet(worksheet: Worksheet, sheetName: string) {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    const maxRow = range.e.r + 1;
    const maxColumn = range.e.c + 1;

    // Count rows with data
    let dataRows = 0;
    for (let row = 0; row <= range.e.r; row++) {
      let hasData = false;
      for (let col = 0; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (worksheet[cellAddress] && worksheet[cellAddress].v) {
          hasData = true;
          break;
        }
      }
      if (hasData) dataRows++;
    }

    // Check for headers
    const hasHeaders = this.detectHeaders(worksheet);
    
    // Recommend for import based on content
    const recommendedForImport = dataRows > 1 && hasHeaders && 
      (sheetName.toLowerCase().includes('schedule') || 
       sheetName.toLowerCase().includes('boq') ||
       sheetName.toLowerCase().includes('estimate'));

    return {
      name: sheetName,
      maxRow,
      maxColumn,
      dataRows,
      hasHeaders,
      recommendedForImport
    };
  }

  /**
   * Detect if worksheet has header row
   */
  private detectHeaders(worksheet: Worksheet): boolean {
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
    if (range.e.r < 1) return false;

    // Check first row for header-like content
    for (let col = 0; col <= Math.min(range.e.c, 10); col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
      const cell = worksheet[cellAddress];
      if (cell && typeof cell.v === 'string') {
        const value = cell.v.toLowerCase();
        if (this.requiredColumns.some(header => 
          value.includes(header.toLowerCase()) || 
          header.toLowerCase().includes(value)
        )) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Preview import from Excel file
   */
  async previewImport(buffer: Buffer, sheetName?: string): Promise<ImportPreviewItem[]> {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Use specified sheet or first sheet
    const targetSheet = sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[targetSheet];
    
    if (!worksheet) {
      throw new Error(`Sheet "${targetSheet}" not found`);
    }

    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = jsonData[0] as string[];
    
    // Map column indices
    const columnMap = this.mapColumns(headers);
    
    const previewItems: ImportPreviewItem[] = [];
    
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      if (!row || row.length === 0) continue;

      const item = this.parseRowToPreviewItem(row, columnMap, i + 1);
      if (item) {
        previewItems.push(item);
      }
    }

    return previewItems;
  }

  /**
   * Map Excel columns to expected fields
   */
  private mapColumns(headers: string[]): Record<string, number> {
    const columnMap: Record<string, number> = {};
    
    const fieldMappings = {
      code: ['code', 'item code', 'sl no', 'sr no', 'no'],
      description: ['description', 'item description', 'particulars', 'work description'],
      unit: ['unit', 'uom', 'unit of measurement'],
      rate: ['rate', 'unit rate', 'cost', 'price'],
      quantity: ['quantity', 'qty', 'amount', 'nos'],
      category: ['category', 'type', 'group'],
      remarks: ['remarks', 'notes', 'comment']
    };

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]?.toString().toLowerCase().trim();
      if (!header) continue;

      for (const [field, patterns] of Object.entries(fieldMappings)) {
        if (patterns.some(pattern => 
          header.includes(pattern) || pattern.includes(header)
        )) {
          columnMap[field] = i;
          break;
        }
      }
    }

    return columnMap;
  }

  /**
   * Parse Excel row to preview item
   */
  private parseRowToPreviewItem(
    row: any[], 
    columnMap: Record<string, number>, 
    rowNumber: number
  ): ImportPreviewItem | null {
    const getValue = (field: string): string => {
      const index = columnMap[field];
      return index !== undefined ? (row[index]?.toString().trim() || '') : '';
    };

    const getNumericValue = (field: string): number => {
      const value = getValue(field);
      if (!value) return 0;
      
      // Clean numeric value (remove currency symbols, commas, etc.)
      const cleaned = value.replace(/[₹$,\s]/g, '');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? 0 : parsed;
    };

    const code = getValue('code');
    const description = getValue('description');
    
    // Skip rows without essential data
    if (!code && !description) return null;

    const item: ImportPreviewItem = {
      rowNumber,
      code: code || `ITEM_${rowNumber}`,
      description: description || 'No description',
      unit: getValue('unit') || 'Each',
      rate: getNumericValue('rate'),
      quantity: getNumericValue('quantity') || 1,
      category: getValue('category'),
      remarks: getValue('remarks'),
      selected: true,
      validationErrors: []
    };

    // Validate item
    this.validatePreviewItem(item);

    return item;
  }

  /**
   * Validate preview item and add errors
   */
  private validatePreviewItem(item: ImportPreviewItem): void {
    if (!item.code.trim()) {
      item.validationErrors.push('Missing item code');
    }
    
    if (!item.description.trim()) {
      item.validationErrors.push('Missing description');
    }
    
    if (!item.unit.trim()) {
      item.validationErrors.push('Missing unit');
    }
    
    if (item.rate <= 0) {
      item.validationErrors.push('Invalid or missing rate');
    }
    
    if (item.quantity < 0) {
      item.validationErrors.push('Invalid quantity');
    }
  }

  /**
   * Convert preview items to schedule items
   */
  convertToScheduleItems(previewItems: ImportPreviewItem[]): ScheduleItem[] {
    return previewItems
      .filter(item => item.selected && item.validationErrors.length === 0)
      .map(item => ({
        code: item.code,
        description: item.description,
        unit: item.unit,
        rate: item.rate,
        quantity: item.quantity,
        amount: item.rate * item.quantity,
        category: item.category,
        remarks: item.remarks,
        analysisItems: [],
        measurements: []
      }));
  }

  /**
   * Export schedule items to Excel
   */
  async exportToExcel(
    scheduleItems: ScheduleItem[], 
    projectInfo?: any,
    options?: {
      includeAnalysis?: boolean;
      includeMeasurements?: boolean;
      template?: string;
    }
  ): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Create main schedule sheet
    const scheduleData = this.prepareScheduleData(scheduleItems, projectInfo);
    const scheduleSheet = XLSX.utils.aoa_to_sheet(scheduleData);
    
    // Apply formatting
    this.applyExcelFormatting(scheduleSheet, scheduleData.length);
    
    XLSX.utils.book_append_sheet(workbook, scheduleSheet, 'Schedule');

    // Add analysis sheet if requested
    if (options?.includeAnalysis) {
      const analysisData = this.prepareAnalysisData(scheduleItems);
      const analysisSheet = XLSX.utils.aoa_to_sheet(analysisData);
      XLSX.utils.book_append_sheet(workbook, analysisSheet, 'Analysis');
    }

    // Add measurements sheet if requested
    if (options?.includeMeasurements) {
      const measurementData = this.prepareMeasurementData(scheduleItems);
      const measurementSheet = XLSX.utils.aoa_to_sheet(measurementData);
      XLSX.utils.book_append_sheet(workbook, measurementSheet, 'Measurements');
    }

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  /**
   * Prepare schedule data for Excel export
   */
  private prepareScheduleData(scheduleItems: ScheduleItem[], projectInfo?: any): any[][] {
    const data: any[][] = [];

    // Add project header if provided
    if (projectInfo) {
      data.push([`Project: ${projectInfo.name || 'Untitled Project'}`]);
      data.push([`Location: ${projectInfo.location || ''}`]);
      data.push([`Client: ${projectInfo.client || ''}`]);
      data.push(['']); // Empty row
    }

    // Add headers
    data.push([
      'Sl. No.',
      'Item Code',
      'Description',
      'Unit',
      'Quantity',
      'Rate',
      'Amount',
      'Category',
      'Remarks'
    ]);

    // Add schedule items
    scheduleItems.forEach((item, index) => {
      data.push([
        index + 1,
        item.code,
        item.description,
        item.unit,
        item.quantity,
        item.rate,
        item.amount || (item.quantity * item.rate),
        item.category || '',
        item.remarks || ''
      ]);
    });

    // Add total row
    const totalAmount = scheduleItems.reduce((sum, item) => 
      sum + (item.amount || (item.quantity * item.rate)), 0
    );
    
    data.push(['']); // Empty row
    data.push(['', '', '', '', '', 'TOTAL:', totalAmount, '', '']);

    return data;
  }

  /**
   * Prepare analysis data for Excel export
   */
  private prepareAnalysisData(scheduleItems: ScheduleItem[]): any[][] {
    const data: any[][] = [];
    
    data.push(['Rate Analysis']);
    data.push(['']);
    
    scheduleItems.forEach(item => {
      if (item.analysisItems && item.analysisItems.length > 0) {
        data.push([`${item.code} - ${item.description}`]);
        data.push(['Code', 'Description', 'Unit', 'Quantity', 'Rate', 'Amount']);
        
        item.analysisItems.forEach(analysisItem => {
          data.push([
            analysisItem.code || '',
            analysisItem.description,
            analysisItem.unit,
            analysisItem.quantity,
            analysisItem.rate,
            analysisItem.amount || (analysisItem.quantity * analysisItem.rate)
          ]);
        });
        
        data.push(['']); // Empty row between items
      }
    });

    return data;
  }

  /**
   * Prepare measurement data for Excel export
   */
  private prepareMeasurementData(scheduleItems: ScheduleItem[]): any[][] {
    const data: any[][] = [];
    
    data.push(['Measurements']);
    data.push(['']);
    
    scheduleItems.forEach(item => {
      if (item.measurements && item.measurements.length > 0) {
        data.push([`${item.code} - ${item.description}`]);
        
        item.measurements.forEach(measurement => {
          data.push([measurement.caption]);
          data.push(['Item No.', 'Records', 'Total', 'Remarks']);
          
          measurement.items.forEach(measItem => {
            const total = measItem.total || 0;
            data.push([
              measItem.itemNos.join(', '),
              measItem.records.map(record => record.join(' x ')).join(' + '),
              total,
              measItem.remark
            ]);
          });
          
          data.push(['']); // Empty row
        });
      }
    });

    return data;
  }

  /**
   * Apply basic Excel formatting
   */
  private applyExcelFormatting(worksheet: Worksheet, dataLength: number): void {
    // Set column widths
    const columnWidths = [
      { wch: 8 },  // Sl. No.
      { wch: 15 }, // Item Code
      { wch: 50 }, // Description
      { wch: 10 }, // Unit
      { wch: 12 }, // Quantity
      { wch: 12 }, // Rate
      { wch: 15 }, // Amount
      { wch: 15 }, // Category
      { wch: 20 }  // Remarks
    ];
    
    worksheet['!cols'] = columnWidths;

    // Set row heights for better readability
    const rowHeights = Array(dataLength).fill({ hpt: 20 });
    worksheet['!rows'] = rowHeights;
  }
}