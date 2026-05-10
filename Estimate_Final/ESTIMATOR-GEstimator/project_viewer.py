#!/usr/bin/env python3
"""
Simple viewer for GEstimator project files
"""
import sqlite3
import json
import os

def view_project_schedule(filepath):
    """View schedule items in a GEstimator project"""
    print(f"Viewing schedule items from: {os.path.basename(filepath)}")
    print("=" * 60)
    
    try:
        # Connect to the database
        conn = sqlite3.connect(filepath)
        cursor = conn.cursor()
        
        # Get project information
        try:
            cursor.execute("SELECT key, value FROM ProjectTable")
            settings = dict(cursor.fetchall())
            print(f"Project: {settings.get('project_name', 'Unknown')}")
            print(f"Version: {settings.get('file_version', 'Unknown')}")
            print()
        except:
            print("Project information not available")
            print()
        
        # Get schedule items
        try:
            cursor.execute("""
                SELECT code, description, unit, rate, qty 
                FROM ScheduleTable 
                ORDER BY code
            """)
            
            items = cursor.fetchall()
            
            if items:
                # Print header
                print(f"{'Code':<10} {'Description':<40} {'Unit':<8} {'Rate':<10} {'Qty':<10}")
                print("-" * 80)
                
                for i, item in enumerate(items[:20]):  # Show first 20 items
                    code, description, unit, rate, qty = item
                    # Truncate long descriptions
                    if len(description) > 37:
                        description = description[:37] + "..."
                    print(f"{code:<10} {description:<40} {unit or '':<8} {rate or '':<10} {qty or '':<10}")
                
                if len(items) > 20:
                    print(f"\n... and {len(items) - 20} more items")
                
                print(f"\nTotal schedule items: {len(items)}")
            else:
                print("No schedule items found")
                
        except Exception as e:
            print(f"Error reading schedule items: {e}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error opening project file: {e}")

def main():
    # Look for project files
    project_dir = os.path.expanduser("~/.gestimator/projects")
    
    if os.path.exists(project_dir):
        project_files = [f for f in os.listdir(project_dir) if f.endswith('.eproj')]
        
        if project_files:
            print("Available GEstimator Projects:")
            print("-" * 40)
            for i, filename in enumerate(project_files, 1):
                filepath = os.path.join(project_dir, filename)
                size = os.path.getsize(filepath)
                print(f"{i}. {filename} ({size} bytes)")
            
            print()
            # View the first project
            first_project = os.path.join(project_dir, project_files[0])
            view_project_schedule(first_project)
        else:
            print("No project files found in:", project_dir)
    else:
        print("Project directory not found:", project_dir)

if __name__ == "__main__":
    main()