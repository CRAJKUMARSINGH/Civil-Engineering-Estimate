#!/usr/bin/env python3
"""
Test the conversion functions directly
"""

import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, '.')

# Import the conversion functions
import convert_projects

def main():
    print("Testing conversion functions...")
    
    # Test parsing an Excel file
    projects_dir = Path("Attached_Assets/PROJECTS")
    excel_files = list(projects_dir.glob("*.xlsx"))
    
    if not excel_files:
        print("No Excel files found!")
        return
    
    # Test with the first file
    excel_file = excel_files[0]
    print(f"Testing with file: {excel_file.name}")
    
    # Try to parse the file
    try:
        items = convert_projects.parse_excel_project(excel_file)
        print(f"Successfully parsed {len(items)} items")
        
        # Show first few items
        for i, item in enumerate(items[:3]):
            print(f"  Item {i+1}: {item['code']} - {item['description'][:50]}...")
            
    except Exception as e:
        print(f"Error parsing file: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()