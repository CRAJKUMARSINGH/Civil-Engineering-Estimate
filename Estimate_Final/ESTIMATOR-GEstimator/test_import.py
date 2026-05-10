#!/usr/bin/env python3
import sys
print("Starting test script...")
print(f"Python version: {sys.version}")

try:
    print("Importing estimator...")
    from estimator import misc
    print(f"Success! PROGRAM_NAME = {misc.PROGRAM_NAME}")
    
    print("\nImporting openpyxl...")
    import openpyxl
    print("Success!")
    
    print("\nImporting peewee...")
    import peewee
    print("Success!")
    
    print("\nImporting appdirs...")
    import appdirs
    print("Success!")
    
    print("\nAll imports successful!")
    
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
