#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Data Validator for Excel import/export operations
"""

import logging
import re
from decimal import Decimal, InvalidOperation
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass

from .. import misc

log = logging.getLogger(__name__)

@dataclass
class ValidationResult:
    """Result of data validation"""
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    suggestions: List[str]

class DataValidator:
    """Validates imported Excel data for quality and consistency"""
    
    def __init__(self, ssr_manager=None):
        """Initialize validator with optional SSR manager"""
        self.ssr_manager = ssr_manager
        
        # Validation rules
        self.code_pattern = re.compile(r'^[A-Za-z0-9._-]+$')
        self.rate_range = (0, 999999999)  # Min and max rate values
        self.qty_range = (0, 999999999)   # Min and max quantity values
        
        # Common unit variations
        self.unit_standardization = {
            'nos': 'Nos',
            'no': 'Nos',
            'number': 'Nos',
            'each': 'Each',
            'ea': 'Each',
            'sqm': 'Sqm',
            'sq.m': 'Sqm',
            'sq m': 'Sqm',
            'cum': 'Cum',
            'cu.m': 'Cum',
            'cu m': 'Cum',
            'rmt': 'Rmt',
            'rm': 'Rmt',
            'kg': 'Kg',
            'kilogram': 'Kg',
            'tonne': 'Tonne',
            'ton': 'Tonne',
            'mt': 'Tonne'
        }
    
    def validate_imported_data(self, data: List[Dict]) -> ValidationResult:
        """
        Validate imported Excel data
        
        Args:
            data: List of imported data dictionaries
            
        Returns:
            ValidationResult with validation details
        """
        errors = []
        warnings = []
        suggestions = []
        
        if not data:
            errors.append("No data to validate")
            return ValidationResult(False, errors, warnings, suggestions)
        
        # Validate each row
        for idx, row in enumerate(data, 1):
            row_errors, row_warnings, row_suggestions = self._validate_row(row, idx)
            errors.extend(row_errors)
            warnings.extend(row_warnings)
            suggestions.extend(row_suggestions)
        
        # Perform cross-row validations
        cross_errors, cross_warnings, cross_suggestions = self._validate_cross_rows(data)
        errors.extend(cross_errors)
        warnings.extend(cross_warnings)
        suggestions.extend(cross_suggestions)
        
        is_valid = len(errors) == 0
        
        return ValidationResult(is_valid, errors, warnings, suggestions)
    
    def _validate_row(self, row: Dict, row_num: int) -> Tuple[List[str], List[str], List[str]]:
        """Validate individual row"""
        errors = []
        warnings = []
        suggestions = []
        
        # Validate required fields
        required_fields = ['code', 'description', 'unit']
        for field in required_fields:
            if not row.get(field):
                errors.append(f"Row {row_num}: Missing required field '{field}'")
        
        # Validate code format
        code = row.get('code', '')
        if code:
            if not self.code_pattern.match(str(code)):
                warnings.append(f"Row {row_num}: Code '{code}' contains special characters")
            
            if len(str(code)) > 20:
                warnings.append(f"Row {row_num}: Code '{code}' is very long (>20 chars)")
        
        # Validate description
        description = row.get('description', '')
        if description:
            if len(description) > misc.MAX_DESC_LEN:
                warnings.append(f"Row {row_num}: Description will be truncated (>{misc.MAX_DESC_LEN} chars)")
            
            if description.isupper():
                suggestions.append(f"Row {row_num}: Consider using proper case for description")
        
        # Validate unit
        unit = row.get('unit', '')
        if unit:
            unit_lower = unit.lower()
            if unit_lower in self.unit_standardization:
                standard_unit = self.unit_standardization[unit_lower]
                if unit != standard_unit:
                    suggestions.append(f"Row {row_num}: Consider standardizing unit '{unit}' to '{standard_unit}'")
        
        # Validate rate
        rate = row.get('rate')
        if rate is not None:
            try:
                rate_decimal = Decimal(str(rate))
                if not (self.rate_range[0] <= rate_decimal <= self.rate_range[1]):
                    warnings.append(f"Row {row_num}: Rate {rate} is outside normal range")
                
                if rate_decimal == 0:
                    warnings.append(f"Row {row_num}: Rate is zero")
                
            except (InvalidOperation, ValueError):
                errors.append(f"Row {row_num}: Invalid rate value '{rate}'")
        
        # Validate quantity
        qty = row.get('qty')
        if qty is not None:
            try:
                qty_decimal = Decimal(str(qty))
                if not (self.qty_range[0] <= qty_decimal <= self.qty_range[1]):
                    warnings.append(f"Row {row_num}: Quantity {qty} is outside normal range")
                
            except (InvalidOperation, ValueError):
                errors.append(f"Row {row_num}: Invalid quantity value '{qty}'")
        
        # Validate against SSR if available
        if self.ssr_manager and code:
            ssr_errors, ssr_warnings, ssr_suggestions = self._validate_against_ssr(
                row, row_num
            )
            errors.extend(ssr_errors)
            warnings.extend(ssr_warnings)
            suggestions.extend(ssr_suggestions)
        
        return errors, warnings, suggestions
    
    def _validate_against_ssr(self, row: Dict, row_num: int) -> Tuple[List[str], List[str], List[str]]:
        """Validate row against SSR database"""
        errors = []
        warnings = []
        suggestions = []
        
        code = row.get('code')
        description = row.get('description', '')
        rate = row.get('rate')
        
        # Check if item exists in SSR
        ssr_item = self.ssr_manager.find_item_by_code(code)
        
        if ssr_item:
            # Check rate consistency
            if rate is not None:
                try:
                    rate_decimal = Decimal(str(rate))
                    ssr_rate = Decimal(str(ssr_item['rate']))
                    
                    rate_diff = abs(rate_decimal - ssr_rate)
                    rate_diff_percent = (rate_diff / ssr_rate) * 100 if ssr_rate > 0 else 0
                    
                    if rate_diff_percent > 10:
                        warnings.append(
                            f"Row {row_num}: Rate {rate} differs significantly from SSR rate {ssr_rate} ({rate_diff_percent:.1f}%)"
                        )
                    elif rate_diff_percent > 5:
                        suggestions.append(
                            f"Row {row_num}: Rate {rate} differs from SSR rate {ssr_rate} ({rate_diff_percent:.1f}%)"
                        )
                
                except (InvalidOperation, ValueError):
                    pass  # Rate validation handled elsewhere
            
            # Check description consistency
            if description:
                desc_similarity = self._calculate_similarity(description, ssr_item['description'])
                if desc_similarity < 0.7:
                    suggestions.append(
                        f"Row {row_num}: Description differs from SSR: '{ssr_item['description']}'"
                    )
        
        else:
            # Try fuzzy matching
            fuzzy_matches = self.ssr_manager.fuzzy_match_description(description, threshold=0.8, limit=1)
            
            if fuzzy_matches:
                match = fuzzy_matches[0]
                suggestions.append(
                    f"Row {row_num}: Item not found in SSR, but similar item exists: {match['code']} - {match['description']}"
                )
            else:
                warnings.append(f"Row {row_num}: Item '{code}' not found in SSR database")
        
        return errors, warnings, suggestions
    
    def _validate_cross_rows(self, data: List[Dict]) -> Tuple[List[str], List[str], List[str]]:
        """Validate data across multiple rows"""
        errors = []
        warnings = []
        suggestions = []
        
        # Check for duplicate codes
        codes = [row.get('code') for row in data if row.get('code')]
        duplicate_codes = set([code for code in codes if codes.count(code) > 1])
        
        if duplicate_codes:
            for code in duplicate_codes:
                errors.append(f"Duplicate item code found: '{code}'")
        
        # Check for similar descriptions (potential duplicates)
        descriptions = [(i, row.get('description', '')) for i, row in enumerate(data) 
                       if row.get('description')]
        
        for i, (idx1, desc1) in enumerate(descriptions):
            for idx2, desc2 in descriptions[i+1:]:
                similarity = self._calculate_similarity(desc1, desc2)
                if similarity > 0.9 and desc1 != desc2:
                    warnings.append(
                        f"Very similar descriptions found in rows {idx1+1} and {idx2+1}: "
                        f"'{desc1[:50]}...' and '{desc2[:50]}...'"
                    )
        
        # Check for inconsistent units for similar items
        unit_groups = {}
        for i, row in enumerate(data):
            desc = row.get('description', '').lower()
            unit = row.get('unit', '')
            
            # Group by first few words of description
            desc_key = ' '.join(desc.split()[:3])
            if desc_key not in unit_groups:
                unit_groups[desc_key] = []
            unit_groups[desc_key].append((i+1, unit))
        
        for desc_key, units in unit_groups.items():
            if len(units) > 1:
                unique_units = set(unit for _, unit in units)
                if len(unique_units) > 1:
                    row_nums = [str(row_num) for row_num, _ in units]
                    warnings.append(
                        f"Inconsistent units for similar items in rows {', '.join(row_nums)}: "
                        f"{', '.join(unique_units)}"
                    )
        
        # Statistical analysis
        rates = [float(row.get('rate', 0)) for row in data if row.get('rate')]
        if rates:
            avg_rate = sum(rates) / len(rates)
            max_rate = max(rates)
            min_rate = min(rates)
            
            # Check for outliers
            for i, row in enumerate(data):
                rate = row.get('rate')
                if rate is not None:
                    rate_float = float(rate)
                    if rate_float > avg_rate * 10:
                        warnings.append(
                            f"Row {i+1}: Rate {rate} is unusually high (10x average)"
                        )
                    elif rate_float > 0 and rate_float < avg_rate * 0.1:
                        warnings.append(
                            f"Row {i+1}: Rate {rate} is unusually low (0.1x average)"
                        )
        
        return errors, warnings, suggestions
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two text strings"""
        from difflib import SequenceMatcher
        return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
    
    def suggest_corrections(self, data: List[Dict]) -> List[Dict]:
        """
        Suggest corrections for common data issues
        
        Args:
            data: List of data dictionaries
            
        Returns:
            List of corrected data dictionaries
        """
        corrected_data = []
        
        for row in data:
            corrected_row = row.copy()
            
            # Standardize units
            unit = corrected_row.get('unit', '')
            if unit:
                unit_lower = unit.lower()
                if unit_lower in self.unit_standardization:
                    corrected_row['unit'] = self.unit_standardization[unit_lower]
            
            # Clean and format code
            code = corrected_row.get('code', '')
            if code:
                # Remove extra spaces and special characters
                cleaned_code = re.sub(r'[^\w.-]', '', str(code).strip())
                corrected_row['code'] = cleaned_code
            
            # Clean description
            description = corrected_row.get('description', '')
            if description:
                # Remove extra spaces and normalize
                cleaned_desc = ' '.join(str(description).split())
                corrected_row['description'] = cleaned_desc
            
            # Round rates to reasonable precision
            rate = corrected_row.get('rate')
            if rate is not None:
                try:
                    rate_decimal = Decimal(str(rate))
                    # Round to 2 decimal places
                    corrected_row['rate'] = float(rate_decimal.quantize(Decimal('0.01')))
                except (InvalidOperation, ValueError):
                    pass
            
            # Round quantities to reasonable precision
            qty = corrected_row.get('qty')
            if qty is not None:
                try:
                    qty_decimal = Decimal(str(qty))
                    # Round to 3 decimal places
                    corrected_row['qty'] = float(qty_decimal.quantize(Decimal('0.001')))
                except (InvalidOperation, ValueError):
                    pass
            
            corrected_data.append(corrected_row)
        
        return corrected_data
    
    def generate_validation_report(self, validation_result: ValidationResult) -> str:
        """Generate a formatted validation report"""
        report = []
        
        report.append("DATA VALIDATION REPORT")
        report.append("=" * 50)
        
        if validation_result.is_valid:
            report.append("✓ Data validation PASSED")
        else:
            report.append("✗ Data validation FAILED")
        
        report.append("")
        
        if validation_result.errors:
            report.append(f"ERRORS ({len(validation_result.errors)}):")
            for error in validation_result.errors:
                report.append(f"  ✗ {error}")
            report.append("")
        
        if validation_result.warnings:
            report.append(f"WARNINGS ({len(validation_result.warnings)}):")
            for warning in validation_result.warnings:
                report.append(f"  ⚠ {warning}")
            report.append("")
        
        if validation_result.suggestions:
            report.append(f"SUGGESTIONS ({len(validation_result.suggestions)}):")
            for suggestion in validation_result.suggestions:
                report.append(f"  💡 {suggestion}")
            report.append("")
        
        report.append("=" * 50)
        
        return "\n".join(report)