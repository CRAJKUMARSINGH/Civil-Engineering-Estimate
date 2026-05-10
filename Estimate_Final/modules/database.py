#!/usr/bin/env python3
"""
Database Module for Construction Estimation System
Handles data persistence and retrieval
"""

import os
import sqlite3
from datetime import datetime
from typing import Dict

import pandas as pd
import streamlit as st


class EstimationDatabase:
    """Database handler for construction estimation data"""
    
    def __init__(self, db_path: str = "estimation_data.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """Initialize database with required tables"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Projects table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS projects (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    location TEXT,
                    created_date TEXT,
                    last_modified TEXT,
                    total_cost REAL,
                    status TEXT DEFAULT 'active'
                )
            """)
            
            # Measurements table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS measurements (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER,
                    sheet_name TEXT,
                    item_no TEXT,
                    description TEXT,
                    specification TEXT,
                    location TEXT,
                    quantity REAL,
                    length REAL,
                    breadth REAL,
                    height REAL,
                    diameter REAL,
                    thickness REAL,
                    unit TEXT,
                    total REAL,
                    deduction REAL,
                    net_total REAL,
                    remarks TEXT,
                    ssr_code TEXT,
                    FOREIGN KEY (project_id) REFERENCES projects (id)
                )
            """)
            
            # Abstracts table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS abstracts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    project_id INTEGER,
                    sheet_name TEXT,
                    ssr_code TEXT,
                    description TEXT,
                    unit TEXT,
                    quantity REAL,
                    rate REAL,
                    amount REAL,
                    FOREIGN KEY (project_id) REFERENCES projects (id)
                )
            """)
            
            # SSR items table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS ssr_items (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    code TEXT UNIQUE,
                    description TEXT,
                    category TEXT,
                    unit TEXT,
                    rate REAL,
                    last_updated TEXT
                )
            """)
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            st.error(f"Database initialization error: {e}")
    
    def save_project(self, project_data: Dict) -> int:
        """Save complete project data to database"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Insert project
            cursor.execute("""
                INSERT INTO projects (name, location, created_date, last_modified, total_cost)
                VALUES (?, ?, ?, ?, ?)
            """, (
                project_data['name'],
                project_data.get('location', ''),
                datetime.now().isoformat(),
                datetime.now().isoformat(),
                project_data.get('total_cost', 0)
            ))
            
            project_id = cursor.lastrowid
            
            # Save measurements
            if 'measurements' in project_data:
                for sheet_name, measurements_df in project_data['measurements'].items():
                    for _, row in measurements_df.iterrows():
                        cursor.execute("""
                            INSERT INTO measurements (
                                project_id, sheet_name, item_no, description, specification,
                                location, quantity, length, breadth, height, diameter,
                                thickness, unit, total, deduction, net_total, remarks, ssr_code
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            project_id, sheet_name, row.get('item_no', ''),
                            row.get('description', ''), row.get('specification', ''),
                            row.get('location', ''), row.get('quantity', 0),
                            row.get('length', 0), row.get('breadth', 0),
                            row.get('height', 0), row.get('diameter', 0),
                            row.get('thickness', 0), row.get('unit', ''),
                            row.get('total', 0), row.get('deduction', 0),
                            row.get('net_total', 0), row.get('remarks', ''),
                            row.get('ssr_code', '')
                        ))
            
            # Save abstracts
            if 'abstracts' in project_data:
                for sheet_name, abstracts_df in project_data['abstracts'].items():
                    for _, row in abstracts_df.iterrows():
                        cursor.execute("""
                            INSERT INTO abstracts (
                                project_id, sheet_name, ssr_code, description,
                                unit, quantity, rate, amount
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        """, (
                            project_id, sheet_name, row.get('ssr_code', ''),
                            row.get('description', ''), row.get('unit', ''),
                            row.get('quantity', 0), row.get('rate', 0),
                            row.get('amount', 0)
                        ))
            
            conn.commit()
            conn.close()
            
            return project_id
            
        except Exception as e:
            st.error(f"Error saving project: {e}")
            return -1
    
    def load_project(self, project_id: int) -> Dict:
        """Load complete project data from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Load project info
            project_df = pd.read_sql_query(
                "SELECT * FROM projects WHERE id = ?", 
                conn, params=(project_id,)
            )
            
            if project_df.empty:
                return None
            
            project_info = project_df.iloc[0].to_dict()
            
            # Load measurements
            measurements_df = pd.read_sql_query(
                "SELECT * FROM measurements WHERE project_id = ?",
                conn, params=(project_id,)
            )
            
            # Group by sheet_name
            measurements_by_sheet = {}
            for sheet_name in measurements_df['sheet_name'].unique():
                sheet_data = measurements_df[measurements_df['sheet_name'] == sheet_name]
                measurements_by_sheet[sheet_name] = sheet_data
            
            # Load abstracts
            abstracts_df = pd.read_sql_query(
                "SELECT * FROM abstracts WHERE project_id = ?",
                conn, params=(project_id,)
            )
            
            # Group by sheet_name
            abstracts_by_sheet = {}
            for sheet_name in abstracts_df['sheet_name'].unique():
                sheet_data = abstracts_df[abstracts_df['sheet_name'] == sheet_name]
                abstracts_by_sheet[sheet_name] = sheet_data
            
            conn.close()
            
            return {
                'project_info': project_info,
                'measurements': measurements_by_sheet,
                'abstracts': abstracts_by_sheet
            }
            
        except Exception as e:
            st.error(f"Error loading project: {e}")
            return None
    
    def list_projects(self) -> pd.DataFrame:
        """List all projects in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            projects_df = pd.read_sql_query(
                "SELECT id, name, location, created_date, total_cost, status FROM projects ORDER BY last_modified DESC",
                conn
            )
            conn.close()
            return projects_df
        except Exception as e:
            st.error(f"Error listing projects: {e}")
            return pd.DataFrame()
    
    def delete_project(self, project_id: int) -> bool:
        """Delete project and all related data"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            # Delete in order (foreign key constraints)
            cursor.execute("DELETE FROM measurements WHERE project_id = ?", (project_id,))
            cursor.execute("DELETE FROM abstracts WHERE project_id = ?", (project_id,))
            cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            st.error(f"Error deleting project: {e}")
            return False
    
    def update_ssr_items(self, ssr_df: pd.DataFrame):
        """Update SSR items in database"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Clear existing SSR items
            cursor = conn.cursor()
            cursor.execute("DELETE FROM ssr_items")
            
            # Insert new SSR items
            for _, row in ssr_df.iterrows():
                cursor.execute("""
                    INSERT INTO ssr_items (code, description, category, unit, rate, last_updated)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (
                    row['code'], row['description'], row['category'],
                    row['unit'], row['rate'], datetime.now().isoformat()
                ))
            
            conn.commit()
            conn.close()
            
            return True
            
        except Exception as e:
            st.error(f"Error updating SSR items: {e}")
            return False
    
    def load_ssr_items(self) -> pd.DataFrame:
        """Load SSR items from database"""
        try:
            conn = sqlite3.connect(self.db_path)
            ssr_df = pd.read_sql_query("SELECT * FROM ssr_items ORDER BY code", conn)
            conn.close()
            return ssr_df
        except Exception as e:
            st.error(f"Error loading SSR items: {e}")
            return pd.DataFrame()
    
    def backup_database(self, backup_path: str) -> bool:
        """Create database backup"""
        try:
            import shutil
            shutil.copy2(self.db_path, backup_path)
            return True
        except Exception as e:
            st.error(f"Backup failed: {e}")
            return False
    
    def get_database_stats(self) -> Dict:
        """Get database statistics"""
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            stats = {}
            
            # Count records in each table
            tables = ['projects', 'measurements', 'abstracts', 'ssr_items']
            for table in tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                stats[f'{table}_count'] = cursor.fetchone()[0]
            
            # Database file size
            stats['db_size_mb'] = os.path.getsize(self.db_path) / (1024 * 1024) if os.path.exists(self.db_path) else 0
            
            conn.close()
            return stats
            
        except Exception as e:
            st.error(f"Error getting database stats: {e}")
            return {}

# Streamlit integration functions
def init_database_connection():
    """Initialize database connection for Streamlit"""
    if 'database' not in st.session_state:
        st.session_state.database = EstimationDatabase()
        
        # Load SSR items from database if available
        ssr_from_db = st.session_state.database.load_ssr_items()
        if not ssr_from_db.empty:
            st.session_state.ssr_items = ssr_from_db

def save_current_project():
    """Save current session state to database"""
    if 'database' not in st.session_state:
        init_database_connection()
    
    project_data = {
        'name': st.session_state.general_abstract_settings.get('project_name', 'Untitled Project'),
        'location': st.session_state.general_abstract_settings.get('project_location', ''),
        'measurements': st.session_state.measurement_sheets,
        'abstracts': st.session_state.abstract_sheets,
        'total_cost': sum(
            abstracts['amount'].sum() if not abstracts.empty else 0
            for abstracts in st.session_state.abstract_sheets.values()
        )
    }
    
    project_id = st.session_state.database.save_project(project_data)
    
    if project_id > 0:
        st.success(f"✅ Project saved successfully! ID: {project_id}")
        return project_id
    else:
        st.error("❌ Failed to save project")
        return None

def load_project_from_db(project_id: int):
    """Load project from database into session state"""
    if 'database' not in st.session_state:
        init_database_connection()
    
    project_data = st.session_state.database.load_project(project_id)
    
    if project_data:
        # Update session state
        st.session_state.general_abstract_settings.update({
            'project_name': project_data['project_info']['name'],
            'project_location': project_data['project_info']['location']
        })
        
        # Update measurement sheets
        for sheet_name, measurements_df in project_data['measurements'].items():
            st.session_state.measurement_sheets[sheet_name] = measurements_df
        
        # Update abstract sheets
        for sheet_name, abstracts_df in project_data['abstracts'].items():
            st.session_state.abstract_sheets[sheet_name] = abstracts_df
        
        st.success(f"✅ Project '{project_data['project_info']['name']}' loaded successfully!")
        return True
    else:
        st.error("❌ Failed to load project")
        return False