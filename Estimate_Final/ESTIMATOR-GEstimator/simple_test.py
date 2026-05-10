#!/usr/bin/env python3
"""
Simple test to see if we can read Excel files
"""

import openpyxl
from pathlib import Path

def main():
    print("Testing Excel file reading...")
    
    # Check if the projects directory exists
    projects_dir = Path("Attached_Assets/PROJECTS")
    print(f"Projects directory exists: {projects_dir.exists()}")
    
    if projects_dir.exists():
        # List files in the directory
        excel_files = list(projects_dir.glob("*.xlsx"))
        print(f"Found {len(excel_files)} Excel files:")
        for f in excel_files:
            print(f"  - {f.name}")
            
            # Try to open and read the file
            try:
                print(f"    Trying to open {f.name}...")
                wb = openpyxl.load_workbook(f, data_only=True)
                print(f"    Successfully opened {f.name}")
                print(f"    Sheet names: {wb.sheetnames}")
                wb.close()
                print(f"    Closed {f.name}")
            except Exception as e:
                print(f"    Error reading {f.name}: {e}")
    else:
        print("Projects directory not found!")

if __name__ == '__main__':
    main()