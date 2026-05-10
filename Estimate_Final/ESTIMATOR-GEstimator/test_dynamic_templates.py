"""
Test script for Dynamic Excel Template Processor

This script tests the basic functionality of the dynamic template system.
"""

import sys
from main_app import EnhancedGEstimatorApp


def test_template_discovery():
    """Test template discovery and loading."""
    print("=" * 60)
    print("TEST 1: Template Discovery")
    print("=" * 60)
    
    try:
        app = EnhancedGEstimatorApp()
        templates = app.list_templates()
        
        print(f"\n✓ Found {len(templates)} template(s):")
        for template_name in templates:
            info = app.get_template_info(template_name)
            if info:
                print(f"\n  Template: {template_name}")
                print(f"    - Filename: {info['filename']}")
                print(f"    - Format: {info['format']}")
                print(f"    - Sheets: {info['sheet_count']}")
                print(f"    - Has Formulas: {info['has_formulas']}")
                print(f"    - Input Fields: {info['input_count']}")
                print(f"    - Output Fields: {info['output_count']}")
                print(f"    - Formulas: {info['formula_count']}")
        
        return True
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_formula_parsing():
    """Test formula parsing and dependency graph."""
    print("\n" + "=" * 60)
    print("TEST 2: Formula Parsing")
    print("=" * 60)
    
    try:
        app = EnhancedGEstimatorApp()
        templates = app.list_templates()
        
        if not templates:
            print("\n⚠ No templates found to test")
            return True
        
        template_name = templates[0]
        print(f"\nTesting template: {template_name}")
        
        if template_name in app.template_structures:
            structure = app.template_structures[template_name]
            formulas = structure.get('formulas', {})
            
            print(f"\n✓ Parsed {len(formulas)} formula(s)")
            
            # Show first 5 formulas as examples
            for i, (cell_ref, formula) in enumerate(list(formulas.items())[:5]):
                print(f"  {cell_ref}: {formula}")
            
            if len(formulas) > 5:
                print(f"  ... and {len(formulas) - 5} more")
        
        return True
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_input_output_detection():
    """Test input and output cell detection."""
    print("\n" + "=" * 60)
    print("TEST 3: Input/Output Detection")
    print("=" * 60)
    
    try:
        app = EnhancedGEstimatorApp()
        templates = app.list_templates()
        
        if not templates:
            print("\n⚠ No templates found to test")
            return True
        
        template_name = templates[0]
        print(f"\nTesting template: {template_name}")
        
        if template_name in app.template_structures:
            structure = app.template_structures[template_name]
            
            input_fields = structure.get('input_fields', {})
            output_fields = structure.get('output_fields', {})
            
            print(f"\n✓ Found {len(input_fields)} input field(s)")
            for cell_ref, cell_info in list(input_fields.items())[:3]:
                print(f"  {cell_ref}: {cell_info.get('value', 'N/A')}")
            
            print(f"\n✓ Found {len(output_fields)} output field(s)")
            for cell_ref, cell_info in list(output_fields.items())[:3]:
                print(f"  {cell_ref}: {cell_info.get('value', 'N/A')}")
        
        return True
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_gestimator_conversion():
    """Test conversion to GEstimator format."""
    print("\n" + "=" * 60)
    print("TEST 4: GEstimator Conversion")
    print("=" * 60)
    
    try:
        app = EnhancedGEstimatorApp()
        templates = app.list_templates()
        
        if not templates:
            print("\n⚠ No templates found to test")
            return True
        
        template_name = templates[0]
        print(f"\nTesting template: {template_name}")
        
        if template_name in app.template_structures:
            structure = app.template_structures[template_name]
            gestimator_data = app.gestimator_adapter.convert_to_gestimator_format(structure)
            
            schedule_items = gestimator_data.get('schedule_items', [])
            metadata = gestimator_data.get('template_metadata', {})
            
            print(f"\n✓ Converted to GEstimator format")
            print(f"  - Schedule Items: {len(schedule_items)}")
            print(f"  - Template Name: {metadata.get('name', 'N/A')}")
            print(f"  - Sheets: {', '.join(metadata.get('sheets', []))}")
        
        return True
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("DYNAMIC EXCEL TEMPLATE PROCESSOR - TEST SUITE")
    print("=" * 60)
    
    tests = [
        test_template_discovery,
        test_formula_parsing,
        test_input_output_detection,
        test_gestimator_conversion
    ]
    
    results = []
    for test in tests:
        result = test()
        results.append(result)
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(results)
    total = len(results)
    
    print(f"\nPassed: {passed}/{total}")
    
    if passed == total:
        print("\n✓ All tests passed!")
        return 0
    else:
        print(f"\n✗ {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
