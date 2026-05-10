#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GEstimator - Complete Construction Estimation Application
Main application entry point with enhanced import/export capabilities
"""

import sys
import logging
from pathlib import Path
import argparse

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/gestimator.log', mode='a'),
        logging.StreamHandler(sys.stdout)
    ]
)

log = logging.getLogger(__name__)

def check_dependencies():
    """Check if all required dependencies are available"""
    required_modules = [
        ('openpyxl', 'Excel file handling'),
        ('sqlite3', 'Database operations'),
    ]
    
    optional_modules = [
        ('Levenshtein', 'Fast fuzzy string matching'),
        ('pandas', 'Advanced data manipulation'),
        ('gi', 'GTK3 GUI framework')
    ]
    
    missing_required = []
    missing_optional = []
    
    # Check required modules
    for module, description in required_modules:
        try:
            __import__(module)
            log.info(f"✓ {module} - {description}")
        except ImportError:
            missing_required.append((module, description))
            log.error(f"✗ {module} - {description} (REQUIRED)")
    
    # Check optional modules
    for module, description in optional_modules:
        try:
            __import__(module)
            log.info(f"✓ {module} - {description}")
        except ImportError:
            missing_optional.append((module, description))
            log.warning(f"⚠ {module} - {description} (OPTIONAL)")
    
    if missing_required:
        print("\n❌ Missing required dependencies:")
        for module, description in missing_required:
            print(f"  - {module}: {description}")
        print("\nPlease install missing dependencies:")
        print("pip install -r requirements.txt")
        return False
    
    if missing_optional:
        print("\n⚠️  Missing optional dependencies (some features may be limited):")
        for module, description in missing_optional:
            print(f"  - {module}: {description}")
        print("\nTo install optional dependencies:")
        print("pip install -r requirements.txt")
    
    return True

def setup_directories():
    """Setup required directories"""
    directories = [
        'logs',
        'data',
        'PROJECTS',
        'config',
        'templates'
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        log.debug(f"Directory ensured: {directory}")

# Legacy dynamic template system imports (for backward compatibility)
try:
    from import_templates import ExcelTemplateImporter
    from template_engine import FormulaDependencyEngine
    from dynamic_renderer import DynamicTemplateRenderer
    from hot_reload import HotReloadManager
    from gestimator_integration import GEstimatorAdapter
    LEGACY_SYSTEM_AVAILABLE = True
except ImportError:
    LEGACY_SYSTEM_AVAILABLE = False


class GEstimatorApp:
    """
    Enhanced GEstimator application with dynamic template support.
    
    This class coordinates all components to provide dynamic Excel template
    processing with formula preservation, hot reloading, and GEstimator integration.
    """
    
    def __init__(self, config_path: str = "config/app_config.json"):
        """
        Initialize the Enhanced GEstimator Application.
        
        Args:
            config_path: Path to the application configuration file
        """
        self.config = self.load_config(config_path)
        
        # Initialize components
        self.template_importer = ExcelTemplateImporter(
            self.config.get('assets_path', 'Attached_Assets')
        )
        self.template_engine = FormulaDependencyEngine()
        self.renderer = DynamicTemplateRenderer(self.template_engine)
        self.hot_reload = HotReloadManager(
            self.template_importer,
            self.config.get('assets_path', 'Attached_Assets')
        )
        self.gestimator_adapter = GEstimatorAdapter(self.template_engine)
        
        # Template structures cache
        self.template_structures: Dict[str, Dict] = {}
        
        # Setup logging
        self.setup_logging()
        
        # Initialize templates
        self.initialize_templates()
    
    def load_config(self, config_path: str) -> Dict:
        """
        Load application configuration from JSON file.
        
        Args:
            config_path: Path to configuration file
            
        Returns:
            Configuration dictionary
        """
        config_file = Path(config_path)
        
        if not config_file.exists():
            # Return default configuration
            return {
                'assets_path': 'Attached_Assets',
                'enable_hot_reload': True,
                'hot_reload_debounce_seconds': 2,
                'max_formula_depth': 100,
                'calculation_timeout_seconds': 30,
                'log_level': 'INFO',
                'log_file': 'logs/gestimator.log'
            }
        
        try:
            with open(config_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Failed to load config file {config_path}: {e}")
            return {}
    
    def setup_logging(self):
        """Configure logging for the application."""
        log_level = self.config.get('log_level', 'INFO')
        log_file = self.config.get('log_file', 'logs/gestimator.log')
        
        # Ensure log directory exists
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Configure logging
        logging.basicConfig(
            level=getattr(logging, log_level),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        
        self.logger = logging.getLogger(__name__)
        self.logger.info("Enhanced GEstimator Application initialized")
    
    def initialize_templates(self):
        """
        Initialize and load all available templates.
        
        Scans for templates, parses formulas, analyzes structure, and
        converts to GEstimator format.
        """
        self.logger.info("Initializing templates...")
        
        # Scan for templates
        templates = self.template_importer.scan_for_templates()
        
        for template in templates:
            if template.has_formulas:
                try:
                    # Load workbook with formula support
                    wb = openpyxl.load_workbook(
                        template.filepath,
                        data_only=False,
                        keep_links=False
                    )
                    
                    # Build dependency graph
                    self.template_engine.parse_workbook_formulas(wb)
                    
                    # Analyze template structure
                    structure = self.renderer.analyze_template_structure(wb)
                    
                    # Store structure for later use
                    template_name = template.filepath.stem
                    self.template_structures[template_name] = structure
                    
                    # Convert to GEstimator format if needed
                    gestimator_data = self.gestimator_adapter.convert_to_gestimator_format(structure)
                    
                    wb.close()
                    
                    self.logger.info(f"Initialized template: {template.filename}")
                    
                except Exception as e:
                    self.logger.error(f"Failed to initialize template {template.filename}: {e}", exc_info=True)
            else:
                self.logger.info(f"Template {template.filename} has no formulas, skipping formula analysis")
        
        self.logger.info(f"Template initialization complete. {len(self.template_structures)} template(s) ready")
    
    def start_hot_reload(self):
        """Start hot reloading for templates."""
        if self.config.get('enable_hot_reload', True):
            self.hot_reload.start_watching()
            self.logger.info("Hot reload started for templates")
        else:
            self.logger.info("Hot reload is disabled in configuration")
    
    def stop_hot_reload(self):
        """Stop hot reloading."""
        if self.hot_reload.is_running:
            self.hot_reload.stop_watching()
            self.logger.info("Hot reload stopped")
    
    def process_user_input(self, template_name: str, inputs: Dict[str, Any]) -> Dict:
        """
        Process user input and recalculate template.
        
        Args:
            template_name: Name of the template to process
            inputs: Dictionary mapping cell references to input values
            
        Returns:
            Dictionary containing calculated results
        """
        self.logger.info(f"Processing user input for template: {template_name}")
        
        # Validate template exists
        if template_name not in self.template_importer.templates:
            error_msg = f"Template {template_name} not found"
            self.logger.error(error_msg)
            return {'success': False, 'error': error_msg}
        
        template = self.template_importer.templates[template_name]
        
        try:
            # Load workbook
            wb = openpyxl.load_workbook(template.filepath, data_only=False)
            
            # Update input cells with provided values
            for cell_ref, value in inputs.items():
                try:
                    # Parse cell reference (Sheet!Coordinate)
                    if '!' in cell_ref:
                        sheet_name, coord = cell_ref.split('!')
                        sheet = wb[sheet_name]
                        sheet[coord].value = value
                        self.logger.debug(f"Updated {cell_ref} = {value}")
                    else:
                        self.logger.warning(f"Invalid cell reference format: {cell_ref}")
                except Exception as e:
                    self.logger.error(f"Failed to update cell {cell_ref}: {e}")
            
            # Get execution order from template engine
            execution_order = self.template_engine.calculate_execution_order()
            
            # Recalculate formulas in correct order
            # Note: This is a simplified implementation
            # A full implementation would need a complete formula evaluation engine
            for cell_ref in execution_order:
                if cell_ref in self.template_engine.cell_formulas:
                    formula = self.template_engine.cell_formulas[cell_ref]
                    result = self._evaluate_formula(formula, wb)
                    
                    # Update cell value
                    if '!' in cell_ref:
                        sheet_name, coord = cell_ref.split('!')
                        wb[sheet_name][coord].value = result
            
            # Extract results
            results = self._extract_results(wb, template_name)
            
            wb.close()
            
            self.logger.info(f"Successfully processed input for {template_name}")
            return {'success': True, 'results': results}
            
        except Exception as e:
            error_msg = f"Failed to process template {template_name}: {e}"
            self.logger.error(error_msg, exc_info=True)
            return {'success': False, 'error': error_msg}
    
    def _evaluate_formula(self, formula: str, workbook) -> Any:
        """
        Evaluate Excel formula (simplified implementation).
        
        Args:
            formula: Formula string to evaluate
            workbook: openpyxl Workbook object
            
        Returns:
            Calculated result or placeholder
        """
        # TODO: Implement full formula evaluation engine
        # For now, return a placeholder indicating the formula
        # A complete implementation would need to:
        # 1. Parse the formula into an AST
        # 2. Evaluate functions and operators
        # 3. Resolve cell references
        # 4. Handle errors and edge cases
        
        self.logger.debug(f"Formula evaluation placeholder: {formula}")
        return f"CALC:{formula}"
    
    def _extract_results(self, workbook, template_name: str) -> Dict:
        """
        Extract results from workbook output cells.
        
        Args:
            workbook: openpyxl Workbook object
            template_name: Name of the template
            
        Returns:
            Dictionary containing output cell values
        """
        results = {}
        
        # Get template structure
        if template_name in self.template_structures:
            structure = self.template_structures[template_name]
            
            # Extract values from output cells
            for cell_ref, cell_info in structure.get('output_fields', {}).items():
                if '!' in cell_ref:
                    sheet_name, coord = cell_ref.split('!')
                    try:
                        value = workbook[sheet_name][coord].value
                        results[cell_ref] = value
                    except Exception as e:
                        self.logger.error(f"Failed to extract value from {cell_ref}: {e}")
        
        return results
    
    def get_template_info(self, template_name: str) -> Optional[Dict]:
        """
        Get information about a specific template.
        
        Args:
            template_name: Name of the template
            
        Returns:
            Template information dictionary or None if not found
        """
        if template_name in self.template_importer.templates:
            template = self.template_importer.templates[template_name]
            structure = self.template_structures.get(template_name, {})
            
            return {
                'filename': template.filename,
                'format': template.format,
                'sheet_count': template.sheet_count,
                'has_formulas': template.has_formulas,
                'input_count': len(structure.get('input_fields', {})),
                'output_count': len(structure.get('output_fields', {})),
                'formula_count': len(structure.get('formulas', {}))
            }
        
        return None
    
    def list_templates(self) -> List[str]:
        """
        Get list of all available template names.
        
        Returns:
            List of template names
        """
        return list(self.template_importer.templates.keys())
    
    def shutdown(self):
        """Shutdown the application gracefully."""
        self.logger.info("Shutting down Enhanced GEstimator Application...")
        self.stop_hot_reload()
        self.logger.info("Shutdown complete")


def main():
    """Main application entry point"""
    parser = argparse.ArgumentParser(
        description='GEstimator - Construction Estimation Application',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python main_app.py                    # Start GUI application
  python main_app.py --test            # Run test suite
  python main_app.py --web             # Start web interface
  python main_app.py --convert file.xlsx  # Convert Excel file
        """
    )
    
    parser.add_argument('--test', action='store_true', 
                       help='Run comprehensive test suite')
    parser.add_argument('--web', action='store_true',
                       help='Start web interface (requires streamlit)')
    parser.add_argument('--convert', metavar='FILE',
                       help='Convert Excel file to GEstimator format')
    parser.add_argument('--debug', action='store_true',
                       help='Enable debug logging')
    parser.add_argument('--legacy', action='store_true',
                       help='Use legacy dynamic template system')
    parser.add_argument('--version', action='version', version='GEstimator 2.0.0')
    
    args = parser.parse_args()
    
    # Set debug logging if requested
    if args.debug:
        logging.getLogger().setLevel(logging.DEBUG)
        log.debug("Debug logging enabled")
    
    # Setup directories
    setup_directories()
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    try:
        if args.test:
            # Run test suite
            log.info("Starting test suite...")
            from test_gestimator_complete import GEstimatorTestSuite
            test_suite = GEstimatorTestSuite()
            test_suite.run_all_tests()
            
        elif args.web:
            # Start web interface
            log.info("Starting web interface...")
            try:
                import streamlit
                import subprocess
                subprocess.run([sys.executable, '-m', 'streamlit', 'run', 'streamlit_app.py'])
            except ImportError:
                log.error("Streamlit not installed. Install with: pip install streamlit")
                sys.exit(1)
            
        elif args.convert:
            # Convert Excel file
            log.info(f"Converting Excel file: {args.convert}")
            from estimator.import_export.excel_importer import EnhancedExcelImporter
            
            importer = EnhancedExcelImporter()
            filepath = Path(args.convert)
            
            if not filepath.exists():
                log.error(f"File not found: {filepath}")
                sys.exit(1)
            
            # Analyze and preview
            analysis = importer.analyze_excel_file(filepath)
            if analysis['success']:
                print(f"✓ File analyzed: {analysis['filename']}")
                print(f"  Sheets: {len(analysis['sheets'])}")
                print(f"  Recommended: {analysis['recommended_sheet']}")
                
                # Preview items
                preview_items = importer.preview_import(filepath)
                print(f"  Items found: {len(preview_items)}")
                
                # Show first few items
                for i, item in enumerate(preview_items[:5]):
                    print(f"    {i+1}. {item.code} - {item.description[:50]}...")
            else:
                log.error(f"Analysis failed: {analysis['errors']}")
                sys.exit(1)
                
        elif args.legacy and LEGACY_SYSTEM_AVAILABLE:
            # Start legacy dynamic template system
            log.info("Starting legacy dynamic template system...")
            app = GEstimatorApp()
            app.start_hot_reload()
            
            templates = app.list_templates()
            print(f"Available templates: {templates}")
            
            try:
                import time
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                app.shutdown()
            
        else:
            # Start GUI application
            log.info("Starting GEstimator GUI application...")
            
            try:
                # Try to import GTK
                import gi
                gi.require_version('Gtk', '3.0')
                from gi.repository import Gtk
                
                # Import and start main application
                from gestimator import GEstimatorMainApp
                app = GEstimatorMainApp()
                app.run()
                
            except ImportError as e:
                log.error(f"GTK3 not available: {e}")
                print("\n🖥️  GUI not available. Try these alternatives:")
                print("  python main_app.py --web     # Start web interface")
                print("  python main_app.py --test    # Run test suite")
                print("  python main_app.py --convert file.xlsx  # Convert Excel file")
                if LEGACY_SYSTEM_AVAILABLE:
                    print("  python main_app.py --legacy  # Start legacy template system")
                print("\nTo install GTK3:")
                print("  Ubuntu/Debian: sudo apt-get install python3-gi python3-gi-cairo gir1.2-gtk-3.0")
                print("  Windows: Download GTK3 Runtime from GitHub")
                sys.exit(1)
                
    except KeyboardInterrupt:
        log.info("Application interrupted by user")
        sys.exit(0)
    except Exception as e:
        log.error(f"Application error: {e}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    main()
