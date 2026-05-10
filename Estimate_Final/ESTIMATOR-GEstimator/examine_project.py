#!/usr/bin/env python3
"""
Examine GEstimator project files (.eproj)
"""
import sys
import os
from estimator.data.schedule import ScheduleDatabase
import peewee

def examine_eproj_file(filepath):
    """Examine a GEstimator .eproj file"""
    print(f"Examining GEstimator project: {os.path.basename(filepath)}")
    print("="*60)
    
    try:
        # Check if file exists
        if not os.path.exists(filepath):
            print(f"Error: File '{filepath}' not found!")
            return
            
        # Get file info
        file_size = os.path.getsize(filepath)
        print(f"File size: {file_size} bytes")
        
        # Try to open as SQLite database (eproj files are SQLite databases)
        db = ScheduleDatabase(None)  # Pass None for stack since we're just examining
        
        # Try to open the database
        try:
            db.open_database(filepath)
            print("Database connection: SUCCESS")
            
            # Try to access some basic information
            try:
                settings = db.get_project_settings()
                print(f"Project name: {settings.get('project_name', 'Unknown')}")
                print(f"File version: {settings.get('file_version', 'Unknown')}")
                print("Project file appears to be valid!")
            except Exception as e:
                print(f"Could access database but had issues reading settings: {e}")
            
            db.close_database()
            
        except Exception as e:
            print(f"Error opening database: {e}")
            # Try basic SQLite connection
            try:
                sqlite_db = peewee.SqliteDatabase(filepath)
                sqlite_db.connect()
                tables = sqlite_db.get_tables()
                print(f"SQLite tables: {tables}")
                sqlite_db.close()
            except Exception as e2:
                print(f"Basic SQLite connection also failed: {e2}")
        
        print("\nProject file examination complete.")
        print("If the file shows as valid above, it should open in GEstimator.")
        
    except Exception as e:
        print(f"Error examining project file: {e}")
        import traceback
        traceback.print_exc()

def main():
    if len(sys.argv) < 2:
        print("Usage: python examine_project.py <project_file.eproj>")
        print("\nLooking for project files in default location...")
        project_dir = os.path.expanduser("~/.gestimator/projects")
        if os.path.exists(project_dir):
            projects = [f for f in os.listdir(project_dir) if f.endswith('.eproj')]
            if projects:
                print("Found projects:")
                for project in projects:
                    print(f"  - {project}")
                    examine_eproj_file(os.path.join(project_dir, project))
                    break  # Just examine the first one
            else:
                print("No .eproj files found in default location")
        return
    
    filepath = sys.argv[1]
    examine_eproj_file(filepath)

if __name__ == "__main__":
    main()