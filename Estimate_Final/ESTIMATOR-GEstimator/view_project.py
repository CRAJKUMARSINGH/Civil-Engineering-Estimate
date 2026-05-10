#!/usr/bin/env python3
"""
View GEstimator project data in a browser by creating an HTML report
"""

import sys
import os
import sqlite3
from pathlib import Path
import webbrowser

def create_html_report(eproj_path):
    """Create an HTML report from a .eproj file"""
    try:
        # Connect to the database
        conn = sqlite3.connect(eproj_path)
        cursor = conn.cursor()
        
        # Get project information
        cursor.execute("SELECT value FROM ProjectTable WHERE key='project_name'")
        project_name_row = cursor.fetchone()
        project_name = project_name_row[0] if project_name_row else "Unknown Project"
        
        # Get schedule items
        cursor.execute("""
            SELECT code, description, unit, rate, qty 
            FROM ScheduleTable 
            ORDER BY order
            LIMIT 50  -- Limit to first 50 items for readability
        """)
        schedule_items = cursor.fetchall()
        
        # Close connection
        conn.close()
        
        # Generate HTML
        html_content = f"""<!DOCTYPE html>
<html>
<head>
    <title>GEstimator Project Viewer - {project_name}</title>
    <style>
        body {{ 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            margin: 0; 
            padding: 20px; 
            background-color: #f5f5f5; 
        }}
        .container {{ 
            max-width: 1200px; 
            margin: 0 auto; 
            background: white; 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1); 
        }}
        h1 {{ 
            color: #2c3e50; 
            border-bottom: 2px solid #3498db; 
            padding-bottom: 10px; 
        }}
        h2 {{ 
            color: #34495e; 
        }}
        table {{ 
            border-collapse: collapse; 
            width: 100%; 
            margin-top: 20px; 
            background: white; 
        }}
        th, td {{ 
            border: 1px solid #ddd; 
            padding: 12px; 
            text-align: left; 
        }}
        th {{ 
            background-color: #3498db; 
            color: white; 
            font-weight: bold; 
        }}
        tr:nth-child(even) {{ 
            background-color: #f8f9fa; 
        }}
        tr:hover {{ 
            background-color: #e3f2fd; 
        }}
        .file-info {{ 
            background-color: #e8f4f8; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 15px 0; 
        }}
        .stats {{ 
            display: flex; 
            justify-content: space-around; 
            background: #2c3e50; 
            color: white; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 15px 0; 
        }}
        .stat-box {{ 
            text-align: center; 
        }}
        .stat-number {{ 
            font-size: 2em; 
            font-weight: bold; 
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>GEstimator Project Viewer</h1>
        <h2>{project_name}</h2>
        
        <div class="file-info">
            <p><strong>Project File:</strong> {eproj_path.name}</p>
            <p><strong>File Size:</strong> {eproj_path.stat().st_size:,} bytes</p>
            <p><strong>Location:</strong> {eproj_path}</p>
        </div>
        
        <div class="stats">
            <div class="stat-box">
                <div class="stat-number">{len(schedule_items)}</div>
                <div>Schedule Items</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">{len([item for item in schedule_items if item[2]])}</div>
                <div>With Units</div>
            </div>
            <div class="stat-box">
                <div class="stat-number">{len([item for item in schedule_items if float(item[3] or 0) > 0])}</div>
                <div>With Rates</div>
            </div>
        </div>
        
        <h2>Schedule Items</h2>
        <table>
            <thead>
                <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th>Unit</th>
                    <th>Rate</th>
                    <th>Quantity</th>
                </tr>
            </thead>
            <tbody>
        """
        
        # Add schedule items
        for item in schedule_items:
            html_content += f"""
                <tr>
                    <td>{item[0] or ''}</td>
                    <td>{item[1][:100] + '...' if len(item[1]) > 100 else item[1] or ''}</td>
                    <td>{item[2] or ''}</td>
                    <td>{float(item[3]) if item[3] else 0:.2f}</td>
                    <td>{float(item[4]) if item[4] else 0:.2f}</td>
                </tr>
            """
        
        html_content += """
            </tbody>
        </table>
        
        <p style="margin-top: 20px; color: #7f8c8d; font-style: italic;">
            Note: This is a visualization of the GEstimator project data. 
            The actual .eproj file is a SQLite database that can only be opened with GEstimator.
        </p>
    </div>
</body>
</html>
        """
        
        # Write HTML file
        output_html = Path("project_viewer.html")
        with open(output_html, 'w', encoding='utf-8') as f:
            f.write(html_content)
            
        print(f"✅ HTML report generated successfully!")
        print(f"📁 Report saved to: {output_html.absolute()}")
        return output_html
        
    except Exception as e:
        print(f"❌ Error generating report: {e}")
        import traceback
        traceback.print_exc()
        return None

def main():
    print("🚀 GEstimator Project Viewer")
    print("="*50)
    
    # Look for the test project file
    test_file = Path("test_project.eproj")
    if test_file.exists():
        print(f"📄 Found project file: {test_file.name}")
        html_file = create_html_report(test_file)
        if html_file:
            print(f"🌐 Opening in browser...")
            try:
                webbrowser.open(f"file://{html_file.absolute()}")
                print("✅ Report opened in your default browser!")
            except Exception as e:
                print(f"⚠️ Could not open browser automatically: {e}")
                print(f"💡 Please manually open: {html_file.absolute()}")
        else:
            print("❌ Failed to create HTML report")
    else:
        print("❌ No project file found")
        print("💡 Please run the conversion first to create project files")

if __name__ == '__main__':
    main()