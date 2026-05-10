"""
Performance Optimizer Module
Implements memory optimization, caching, and performance improvements
"""

import gc
import logging
import re
import sqlite3
import time
from datetime import datetime
from functools import wraps
from pathlib import Path
from typing import Any, Dict, List, Tuple

import pandas as pd
import psutil
import streamlit as st

logger = logging.getLogger(__name__)

class PerformanceOptimizer:
    """Performance optimization utilities for the construction estimation system"""
    
    def __init__(self):
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'memory_usage': 0
        }
    
    @staticmethod
    @st.cache_data(ttl=300)  # Cache for 5 minutes
    def load_measurements_cached(project_id: str, sheet_name: str) -> pd.DataFrame:
        """Cached loading of measurements to reduce database hits"""
        try:
            conn = sqlite3.connect(st.session_state.database.db_path)
            query = """
                SELECT * FROM measurements 
                WHERE project_id = ? AND sheet_name = ?
                ORDER BY created_date DESC
            """
            df = pd.read_sql_query(query, conn, params=(project_id, sheet_name))
            conn.close()
            return df
        except Exception as e:
            logger.error(f"Error loading cached measurements: {e}")
            return pd.DataFrame()
    
    @staticmethod
    @st.cache_data
    def load_measurements(sheet_name: str):
        """Lazy loading of measurements from session state"""
        return st.session_state.measurements.get(sheet_name, pd.DataFrame())
    
    @staticmethod
    @st.cache_data(ttl=600)  # Cache for 10 minutes
    def load_ssr_items_cached() -> pd.DataFrame:
        """Cached loading of SSR items for better performance"""
        try:
            conn = sqlite3.connect(st.session_state.database.db_path)
            query = """
                SELECT id, code, description, unit, rate, category, 
                       sub_category, search_keywords
                FROM ssr_items 
                WHERE is_active = 1
                ORDER BY code
            """
            df = pd.read_sql_query(query, conn)
            conn.close()
            return df
        except Exception as e:
            logger.error(f"Error loading cached SSR items: {e}")
            return pd.DataFrame()
    
    @staticmethod
    def paginate_dataframe(df: pd.DataFrame, page: int = 0, page_size: int = 50) -> Tuple[pd.DataFrame, Dict]:
        """Paginate large DataFrames for better performance"""
        total_rows = len(df)
        total_pages = (total_rows - 1) // page_size + 1 if total_rows > 0 else 0
        
        start_idx = page * page_size
        end_idx = min(start_idx + page_size, total_rows)
        
        paginated_df = df.iloc[start_idx:end_idx]
        
        pagination_info = {
            'current_page': page,
            'total_pages': total_pages,
            'total_rows': total_rows,
            'page_size': page_size,
            'start_row': start_idx + 1,
            'end_row': end_idx
        }
        
        return paginated_df, pagination_info
    
    @staticmethod
    def optimize_memory_usage():
        """Optimize memory usage by cleaning up unused data"""
        # Clear large DataFrames from session state if not recently used
        current_time = time.time()
        
        # Clean up old cached data
        if hasattr(st.session_state, 'last_data_access'):
            if current_time - st.session_state.last_data_access > 1800:  # 30 minutes
                # Clear large data structures
                for key in ['measurements', 'abstracts']:
                    if key in st.session_state:
                        st.session_state[key] = {}
                
                # Force garbage collection
                gc.collect()
                logger.info("Memory optimization: Cleared old cached data")
        
        st.session_state.last_data_access = current_time
    
    @staticmethod
    def get_memory_usage() -> Dict[str, float]:
        """Get current memory usage statistics"""
        process = psutil.Process()
        memory_info = process.memory_info()
        
        return {
            'rss_mb': memory_info.rss / 1024 / 1024,  # Resident Set Size
            'vms_mb': memory_info.vms / 1024 / 1024,  # Virtual Memory Size
            'percent': process.memory_percent(),
            'available_mb': psutil.virtual_memory().available / 1024 / 1024
        }
    
    @staticmethod
    def performance_monitor(func):
        """Decorator to monitor function performance"""
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            start_memory = psutil.Process().memory_info().rss
            
            try:
                result = func(*args, **kwargs)
                
                end_time = time.time()
                end_memory = psutil.Process().memory_info().rss
                
                execution_time = end_time - start_time
                memory_delta = (end_memory - start_memory) / 1024 / 1024  # MB
                
                logger.info(f"Performance: {func.__name__} - Time: {execution_time:.3f}s, Memory: {memory_delta:+.2f}MB")
                
                return result
                
            except Exception as e:
                logger.error(f"Performance monitor error in {func.__name__}: {e}")
                raise
        
        return wrapper
    
    @staticmethod
    def create_database_indexes(db_path: str):
        """Create database indexes for better query performance"""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Create indexes for frequently queried columns
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_measurements_project_id ON measurements(project_id)",
                "CREATE INDEX IF NOT EXISTS idx_measurements_sheet_name ON measurements(sheet_name)",
                "CREATE INDEX IF NOT EXISTS idx_measurements_ssr_code ON measurements(ssr_code)",
                "CREATE INDEX IF NOT EXISTS idx_ssr_items_code ON ssr_items(code)",
                "CREATE INDEX IF NOT EXISTS idx_ssr_items_category ON ssr_items(category)",
                "CREATE INDEX IF NOT EXISTS idx_ssr_items_description ON ssr_items(description)",
                "CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)",
                "CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by)",
                "CREATE INDEX IF NOT EXISTS idx_activity_log_project_id ON activity_log(project_id)",
                "CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp ON activity_log(timestamp)"
            ]
            
            for index_sql in indexes:
                cursor.execute(index_sql)
            
            conn.commit()
            conn.close()
            
            logger.info("✅ Database indexes created successfully")
            
        except Exception as e:
            logger.error(f"❌ Error creating database indexes: {e}")
    
    @staticmethod
    def batch_process_data(data_list: List[Dict], batch_size: int = 100, 
                          process_func: callable = None) -> List[Any]:
        """Process large datasets in batches for better performance"""
        results = []
        total_batches = (len(data_list) - 1) // batch_size + 1
        
        for i in range(0, len(data_list), batch_size):
            batch = data_list[i:i + batch_size]
            batch_num = i // batch_size + 1
            
            logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} items)")
            
            if process_func:
                batch_result = process_func(batch)
                results.extend(batch_result if isinstance(batch_result, list) else [batch_result])
            else:
                results.extend(batch)
        
        return results
    
    @staticmethod
    def optimize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
        """Optimize DataFrame memory usage by converting data types"""
        if df.empty:
            return df
        
        optimized_df = df.copy()
        
        # Optimize numeric columns
        for col in optimized_df.select_dtypes(include=['int64']).columns:
            col_min = optimized_df[col].min()
            col_max = optimized_df[col].max()
            
            if col_min >= -128 and col_max <= 127:
                optimized_df[col] = optimized_df[col].astype('int8')
            elif col_min >= -32768 and col_max <= 32767:
                optimized_df[col] = optimized_df[col].astype('int16')
            elif col_min >= -2147483648 and col_max <= 2147483647:
                optimized_df[col] = optimized_df[col].astype('int32')
        
        # Optimize float columns
        for col in optimized_df.select_dtypes(include=['float64']).columns:
            optimized_df[col] = pd.to_numeric(optimized_df[col], downcast='float')
        
        # Optimize string columns
        for col in optimized_df.select_dtypes(include=['object']).columns:
            if optimized_df[col].dtype == 'object':
                try:
                    optimized_df[col] = optimized_df[col].astype('category')
                except:
                    pass  # Keep as object if conversion fails
        
        memory_reduction = (df.memory_usage(deep=True).sum() - 
                          optimized_df.memory_usage(deep=True).sum()) / 1024 / 1024
        
        if memory_reduction > 0:
            logger.info(f"DataFrame optimized: {memory_reduction:.2f}MB memory saved")
        
        return optimized_df

