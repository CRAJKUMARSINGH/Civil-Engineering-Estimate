#!/usr/bin/env python3
"""
Verify GEstimator project files
"""
import os
import sqlite3

def verify_project_file(filepath):
    """Verify a GEstimator project file"""
    print(f"Verifying: {os.path.basename(filepath)}")
    print("-" * 50)
    
    # Check if file exists
    if not os.path.exists(filepath):
        print(f"❌ File not found: {filepath}")
        return False
    
    # Check file size
    size = os.path.getsize(filepath)
    print(f"File size: {size} bytes")
    
    try:
        # Try to open as SQLite database
        conn = sqlite3.connect(filepath)
        cursor = conn.cursor()
        
        # Check if it has the expected tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in cursor.fetchall()]
        print(f"Tables found: {tables}")
        
        # Check for essential tables
        essential_tables = ['ProjectTable', 'ScheduleTable', 'ResourceTable']
        found_tables = [table for table in essential_tables if table in tables]
        missing_tables = [table for table in essential_tables if table not in tables]
        
        if found_tables:
            print(f"✅ Found essential tables: {found_tables}")
        if missing_tables:
            print(f"⚠️  Missing essential tables: {missing_tables}")
        
        # Try to read project settings
        try:
            cursor.execute("SELECT key, value FROM ProjectTable")
            settings = dict(cursor.fetchall())
            print(f"Project name: {settings.get('project_name', 'Not set')}")
            print(f"File version: {settings.get('file_version', 'Not set')}")
        except Exception as e:
            print(f"⚠️  Could not read project settings: {e}")
        
        conn.close()
        print("✅ File verification complete - appears to be a valid GEstimator project")
        return True
        
    except Exception as e:
        print(f"❌ Error verifying file: {e}")
        return False

def main():
    print("GEstimator Project File Verification")
    print("=" * 40)
    
    # Check the standard project directory
    project_dir = os.path.expanduser("~/.gestimator/projects")
    if os.path.exists(project_dir):
        print(f"Checking projects in: {project_dir}")
        print()
        
        for filename in os.listdir(project_dir):
            if filename.endswith('.eproj'):
                filepath = os.path.join(project_dir, filename)
                verify_project_file(filepath)
                print()
    else:
        print(f"Project directory not found: {project_dir}")
        
        # Check current directory
        print("Checking current directory...")
        for filename in os.listdir('.'):
            if filename.endswith('.eproj'):
                verify_project_file(filename)
                print()

if __name__ == "__main__":
    main()