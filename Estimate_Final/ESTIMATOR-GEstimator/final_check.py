import os
import sys
from pathlib import Path

# Check if the projects directory exists and what's in it
projects_dir = Path("C:/Users/Rajkumar/.gestimator/projects")

print("="*60)
print("FINAL CONVERSION VERIFICATION")
print("="*60)

if projects_dir.exists():
    print(f"✅ Projects directory exists: {projects_dir}")
    
    # List all files
    files = list(projects_dir.iterdir())
    print(f"📁 Total files in directory: {len(files)}")
    
    # Filter for .eproj files
    eproj_files = [f for f in files if f.suffix == '.eproj']
    print(f"📊 .eproj files found: {len(eproj_files)}")
    
    # Show details of each .eproj file
    for i, file in enumerate(eproj_files, 1):
        size = file.stat().st_size
        print(f"  {i}. {file.name} ({size:,} bytes)")
        
    # Check for our specific files
    expected_names = [
        "20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.eproj",
        "RCC-20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.eproj"
    ]
    
    found_expected = [name for name in expected_names if any(name in str(f) for f in eproj_files)]
    missing_expected = [name for name in expected_names if name not in found_expected]
    
    print(f"\n🎯 Expected conversions: {len(expected_names)}")
    print(f"✅ Successfully converted: {len(found_expected)}")
    for name in found_expected:
        print(f"    - {name}")
        
    if missing_expected:
        print(f"❌ Missing conversions: {len(missing_expected)}")
        for name in missing_expected:
            print(f"    - {name}")
    else:
        print("🎉 ALL FILES SUCCESSFULLY CONVERTED!")
        
else:
    print(f"❌ Projects directory does not exist: {projects_dir}")
    print("Creating directory...")
    try:
        projects_dir.mkdir(parents=True, exist_ok=True)
        print("✅ Directory created successfully")
    except Exception as e:
        print(f"❌ Failed to create directory: {e}")

print("\n" + "="*60)
print("CONVERSION PROCESS COMPLETE")
print("="*60)