class DataValidator:
    """Enhanced data validation for robust input handling"""
    
    @staticmethod
    def validate_excel_file(uploaded_file) -> Tuple[bool, List[str]]:
        """Comprehensive Excel file validation"""
        errors = []
        
        # File size validation (50MB limit)
        if uploaded_file.size > 50 * 1024 * 1024:
            errors.append("File size exceeds 50MB limit")
        
        # File type validation
        if not uploaded_file.name.lower().endswith(('.xlsx', '.xls')):
            errors.append("Only Excel files (.xlsx, .xls) are supported")
        
        # File name validation
        if len(uploaded_file.name) > 255:
            errors.append("File name too long (max 255 characters)")
        
        # Check for potentially dangerous file names
        dangerous_patterns = ['..', '/', '\\', '<', '>', ':', '"', '|', '?', '*']
        if any(pattern in uploaded_file.name for pattern in dangerous_patterns):
            errors.append("File name contains invalid characters")
        
        return len(errors) == 0, errors
    
    @staticmethod
    def validate_measurement_input(description: str, quantity: float, unit: str) -> List[str]:
        """Validate measurement input data"""
        errors = []
        
        # Description validation
        if not description or len(description.strip()) < 3:
            errors.append("Description must be at least 3 characters long")
        
        if len(description) > 500:
            errors.append("Description too long (max 500 characters)")
        
        # Quantity validation
        if quantity <= 0:
            errors.append("Quantity must be positive")
        
        if quantity > 1e10:
            errors.append("Quantity too large")
        
        # Unit validation
        if not unit or len(unit.strip()) == 0:
            errors.append("Unit is required")
        
        if len(unit) > 20:
            errors.append("Unit too long (max 20 characters)")
        
        return errors
    
    @staticmethod
    def sanitize_input(text: str) -> str:
        """Sanitize user input to prevent injection attacks"""
        if not isinstance(text, str):
            text = str(text)
        
        # Remove potential SQL injection patterns
        text = re.sub(r'[;\'"]', '', text)
        
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()
    
    @staticmethod
    def validate_project_data(project_data: Dict) -> Tuple[bool, List[str]]:
        """Validate project data before saving"""
        errors = []
        
        # Required fields
        required_fields = ['name']
        for field in required_fields:
            if not project_data.get(field):
                errors.append(f"{field.title()} is required")
        
        # Name validation
        if project_data.get('name'):
            if len(project_data['name']) < 3:
                errors.append("Project name must be at least 3 characters")
            if len(project_data['name']) > 200:
                errors.append("Project name too long (max 200 characters)")
        
        # Area validation
        if project_data.get('total_area'):
            try:
                area = float(project_data['total_area'])
                if area <= 0:
                    errors.append("Total area must be positive")
                if area > 1e8:
                    errors.append("Total area too large")
            except (ValueError, TypeError):
                errors.append("Total area must be a valid number")
        
        return len(errors) == 0, errors

