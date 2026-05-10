"""
Test script for the web interface components
"""
import sys
import os
from pathlib import Path

# Add the current directory to Python path
sys.path.append(str(Path(__file__).parent))

def test_imports():
    """Test that all required modules can be imported."""
    try:
        import streamlit
        print("✓ Streamlit import successful")
    except ImportError as e:
        print(f"✗ Streamlit import failed: {e}")
        return False
    
    try:
        import pandas
        print("✓ Pandas import successful")
    except ImportError as e:
        print(f"✗ Pandas import failed: {e}")
        return False
    
    try:
        from main_app import EnhancedGEstimatorApp
        print("✓ EnhancedGEstimatorApp import successful")
    except ImportError as e:
        print(f"✗ EnhancedGEstimatorApp import failed: {e}")
        return False
    
    return True

def test_app_initialization():
    """Test that the app can be initialized."""
    try:
        from main_app import EnhancedGEstimatorApp
        app = EnhancedGEstimatorApp()
        print("✓ App initialization successful")
        
        # Test template listing
        templates = app.list_templates()
        print(f"✓ Template listing successful: {len(templates)} templates found")
        
        return True
    except Exception as e:
        print(f"✗ App initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Run all tests."""
    print("Testing Web Interface Components")
    print("=" * 50)
    
    tests = [
        test_imports,
        test_app_initialization
    ]
    
    results = []
    for test in tests:
        result = test()
        results.append(result)
        print()
    
    # Summary
    passed = sum(results)
    total = len(results)
    
    print("=" * 50)
    print(f"Test Results: {passed}/{total} passed")
    
    if passed == total:
        print("✓ All tests passed!")
        return 0
    else:
        print(f"✗ {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())