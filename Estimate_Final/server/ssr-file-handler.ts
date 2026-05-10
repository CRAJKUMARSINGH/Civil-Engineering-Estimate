import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { SSRItem } from '@shared/schema';

export interface HierarchicalSSRItem extends SSRItem {
    level: number; // 0 = main, 1 = sub, 2 = sub-sub, 3 = sub-sub-sub
    parentCode?: string;
    fullDescription: string; // Combined description from all parent levels
    hierarchy: string[]; // Array of parent descriptions
    indentLevel: number; // Visual indentation level
}

export interface SSRFileData {
    workbook: XLSX.WorkBook;
    sheetNames: string[];
    items: SSRItem[];
    hierarchicalItems: HierarchicalSSRItem[];
    metadata: {
        totalItems: number;
        categories: string[];
        sheets: { name: string; itemCount: number }[];
        hasHierarchy: boolean;
        maxLevel: number;
    };
}

export class SSRFileHandler {
    private static UPLOAD_DIR = 'uploads/ssr-files';

    /**
     * Ensure upload directory exists
     */
    static ensureUploadDir(): void {
        if (!fs.existsSync(this.UPLOAD_DIR)) {
            fs.mkdirSync(this.UPLOAD_DIR, { recursive: true });
        }
    }

    /**
     * Save uploaded file to disk
     */
    static saveFile(buffer: Buffer, originalName: string): string {
        this.ensureUploadDir();

        const timestamp = Date.now();
        const ext = path.extname(originalName);
        const baseName = path.basename(originalName, ext);
        const fileName = `${baseName}_${timestamp}${ext}`;
        const filePath = path.join(this.UPLOAD_DIR, fileName);

        fs.writeFileSync(filePath, buffer);
        return filePath;
    }

    /**
     * Analyze Building BSR 2022 file structure to understand hierarchy
     */
    static analyzeBuildingBSR(filePath: string): void {
        try {
            const buffer = fs.readFileSync(filePath);
            const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: true });

            console.log('\n=== BUILDING BSR 2022 ANALYSIS ===');
            console.log('Sheet Names:', workbook.SheetNames);

