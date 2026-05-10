#!/usr/bin/env python3
import sys

try:
    print("Testing imports...")
    import import_schedule_and_projects
    print("Import successful!")
    print("Running main...")
    result = import_schedule_and_projects.main()
    print(f"Script completed with exit code: {result}")
except Exception as e:
    print(f"ERROR: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
