#!/usr/bin/env python3
"""
Generate HTML report for GEstimator project files
"""
import sqlite3
import json
import os

def generate_project_report(filepath, output_file):
    """Generate HTML report for a GEstimator project"""
    print(f"Generating report for: {os.path.basename(filepath)}")
    
    try:
        # Connect to the database
        conn = sqlite3.connect(filepath)
        cursor = conn.cursor()
        
        # Start HTML report
        html = """
<!DOCTYPE html>
<html>
<head>
    <title>GEstimator Project Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1, h2 { color: #2c3e50; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .summary { background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0; }
    </style>
</head>
<body>
        """
        
        # Get project information
        try:
            cursor.execute("SELECT key, value FROM ProjectTable")
            settings = dict(cursor.fetchall())
            project_name = settings.get('project_name', 'Unknown Project')
            file_version = settings.get('file_version', 'Unknown')
            
            html += f"""
    <h1>GEstimator Project Report</h1>
    <div class="summary">
        <h2>Project Summary</h2>
        <p><strong>Project Name:</strong> {project_name}</p>
        <p><strong>File Version:</strong> {file_version}</p>
        <p><strong>File:</strong> {os.path.basename(filepath)}</p>
    </div>
            """
        except:
            html += "<h2>Project Information</h2><p>Not available</p>"
        
        # Get schedule items
        try:
            cursor.execute("""
                SELECT code, description, unit, rate, qty 
                FROM ScheduleTable 
                ORDER BY code
            """)
            
            items = cursor.fetchall()
            
            if items:
                html += f"""
    <h2>Schedule Items ({len(items)} items)</h2>
    <table>
        <tr>
            <th>Code</th>
            <th>Description</th>
            <th>Unit</th>
            <th>Rate</th>
            <th>Quantity</th>
        </tr>
                """
                
                for item in items[:50]:  # Show first 50 items
                    code, description, unit, rate, qty = item
                    html += f"""
        <tr>
            <td>{code or ''}</td>
            <td>{description or ''}</td>
            <td>{unit or ''}</td>
            <td>{rate or ''}</td>
            <td>{qty or ''}</td>
        </tr>
                    """
                
                html += """
    </table>
                """
                
                if len(items) > 50:
                    html += f"<p><em>... and {len(items) - 50} more items</em></p>"
            else:
                html += "<h2>Schedule Items</h2><p>No schedule items found</p>"
                
        except Exception as e:
            html += f"<h2>Schedule Items</h2><p>Error reading schedule items: {e}</p>"
        
        conn.close()
        
        # Finish HTML
        html += """
</body>
</html>
        """
        
        # Write HTML file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"Report generated: {output_file}")
        return True
        
    except Exception as e:
        print(f"Error generating report: {e}")
        return False

def main():
    # Look for project files
    project_dir = os.path.expanduser("~/.gestimator/projects")
    output_file = "project_report.html"
    
    if os.path.exists(project_dir):
        project_files = [f for f in os.listdir(project_dir) if f.endswith('.eproj')]
        
        if project_files:
            print("Available GEstimator Projects:")
            for i, filename in enumerate(project_files, 1):
                print(f"{i}. {filename}")
            
            # Generate report for the first project
            first_project = os.path.join(project_dir, project_files[0])
            if generate_project_report(first_project, output_file):
                print(f"\nHTML report saved as: {output_file}")
                print("Open this file in your web browser to view the project details.")
            else:
                print("Failed to generate report.")
        else:
            print("No project files found in:", project_dir)
    else:
        print("Project directory not found:", project_dir)

if __name__ == "__main__":
    main()