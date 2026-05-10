"""
GEstimator Adapter Module

This module provides integration between the dynamic template system and
the existing GEstimator format, converting template data to schedule items.
"""

import json
import logging
from typing import Dict, List, Any
from pathlib import Path


class GEstimatorAdapter:
    """
    Adapts dynamic templates to GEstimator format.
    
    This class converts template output data to GEstimator-compatible schedule
    items and creates configuration files for template mapping.
    """
    
    def __init__(self, template_engine):
        """
        Initialize the GEstimator Adapter.
        
        Args:
            template_engine: FormulaDependencyEngine instance
        """
        self.template_engine = template_engine
        self.logger = logging.getLogger(__name__)
    
    def convert_to_gestimator_format(self, template_data: Dict) -> Dict:
        """
        Convert template data to GEstimator compatible format.
        
        Extracts schedule items from template output cells and formats them
        according to GEstimator specifications.
        
        Args:
            template_data: Template structure dictionary from DynamicTemplateRenderer
            
        Returns:
            Dictionary containing schedule items and metadata in GEstimator format
        """
        self.logger.info("Converting template to GEstimator format...")
        
        schedule_items = []
        
        # Look for SUMMARY sheet or similar output sheets
        summary_sheets = ['SUMMARY', 'Summary', 'OUTPUT', 'Output', 'RESULTS', 'Results']
        
        for sheet_name in summary_sheets:
            if sheet_name in template_data.get('sheets', {}):
                summary_sheet = template_data['sheets'][sheet_name]
                
                # Extract schedule items from output cells
                for output_cell in summary_sheet.get('output_cells', []):
                    item = self._map_to_schedule_item(output_cell)
                    if item:
                        schedule_items.append(item)
                
                break  # Use first matching summary sheet
        
        # If no summary sheet found, try to extract from all output cells
        if not schedule_items:
            self.logger.warning("No summary sheet found, extracting from all output cells")
            for cell_ref, cell_data in template_data.get('output_fields', {}).items():
                item = self._map_to_schedule_item(cell_data)
                if item:
                    schedule_items.append(item)
        
        result = {
            'schedule_items': schedule_items,
            'template_metadata': {
                'name': template_data.get('name', 'Unknown'),
                'version': template_data.get('version', '1.0'),
                'sheets': list(template_data.get('sheets', {}).keys())
            }
        }
        
        self.logger.info(f"Converted {len(schedule_items)} schedule item(s)")
        return result
    
    def _map_to_schedule_item(self, cell_data: Dict) -> Dict:
        """
        Map cell data to GEstimator schedule item format.
        
        Args:
            cell_data: Dictionary containing cell information
            
        Returns:
            Schedule item dictionary or None if mapping fails
        """
        # Extract value from cell data
        value = cell_data.get('value', '')
        reference = cell_data.get('reference', '')
        
        # Try to parse structured data from cell value
        # This is a simplified implementation - real implementation would need
        # more sophisticated parsing based on template conventions
        
        item = {
            'Code': self._extract_code(cell_data),
            'Description': self._extract_description(cell_data),
            'Unit': self._extract_unit(cell_data),
            'Rate': self._extract_rate(cell_data),
            'Qty': self._extract_quantity(cell_data),
            'Amount': self._extract_amount(cell_data),
            'Remarks': self._extract_remarks(cell_data)
        }
        
        # Only return item if it has meaningful data
        if any(item.values()):
            return item
        
        return None
    
    def _extract_code(self, cell_data: Dict) -> str:
        """Extract item code from cell data."""
        # Look for code in cell reference or nearby cells
        return cell_data.get('code', '')
    
    def _extract_description(self, cell_data: Dict) -> str:
        """Extract item description from cell data."""
        # Use cell value as description if it's a string
        value = cell_data.get('value', '')
        if isinstance(value, str):
            return value
        return cell_data.get('description', '')
    
    def _extract_unit(self, cell_data: Dict) -> str:
        """Extract unit from cell data."""
        return cell_data.get('unit', '')
    
    def _extract_rate(self, cell_data: Dict) -> float:
        """Extract rate from cell data."""
        rate = cell_data.get('rate', 0)
        try:
            return float(rate) if rate else 0.0
        except (ValueError, TypeError):
            return 0.0
    
    def _extract_quantity(self, cell_data: Dict) -> float:
        """Extract quantity from cell data."""
        qty = cell_data.get('quantity', 0)
        try:
            return float(qty) if qty else 0.0
        except (ValueError, TypeError):
            return 0.0
    
    def _extract_amount(self, cell_data: Dict) -> float:
        """Extract amount from cell data."""
        # Try to get amount directly or calculate from rate * quantity
        amount = cell_data.get('amount', None)
        if amount is not None:
            try:
                return float(amount)
            except (ValueError, TypeError):
                pass
        
        # Try to use cell value if it's numeric
        value = cell_data.get('value', 0)
        if isinstance(value, (int, float)):
            return float(value)
        
        # Calculate from rate and quantity
        rate = self._extract_rate(cell_data)
        qty = self._extract_quantity(cell_data)
        return rate * qty
    
    def _extract_remarks(self, cell_data: Dict) -> str:
        """Extract remarks from cell data."""
        return cell_data.get('remarks', '')
    
    def create_config_file(self, template_name: str, mapping_config: Dict) -> str:
        """
        Create configuration file for template mapping.
        
        Args:
            template_name: Name of the template
            mapping_config: Dictionary containing mapping configuration
            
        Returns:
            Path to the created configuration file
        """
        config = {
            'template_name': template_name,
            'input_mapping': mapping_config.get('inputs', {}),
            'output_mapping': mapping_config.get('outputs', {}),
            'calculation_settings': mapping_config.get('settings', {}),
            'validation_rules': mapping_config.get('validation', {})
        }
        
        # Create config file path
        config_path = Path("Attached_Assets") / f"{template_name}_config.json"
        
        # Ensure directory exists
        config_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Write configuration
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        self.logger.info(f"Created configuration file: {config_path}")
        return str(config_path)
    
    def load_config_file(self, template_name: str) -> Dict:
        """
        Load configuration file for a template.
        
        Args:
            template_name: Name of the template
            
        Returns:
            Configuration dictionary or empty dict if file doesn't exist
        """
        config_path = Path("Attached_Assets") / f"{template_name}_config.json"
        
        if not config_path.exists():
            self.logger.warning(f"Configuration file not found: {config_path}")
            return {}
        
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                config = json.load(f)
            self.logger.info(f"Loaded configuration file: {config_path}")
            return config
        except Exception as e:
            self.logger.error(f"Failed to load configuration file {config_path}: {e}", exc_info=True)
            return {}
