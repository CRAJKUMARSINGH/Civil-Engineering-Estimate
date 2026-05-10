#!/usr/bin/env python3
"""
Simple script to run the conversion and capture output
"""

import subprocess
import sys

def main():
    try:
        # Run the conversion script and capture output
        result = subprocess.run(
            [sys.executable, "convert_projects.py"],
            capture_output=True,
            text=True,
            timeout=60  # 60 second timeout
        )
        
        # Write output to file
        with open("conversion_result.txt", "w") as f:
            f.write("STDOUT:\n")
            f.write(result.stdout)
            f.write("\nSTDERR:\n")
            f.write(result.stderr)
            f.write(f"\nReturn code: {result.returncode}\n")
        
        print("Conversion completed. Check conversion_result.txt for results.")
        
        # Also print to console
        print("STDOUT:")
        print(result.stdout)
        print("STDERR:")
        print(result.stderr)
        print(f"Return code: {result.returncode}")
        
    except subprocess.TimeoutExpired:
        print("Conversion timed out")
    except Exception as e:
        print(f"Error running conversion: {e}")

if __name__ == '__main__':
    main()