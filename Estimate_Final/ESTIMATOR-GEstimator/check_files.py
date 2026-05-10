#!/usr/bin/env python3
"""
Check what files exist in the projects directory
"""

import os
from pathlib import Path

def main():
    print("="*60)
    print("CHECKING PROJECT FILES")
    print("="*60)
    
    # Check if directory exists
    projects_dir = Path("C:/Users/Rajkumar/.gestimator/projects")
    print(f"Projects directory exists: {projects_dir.exists()}")
    
    if projects_dir.exists():
        # List all files
        files = list(projects_dir.iterdir())
        print(f"Total files in directory: {len(files)}")
        
        # Show all files
        for file in files:
            if file.is_file():
                size = file.stat().st_size
                print(f"  📄 {file.name} ({size:,} bytes)")
            else:
                print(f"  📁 {file.name}/")
                
        # Check for .eproj files specifically
        eproj_files = list(projects_dir.glob("*.eproj"))
        print(f"\n.eproj files found: {len(eproj_files)}")
        
        for file in eproj_files:
            size = file.stat().st_size
            print(f"  ✅ {file.name} ({size:,} bytes)")
            
    else:
        print("Creating directory...")
        try:
            projects_dir.mkdir(parents=True, exist_ok=True)
            print("✅ Directory created successfully")
        except Exception as e:
            print(f"❌ Failed to create directory: {e}")

if __name__ == '__main__':
    main()