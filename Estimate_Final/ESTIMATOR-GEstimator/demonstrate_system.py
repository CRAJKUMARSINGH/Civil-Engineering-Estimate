"""
Demonstration script for the complete dynamic Excel template system workflow.
"""

import json
import os
from main_app import EnhancedGEstimatorApp


def demonstrate_system():
    """Demonstrate the complete workflow of the dynamic template system."""
    print("=" * 70)
    print("DYNAMIC EXCEL TEMPLATE SYSTEM - COMPLETE WORKFLOW DEMONSTRATION")
    print("=" * 70)
    
    try:
        # Step 1: Initialize the application
        print("\n1. Initializing Enhanced GEstimator Application...")
        app = EnhancedGEstimatorApp()
        print("   ✓ Application initialized successfully")
        
        # Step 2: List available templates
        print("\n2. Discovering available templates...")
        templates = app.list_templates()
        print(f"   ✓ Found {len(templates)} template(s):")
        for i, template in enumerate(templates, 1):
            print(f"     {i}. {template}")
        
        if not templates:
            print("   ⚠ No templates found. Cannot proceed with demonstration.")
            return
        
        # Step 3: Select a template for demonstration
        template_name = templates[0]
        print(f"\n3. Selected template for demonstration: {template_name}")
        
        # Step 4: Get template information
        print("\n4. Analyzing template structure...")
        info = app.get_template_info(template_name)
        if info:
            print("   ✓ Template analysis complete:")
            print(f"     - Filename: {info['filename']}")
            print(f"     - Format: {info['format']}")
            print(f"     - Sheets: {info['sheet_count']}")
            print(f"     - Has formulas: {info['has_formulas']}")
            print(f"     - Input fields: {info['input_count']}")
            print(f"     - Output fields: {info['output_count']}")
            print(f"     - Formulas: {info['formula_count']}")
        else:
            print("   ✗ Failed to analyze template")
            return
        
        # Step 5: Show template structure details
        print("\n5. Detailed template structure analysis...")
        if template_name in app.template_structures:
            structure = app.template_structures[template_name]
            
            # Show sheets
            print("   ✓ Sheets found:")
            for sheet_name in structure.get('sheets', {}):
                print(f"     - {sheet_name}")
            
            # Show input fields
            input_fields = structure.get('input_fields', {})
            print(f"   ✓ Input fields ({len(input_fields)} found):")
            for cell_ref, cell_info in list(input_fields.items())[:5]:  # Show first 5
                value = cell_info.get('value', 'N/A')
                print(f"     - {cell_ref}: {value}")
            if len(input_fields) > 5:
                print(f"     ... and {len(input_fields) - 5} more")
            
            # Show output fields
            output_fields = structure.get('output_fields', {})
            print(f"   ✓ Output fields ({len(output_fields)} found):")
            for cell_ref, cell_info in list(output_fields.items())[:5]:  # Show first 5
                value = cell_info.get('value', 'N/A')
                print(f"     - {cell_ref}: {value}")
            if len(output_fields) > 5:
                print(f"     ... and {len(output_fields) - 5} more")
            
            # Show formulas
            formulas = structure.get('formulas', {})
            print(f"   ✓ Formulas ({len(formulas)} found):")
            for cell_ref, formula in list(formulas.items())[:3]:  # Show first 3
                print(f"     - {cell_ref}: {formula}")
            if len(formulas) > 3:
                print(f"     ... and {len(formulas) - 3} more")
        else:
            print("   ⚠ No detailed structure available for template")
        
        # Step 6: Convert to GEstimator format
        print("\n6. Converting template to GEstimator format...")
        if template_name in app.template_structures:
            structure = app.template_structures[template_name]
            gestimator_data = app.gestimator_adapter.convert_to_gestimator_format(structure)
            
            schedule_items = gestimator_data.get('schedule_items', [])
            metadata = gestimator_data.get('template_metadata', {})
            
            print("   ✓ Conversion to GEstimator format complete:")
            print(f"     - Schedule items generated: {len(schedule_items)}")
            print(f"     - Template name: {metadata.get('name', 'N/A')}")
            print(f"     - Sheets processed: {', '.join(metadata.get('sheets', []))}")
            
            # Show first few schedule items
            if schedule_items:
                print("     - Sample schedule items:")
                for i, item in enumerate(schedule_items[:3]):
                    print(f"       {i+1}. Code: {item.get('Code', 'N/A')}")
                    print(f"          Description: {item.get('Description', 'N/A')}")
                    print(f"          Unit: {item.get('Unit', 'N/A')}")
                    print(f"          Rate: {item.get('Rate', 'N/A')}")
                    print(f"          Qty: {item.get('Qty', 'N/A')}")
                    print(f"          Amount: {item.get('Amount', 'N/A')}")
        else:
            print("   ⚠ Cannot convert template - no structure available")
        
        # Step 7: Demonstrate processing with inputs (if we have a simple template)
        print("\n7. Demonstrating template processing with sample inputs...")
        # Create sample inputs based on what we know about the template
        sample_inputs = {
            "Input!B1": 12.5,
            "Input!B2": 6.0,
            "Input!B3": 3.5,
            "Input!B5": 1600.0,
            "Input!B6": 800.0
        }
        
        print("   Sample inputs:")
        for cell_ref, value in sample_inputs.items():
            print(f"     - {cell_ref}: {value}")
        
        result = app.process_user_input(template_name, sample_inputs)
        if result['success']:
            print("   ✓ Template processing completed successfully")
            print("   Results (first 5):")
            for i, (cell_ref, value) in enumerate(list(result['results'].items())[:5]):
                print(f"     - {cell_ref}: {value}")
            if len(result['results']) > 5:
                print(f"     ... and {len(result['results']) - 5} more")
        else:
            print(f"   ⚠ Template processing failed: {result.get('error', 'Unknown error')}")
        
        # Step 8: Show hot reload capabilities
        print("\n8. Hot reload system status...")
        if hasattr(app, 'hot_reload') and app.hot_reload:
            print("   ✓ Hot reload manager is available")
            print(f"   ✓ Watching directory: {app.hot_reload.watch_path}")
            print(f"   ✓ Hot reload enabled: {app.config.get('enable_hot_reload', True)}")
        else:
            print("   ⚠ Hot reload system not available")
        
        print("\n" + "=" * 70)
        print("DEMONSTRATION COMPLETED SUCCESSFULLY!")
        print("=" * 70)
        print("\nNext steps:")
        print("1. Try the CLI: python dynamic_template_cli.py list")
        print("2. Create your own templates following the conventions")
        print("3. Modify the example template to suit your needs")
        print("4. Check the logs in the 'logs' directory for detailed information")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Demonstration failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = demonstrate_system()
    exit(0 if success else 1)