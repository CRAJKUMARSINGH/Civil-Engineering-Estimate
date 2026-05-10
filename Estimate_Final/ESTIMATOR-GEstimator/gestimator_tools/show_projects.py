#!/usr/bin/env python3
"""Show converted projects and how to open them in GEstimator"""

import os
from pathlib import Path
import sqlite3

print("="*80)
print("GEstimator Converted Projects")
print("="*80)

# Find the projects directory
import appdirs
dirs = appdirs.AppDirs('GEstimator', 'CPWD', version='1')
projects_dir = Path(dirs.user_data_dir) / 'projects'

print(f"\nProjects Directory: {projects_dir}")
print(f"Exists: {projects_dir.exists()}")

if projects_dir.exists():
    eproj_files = list(projects_dir.glob("*.eproj"))
    print(f"\nFound {len(eproj_files)} project(s):\n")
    
    for i, eproj in enumerate(eproj_files, 1):
        print(f"{i}. {eproj.name}")
        print(f"   Path: {eproj}")
        print(f"   Size: {eproj.stat().st_size:,} bytes")
        
        # Read project details
        try:
            conn = sqlite3.connect(str(eproj))
            cursor = conn.cursor()
            
            # Get project name
            cursor.execute("SELECT value FROM ProjectTable WHERE key='project_name'")
            result = cursor.fetchone()
            if result:
                print(f"   Project Name: {result[0]}")
            
            # Get item count
            cursor.execute("SELECT COUNT(*) FROM ScheduleTable")
            count = cursor.fetchone()[0]
            print(f"   Schedule Items: {count}")
            
            # Show first 3 items
            cursor.execute("SELECT code, description, unit, rate, qty FROM ScheduleTable LIMIT 3")
            items = cursor.fetchall()
            print(f"   Sample Items:")
            for code, desc, unit, rate, qty in items:
                print(f"     • {code}: {desc[:50]}...")
                print(f"       {qty} {unit} @ ₹{rate}")
            
            conn.close()
        except Exception as e:
            print(f"   Error: {e}")
        
        print()

print("="*80)
print("HOW TO OPEN IN GESTIMATOR")
print("="*80)
print("\nMethod 1: Open from GEstimator")
print("  1. Launch GEstimator.exe")
print("  2. Click 'Open Project' button (or File > Open)")
print("  3. Navigate to the folder above")
print("  4. Select a .eproj file and click Open")

print("\nMethod 2: Double-click the .eproj file")
print("  1. Open Windows Explorer")
print("  2. Navigate to the folder above")
print("  3. Double-click any .eproj file")
print("  (This works if .eproj is associated with GEstimator)")

print("\nMethod 3: Copy to a convenient location")
print("  You can copy the .eproj files to any folder you prefer")
print("  They will work from any location")

print("\n" + "="*80)

# Create a batch file to open the folder
batch_content = f'''@echo off
echo Opening GEstimator projects folder...
explorer "{projects_dir}"
'''

with open("open_projects_folder.bat", "w") as f:
    f.write(batch_content)

print("\n✓ Created 'open_projects_folder.bat'")
print("  Double-click this file to open the projects folder in Windows Explorer")
print("="*80)
