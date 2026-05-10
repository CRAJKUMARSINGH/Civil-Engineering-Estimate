import pandas as pd
import json
import os
import re

class BSRParser:
    """Parses BSR/SOR Excel files into optimized JSON structures"""
    
    def __init__(self, excel_path):
        self.excel_path = excel_path
        self.df = None
        self.json_data = []

    def parse(self):
        """Main parsing logic"""
        try:
            # Load Excel
            self.df = pd.read_excel(self.excel_path)
            
            # Clean column names
            self.df.columns = [str(c).strip().lower() for c in self.df.columns]
            
            # Identify columns (fuzzy match)
            code_col = self._find_col(['code', 'item', 'sl'])
            desc_col = self._find_col(['description', 'item description', 'particulars'])
            unit_col = self._find_col(['unit'])
            rate_col = self._find_col(['rate', 'total rate', 'amount'])

            for _, row in self.df.iterrows():
                code = str(row.get(code_col, '')).strip()
                if not code or code == 'nan' or code == 'None':
                    continue
                
                # Calculate depth based on number of dots
                depth = code.count('.')
                
                item = {
                    'id': code,
                    'serial': code,
                    'description': str(row.get(desc_col, '')),
                    'unit': str(row.get(unit_col, 'cum')),
                    'rate': self._clean_rate(row.get(rate_col, 0)),
                    'depth': depth
                }
                self.json_data.append(item)
            
            print(f"Parsed {len(self.json_data)} items from {self.excel_path}")
            return self.json_data
        except Exception as e:
            print(f"Error parsing BSR: {e}")
            return []

    def _find_col(self, keywords):
        for col in self.df.columns:
            if any(k in col for k in keywords):
                return col
        return None

    def _clean_rate(self, rate):
        try:
            if pd.isna(rate):
                return 0.0
            if isinstance(rate, str):
                rate = re.sub(r'[^\d.]', '', rate)
            return float(rate) if rate else 0.0
        except:
            return 0.0

    def save_json(self, output_path):
        with open(output_path, 'w') as f:
            json.dump(self.json_data, f, indent=2)
        print(f"Saved JSON to {output_path}")

if __name__ == "__main__":
    # Test parsing
    bsr_path = "public/data/BSR_2019_rates.xlsx"
    if os.path.exists(bsr_path):
        parser = BSRParser(bsr_path)
        parser.parse()
        parser.save_json("public/data/bsr_2019.json")
    else:
        print(f"File not found: {bsr_path}")
