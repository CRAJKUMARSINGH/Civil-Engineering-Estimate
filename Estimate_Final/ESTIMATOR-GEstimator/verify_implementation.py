"""
Simple verification script for the dynamic Excel template implementation.
"""

import os
import sys

# Add the current directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all modules can be imported."""
    try:
        from import_templates import ExcelTemplateImporter
        print("✓ import_templates module imported successfully")
    except Exception as e:
        print(f"✗ Failed to import import_templates: {e}")
        return False
    
    try:
        from template_engine import FormulaDependencyEngine
        print("✓ template_engine module imported successfully")
    except Exception as e:
        print(f"✗ Failed to import template_engine: {e}")
        return False
    
    try:
        from dynamic_renderer import DynamicTemplateRenderer
        print("✓ dynamic_renderer module imported successfully")
    except Exception as e:
        print(f"✗ Failed to import dynamic_renderer: {e}")
        return False
    
    try:
        from hot_reload import HotReloadManager
        print("✓ hot_reload module imported successfully")
    except Exception as e:
        print(f"✗ Failed to import hot_reload: {e}")
        return False
    
    try:
        from gestimator_integration import GEstimatorAdapter
        print("✓ gestimator_integration module imported successfully")
    except Exception as e:
        print(f"✗ Failed to import gestimator_integration: {e}")
        return False
    
    try:
        from main_app import EnhancedGEstimatorApp
        print("✓ main_app module imported successfully")
    except Exception as e:
        print(f"✗ Failed to import main_app: {e}")
        return False
    
    return True

def test_template_discovery():
    """Test template discovery."""
    try:
        from import_templates import ExcelTemplateImporter
        importer = ExcelTemplateImporter("Attached_Assets")
        templates = importer.scan_for_templates()
        print(f"✓ Found {len(templates)} templates")
        for template in templates:
            print(f"  - {template.filename} ({template.format})")
        return True
    except Exception as e:
        print(f"✗ Template discovery failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run verification tests."""
    print("=" * 60)
    print("DYNAMIC EXCEL TEMPLATE IMPLEMENTATION VERIFICATION")
    print("=" * 60)
    
    print("\n1. Testing module imports...")
    if not test_imports():
        print("\n✗ Import tests failed")
        return 1
    
    print("\n2. Testing template discovery...")
    if not test_template_discovery():
        print("\n✗ Template discovery failed")
        return 1
    
    print("\n" + "=" * 60)
    print("VERIFICATION COMPLETE - ALL TESTS PASSED!")
    print("=" * 60)
    return 0

if __name__ == "__main__":
    sys.exit(main())