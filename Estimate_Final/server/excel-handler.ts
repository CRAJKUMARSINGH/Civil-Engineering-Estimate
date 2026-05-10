import * as XLSX from 'xlsx';
import { SSRItem } from '@shared/schema';

export interface ExcelWorkbookData {
  workbook: XLSX.WorkBook;
  sheetNames: string[];
}

export interface SheetRow {
  [key: string]: any;
}

export class ExcelHandler {
  /**
   * Parse Excel file buffer and return workbook data
   */
  static parseExcelFile(buffer: Buffer): ExcelWorkbookData {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: true });
    return {
      workbook,
      sheetNames: workbook.SheetNames,
    };
  }

  /**
   * Find PART-X sheet pairs (ABSTRACT OF COST and MEASUREMENTS)
   */
  static findPartSheets(sheetNames: string[]): { partNumber: number; costSheet: string; measurementSheet: string }[] {
    const parts: { partNumber: number; costSheet: string; measurementSheet: string }[] = [];
    
    const costPattern = /ABSTRACT\s+OF\s+COST.*PART[-\s]*(\d+)/i;
    const measurementPattern = /MEASUREMENT.*PART[-\s]*(\d+)/i;

    const costSheets = sheetNames.filter(name => costPattern.test(name));
    const measurementSheets = sheetNames.filter(name => measurementPattern.test(name));

    costSheets.forEach(costSheet => {
      const match = costSheet.match(costPattern);
      if (match) {
        const partNumber = parseInt(match[1]);
        const measurementSheet = measurementSheets.find(ms => {
          const msMatch = ms.match(measurementPattern);
          return msMatch && parseInt(msMatch[1]) === partNumber;
        });

        if (measurementSheet) {
          parts.push({ partNumber, costSheet, measurementSheet });
        }
      }
    });

    return parts;
  }

  /**
   * Insert SSR item into ABSTRACT OF COST sheet
   */
  static insertSSRItemToCostSheet(
    workbook: XLSX.WorkBook,
    sheetName: string,
    ssrItem: SSRItem,
    insertAtRow: number
  ): void {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) throw new Error(`Sheet ${sheetName} not found`);

    // Convert sheet to JSON to manipulate
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Find the next serial number
    let maxSerial = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] && data[i][0] && typeof data[i][0] === 'number') {
        maxSerial = Math.max(maxSerial, data[i][0]);
      }
    }
    const newSerial = maxSerial + 1;

    // Create new row with SSR item data
    // Typical structure: [Serial, Description, Unit, Quantity, Rate, Amount]
    const newRow = [
      newSerial,
      ssrItem.description,
      ssrItem.unit,
      '', // Empty quantity (to be filled by user)
      parseFloat(ssrItem.rate),
      '', // Empty amount (will be calculated)
    ];

    // Insert the row
    if (insertAtRow >= data.length) {
      data.push(newRow);
    } else {
      data.splice(insertAtRow, 0, newRow);
    }

    // Convert back to worksheet
    const newWorksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Preserve column widths if they exist
    if (worksheet['!cols']) {
      newWorksheet['!cols'] = worksheet['!cols'];
    }
    
    // Preserve row heights if they exist
    if (worksheet['!rows']) {
      newWorksheet['!rows'] = worksheet['!rows'];
    }

    workbook.Sheets[sheetName] = newWorksheet;
  }

  /**
   * Insert SSR item and blank measurement rows into MEASUREMENTS sheet
   */
  static insertSSRItemToMeasurementSheet(
    workbook: XLSX.WorkBook,
    sheetName: string,
    ssrItem: SSRItem,
    serialNumber: number,
    blankRowsCount: number = 3
  ): void {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) throw new Error(`Sheet ${sheetName} not found`);

    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Create header row with SSR description
    // Typical structure: [Serial, Description, Length, Breadth, Height, Quantity, Unit]
    const headerRow = [
      serialNumber,
      ssrItem.description,
      '', '', '', '', ssrItem.unit
    ];

    // Create blank measurement rows
    const blankRows: any[][] = [];
    for (let i = 0; i < blankRowsCount; i++) {
      blankRows.push([
        '', // Serial (empty for measurement rows)
        '', // Description (empty for sub-items)
        '', // Length
        '', // Breadth
        '', // Height
        '', // Quantity
        ''  // Unit
      ]);
    }

    // Find insertion point (append to end for now)
    const insertPoint = data.length;
    
    // Insert header and blank rows
    data.splice(insertPoint, 0, headerRow, ...blankRows);

    // Convert back to worksheet
    const newWorksheet = XLSX.utils.aoa_to_sheet(data);
    
    // Preserve formatting
    if (worksheet['!cols']) {
      newWorksheet['!cols'] = worksheet['!cols'];
    }
    if (worksheet['!rows']) {
      newWorksheet['!rows'] = worksheet['!rows'];
    }

    workbook.Sheets[sheetName] = newWorksheet;
  }

  /**
   * Insert SSR item into both ABSTRACT OF COST and MEASUREMENTS sheets
   */
  static insertSSRItemToPartSheets(
    workbook: XLSX.WorkBook,
    costSheetName: string,
    measurementSheetName: string,
    ssrItem: SSRItem,
    insertAtRow?: number
  ): { serialNumber: number } {
    // Insert into cost sheet first to get the serial number
    const costSheet = workbook.Sheets[costSheetName];
    const data: any[][] = XLSX.utils.sheet_to_json(costSheet, { header: 1 });
    
    // Find the next serial number
    let maxSerial = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] && data[i][0] && typeof data[i][0] === 'number') {
        maxSerial = Math.max(maxSerial, data[i][0]);
      }
    }
    const serialNumber = maxSerial + 1;

    // Insert into cost sheet
    this.insertSSRItemToCostSheet(workbook, costSheetName, ssrItem, insertAtRow || data.length);

    // Insert into measurement sheet with blank rows
    this.insertSSRItemToMeasurementSheet(workbook, measurementSheetName, ssrItem, serialNumber, 3);

    return { serialNumber };
  }

  /**
   * Generate Excel file buffer from workbook
   */
  static generateExcelBuffer(workbook: XLSX.WorkBook): Buffer {
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', cellStyles: true });
    return buffer;
  }

  /**
   * Get sheet data as JSON
   */
  static getSheetData(workbook: XLSX.WorkBook, sheetName: string): any[] {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return [];
    return XLSX.utils.sheet_to_json(worksheet);
  }
}