class BackupManager:
    """Automated backup system for data protection"""
    
    def __init__(self, backup_dir: str = "backups"):
        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(exist_ok=True)
        self.max_backups = 10  # Keep last 10 backups
    
    def create_backup(self, db_path: str) -> str:
        """Create timestamped database backup"""
        try:
            import shutil
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"backup_{timestamp}.db"
            backup_path = self.backup_dir / backup_filename
            
            shutil.copy2(db_path, backup_path)
            
            # Clean up old backups
            self._cleanup_old_backups()
            
            logger.info(f"✅ Database backup created: {backup_path}")
            return str(backup_path)
            
        except Exception as e:
            logger.error(f"❌ Backup creation failed: {e}")
            raise
    
    def _cleanup_old_backups(self):
        """Remove old backup files to save space"""
        try:
            backup_files = sorted(self.backup_dir.glob("backup_*.db"), 
                                key=lambda x: x.stat().st_mtime, reverse=True)
            
            # Remove excess backups
            for old_backup in backup_files[self.max_backups:]:
                old_backup.unlink()
                logger.info(f"Removed old backup: {old_backup}")
                
        except Exception as e:
            logger.error(f"Error cleaning up backups: {e}")
    
    def restore_backup(self, backup_path: str, target_path: str) -> bool:
        """Restore database from backup"""
        try:
            import shutil
            
            if not Path(backup_path).exists():
                raise FileNotFoundError(f"Backup file not found: {backup_path}")
            
            # Create backup of current database before restore
            current_backup = self.create_backup(target_path)
            
            # Restore from backup
            shutil.copy2(backup_path, target_path)
            
            logger.info(f"✅ Database restored from: {backup_path}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Restore failed: {e}")
            return False
    
    def list_backups(self) -> List[Dict]:
        """List available backups with metadata"""
        backups = []
        
        try:
            for backup_file in sorted(self.backup_dir.glob("backup_*.db"), 
                                    key=lambda x: x.stat().st_mtime, reverse=True):
                stat = backup_file.stat()
                
                backups.append({
                    'filename': backup_file.name,
                    'path': str(backup_file),
                    'size_mb': stat.st_size / 1024 / 1024,
                    'created_date': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'age_hours': (time.time() - stat.st_mtime) / 3600
                })
                
        except Exception as e:
            logger.error(f"Error listing backups: {e}")
        
        return backups