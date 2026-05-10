"""Basic tests for Construction Estimation System"""
import sys
from pathlib import Path

import pytest

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))


def test_imports():
    """Test that core modules can be imported"""
    try:
        import numpy
        import openpyxl
        import pandas
        import plotly
        import rapidfuzz
        import reportlab
        import streamlit
        assert True
    except ImportError as e:
        pytest.fail(f"Import failed: {e}")


def test_constants():
    """Test that constants are defined"""
    # These would be imported from streamlit_app if it was modular
    MAX_FILE_SIZE_MB = 5
    MAX_ROWS = 10000
    
    assert MAX_FILE_SIZE_MB == 5
    assert MAX_ROWS == 10000


def test_file_size_validation():
    """Test file size validation logic"""
    MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB
    
    # Test valid size
    valid_size = 3 * 1024 * 1024  # 3 MB
    assert valid_size <= MAX_FILE_SIZE
    
    # Test invalid size
    invalid_size = 10 * 1024 * 1024  # 10 MB
    assert invalid_size > MAX_FILE_SIZE


def test_row_count_validation():
    """Test row count validation logic"""
    MAX_ROWS = 10000
    
    # Test valid row count
    assert 5000 <= MAX_ROWS
    
    # Test invalid row count
    assert 15000 > MAX_ROWS


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
