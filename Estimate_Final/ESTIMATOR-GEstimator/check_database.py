#!/usr/bin/env python3
import sqlite3
from pathlib import Path

# Check the converted database
db_path = Path("C:/Users/Rajkumar/AppData/Local/CPWD/GEstimator/1/projects/20-40 Construction of Hall with Geodesic Aluminium Dome Roof at Arthuna.eproj")

print(f"Checking database: {db_path.name}")
print("="*80)

if not db_path.exists():
    print("ERROR: Database file not found!")
    exit(1)

conn = sqlite3.connect(str(db_path))
cursor = conn.cursor()

# Check tables
print("\nTables in database:")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = [row[0] for row in cursor.fetchall()]
for table in tables:
    print(f"  - {table}")

# Check ScheduleTable structure
print("\nScheduleTable structure:")
cursor.execute("PRAGMA table_info(ScheduleTable)")
columns = cursor.fetchall()
for col in columns:
    print(f"  {col[1]} ({col[2]})")

# Check data
print("\nScheduleTable data:")
cursor.execute("SELECT COUNT(*) FROM ScheduleTable")
count = cursor.fetchone()[0]
print(f"  Total rows: {count}")

if count > 0:
    print("\n  Sample items:")
    cursor.execute("SELECT id, code, description, unit, rate, qty FROM ScheduleTable LIMIT 5")
    for row in cursor.fetchall():
        print(f"    ID={row[0]}, Code={row[1]}, Desc={row[2][:40]}, Unit={row[3]}, Rate={row[4]}, Qty={row[5]}")

# Check ProjectTable
print("\nProjectTable settings:")
cursor.execute("SELECT key, value FROM ProjectTable")
for row in cursor.fetchall():
    print(f"  {row[0]}: {row[1]}")

conn.close()

print("\n" + "="*80)
print("Diagnostic complete!")

# Now check a working GEstimator database for comparison
print("\n" + "="*80)
print("Checking reference database structure...")
print("="*80)

ref_db = Path("estimator/database/DSR2021.eproj")
if ref_db.exists():
    conn2 = sqlite3.connect(str(ref_db))
    cursor2 = conn2.cursor()
    
    print("\nReference ScheduleTable structure:")
    cursor2.execute("PRAGMA table_info(ScheduleTable)")
    ref_columns = cursor2.fetchall()
    for col in ref_columns:
        print(f"  {col[1]} ({col[2]})")
    
    conn2.close()
else:
    print("Reference database not found")

input("\nPress Enter to exit...")
