"""
Batch Import Module
Import multiple Excel files at once with progress tracking
"""
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Dict, List

import openpyxl
import pandas as pd


class BatchImporter:
    """Handles batch import of multiple Excel files"""
    
    def __init__(self):
        self.results = []
        self.success_count = 0
        self.error_count = 0
        self.skipped_count = 0
    
    def process_files(
        self, 
        file_paths: List[str], 
        import_function: Callable,
        progress_callback: Callable = None
    ) -> Dict[str, Any]:
        """
        Process multiple files with progress tracking
        
        Args:
            file_paths: List of file paths to process
            import_function: Function to call for each file
            progress_callback: Optional callback for progress updates
            
        Returns:
            Dictionary with results summary
        """
        self.results = []
        self.success_count = 0
        self.error_count = 0
        self.skipped_count = 0
        
        total_files = len(file_paths)
        
        for idx, file_path in enumerate(file_paths):
            # Update progress
            if progress_callback:
                progress = (idx + 1) / total_files
                progress_callback(progress, f"Processing {Path(file_path).name}")
            
            # Process file
            result = self._process_single_file(file_path, import_function)
            self.results.append(result)
            
            # Update counters
            if result['status'] == 'success':
                self.success_count += 1
            elif result['status'] == 'error':
                self.error_count += 1
            else:
                self.skipped_count += 1
        
        return self._generate_summary()
    
    def _process_single_file(
        self, 
        file_path: str, 
        import_function: Callable
    ) -> Dict[str, Any]:
        """Process a single file"""
        
        file_name = Path(file_path).name
        
        try:
            # Check file exists
            if not Path(file_path).exists():
                return {
                    'file_name': file_name,
                    'file_path': file_path,
                    'status': 'error',
                    'error': 'File not found',
                    'timestamp': datetime.now().isoformat()
                }
            
            # Check file size
            file_size = Path(file_path).stat().st_size
            if file_size > 50 * 1024 * 1024:  # 50MB limit
                return {
                    'file_name': file_name,
                    'file_path': file_path,
                    'status': 'skipped',
                    'reason': 'File too large (>50MB)',
                    'timestamp': datetime.now().isoformat()
                }
            
            # Try to import
            start_time = datetime.now()
            result = import_function(file_path)
            end_time = datetime.now()
            
            processing_time = (end_time - start_time).total_seconds()
            
            return {
                'file_name': file_name,
                'file_path': file_path,
                'status': 'success',
                'processing_time': processing_time,
                'sheets_imported': result.get('sheets_imported', 0),
                'rows_imported': result.get('rows_imported', 0),
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                'file_name': file_name,
                'file_path': file_path,
                'status': 'error',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate summary of batch import"""
        
        total_sheets = sum(r.get('sheets_imported', 0) for r in self.results if r['status'] == 'success')
        total_rows = sum(r.get('rows_imported', 0) for r in self.results if r['status'] == 'success')
        total_time = sum(r.get('processing_time', 0) for r in self.results if r['status'] == 'success')
        
        return {
            'total_files': len(self.results),
            'success_count': self.success_count,
            'error_count': self.error_count,
            'skipped_count': self.skipped_count,
            'total_sheets_imported': total_sheets,
            'total_rows_imported': total_rows,
            'total_processing_time': total_time,
            'results': self.results,
            'timestamp': datetime.now().isoformat()
        }
    
    def get_failed_files(self) -> List[Dict]:
        """Get list of files that failed to import"""
        return [r for r in self.results if r['status'] == 'error']
    
    def get_successful_files(self) -> List[Dict]:
        """Get list of successfully imported files"""
        return [r for r in self.results if r['status'] == 'success']
    
    def export_report(self, output_path: str):
        """Export batch import report to CSV"""
        df = pd.DataFrame(self.results)
        df.to_csv(output_path, index=False)
        return output_path


class SmartBatchImporter(BatchImporter):
    """Enhanced batch importer with smart file detection"""
    
    def __init__(self):
        super().__init__()
        self.file_types = {}
    
    def analyze_files(self, file_paths: List[str]) -> Dict[str, List[str]]:
        """
        Analyze files and group by type
        
        Returns:
            Dictionary with file types as keys and file lists as values
        """
        categorized = {
            'estimates': [],
            'templates': [],
            'measurements': [],
            'abstracts': [],
            'unknown': []
        }
        
        for file_path in file_paths:
            file_type = self._detect_file_type(file_path)
            categorized[file_type].append(file_path)
        
        return categorized
    
    def _detect_file_type(self, file_path: str) -> str:
        """Detect file type based on name and structure"""
        
        file_name = Path(file_path).name.lower()
        
        # Check filename patterns
        if 'template' in file_name:
            return 'templates'
        elif 'estimate' in file_name or 'est' in file_name:
            return 'estimates'
        elif 'meas' in file_name:
            return 'measurements'
        elif 'abs' in file_name or 'abstract' in file_name:
            return 'abstracts'
        
        # Try to analyze structure
        try:
            wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
            sheet_names = [s.lower() for s in wb.sheetnames]
            wb.close()
            
            if any('meas' in s for s in sheet_names):
                return 'measurements'
            elif any('abs' in s for s in sheet_names):
                return 'abstracts'
            elif any('template' in s for s in sheet_names):
                return 'templates'
            else:
                return 'estimates'
                
        except:
            return 'unknown'
