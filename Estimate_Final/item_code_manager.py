"""
Item Code Manager - Reusable Item System (5.4.6 Format)
========================================================
Implements standardized item codes for reusability across projects
"""

import json
import sqlite3
from datetime import datetime
from typing import Dict, List, Optional

import pandas as pd


class ItemCodeManager:
    """Enhanced item code management system with SSR/BSR integration"""
    
    def __init__(self, db_path: str = "construction_estimates.db"):
        self.db_path = db_path
        self.initialize_database()
    
    def initialize_database(self):
        """Create enhanced database structure for reusability"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Item Master for Reusability
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS item_master (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_code TEXT UNIQUE,
                description TEXT,
                standard_unit TEXT,
                category TEXT,
                subcategory TEXT,
                ssr_code TEXT,
                bsr_code TEXT,
                standard_rate REAL,
                created_date TEXT,
                usage_frequency INTEGER DEFAULT 0,
                last_used_date TEXT
            )
        """)
        
        # Measurement Templates for Reusability
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS measurement_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                template_code TEXT UNIQUE,
                template_name TEXT,
                description TEXT,
                formula TEXT,
                input_fields TEXT,
                calculation_type TEXT,
                category TEXT,
                usage_count INTEGER DEFAULT 0
            )
        """)
        
        # Historical Estimates
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS estimate_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                estimate_code TEXT,
                project_reference TEXT,
                item_code TEXT,
                description TEXT,
                quantity REAL,
                rate REAL,
                amount REAL,
                date_created TEXT,
                region TEXT,
                FOREIGN KEY (item_code) REFERENCES item_master(item_code)
            )
        """)
        
        # Multiple Measurement Rows
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS measurement_rows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                item_code TEXT,
                row_number INTEGER,
                description TEXT,
                location TEXT,
                nos REAL,
                length REAL,
                breadth REAL,
                height REAL,
                unit TEXT,
                total REAL,
                rate REAL,
                amount REAL,
                created_date TEXT,
                FOREIGN KEY (item_code) REFERENCES item_master(item_code)
            )
        """)
        
        conn.commit()
        conn.close()
        
        print("✅ Database initialized with enhanced structure")
    
    def create_item_code(self, category: str, subcategory: str, item_no: int) -> str:
        """Create standardized item codes like 5.4.6"""
        return f"{category}.{subcategory}.{item_no}"
    
    def add_reusable_item(self, item_data: Dict) -> str:
        """Add item to master library for reuse"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            # Generate next item code
            cursor.execute("""
                SELECT COUNT(*) FROM item_master 
                WHERE category = ? AND subcategory = ?
            """, (item_data['category'], item_data['subcategory']))
            
            next_no = cursor.fetchone()[0] + 1
            item_code = self.create_item_code(
                item_data['category'], 
                item_data['subcategory'], 
                next_no
            )
            
            cursor.execute("""
                INSERT INTO item_master 
                (item_code, description, standard_unit, category, subcategory, 
                 ssr_code, bsr_code, standard_rate, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                item_code,
                item_data['description'],
                item_data['unit'],
                item_data['category'],
                item_data['subcategory'],
                item_data.get('ssr_code', ''),
                item_data.get('bsr_code', ''),
                item_data.get('rate', 0),
                datetime.now().isoformat()
            ))
            
            conn.commit()
            print(f"✅ Created reusable item: {item_code}")
            return item_code
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Error creating item: {e}")
            return None
        finally:
            conn.close()
    
    def search_reusable_items(self, search_term: str) -> pd.DataFrame:
        """Search items for reuse with fuzzy matching"""
        conn = sqlite3.connect(self.db_path)
        
        query = """
            SELECT item_code, description, standard_unit, standard_rate,
                   category, subcategory, usage_frequency, ssr_code, bsr_code
            FROM item_master 
            WHERE description LIKE ? OR item_code LIKE ?
            ORDER BY usage_frequency DESC, item_code ASC
        """
        
        results = pd.read_sql_query(
            query, 
            conn, 
            params=[f"%{search_term}%", f"%{search_term}%"]
        )
        conn.close()
        return results
    
    def get_item_by_code(self, item_code: str) -> Optional[Dict]:
        """Get item details by code"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM item_master WHERE item_code = ?
        """, (item_code,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            columns = ['id', 'item_code', 'description', 'standard_unit', 
                      'category', 'subcategory', 'ssr_code', 'bsr_code',
                      'standard_rate', 'created_date', 'usage_frequency', 'last_used_date']
            return dict(zip(columns, row))
        return None
    
    def increment_usage(self, item_code: str):
        """Increment usage frequency when item is used"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            UPDATE item_master 
            SET usage_frequency = usage_frequency + 1,
                last_used_date = ?
            WHERE item_code = ?
        """, (datetime.now().isoformat(), item_code))
        
        conn.commit()
        conn.close()
    
    def get_popular_items(self, limit: int = 20) -> pd.DataFrame:
        """Get most frequently used items"""
        conn = sqlite3.connect(self.db_path)
        
        query = """
            SELECT item_code, description, standard_unit, standard_rate,
                   usage_frequency, last_used_date
            FROM item_master 
            WHERE usage_frequency > 0
            ORDER BY usage_frequency DESC
            LIMIT ?
        """
        
        results = pd.read_sql_query(query, conn, params=[limit])
        conn.close()
        return results
    
    def add_measurement_template(self, template_data: Dict) -> bool:
        """Add a reusable measurement template"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT INTO measurement_templates 
                (template_code, template_name, description, formula, 
                 input_fields, calculation_type, category)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                template_data['template_code'],
                template_data['template_name'],
                template_data['description'],
                template_data['formula'],
                json.dumps(template_data['input_fields']),
                template_data['calculation_type'],
                template_data['category']
            ))
            
            conn.commit()
            print(f"✅ Added template: {template_data['template_code']}")
            return True
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Error adding template: {e}")
            return False
        finally:
            conn.close()
    
    def get_templates_by_category(self, category: str) -> pd.DataFrame:
        """Get measurement templates by category"""
        conn = sqlite3.connect(self.db_path)
        
        query = """
            SELECT template_code, template_name, description, formula,
                   calculation_type, usage_count
            FROM measurement_templates 
            WHERE category = ?
            ORDER BY usage_count DESC
        """
        
        results = pd.read_sql_query(query, conn, params=[category])
        conn.close()
        return results
    
    def export_item_master(self, output_path: str) -> bool:
        """Export item master to Excel"""
        try:
            conn = sqlite3.connect(self.db_path)
            df = pd.read_sql_query("SELECT * FROM item_master", conn)
            conn.close()
            
            df.to_excel(output_path, index=False)
            print(f"✅ Exported item master to: {output_path}")
            return True
        except Exception as e:
            print(f"❌ Export failed: {e}")
            return False


