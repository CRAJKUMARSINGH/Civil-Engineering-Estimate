#!/usr/bin/env python3
"""
Convert uploaded Excel files from attached_assets folder to .eproj format
This is a helper script for CONVERT_UPLOADED_FILES.bat
"""

import sys
from pathlib import Path

# Import the main converter module
import convert_attached_projects as converter

def main():
    """Convert all Excel files in attached_assets directory"""
    
    attached_dir = Path("attached_assets")
    
    if not attached_dir.exists():
        print(f"ERROR: Directory not found: {attached_dir}")
        print("Please upload Excel files first.")
        return 1
    
    # Find all Excel files
    excel_files = []
    for pattern in ['*.xlsx', '*.xls']:
        excel_files.extend(attached_dir.glob(pattern))
    
    excel_files = [f for f in excel_files if f.is_file()]
    
    if not excel_files:
        print(f"No Excel files found in {attached_dir}")
        print("Please upload .xlsx or .xls files to the attached_assets folder.")
        return 1
    
    print("="*80)
    print("Excel to .eproj Converter - Uploaded Files")
    print("="*80)
    print()
    print(f"Found {len(excel_files)} Excel file(s):")
    for f in excel_files:
        print(f"  - {f.name}")
    print()
    
    print("="*80)
    print("Starting conversion...")
    print("="*80)
    print()
    
    converted = 0
    skipped = 0
    failed = 0
    
    for excel_file in excel_files:
        print(f"Processing: {excel_file.name}")
        result = converter.convert_excel_to_eproj(excel_file, attached_dir)
        if result is True:
            converted += 1
        elif result is None:
            skipped += 1
        else:
            failed += 1
        print()
    
    print("="*80)
    print("CONVERSION SUMMARY")
    print("="*80)
    print(f"Total files:      {len(excel_files)}")
    print(f"Converted:        {converted}")
    print(f"Skipped:          {skipped}")
    print(f"Failed:           {failed}")
    print()
    print(f"Output directory: {attached_dir.absolute()}")
    print()
    print("The .eproj files are ready to open in GEstimator on Windows!")
    print("="*80)
    
    return 0 if failed == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