            // Analyze first few sheets to understand structure
            workbook.SheetNames.slice(0, 3).forEach(sheetName => {
                console.log(`\n--- Sheet: ${sheetName} ---`);
                const worksheet = workbook.Sheets[sheetName];
                const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // Show first 20 rows to understand structure
                for (let i = 0; i < Math.min(20, data.length); i++) {
                    const row = data[i];
                    if (row && row.length > 0) {
                        console.log(`Row ${i + 1}:`, row.slice(0, 6)); // First 6 columns
                    }
                }
            });

        } catch (error) {
            console.error('Error analyzing Building BSR file:', error);
        }
    }

    /**
     * Parse hierarchical SSR structure (Building BSR format)
     */
    static parseHierarchicalSSR(buffer: Buffer): SSRFileData {
        const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: true });
        const sheetNames = workbook.SheetNames;
        const items: SSRItem[] = [];
        const hierarchicalItems: HierarchicalSSRItem[] = [];
        const categories = new Set<string>();
        const sheetsMetadata: { name: string; itemCount: number }[] = [];

        let maxLevel = 0;
        let hasHierarchy = false;

        sheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            let sheetItemCount = 0;
            const hierarchyStack: { level: number; description: string; code: string }[] = [];

            // Process each row to detect hierarchy
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length < 2) continue;

                const result = this.parseHierarchicalRow(row, hierarchyStack, sheetName);

                if (result) {
                    const { item, hierarchicalItem } = result;

                    if (item.code && item.description) {
                        items.push(item);
                        hierarchicalItems.push(hierarchicalItem);

                        if (item.category) {
                            categories.add(item.category);
                        }

                        maxLevel = Math.max(maxLevel, hierarchicalItem.level);
                        if (hierarchicalItem.level > 0) {
                            hasHierarchy = true;
                        }

                        sheetItemCount++;
                    }
                }
            }

            sheetsMetadata.push({
                name: sheetName,
                itemCount: sheetItemCount,
            });
        });

        return {
            workbook,
            sheetNames,
            items,
            hierarchicalItems,
            metadata: {
                totalItems: items.length,
                categories: Array.from(categories),
                sheets: sheetsMetadata,
                hasHierarchy,
                maxLevel,
            },
        };
    }

    /**
     * Parse individual row and detect hierarchy level
     */
    private static parseHierarchicalRow(
        row: any[],
        hierarchyStack: { level: number; description: string; code: string }[],
        sheetName: string
    ): { item: SSRItem; hierarchicalItem: HierarchicalSSRItem } | null {

        // Detect indentation level by checking leading spaces or cell formatting
        const indentLevel = this.detectIndentationLevel(row);

        const code = this.cleanValue(row[0]);
        const description = this.cleanValue(row[1]);
        const unit = this.cleanValue(row[2]);
        const rate = this.parseRate(row[3]);

        // Skip empty rows or header-like rows
        if (!description) return null;

        // Determine if this is a main item, sub-item, or sub-sub-item
        const level = this.determineHierarchyLevel(row, indentLevel, description);

        // Update hierarchy stack
        this.updateHierarchyStack(hierarchyStack, level, description, code);

        // Build full description from hierarchy
        const hierarchy = hierarchyStack.slice(0, level + 1).map(h => h.description);
        const fullDescription = hierarchy.join(' > ');

        const category = this.cleanValue(row[4]) || this.inferCategoryFromSheet(sheetName);

        const item: SSRItem = {
            id: '', // Will be generated by database
            code: code || `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            description,
            unit: unit || 'each',
            rate: (rate || 0).toString(),
            category,
        };

        const hierarchicalItem: HierarchicalSSRItem = {
            ...item,
            level,
            parentCode: level > 0 ? hierarchyStack[level - 1]?.code : undefined,
            fullDescription,
            hierarchy,
            indentLevel,
        };

        return { item, hierarchicalItem };
    }

    /**
     * Detect indentation level from Excel cell formatting or content
     */
    private static detectIndentationLevel(row: any[]): number {
        const firstCell = row[0];
        const secondCell = row[1];

        // Check for leading spaces in description
        if (typeof secondCell === 'string') {
            const leadingSpaces = secondCell.match(/^(\s*)/)?.[1]?.length || 0;
            return Math.floor(leadingSpaces / 4); // Assume 4 spaces per level
        }

        // Check for numeric codes vs alphabetic codes
        if (typeof firstCell === 'string') {
            if (firstCell.match(/^\d+\.\d+\.\d+/)) return 2; // 1.1.1 format
            if (firstCell.match(/^\d+\.\d+/)) return 1; // 1.1 format
            if (firstCell.match(/^\d+$/)) return 0; // 1 format
        }

        return 0;
    }

    /**
     * Determine hierarchy level based on various indicators
     */
    private static determineHierarchyLevel(row: any[], indentLevel: number, description: string): number {
        const code = this.cleanValue(row[0]);

        // Check code format patterns
        if (code) {
            if (code.match(/^\d+\.\d+\.\d+\.\d+/)) return 3; // 1.1.1.1 format
            if (code.match(/^\d+\.\d+\.\d+/)) return 2; // 1.1.1 format
            if (code.match(/^\d+\.\d+/)) return 1; // 1.1 format
            if (code.match(/^\d+$/)) return 0; // 1 format
        }

        // Check description patterns
        if (description) {
            if (description.match(/^\s{12,}/)) return 3; // Heavy indentation
            if (description.match(/^\s{8,11}/)) return 2; // Medium indentation
            if (description.match(/^\s{4,7}/)) return 1; // Light indentation
        }

        return Math.max(0, indentLevel);
    }

    /**
     * Update hierarchy stack based on current level
     */
    private static updateHierarchyStack(
        stack: { level: number; description: string; code: string }[],
        currentLevel: number,
        description: string,
        code: string
    ): void {
        // Remove items from stack that are at or below current level
        while (stack.length > 0 && stack[stack.length - 1].level >= currentLevel) {
            stack.pop();
        }

        // Add current item to stack
        stack.push({ level: currentLevel, description, code });
    }

    /**
     * Parse SSR Excel file and extract all items
     */
    static parseSSRFile(buffer: Buffer): SSRFileData {
        // First try hierarchical parsing
        try {
            const hierarchicalResult = this.parseHierarchicalSSR(buffer);
            if (hierarchicalResult.metadata.hasHierarchy) {
                return hierarchicalResult;
            }
        } catch (error) {
            console.log('Hierarchical parsing failed, falling back to simple parsing:', error);
        }

        // Fallback to simple parsing
        const workbook = XLSX.read(buffer, { type: 'buffer', cellStyles: true });
        const sheetNames = workbook.SheetNames;
        const items: SSRItem[] = [];
        const hierarchicalItems: HierarchicalSSRItem[] = [];
        const categories = new Set<string>();
        const sheetsMetadata: { name: string; itemCount: number }[] = [];

        sheetNames.forEach(sheetName => {
            const worksheet = workbook.Sheets[sheetName];
            const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            let sheetItemCount = 0;

            // Skip header rows and process data
            for (let i = 1; i < data.length; i++) {
                const row = data[i];
                if (!row || row.length < 4) continue;

                // Typical SSR format: [Code, Description, Unit, Rate, Category?]
                const code = this.cleanValue(row[0]);
                const description = this.cleanValue(row[1]);
                const unit = this.cleanValue(row[2]);
                const rate = this.parseRate(row[3]);

                if (code && description && unit && rate !== null) {
                    const category = this.cleanValue(row[4]) || this.inferCategoryFromSheet(sheetName);

                    const item: SSRItem = {
                        id: '', // Will be generated by database
                        code,
                        description,
                        unit,
                        rate: rate.toString(),
                        category,
                    };

                    const hierarchicalItem: HierarchicalSSRItem = {
                        ...item,
                        level: 0,
                        fullDescription: description,
                        hierarchy: [description],
                        indentLevel: 0,
                    };

                    items.push(item);
                    hierarchicalItems.push(hierarchicalItem);

                    if (category) {
                        categories.add(category);
                    }
                    sheetItemCount++;
                }
            }

            sheetsMetadata.push({
                name: sheetName,
                itemCount: sheetItemCount,
            });
        });

        return {
            workbook,
            sheetNames,
            items,
            hierarchicalItems,
            metadata: {
                totalItems: items.length,
                categories: Array.from(categories),
                sheets: sheetsMetadata,
                hasHierarchy: false,
                maxLevel: 0,
            },
        };
    }

    /**
     * Load SSR file from disk
     */
    static loadSSRFile(filePath: string): Buffer {
        if (!fs.existsSync(filePath)) {
            throw new Error(`SSR file not found: ${filePath}`);
        }
        return fs.readFileSync(filePath);
    }

    /**
     * Delete SSR file from disk
     */
    static deleteSSRFile(filePath: string): void {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }

    /**
     * Get file info without loading the entire file
     */
    static getFileInfo(filePath: string): { size: number; exists: boolean } {
        try {
            const stats = fs.statSync(filePath);
            return { size: stats.size, exists: true };
        } catch {
            return { size: 0, exists: false };
        }
    }

    /**
     * Export SSR items back to Excel format
     */
    static exportToExcel(items: SSRItem[], fileName: string): Buffer {
        const workbook = XLSX.utils.book_new();

        // Group items by category
        const itemsByCategory = items.reduce((acc, item) => {
            const category = item.category || 'General';
            if (!acc[category]) acc[category] = [];
            acc[category].push(item);
            return acc;
        }, {} as Record<string, SSRItem[]>);

        // Create a sheet for each category
        Object.entries(itemsByCategory).forEach(([category, categoryItems]) => {
            const data = [
                ['Code', 'Description', 'Unit', 'Rate', 'Category'], // Header
                ...categoryItems.map(item => [
                    item.code,
                    item.description,
                    item.unit,
                    parseFloat(item.rate),
                    item.category || '',
                ]),
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(data);

            // Set column widths
            worksheet['!cols'] = [
                { width: 15 }, // Code
                { width: 50 }, // Description
                { width: 10 }, // Unit
                { width: 12 }, // Rate
                { width: 20 }, // Category
            ];

            XLSX.utils.book_append_sheet(workbook, worksheet, category);
        });

        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }

    /**
     * Clean and normalize cell values
     */
    private static cleanValue(value: any): string {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    }

    /**
     * Parse rate value from cell
     */
    private static parseRate(value: any): number | null {
        if (value === null || value === undefined || value === '') return null;

        const numValue = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^\d.-]/g, ''));
        return isNaN(numValue) ? null : numValue;
    }

    /**
     * Infer category from sheet name
     */
    private static inferCategoryFromSheet(sheetName: string): string {
        const name = sheetName.toLowerCase();

        if (name.includes('civil') || name.includes('construction')) return 'Civil Works';
        if (name.includes('electrical')) return 'Electrical Works';
        if (name.includes('mechanical')) return 'Mechanical Works';
        if (name.includes('plumbing')) return 'Plumbing Works';
        if (name.includes('finishing')) return 'Finishing Works';
        if (name.includes('material')) return 'Materials';
        if (name.includes('labor') || name.includes('labour')) return 'Labor';

        return 'General';
    }

    /**
     * Generate combined description for hierarchical SSR item insertion
     */
    static generateCombinedDescription(hierarchicalItem: HierarchicalSSRItem): {
        mainDescription: string;
        subDescriptions: string[];
        fullCombinedDescription: string;
    } {
        const { hierarchy, level, description } = hierarchicalItem;

        // Main description is the top-level item
        const mainDescription = hierarchy[0] || description;

        // Sub descriptions are all intermediate levels
        const subDescriptions = hierarchy.slice(1, -1);

        // Full combined description includes all levels
        const fullCombinedDescription = hierarchy.join(' → ');

        return {
            mainDescription,
            subDescriptions,
            fullCombinedDescription,
        };
    }

    /**
     * Create insertion-ready description lines for estimate
     */
    static createInsertionDescriptionLines(hierarchicalItem: HierarchicalSSRItem): string[] {
        const { hierarchy, level } = hierarchicalItem;
        const lines: string[] = [];

        // Add each level as a separate line with appropriate indentation
        hierarchy.forEach((desc, index) => {
            const indent = '  '.repeat(index); // 2 spaces per level
            const prefix = index === hierarchy.length - 1 ? '• ' : '▸ '; // Different bullets for final vs intermediate
            lines.push(`${indent}${prefix}${desc}`);
        });

        return lines;
    }

    /**
     * Format hierarchical item for display in estimate
     */
    static formatHierarchicalItemForEstimate(hierarchicalItem: HierarchicalSSRItem): {
        displayDescription: string;
        detailedDescription: string[];
        estimateDescription: string;
    } {
        const { hierarchy, level, description, code, unit, rate } = hierarchicalItem;

        // Display description shows the hierarchy clearly
        const displayDescription = hierarchy.join(' > ');

        // Detailed description breaks down each level
        const detailedDescription = hierarchy.map((desc, index) => {
            const levelName = ['Main', 'Sub', 'Sub-Sub', 'Sub-Sub-Sub'][index] || `Level ${index + 1}`;
            return `${levelName}: ${desc}`;
        });

        // Estimate description is formatted for insertion into estimate sheets
        const estimateDescription = level > 0
            ? `${hierarchy[0]} - ${hierarchy.slice(1).join(' - ')}`
            : description;

        return {
            displayDescription,
            detailedDescription,
            estimateDescription,
        };
    }

    /**
     * Validate SSR file format
     */
    static validateSSRFile(buffer: Buffer): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        try {
            const workbook = XLSX.read(buffer, { type: 'buffer' });

            if (workbook.SheetNames.length === 0) {
                errors.push('No sheets found in the Excel file');
            }

            let hasValidData = false;

            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (data.length > 1) { // At least header + 1 data row
                    hasValidData = true;
                }
            });

            if (!hasValidData) {
                errors.push('No valid data rows found in any sheet');
            }

        } catch (error) {
            errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }

        return {
            isValid: errors.length === 0,
            errors,
        };
    }
}