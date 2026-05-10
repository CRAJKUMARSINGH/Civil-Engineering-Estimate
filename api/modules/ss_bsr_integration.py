"""
SSR/BSR Database Integration
=============================
Integrates PWD SSR and CPWD BSR databases with fuzzy matching
"""

import sqlite3
from datetime import datetime
from typing import Dict, List, Optional

import pandas as pd
from rapidfuzz import fuzz


class SSRBSRDatabase:
    """SSR/BSR database with fuzzy matching"""
    
    def __init__(self, db_path: str = "construction_estimates.db"):
        self.db_path = db_path
        self.initialize_database()
        self.load_sample_data()
    
    def initialize_database(self):
        """Create SSR/BSR tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # SSR Items (PWD Schedule of Rates)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ssr_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ssr_code TEXT UNIQUE,
                description TEXT,
                unit TEXT,
                rate REAL,
                material_cost REAL,
                labor_cost REAL,
                equipment_cost REAL,
                category TEXT,
                subcategory TEXT,
                year TEXT,
                region TEXT,
                created_date TEXT
            )
        """)
        
        # BSR Items (CPWD Basic Schedule of Rates)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bsr_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bsr_code TEXT UNIQUE,
                description TEXT,
                unit TEXT,
                rate REAL,
                material_cost REAL,
                labor_cost REAL,
                equipment_cost REAL,
                category TEXT,
                subcategory TEXT,
                year TEXT,
                zone TEXT,
                created_date TEXT
            )
        """)
        
        conn.commit()
        conn.close()
        print("✅ SSR/BSR database initialized")
    
    def load_sample_data(self):
        """Load sample SSR/BSR data"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Check if data already exists
        cursor.execute("SELECT COUNT(*) FROM ssr_items")
        if cursor.fetchone()[0] > 0:
            conn.close()
            return
        
        # Sample SSR items (PWD Rajasthan)
        ssr_items = [
            ('SSR-1.1.1', 'Excavation in ordinary soil', 'Cum', 185.00, 0, 185.00, 0, '1', '1', '2024', 'Rajasthan'),
            ('SSR-1.1.2', 'Excavation in hard soil', 'Cum', 245.00, 0, 245.00, 0, '1', '1', '2024', 'Rajasthan'),
            ('SSR-2.1.1', 'Cement concrete 1:3:6', 'Cum', 4850.00, 3200.00, 1450.00, 200.00, '2', '1', '2024', 'Rajasthan'),
            ('SSR-2.1.2', 'Cement concrete 1:2:4 with 20mm aggregate', 'Cum', 5250.00, 3600.00, 1450.00, 200.00, '2', '1', '2024', 'Rajasthan'),
            ('SSR-2.1.3', 'Cement concrete 1:1.5:3 with 20mm aggregate', 'Cum', 5850.00, 4100.00, 1550.00, 200.00, '2', '1', '2024', 'Rajasthan'),
            ('SSR-3.1.1', 'Brick work in cement mortar 1:6', 'Cum', 4850.00, 3200.00, 1650.00, 0, '3', '1', '2024', 'Rajasthan'),
            ('SSR-3.1.2', 'Brick work in cement mortar 1:4', 'Cum', 5250.00, 3600.00, 1650.00, 0, '3', '1', '2024', 'Rajasthan'),
            ('SSR-3.2.1', 'Cement plaster 12mm thick 1:4', 'Sqm', 185.00, 95.00, 90.00, 0, '3', '2', '2024', 'Rajasthan'),
            ('SSR-3.2.2', 'Cement plaster 15mm thick 1:4', 'Sqm', 225.00, 115.00, 110.00, 0, '3', '2', '2024', 'Rajasthan'),
            ('SSR-4.1.1', 'Steel reinforcement bars', 'Kg', 68.50, 58.00, 10.50, 0, '4', '1', '2024', 'Rajasthan'),
            ('SSR-5.1.1', 'Cement concrete flooring 40mm thick 1:2:4', 'Sqm', 385.00, 245.00, 140.00, 0, '5', '1', '2024', 'Rajasthan'),
            ('SSR-5.2.1', 'Marble flooring 20mm thick', 'Sqm', 1250.00, 950.00, 300.00, 0, '5', '2', '2024', 'Rajasthan'),
            ('SSR-6.1.1', 'PVC pipes 110mm dia', 'Rmt', 285.00, 245.00, 40.00, 0, '6', '1', '2024', 'Rajasthan'),
            ('SSR-7.1.1', 'Electrical wiring 2.5 sq mm', 'Rmt', 125.00, 95.00, 30.00, 0, '7', '1', '2024', 'Rajasthan'),
            ('SSR-8.1.1', 'Teak wood door frame', 'Cum', 45000.00, 38000.00, 7000.00, 0, '8', '1', '2024', 'Rajasthan'),
            ('SSR-9.1.1', 'Painting with plastic emulsion', 'Sqm', 85.00, 45.00, 40.00, 0, '9', '1', '2024', 'Rajasthan'),
        ]
        
        for item in ssr_items:
            cursor.execute("""
                INSERT OR IGNORE INTO ssr_items 
                (ssr_code, description, unit, rate, material_cost, labor_cost, 
                 equipment_cost, category, subcategory, year, region, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (*item, datetime.now().isoformat()))
        
        # Sample BSR items (CPWD)
        bsr_items = [
            ('BSR-1.1.1', 'Excavation in ordinary soil', 'Cum', 195.00, 0, 195.00, 0, '1', '1', '2024', 'Zone-A'),
            ('BSR-2.1.1', 'Cement concrete 1:3:6', 'Cum', 5050.00, 3350.00, 1500.00, 200.00, '2', '1', '2024', 'Zone-A'),
            ('BSR-2.1.2', 'Cement concrete 1:2:4 with 20mm aggregate', 'Cum', 5450.00, 3750.00, 1500.00, 200.00, '2', '1', '2024', 'Zone-A'),
            ('BSR-3.1.1', 'Brick work in cement mortar 1:6', 'Cum', 5050.00, 3350.00, 1700.00, 0, '3', '1', '2024', 'Zone-A'),
            ('BSR-3.2.1', 'Cement plaster 12mm thick 1:4', 'Sqm', 195.00, 100.00, 95.00, 0, '3', '2', '2024', 'Zone-A'),
            ('BSR-4.1.1', 'Steel reinforcement bars', 'Kg', 72.50, 61.00, 11.50, 0, '4', '1', '2024', 'Zone-A'),
        ]
        
        for item in bsr_items:
            cursor.execute("""
                INSERT OR IGNORE INTO bsr_items 
                (bsr_code, description, unit, rate, material_cost, labor_cost, 
                 equipment_cost, category, subcategory, year, zone, created_date)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (*item, datetime.now().isoformat()))
        
        conn.commit()
        conn.close()
        print("✅ Sample SSR/BSR data loaded")
    
    def search_ssr(self, description: str, threshold: int = 70) -> List[Dict]:
        """Search SSR database with fuzzy matching"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT ssr_code, description, unit, rate FROM ssr_items")
        all_items = cursor.fetchall()
        conn.close()
        
        # Fuzzy match
        matches = []
        for item in all_items:
            score = fuzz.token_set_ratio(description.lower(), item[1].lower())
            if score >= threshold:
                matches.append({
                    'code': item[0],
                    'description': item[1],
                    'unit': item[2],
                    'rate': item[3],
                    'confidence': score,
                    'source': 'SSR'
                })
        
        # Sort by confidence
        matches.sort(key=lambda x: x['confidence'], reverse=True)
        return matches
    
    def search_bsr(self, description: str, threshold: int = 70) -> List[Dict]:
        """Search BSR database with fuzzy matching"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT bsr_code, description, unit, rate FROM bsr_items")
        all_items = cursor.fetchall()
        conn.close()
        
        # Fuzzy match
        matches = []
        for item in all_items:
            score = fuzz.token_set_ratio(description.lower(), item[1].lower())
            if score >= threshold:
                matches.append({
                    'code': item[0],
                    'description': item[1],
                    'unit': item[2],
                    'rate': item[3],
                    'confidence': score,
                    'source': 'BSR'
                })
        
        # Sort by confidence
        matches.sort(key=lambda x: x['confidence'], reverse=True)
        return matches
    
    def search_both(self, description: str, threshold: int = 70) -> Dict:
        """Search both SSR and BSR databases"""
        ssr_matches = self.search_ssr(description, threshold)
        bsr_matches = self.search_bsr(description, threshold)
        
        return {
            'ssr': ssr_matches[:5],  # Top 5 SSR matches
            'bsr': bsr_matches[:5],  # Top 5 BSR matches
            'best_match': ssr_matches[0] if ssr_matches else (bsr_matches[0] if bsr_matches else None)
        }
    
    def get_rate_comparison(self, description: str) -> pd.DataFrame:
        """Compare SSR and BSR rates for an item"""
        results = self.search_both(description, threshold=60)
        
        comparison_data = []
        
        # Add SSR matches
        for match in results['ssr']:
            comparison_data.append({
                'Source': 'SSR',
                'Code': match['code'],
                'Description': match['description'],
                'Unit': match['unit'],
                'Rate (₹)': match['rate'],
                'Confidence': f"{match['confidence']}%"
            })
        
        # Add BSR matches
        for match in results['bsr']:
            comparison_data.append({
                'Source': 'BSR',
                'Code': match['code'],
                'Description': match['description'],
                'Unit': match['unit'],
                'Rate (₹)': match['rate'],
                'Confidence': f"{match['confidence']}%"
            })
        
        return pd.DataFrame(comparison_data)
    
    def get_ssr_by_code(self, ssr_code: str) -> Optional[Dict]:
        """Get SSR item by code"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT ssr_code, description, unit, rate, material_cost, 
                   labor_cost, equipment_cost
            FROM ssr_items WHERE ssr_code = ?
        """, (ssr_code,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'code': row[0],
                'description': row[1],
                'unit': row[2],
                'rate': row[3],
                'material_cost': row[4],
                'labor_cost': row[5],
                'equipment_cost': row[6]
            }
        return None
    
    def get_bsr_by_code(self, bsr_code: str) -> Optional[Dict]:
        """Get BSR item by code"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT bsr_code, description, unit, rate, material_cost, 
                   labor_cost, equipment_cost
            FROM bsr_items WHERE bsr_code = ?
        """, (bsr_code,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                'code': row[0],
                'description': row[1],
                'unit': row[2],
                'rate': row[3],
                'material_cost': row[4],
                'labor_cost': row[5],
                'equipment_cost': row[6]
            }
        return None
    
    def get_all_ssr_items(self) -> pd.DataFrame:
        """Get all SSR items"""
        conn = sqlite3.connect(self.db_path)
        df = pd.read_sql_query("""
            SELECT ssr_code, description, unit, rate, category, subcategory
            FROM ssr_items
            ORDER BY ssr_code
        """, conn)
        conn.close()
        return df
    
    def get_all_bsr_items(self) -> pd.DataFrame:
        """Get all BSR items"""
        conn = sqlite3.connect(self.db_path)
        df = pd.read_sql_query("""
            SELECT bsr_code, description, unit, rate, category, subcategory
            FROM bsr_items
            ORDER BY bsr_code
        """, conn)
        conn.close()
        return df


