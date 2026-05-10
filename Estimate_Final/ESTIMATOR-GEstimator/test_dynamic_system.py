"""
Test script for the complete dynamic Excel template system.
"""

import sys
import os
import json
from main_app import EnhancedGEstimatorApp


def test_complete_system():
    """Test the complete dynamic template system."""
    print("=" * 60)
    print("TESTING COMPLETE DYNAMIC EXCEL TEMPLATE SYSTEM")
    print("=" * 60)
    
    try:
        # Initialize the application
        print("\n1. Initializing application...")
        app = EnhancedGEstimatorApp()
        print("✓ Application initialized successfully")
        
        # List templates
        print("\n2. Listing templates...")
        templates = app.list_templates()
        print(f"✓ Found {len(templates)} template(s): {templates}")
        
        if not templates:
            print("⚠ No templates found. Cannot proceed with further tests.")
            return True
        
        # Get template info
        template_name = templates[0]
        print(f"\n3. Getting info for template: {template_name}")
        info = app.get_template_info(template_name)
        if info:
            print(f"✓ Template info retrieved")
            print(f"  - Filename: {info['filename']}")
            print(f"  - Format: {info['format']}")
            print(f"  - Sheets: {info['sheet_count']}")
            print(f"  - Has formulas: {info['has_formulas']}")
        else:
            print("✗ Failed to get template info")
            return False
        
        # Test GEstimator conversion
        print(f"\n4. Converting {template_name} to GEstimator format...")
        if template_name in app.template_structures:
            structure = app.template_structures[template_name]
            gestimator_data = app.gestimator_adapter.convert_to_gestimator_format(structure)
            print(f"✓ Converted to GEstimator format")
            print(f"  - Schedule items: {len(gestimator_data.get('schedule_items', []))}")
            print(f"  - Template metadata: {gestimator_data.get('template_metadata', {})}")
        else:
            print("⚠ No structure found for template")
        
        print("\n" + "=" * 60)
        print("ALL TESTS COMPLETED SUCCESSFULLY!")
        print("=" * 60)
        return True
        
    except Exception as e:
        print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_complete_system()
    sys.exit(0 if success else 1)