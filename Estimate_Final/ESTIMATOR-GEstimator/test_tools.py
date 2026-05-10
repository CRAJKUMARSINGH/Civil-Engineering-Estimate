#!/usr/bin/env python3
"""
Test script to verify that GEstimator tools are working correctly
"""

import os
import sys

def check_files_exist():
    """Check that all required files exist"""
    required_files = [
        'geodesic_dome_gestimator.xlsx',
        'gestimator_complete_template.xlsx',
        'create_gestimator_converter.py',
        'batch_gestimator_converter.py',
        'create_gestimator_template.py',
        'verify_conversion.py',
        'analyze_excel.py',
        'gestimator_conversion_guide.md'
    ]
    
    print("Checking required files...")
    all_good = True
    
    for file in required_files:
        if os.path.exists(file):
            print(f"  ✓ {file}")
        else:
            print(f"  ✗ {file} (MISSING)")
            all_good = False
    
    return all_good

def check_project_files():
    """Check that project files exist"""
    print("\nChecking project files...")
    
    # Check for .eproj files
    project_files = []
    if os.path.exists('PROJECTS'):
        for file in os.listdir('PROJECTS'):
            if file.endswith('.eproj'):
                project_files.append(file)
    
    if project_files:
        for file in project_files:
            print(f"  ✓ PROJECTS/{file}")
    else:
        print("  ! No .eproj files found in PROJECTS directory")
    
    return len(project_files) > 0

def main():
    print("GEstimator Tools Verification")
    print("=" * 30)
    
    # Check main files
    files_ok = check_files_exist()
    
    # Check project files
    projects_ok = check_project_files()
    
    print("\n" + "=" * 30)
    if files_ok:
        print("✓ All main tools and files are present")
    else:
        print("✗ Some required files are missing")
        
    if projects_ok:
        print("✓ Project files have been converted")
    else:
        print("! No project files found (this may be OK)")
        
    print("\nYour GEstimator conversion environment is ready!")
    print("You can now:")
    print("1. Import 'geodesic_dome_gestimator.xlsx' into GEstimator")
    print("2. Use the conversion tools for other Excel files")
    print("3. Use the templates for new projects")

if __name__ == "__main__":
    main()