if __name__ == "__main__":
    # Demo usage
    print("="*80)
    print("SSR/BSR DATABASE INTEGRATION - DEMO")
    print("="*80)
    print()
    
    # Initialize
    db = SSRBSRDatabase()
    
    # Test search
    test_descriptions = [
        "brick work cement mortar",
        "cement concrete 1:2:4",
        "cement plaster",
        "steel reinforcement"
    ]
    
    for desc in test_descriptions:
        print(f"\nSearching for: '{desc}'")
        print("-"*80)
        
        results = db.search_both(desc)
        
        if results['best_match']:
            best = results['best_match']
            print(f"✅ Best Match: {best['code']} - {best['description']}")
            print(f"   Rate: ₹{best['rate']:,.2f} | Confidence: {best['confidence']}%")
        
        print(f"\nSSR Matches: {len(results['ssr'])}")
        for match in results['ssr'][:3]:
            print(f"  - {match['code']}: ₹{match['rate']:,.2f} ({match['confidence']}%)")
        
        print(f"\nBSR Matches: {len(results['bsr'])}")
        for match in results['bsr'][:3]:
            print(f"  - {match['code']}: ₹{match['rate']:,.2f} ({match['confidence']}%)")
    
    print()
    print("="*80)
    print("DEMO COMPLETE")
    print("="*80)
