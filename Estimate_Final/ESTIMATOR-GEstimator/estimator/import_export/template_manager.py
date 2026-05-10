#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Template Manager for saving and reusing Excel import structures
"""

import logging
import json
import sqlite3
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict

from ..data import schedule

log = logging.getLogger(__name__)

@dataclass
class TemplateStructure:
    """Data class for template structure"""
    name: str
    description: str
    columns: Dict[str, int]  # Column name to index mapping
    item_categories: List[str]
    default_resources: List[Dict]
    measurement_format: Dict
    created_date: str
    modified_date: str

class TemplateManager:
    """Manages estimate templates for reuse"""
    
    def __init__(self, template_database_path: Optional[Path] = None):
        """Initialize template manager"""
        self.template_database_path = template_database_path
        self.connection = None
        
        if template_database_path:
            self._initialize_database()
    
    def _initialize_database(self):
        """Initialize template database"""
        try:
            # Create directory if it doesn't exist
            self.template_database_path.parent.mkdir(parents=True, exist_ok=True)
            
            self.connection = sqlite3.connect(str(self.template_database_path))
            self.connection.row_factory = sqlite3.Row
            
            self._create_template_tables()
            
            log.info(f"Template database initialized: {self.template_database_path}")
            
        except Exception as e:
            log.error(f"Error initializing template database: {e}")
            self.connection = None
    
    def _create_template_tables(self):
        """Create template database tables"""
        cursor = self.connection.cursor()
        
        # Templates table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS estimate_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                structure JSON NOT NULL,
                created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                modified_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Template items table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS template_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id INTEGER NOT NULL,
                item_code TEXT NOT NULL,
                item_description TEXT NOT NULL,
                unit TEXT NOT NULL,
                category TEXT,
                default_rate DECIMAL(15,2),
                default_qty DECIMAL(15,3),
                remarks TEXT,
                order_index INTEGER,
                FOREIGN KEY(template_id) REFERENCES estimate_templates(id) ON DELETE CASCADE
            )
        ''')
        
        # Template categories table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS template_categories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_id INTEGER NOT NULL,
                category_name TEXT NOT NULL,
                category_order INTEGER,
                FOREIGN KEY(template_id) REFERENCES estimate_templates(id) ON DELETE CASCADE
            )
        ''')
        
        # Create indexes
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_template_name ON estimate_templates(name)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_template_items ON template_items(template_id)')
        
        self.connection.commit()
    
    def save_items_as_template(self, schedule_items: List[schedule.ScheduleItemModel], 
                              template_name: str, description: str = "") -> bool:
        """
        Save schedule items as a reusable template
        
        Args:
            schedule_items: List of schedule items to save
            template_name: Name for the template
            description: Optional description
            
        Returns:
            True if successful, False otherwise
        """
        if not self.connection:
            raise RuntimeError("Template database not initialized")
        
        try:
            cursor = self.connection.cursor()
            
            # Extract structure information
            structure = self._extract_structure_from_items(schedule_items)
            
            # Insert or update template
            cursor.execute('''
                INSERT OR REPLACE INTO estimate_templates 
                (name, description, structure, modified_date)
                VALUES (?, ?, ?, ?)
            ''', (
                template_name,
                description,
                json.dumps(structure),
                datetime.now().isoformat()
            ))
            
            template_id = cursor.lastrowid
            
            # Clear existing template items
            cursor.execute('DELETE FROM template_items WHERE template_id = ?', (template_id,))
            cursor.execute('DELETE FROM template_categories WHERE template_id = ?', (template_id,))
            
            # Insert template items
            categories = set()
            for idx, item in enumerate(schedule_items):
                cursor.execute('''
                    INSERT INTO template_items 
                    (template_id, item_code, item_description, unit, category, 
                     default_rate, default_qty, remarks, order_index)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    template_id,
                    item.code,
                    item.description,
                    item.unit,
                    item.category,
                    item.rate,
                    item.qty,
                    item.remarks,
                    idx
                ))
                
                if item.category:
                    categories.add(item.category)
            
            # Insert categories
            for idx, category in enumerate(sorted(categories)):
                cursor.execute('''
                    INSERT INTO template_categories 
                    (template_id, category_name, category_order)
                    VALUES (?, ?, ?)
                ''', (template_id, category, idx))
            
            self.connection.commit()
            
            log.info(f"Template saved: {template_name} with {len(schedule_items)} items")
            return True
            
        except Exception as e:
            log.error(f"Error saving template: {e}")
            if self.connection:
                self.connection.rollback()
            return False
    
    def _extract_structure_from_items(self, schedule_items: List[schedule.ScheduleItemModel]) -> Dict:
        """Extract structure information from schedule items"""
        structure = {
            'columns': {
                'Code': 0,
                'Description': 1,
                'Unit': 2,
                'Rate': 3,
                'Quantity': 4
            },
            'item_count': len(schedule_items),
            'categories': list(set(item.category for item in schedule_items if item.category)),
            'units': list(set(item.unit for item in schedule_items)),
            'has_rates': any(item.rate > 0 for item in schedule_items),
            'has_quantities': any(item.qty > 0 for item in schedule_items)
        }
        
        return structure
    
    def load_template(self, template_name: str) -> Optional[Dict]:
        """Load template by name"""
        if not self.connection:
            return None
        
        cursor = self.connection.cursor()
        
        # Get template info
        cursor.execute('''
            SELECT * FROM estimate_templates WHERE name = ?
        ''', (template_name,))
        
        template_row = cursor.fetchone()
        if not template_row:
            return None
        
        template = dict(template_row)
        template['structure'] = json.loads(template['structure'])
        
        # Get template items
        cursor.execute('''
            SELECT * FROM template_items 
            WHERE template_id = ? 
            ORDER BY order_index
        ''', (template['id'],))
        
        template['items'] = [dict(row) for row in cursor.fetchall()]
        
        # Get template categories
        cursor.execute('''
            SELECT * FROM template_categories 
            WHERE template_id = ? 
            ORDER BY category_order
        ''', (template['id'],))
        
        template['categories'] = [dict(row) for row in cursor.fetchall()]
        
        return template
    
    def list_templates(self) -> List[Dict]:
        """List all available templates"""
        if not self.connection:
            return []
        
        cursor = self.connection.cursor()
        cursor.execute('''
            SELECT t.*, 
                   COUNT(ti.id) as item_count,
                   COUNT(tc.id) as category_count
            FROM estimate_templates t
            LEFT JOIN template_items ti ON t.id = ti.template_id
            LEFT JOIN template_categories tc ON t.id = tc.template_id
            GROUP BY t.id
            ORDER BY t.modified_date DESC
        ''')
        
        return [dict(row) for row in cursor.fetchall()]
    
    def delete_template(self, template_name: str) -> bool:
        """Delete template by name"""
        if not self.connection:
            return False
        
        try:
            cursor = self.connection.cursor()
            cursor.execute('DELETE FROM estimate_templates WHERE name = ?', (template_name,))
            
            deleted = cursor.rowcount > 0
            self.connection.commit()
            
            if deleted:
                log.info(f"Template deleted: {template_name}")
            
            return deleted
            
        except Exception as e:
            log.error(f"Error deleting template: {e}")
            return False
    
    def create_estimate_from_template(self, template_name: str, 
                                    database_manager) -> Optional[List[schedule.ScheduleItemModel]]:
        """
        Create new estimate from template
        
        Args:
            template_name: Name of template to use
            database_manager: Database manager for creating estimate
            
        Returns:
            List of created schedule items or None if failed
        """
        template = self.load_template(template_name)
        if not template:
            log.error(f"Template not found: {template_name}")
            return None
        
        try:
            # Convert template items to ScheduleItemModel objects
            schedule_items = []
            
            for item_data in template['items']:
                item = schedule.ScheduleItemModel(
                    code=item_data['item_code'],
                    description=item_data['item_description'],
                    unit=item_data['unit'],
                    rate=item_data['default_rate'] or 0,
                    qty=item_data['default_qty'] or 0,
                    remarks=item_data['remarks'] or '',
                    ana_remarks='',
                    category=item_data['category'],
                    parent=None
                )
                schedule_items.append(item)
            
            # Insert items into database
            imported, skipped, failed = database_manager.insert_schedule_items(schedule_items)
            
            log.info(f"Created estimate from template {template_name}: "
                    f"{imported} imported, {skipped} skipped, {failed} failed")
            
            return schedule_items
            
        except Exception as e:
            log.error(f"Error creating estimate from template: {e}")
            return None
    
    def create_from_template(self, template_name: str, 
                           database_manager) -> Optional[List[schedule.ScheduleItemModel]]:
        """
        Create new estimate from saved template
        
        Args:
            template_name: Name of template to use
            database_manager: Database manager for creating estimate
            
        Returns:
            List of created schedule items or None if failed
        """
        return self.create_estimate_from_template(template_name, database_manager)
    
    def import_excel_as_template(self, excel_path: Path, template_name: str,
                               excel_importer, description: str = "") -> bool:
        """
        Import Excel file structure as template
        
        Args:
            excel_path: Path to Excel file
            template_name: Name for the template
            excel_importer: Excel importer instance
            description: Optional description
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Analyze Excel file
            analysis = excel_importer.analyze_excel_file(excel_path)
            if not analysis['success']:
                log.error(f"Failed to analyze Excel file: {analysis['errors']}")
                return False
            
            # Get preview of items (first 10 rows for structure)
            preview_items = excel_importer.preview_import(
                excel_path, 
                sheet_name=analysis['recommended_sheet'],
                start_row=None,
                end_row=None
            )
            
            if not preview_items:
                log.error("No items found in Excel file")
                return False
            
            # Convert preview items to schedule items
            schedule_items = []
            for item in preview_items[:50]:  # Limit to first 50 items for template
                schedule_item = schedule.ScheduleItemModel(
                    code=item.code,
                    description=item.description,
                    unit=item.unit,
                    rate=item.rate,
                    qty=item.qty,
                    remarks=item.remarks or '',
                    ana_remarks='',
                    category=item.category,
                    parent=None
                )
                schedule_items.append(schedule_item)
            
            # Save as template
            return self.save_items_as_template(schedule_items, template_name, description)
            
        except Exception as e:
            log.error(f"Error importing Excel as template: {e}")
            return False
    
    def export_template_to_excel(self, template_name: str, output_path: Path) -> bool:
        """
        Export template to Excel file
        
        Args:
            template_name: Name of template to export
            output_path: Path for output Excel file
            
        Returns:
            True if successful, False otherwise
        """
        template = self.load_template(template_name)
        if not template:
            return False
        
        try:
            from .. import misc
            
            # Create spreadsheet
            spreadsheet = misc.Spreadsheet()
            spreadsheet.set_title(f"Template - {template_name}")
            
            # Prepare data
            headers = ['Code', 'Description', 'Unit', 'Rate', 'Quantity', 'Category', 'Remarks']
            data = [headers]
            
            for item in template['items']:
                row = [
                    item['item_code'],
                    item['item_description'],
                    item['unit'],
                    float(item['default_rate'] or 0),
                    float(item['default_qty'] or 0),
                    item['category'] or '',
                    item['remarks'] or ''
                ]
                data.append(row)
            
            # Insert data
            spreadsheet.insert_data(data, bold=True)
            
            # Set column widths
            spreadsheet.set_column_widths([15, 50, 10, 12, 12, 15, 20])
            
            # Save file
            spreadsheet.save(str(output_path))
            
            log.info(f"Template exported to Excel: {output_path}")
            return True
            
        except Exception as e:
            log.error(f"Error exporting template to Excel: {e}")
            return False
    
    def get_template_statistics(self) -> Dict[str, Any]:
        """Get template database statistics"""
        if not self.connection:
            return {}
        
        cursor = self.connection.cursor()
        
        stats = {}
        
        # Total templates
        cursor.execute('SELECT COUNT(*) FROM estimate_templates')
        stats['total_templates'] = cursor.fetchone()[0]
        
        # Total template items
        cursor.execute('SELECT COUNT(*) FROM template_items')
        stats['total_items'] = cursor.fetchone()[0]
        
        # Templates by creation date
        cursor.execute('''
            SELECT DATE(created_date) as date, COUNT(*) as count
            FROM estimate_templates
            GROUP BY DATE(created_date)
            ORDER BY date DESC
            LIMIT 10
        ''')
        stats['templates_by_date'] = dict(cursor.fetchall())
        
        # Most used categories
        cursor.execute('''
            SELECT category_name, COUNT(*) as usage_count
            FROM template_categories
            GROUP BY category_name
            ORDER BY usage_count DESC
            LIMIT 10
        ''')
        stats['popular_categories'] = dict(cursor.fetchall())
        
        return stats
    
    def close(self):
        """Close database connection"""
        if self.connection:
            self.connection.close()
            self.connection = None
            log.info("Template database connection closed")