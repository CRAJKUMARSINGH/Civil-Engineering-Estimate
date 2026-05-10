#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch Processor for handling multiple Excel files
"""

import logging
from pathlib import Path
from typing import List, Dict, Optional, Callable, Any
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

log = logging.getLogger(__name__)

@dataclass
class BatchResult:
    """Result of batch processing operation"""
    file_path: Path
    success: bool
    message: str
    data: Optional[Any] = None
    error: Optional[str] = None
    processing_time: float = 0.0

class BatchProcessor:
    """Handles batch processing of multiple Excel files"""
    
    def __init__(self, excel_importer, database_manager=None, 
                 max_workers: int = 4, progress_callback: Callable = None):
        """
        Initialize batch processor
        
        Args:
            excel_importer: Excel importer instance
            database_manager: Database manager for imports
            max_workers: Maximum number of concurrent workers
            progress_callback: Optional callback for progress updates
        """
        self.excel_importer = excel_importer
        self.database_manager = database_manager
        self.max_workers = max_workers
        self.progress_callback = progress_callback
        self._lock = threading.Lock()
        self._processed_count = 0
        self._total_count = 0
    
    def process_multiple_files(self, file_paths: List[Path], 
                             strategy: str = 'separate') -> List[BatchResult]:
        """
        Process multiple Excel files
        
        Args:
            file_paths: List of Excel file paths
            strategy: Processing strategy ('separate', 'merge', 'compare')
            
        Returns:
            List of BatchResult objects
        """
        self._processed_count = 0
        self._total_count = len(file_paths)
        
        log.info(f"Starting batch processing of {self._total_count} files with strategy '{strategy}'")
        
        if strategy == 'separate':
            return self._process_separate(file_paths)
        elif strategy == 'merge':
            return self._process_merge(file_paths)
        elif strategy == 'compare':
            return self._process_compare(file_paths)
        else:
            raise ValueError(f"Unknown processing strategy: {strategy}")
    
    def _process_separate(self, file_paths: List[Path]) -> List[BatchResult]:
        """Process files separately (create individual estimates)"""
        results = []
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_path = {
                executor.submit(self._process_single_file, file_path): file_path
                for file_path in file_paths
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_path):
                file_path = future_to_path[future]
                try:
                    result = future.result()
                    results.append(result)
                    
                    with self._lock:
                        self._processed_count += 1
                        if self.progress_callback:
                            self.progress_callback(self._processed_count, self._total_count, result)
                    
                except Exception as e:
                    error_result = BatchResult(
                        file_path=file_path,
                        success=False,
                        message=f"Processing failed: {str(e)}",
                        error=str(e)
                    )
                    results.append(error_result)
                    
                    with self._lock:
                        self._processed_count += 1
                        if self.progress_callback:
                            self.progress_callback(self._processed_count, self._total_count, error_result)
        
        return results
    
    def _process_single_file(self, file_path: Path) -> BatchResult:
        """Process a single Excel file"""
        import time
        start_time = time.time()
        
        try:
            log.info(f"Processing file: {file_path.name}")
            
            # Analyze file
            analysis = self.excel_importer.analyze_excel_file(file_path)
            if not analysis['success']:
                return BatchResult(
                    file_path=file_path,
                    success=False,
                    message=f"Analysis failed: {'; '.join(analysis['errors'])}",
                    processing_time=time.time() - start_time
                )
            
            # Preview import
            preview_items = self.excel_importer.preview_import(
                file_path,
                sheet_name=analysis['recommended_sheet']
            )
            
            if not preview_items:
                return BatchResult(
                    file_path=file_path,
                    success=False,
                    message="No valid items found in file",
                    processing_time=time.time() - start_time
                )
            
            # Import items if database manager is available
            if self.database_manager:
                import_stats = self.excel_importer.import_selected_items(
                    preview_items, self.database_manager
                )
                
                message = (f"Imported: {import_stats['imported']}, "
                          f"Skipped: {import_stats['skipped']}, "
                          f"Failed: {import_stats['failed']}")
                
                return BatchResult(
                    file_path=file_path,
                    success=True,
                    message=message,
                    data=import_stats,
                    processing_time=time.time() - start_time
                )
            else:
                return BatchResult(
                    file_path=file_path,
                    success=True,
                    message=f"Analyzed successfully: {len(preview_items)} items found",
                    data={'items': len(preview_items)},
                    processing_time=time.time() - start_time
                )
        
        except Exception as e:
            log.error(f"Error processing {file_path}: {e}")
            return BatchResult(
                file_path=file_path,
                success=False,
                message=f"Processing error: {str(e)}",
                error=str(e),
                processing_time=time.time() - start_time
            )
    
    def _process_merge(self, file_paths: List[Path]) -> List[BatchResult]:
        """Process files and merge into single estimate"""
        results = []
        all_items = []
        
        # Process each file to collect items
        for file_path in file_paths:
            try:
                log.info(f"Processing file for merge: {file_path.name}")
                
                # Analyze and preview
                analysis = self.excel_importer.analyze_excel_file(file_path)
                if not analysis['success']:
                    results.append(BatchResult(
                        file_path=file_path,
                        success=False,
                        message=f"Analysis failed: {'; '.join(analysis['errors'])}"
                    ))
                    continue
                
                preview_items = self.excel_importer.preview_import(
                    file_path,
                    sheet_name=analysis['recommended_sheet']
                )
                
                if preview_items:
                    all_items.extend(preview_items)
                    results.append(BatchResult(
                        file_path=file_path,
                        success=True,
                        message=f"Added {len(preview_items)} items to merge",
                        data={'items': len(preview_items)}
                    ))
                else:
                    results.append(BatchResult(
                        file_path=file_path,
                        success=False,
                        message="No valid items found"
                    ))
                
                with self._lock:
                    self._processed_count += 1
                    if self.progress_callback:
                        self.progress_callback(self._processed_count, self._total_count, results[-1])
            
            except Exception as e:
                results.append(BatchResult(
                    file_path=file_path,
                    success=False,
                    message=f"Error: {str(e)}",
                    error=str(e)
                ))
        
        # Merge all items if database manager is available
        if all_items and self.database_manager:
            try:
                # Remove duplicates based on code
                unique_items = {}
                for item in all_items:
                    if item.code not in unique_items:
                        unique_items[item.code] = item
                    else:
                        log.warning(f"Duplicate item code found during merge: {item.code}")
                
                merged_items = list(unique_items.values())
                
                import_stats = self.excel_importer.import_selected_items(
                    merged_items, self.database_manager
                )
                
                # Add merge summary result
                results.append(BatchResult(
                    file_path=Path("MERGED_ESTIMATE"),
                    success=True,
                    message=(f"Merge completed - Imported: {import_stats['imported']}, "
                            f"Skipped: {import_stats['skipped']}, "
                            f"Failed: {import_stats['failed']}"),
                    data=import_stats
                ))
                
            except Exception as e:
                results.append(BatchResult(
                    file_path=Path("MERGED_ESTIMATE"),
                    success=False,
                    message=f"Merge failed: {str(e)}",
                    error=str(e)
                ))
        
        return results
    
    def _process_compare(self, file_paths: List[Path]) -> List[BatchResult]:
        """Process files and generate comparison matrix"""
        results = []
        file_data = {}
        
        # Process each file to collect data
        for file_path in file_paths:
            try:
                log.info(f"Processing file for comparison: {file_path.name}")
                
                analysis = self.excel_importer.analyze_excel_file(file_path)
                if not analysis['success']:
                    results.append(BatchResult(
                        file_path=file_path,
                        success=False,
                        message=f"Analysis failed: {'; '.join(analysis['errors'])}"
                    ))
                    continue
                
                preview_items = self.excel_importer.preview_import(
                    file_path,
                    sheet_name=analysis['recommended_sheet']
                )
                
                if preview_items:
                    # Create item lookup by code
                    item_lookup = {item.code: item for item in preview_items}
                    file_data[file_path.name] = item_lookup
                    
                    results.append(BatchResult(
                        file_path=file_path,
                        success=True,
                        message=f"Processed {len(preview_items)} items for comparison",
                        data={'items': len(preview_items)}
                    ))
                else:
                    results.append(BatchResult(
                        file_path=file_path,
                        success=False,
                        message="No valid items found"
                    ))
                
                with self._lock:
                    self._processed_count += 1
                    if self.progress_callback:
                        self.progress_callback(self._processed_count, self._total_count, results[-1])
            
            except Exception as e:
                results.append(BatchResult(
                    file_path=file_path,
                    success=False,
                    message=f"Error: {str(e)}",
                    error=str(e)
                ))
        
        # Generate comparison matrix
        if len(file_data) > 1:
            comparison_matrix = self._generate_comparison_matrix(file_data)
            
            results.append(BatchResult(
                file_path=Path("COMPARISON_MATRIX"),
                success=True,
                message=f"Comparison completed for {len(file_data)} files",
                data=comparison_matrix
            ))
        
        return results
    
    def _generate_comparison_matrix(self, file_data: Dict[str, Dict]) -> Dict:
        """Generate comparison matrix from file data"""
        # Collect all unique item codes
        all_codes = set()
        for items in file_data.values():
            all_codes.update(items.keys())
        
        comparison = {
            'files': list(file_data.keys()),
            'total_items': len(all_codes),
            'common_items': [],
            'unique_items': {},
            'rate_differences': []
        }
        
        # Find common items (present in all files)
        common_codes = set(all_codes)
        for items in file_data.values():
            common_codes &= set(items.keys())
        
        comparison['common_items'] = list(common_codes)
        
        # Find unique items (present in only one file)
        for filename, items in file_data.items():
            unique_codes = set(items.keys())
            for other_filename, other_items in file_data.items():
                if filename != other_filename:
                    unique_codes -= set(other_items.keys())
            
            comparison['unique_items'][filename] = list(unique_codes)
        
        # Analyze rate differences for common items
        for code in common_codes:
            rates = []
            for filename, items in file_data.items():
                if code in items:
                    rates.append((filename, float(items[code].rate)))
            
            if len(rates) > 1:
                min_rate = min(rate for _, rate in rates)
                max_rate = max(rate for _, rate in rates)
                
                if max_rate > 0 and (max_rate - min_rate) / max_rate > 0.1:  # >10% difference
                    comparison['rate_differences'].append({
                        'code': code,
                        'rates': dict(rates),
                        'min_rate': min_rate,
                        'max_rate': max_rate,
                        'difference_percent': ((max_rate - min_rate) / max_rate) * 100
                    })
        
        return comparison
    
    def export_batch_results(self, results: List[BatchResult], 
                           output_path: Path) -> bool:
        """
        Export batch processing results to Excel file
        
        Args:
            results: List of batch results
            output_path: Path for output Excel file
            
        Returns:
            True if successful, False otherwise
        """
        try:
            from .. import misc
            
            spreadsheet = misc.Spreadsheet()
            spreadsheet.set_title("Batch Processing Results")
            
            # Prepare summary data
            headers = ['File Name', 'Status', 'Message', 'Processing Time (s)', 'Items/Data']
            data = [headers]
            
            for result in results:
                status = "SUCCESS" if result.success else "FAILED"
                items_info = ""
                
                if result.data:
                    if isinstance(result.data, dict):
                        if 'imported' in result.data:
                            items_info = f"I:{result.data['imported']} S:{result.data['skipped']} F:{result.data['failed']}"
                        elif 'items' in result.data:
                            items_info = str(result.data['items'])
                
                row = [
                    result.file_path.name,
                    status,
                    result.message,
                    f"{result.processing_time:.2f}",
                    items_info
                ]
                data.append(row)
            
            # Insert data
            spreadsheet.insert_data(data, bold=True)
            
            # Set column widths
            spreadsheet.set_column_widths([30, 15, 50, 15, 20])
            
            # Add statistics sheet
            spreadsheet.new_sheet()
            spreadsheet.set_title("Statistics")
            
            successful = sum(1 for r in results if r.success)
            failed = len(results) - successful
            total_time = sum(r.processing_time for r in results)
            
            stats_data = [
                ['Statistic', 'Value'],
                ['Total Files', len(results)],
                ['Successful', successful],
                ['Failed', failed],
                ['Success Rate', f"{(successful/len(results)*100):.1f}%" if results else "0%"],
                ['Total Processing Time', f"{total_time:.2f}s"],
                ['Average Time per File', f"{(total_time/len(results)):.2f}s" if results else "0s"]
            ]
            
            spreadsheet.insert_data(stats_data, bold=True)
            spreadsheet.set_column_widths([25, 20])
            
            # Save file
            spreadsheet.save(str(output_path))
            
            log.info(f"Batch results exported to: {output_path}")
            return True
            
        except Exception as e:
            log.error(f"Error exporting batch results: {e}")
            return False
    
    def get_processing_statistics(self, results: List[BatchResult]) -> Dict[str, Any]:
        """Get statistics from batch processing results"""
        if not results:
            return {}
        
        successful = [r for r in results if r.success]
        failed = [r for r in results if not r.success]
        
        stats = {
            'total_files': len(results),
            'successful': len(successful),
            'failed': len(failed),
            'success_rate': (len(successful) / len(results)) * 100,
            'total_processing_time': sum(r.processing_time for r in results),
            'average_processing_time': sum(r.processing_time for r in results) / len(results),
            'fastest_file': min(results, key=lambda r: r.processing_time) if results else None,
            'slowest_file': max(results, key=lambda r: r.processing_time) if results else None
        }
        
        # Collect error types
        error_types = {}
        for result in failed:
            if result.error:
                error_type = type(Exception(result.error)).__name__
                error_types[error_type] = error_types.get(error_type, 0) + 1
        
        stats['error_types'] = error_types
        
        return stats