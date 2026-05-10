#!/usr/bin/env python3
"""
List and manage converted GEstimator projects
"""

import os
import shutil
from pathlib import Path
import appdirs

# GEstimator constants
PROGRAM_NAME = 'GEstimator'
PROGRAM_AUTHOR = 'CPWD'
PROGRAM_VER = '1'
PROJECT_EXTENSION = '.eproj'

def main():
    print("="*80)
    print("GEstimator Converted Projects Manager")
    print("="*80)
    
    # Get GEstimator user data directory
    dirs = appdirs.AppDirs(PROGRAM_NAME, PROGRAM_AUTHOR, version=PROGRAM_VER)
    user_data_dir = Path(dirs.user_data_dir)
    projects_dir = user_data_dir / 'projects'
    
    print(f"\nProjects directory: {projects_dir}")
    
    # Find all .eproj files
    if not projects_dir.exists():
        print("\n❌ Projects directory does not exist!")
        return
    
    eproj_files = list(projects_dir.glob(f"*{PROJECT_EXTENSION}"))
    
    if not eproj_files:
        print("\n❌ No converted projects found!")
        return
    
    print(f"\n✅ Found {len(eproj_files)} converted project(s):\n")
    
    for idx, proj_file in enumerate(eproj_files, 1):
        file_size = proj_file.stat().st_size / 1024  # KB
        print(f"{idx}. {proj_file.name}")
        print(f"   Path: {proj_file}")
        print(f"   Size: {file_size:.1f} KB")
        print()
    
    # Copy to desktop for easy access
    desktop = Path.home() / "Desktop"
    if desktop.exists():
        print("="*80)
        print("COPY TO DESKTOP FOR EASY ACCESS")
        print("="*80)
        
        response = input("\nWould you like to copy these projects to your Desktop? (y/n): ")
        
        if response.lower() == 'y':
            copied = 0
            for proj_file in eproj_files:
                try:
                    dest = desktop / proj_file.name
                    shutil.copy2(proj_file, dest)
                    print(f"✅ Copied: {proj_file.name}")
                    copied += 1
                except Exception as e:
                    print(f"❌ Failed to copy {proj_file.name}: {e}")
            
            print(f"\n✅ Copied {copied} project(s) to Desktop!")
            print(f"Desktop location: {desktop}")
    
    # Instructions
    print("\n" + "="*80)
    print("HOW TO OPEN IN GESTIMATOR")
    print("="*80)
    print("""
1. Launch GEstimator application
2. Click on "File" menu or the folder icon
3. Select "Open Project"
4. Navigate to one of these locations:
   - Desktop (if you copied files there)
   - Or: {projects_dir}
5. Select the .eproj file you want to open
6. Click "Open"

The project will load with all schedule items!
""".format(projects_dir=projects_dir))
    
    print("="*80)
    print("Press Enter to exit...")
    input()

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()
        input("\nPress Enter to exit...")
