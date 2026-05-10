#!/usr/bin/env python3
"""
Verify that both Excel files were converted to .eproj format
"""

import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, '.')

def main():
    print("Verifying conversion of both Excel files...")
    
    # Check the target directory
    target_dir = Path("C:\\Users\\Rajkumar\\.gestimator\\projects")
    
    if target_dir.exists():
        print(f"Target directory exists: {target_dir}")
        
        # List all .eproj files
        eproj_files = list(target_dir.glob("*.eproj"))
        print(f"Found {len(eproj_files)} .eproj files:")
        
        for f in eproj_files:
            size = f.stat().st_size
            print(f"  - {f.name} ({size} bytes)")
            
        # Check if we have the expected files
        expected_files = [
            "20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.eproj",
            "RCC-20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.eproj"
        ]
        
        found_files = [f.name for f in eproj_files]
        missing_files = [f for f in expected_files if f not in found_files]
        
        if not missing_files:
            print("\n✅ SUCCESS: Both Excel files have been successfully converted to .eproj format!")
        else:
            print(f"\n⚠️  MISSING: {len(missing_files)} files not found:")
            for f in missing_files:
                print(f"  - {f}")
                
        # Also check the test file we created earlier
        test_file = Path("test_project.eproj")
        if test_file.exists():
            size = test_file.stat().st_size
            print(f"\n✅ TEST FILE: {test_file.name} ({size} bytes)")
            
    else:
        print(f"Target directory does not exist: {target_dir}")

if __name__ == '__main__':
    main()