"""
Hot Reload Manager Module

This module provides file system watching capabilities to automatically reload
Excel templates when they are modified or created.
"""

import logging
import time
from pathlib import Path
from typing import Callable, Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent


class TemplateReloadHandler(FileSystemEventHandler):
    """
    Handles file system events for template reloading.
    
    This handler responds to file modifications and creations, triggering
    template reload operations for Excel files.
    """
    
    def __init__(self, template_manager, callback: Optional[Callable] = None):
        """
        Initialize the Template Reload Handler.
        
        Args:
            template_manager: ExcelTemplateImporter instance
            callback: Optional callback function to invoke on template changes
        """
        super().__init__()
        self.template_manager = template_manager
        self.callback = callback
        self.logger = logging.getLogger(__name__)
        self.last_modified = {}  # Track last modification times for debouncing
    
    def on_modified(self, event: FileSystemEvent):
        """
        Handle file modification events.
        
        Args:
            event: FileSystemEvent containing event details
        """
        if event.is_directory:
            return
        
        # Check if it's an Excel file
        if event.src_path.endswith(('.xls', '.xlsx')):
            # Debounce: ignore if modified within last 2 seconds
            current_time = time.time()
            if event.src_path in self.last_modified:
                if current_time - self.last_modified[event.src_path] < 2:
                    return
            
            self.last_modified[event.src_path] = current_time
            
            self.logger.info(f"Template modified: {event.src_path}")
            
            try:
                self.template_manager.reload_template(event.src_path)
                
                if self.callback:
                    self.callback(event.src_path)
            except Exception as e:
                self.logger.error(f"Failed to reload template {event.src_path}: {e}", exc_info=True)
    
    def on_created(self, event: FileSystemEvent):
        """
        Handle file creation events.
        
        Args:
            event: FileSystemEvent containing event details
        """
        if event.is_directory:
            return
        
        # Check if it's an Excel file
        if event.src_path.endswith(('.xls', '.xlsx')):
            self.logger.info(f"New template created: {event.src_path}")
            
            try:
                # Small delay to ensure file is fully written
                time.sleep(0.5)
                
                self.template_manager.load_new_template(event.src_path)
                
                if self.callback:
                    self.callback(event.src_path)
            except Exception as e:
                self.logger.error(f"Failed to load new template {event.src_path}: {e}", exc_info=True)


class HotReloadManager:
    """
    Manages hot reloading of Excel templates.
    
    This class sets up file system watching and coordinates template reloading
    when files are modified or created.
    """
    
    def __init__(self, template_manager, watch_path: str = "Attached_Assets"):
        """
        Initialize the Hot Reload Manager.
        
        Args:
            template_manager: ExcelTemplateImporter instance
            watch_path: Directory path to watch for changes
        """
        self.template_manager = template_manager
        self.watch_path = Path(watch_path)
        self.observer = Observer()
        self.is_running = False
        self.logger = logging.getLogger(__name__)
        self.callbacks = []
        
        # Ensure watch directory exists
        if not self.watch_path.exists():
            self.logger.warning(f"Watch path does not exist: {self.watch_path}")
            self.watch_path.mkdir(parents=True, exist_ok=True)
            self.logger.info(f"Created watch directory: {self.watch_path}")
    
    def start_watching(self):
        """
        Start watching for file changes.
        
        Initializes the file system observer and begins monitoring the watch path.
        """
        if self.is_running:
            self.logger.warning("Hot reload is already running")
            return
        
        event_handler = TemplateReloadHandler(
            self.template_manager,
            self._template_changed_callback
        )
        
        self.observer.schedule(event_handler, str(self.watch_path), recursive=False)
        self.observer.start()
        self.is_running = True
        
        self.logger.info(f"Hot reload started, watching: {self.watch_path}")
    
    def stop_watching(self):
        """
        Stop watching for file changes.
        
        Cleanly terminates the file system observer thread.
        """
        if not self.is_running:
            self.logger.warning("Hot reload is not running")
            return
        
        self.observer.stop()
        self.observer.join()
        self.is_running = False
        
        self.logger.info("Hot reload stopped")
    
    def register_callback(self, callback: Callable):
        """
        Register a callback function to be invoked on template changes.
        
        Args:
            callback: Function to call when templates change
        """
        self.callbacks.append(callback)
        self.logger.debug(f"Registered callback: {callback.__name__}")
    
    def _template_changed_callback(self, filepath: str):
        """
        Internal callback invoked when a template file changes.
        
        Args:
            filepath: Path to the changed template file
        """
        self.logger.info(f"Template changed: {filepath}")
        
        # Invoke all registered callbacks
        for callback in self.callbacks:
            try:
                callback(filepath)
            except Exception as e:
                self.logger.error(f"Callback {callback.__name__} failed: {e}", exc_info=True)
    
    def __enter__(self):
        """Context manager entry."""
        self.start_watching()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        self.stop_watching()