class MultiRowMeasurementManager:
    """Handle multiple measurement rows for same item"""
    
    def __init__(self, db_path: str = "construction_estimates.db"):
        self.db_path = db_path
    
    def add_measurement_rows(self, project_id: int, item_code: str, 
                            measurements: List[Dict]) -> bool:
        """Add multiple measurement rows for same item description"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            for i, measurement in enumerate(measurements):
                # Calculate total
                nos = measurement.get('nos', 1)
                length = measurement.get('length', 0)
                breadth = measurement.get('breadth', 0)
                height = measurement.get('height', 0)
                
                if length and breadth and height:
                    total = nos * length * breadth * height
                elif length and breadth:
                    total = nos * length * breadth
                elif length:
                    total = nos * length
                else:
                    total = nos
                
                amount = total * measurement.get('rate', 0)
                
                cursor.execute("""
                    INSERT INTO measurement_rows 
                    (project_id, item_code, row_number, description, location,
                     nos, length, breadth, height, unit, total, rate, amount, created_date)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    project_id,
                    item_code,
                    i + 1,
                    measurement['description'],
                    measurement.get('location', ''),
                    nos,
                    length,
                    breadth,
                    height,
                    measurement['unit'],
                    total,
                    measurement['rate'],
                    amount,
                    datetime.now().isoformat()
                ))
            
            conn.commit()
            print(f"✅ Added {len(measurements)} measurement rows for {item_code}")
            return True
            
        except Exception as e:
            conn.rollback()
            print(f"❌ Error adding measurements: {e}")
            return False
        finally:
            conn.close()
    
    def get_measurements_by_item(self, item_code: str) -> pd.DataFrame:
        """Get all measurement rows for an item"""
        conn = sqlite3.connect(self.db_path)
        
        query = """
            SELECT row_number, description, location, nos, length, breadth, 
                   height, unit, total, rate, amount
            FROM measurement_rows 
            WHERE item_code = ?
            ORDER BY row_number
        """
        
        results = pd.read_sql_query(query, conn, params=[item_code])
        conn.close()
        return results
    
    def get_project_measurements(self, project_id: int) -> pd.DataFrame:
        """Get all measurements for a project grouped by item"""
        conn = sqlite3.connect(self.db_path)
        
        query = """
            SELECT m.item_code, i.description as item_description,
                   m.row_number, m.location, m.nos, m.length, m.breadth, 
                   m.height, m.unit, m.total, m.rate, m.amount
            FROM measurement_rows m
            LEFT JOIN item_master i ON m.item_code = i.item_code
            WHERE m.project_id = ?
            ORDER BY m.item_code, m.row_number
        """
        
        results = pd.read_sql_query(query, conn, params=[project_id])
        conn.close()
        return results


if __name__ == "__main__":
    # Demo usage
    print("="*80)
    print("ITEM CODE MANAGER - DEMO")
    print("="*80)
    print()
    
    # Initialize
    manager = ItemCodeManager()
    
    # Add sample reusable items
    sample_items = [
        {
            'category': '3',
            'subcategory': '1',
            'description': 'Brick work in cement mortar 1:6',
            'unit': 'Cum',
            'rate': 4850.00,
            'ssr_code': 'SSR-3.1.1'
        },
        {
            'category': '3',
            'subcategory': '2',
            'description': 'Cement plaster 12mm thick 1:4',
            'unit': 'Sqm',
            'rate': 185.00,
            'ssr_code': 'SSR-3.2.1'
        },
        {
            'category': '5',
            'subcategory': '4',
            'description': 'Cement concrete 1:2:4 with 20mm aggregate',
            'unit': 'Cum',
            'rate': 5250.00,
            'ssr_code': 'SSR-5.4.1'
        }
    ]
    
    print("Adding sample items...")
    for item in sample_items:
        code = manager.add_reusable_item(item)
        print(f"  Created: {code} - {item['description']}")
    
    print()
    print("Searching for 'brick'...")
    results = manager.search_reusable_items('brick')
    print(results)
    
    print()
    print("="*80)
    print("DEMO COMPLETE")
    print("="*80)
