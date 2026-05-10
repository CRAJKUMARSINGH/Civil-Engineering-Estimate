#!/usr/bin/env python3
import sqlite3
from pathlib import Path

output = open("schema_comparison.txt", "w", encoding="utf-8")

def log(msg):
    print(msg)
    output.write(msg + "\n")
    output.flush()

log("="*80)
log("Database Schema Comparison")
log("="*80)

# Check reference database
ref_db = Path("estimator/database/DSR2021.eproj")
log(f"\n1. Reference Database: {ref_db}")
log("-"*80)

if ref_db.exists():
    conn = sqlite3.connect(str(ref_db))
    cursor = conn.cursor()
    
    # Get tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    log(f"Tables: {tables}")
    
    # Get ScheduleTable structure
    log("\nScheduleTable columns:")
    cursor.execute("PRAGMA table_info(ScheduleTable)")
    for col in cursor.fetchall():
        log(f"  {col[0]}: {col[1]} {col[2]} (notnull={col[3]}, default={col[4]}, pk={col[5]})")
    
    # Check sample data
    cursor.execute("SELECT COUNT(*) FROM ScheduleTable")
    count = cursor.fetchone()[0]
    log(f"\nScheduleTable rows: {count}")
    
    if count > 0:
        cursor.execute("SELECT * FROM ScheduleTable LIMIT 1")
        sample = cursor.fetchone()
        log(f"Sample row: {sample}")
    
    conn.close()
else:
    log("Reference database not found!")

# Check converted database
conv_db = Path("C:/Users/Rajkumar/AppData/Local/CPWD/GEstimator/1/projects/20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.eproj")
log(f"\n2. Converted Database: {conv_db.name}")
log("-"*80)

if conv_db.exists():
    conn = sqlite3.connect(str(conv_db))
    cursor = conn.cursor()
    
    # Get tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    log(f"Tables: {tables}")
    
    # Get ScheduleTable structure
    log("\nScheduleTable columns:")
    cursor.execute("PRAGMA table_info(ScheduleTable)")
    for col in cursor.fetchall():
        log(f"  {col[0]}: {col[1]} {col[2]} (notnull={col[3]}, default={col[4]}, pk={col[5]})")
    
    # Check sample data
    cursor.execute("SELECT COUNT(*) FROM ScheduleTable")
    count = cursor.fetchone()[0]
    log(f"\nScheduleTable rows: {count}")
    
    if count > 0:
        cursor.execute("SELECT * FROM ScheduleTable LIMIT 1")
        sample = cursor.fetchone()
        log(f"Sample row: {sample}")
    
    conn.close()
else:
    log("Converted database not found!")

output.close()
log("\n" + "="*80)
log("Comparison saved to schema_comparison.txt")
