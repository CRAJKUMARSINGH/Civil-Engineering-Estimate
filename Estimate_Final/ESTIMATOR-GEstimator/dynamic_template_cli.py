"""
Command Line Interface for Dynamic Excel Template Processor

This script provides a command-line interface to interact with the dynamic
Excel template processing system.
"""

import argparse
import json
import sys
from pathlib import Path
from main_app import EnhancedGEstimatorApp


def list_templates(app):
    """List all available templates."""
    templates = app.list_templates()
    if not templates:
        print("No templates found.")
        return
    
    print(f"Found {len(templates)} template(s):")
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


def process_template(app, template_name, input_file=None, output_file=None):
    """Process a template with given inputs."""
    if template_name not in app.list_templates():
        print(f"Template '{template_name}' not found.")
        return
    
    inputs = {}
    if input_file:
        try:
            with open(input_file, 'r') as f:
                inputs = json.load(f)
            print(f"Loaded inputs from {input_file}")
        except Exception as e:
            print(f"Failed to load inputs from {input_file}: {e}")
            return
    
    print(f"Processing template: {template_name}")
    result = app.process_user_input(template_name, inputs)
    
    if result['success']:
        print("Processing completed successfully!")
        if output_file:
            try:
                with open(output_file, 'w') as f:
                    json.dump(result['results'], f, indent=2)
                print(f"Results saved to {output_file}")
            except Exception as e:
                print(f"Failed to save results to {output_file}: {e}")
        else:
            print("\nResults:")
            for cell_ref, value in result['results'].items():
                print(f"  {cell_ref}: {value}")
    else:
        print(f"Processing failed: {result['error']}")


def convert_to_gestimator(app, template_name, output_file=None):
    """Convert template to GEstimator format."""
    if template_name not in app.list_templates():
        print(f"Template '{template_name}' not found.")
        return
    
    if template_name in app.template_structures:
        structure = app.template_structures[template_name]
        gestimator_data = app.gestimator_adapter.convert_to_gestimator_format(structure)
        
        if output_file:
            try:
                with open(output_file, 'w') as f:
                    json.dump(gestimator_data, f, indent=2)
                print(f"GEstimator data saved to {output_file}")
            except Exception as e:
                print(f"Failed to save GEstimator data to {output_file}: {e}")
        else:
            print(json.dumps(gestimator_data, indent=2))
    else:
        print(f"No structure found for template '{template_name}'")


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Dynamic Excel Template Processor for GEstimator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  dynamic_template_cli.py list
  dynamic_template_cli.py info my_template
  dynamic_template_cli.py process my_template -i inputs.json -o results.json
  dynamic_template_cli.py convert my_template -o gestimator_output.json
        """
    )
    
    parser.add_argument(
        '--config',
        help='Path to configuration file',
        default='config/app_config.json'
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # List command
    subparsers.add_parser('list', help='List all available templates')
    
    # Info command
    info_parser = subparsers.add_parser('info', help='Show template information')
    info_parser.add_argument('template_name', help='Name of the template')
    
    # Process command
    process_parser = subparsers.add_parser('process', help='Process a template with inputs')
    process_parser.add_argument('template_name', help='Name of the template to process')
    process_parser.add_argument('-i', '--input', help='Input JSON file with cell values')
    process_parser.add_argument('-o', '--output', help='Output JSON file for results')
    
    # Convert command
    convert_parser = subparsers.add_parser('convert', help='Convert template to GEstimator format')
    convert_parser.add_argument('template_name', help='Name of the template to convert')
    convert_parser.add_argument('-o', '--output', help='Output JSON file for GEstimator data')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    try:
        app = EnhancedGEstimatorApp(args.config)
    except Exception as e:
        print(f"Failed to initialize application: {e}")
        return
    
    if args.command == 'list':
        list_templates(app)
    elif args.command == 'info':
        info = app.get_template_info(args.template_name)
        if info:
            print(f"Template: {args.template_name}")
            print(f"  - Filename: {info['filename']}")
            print(f"  - Format: {info['format']}")
            print(f"  - Sheets: {info['sheet_count']}")
            print(f"  - Has Formulas: {info['has_formulas']}")
            print(f"  - Input Fields: {info['input_count']}")
            print(f"  - Output Fields: {info['output_count']}")
            print(f"  - Formulas: {info['formula_count']}")
        else:
            print(f"Template '{args.template_name}' not found.")
    elif args.command == 'process':
        process_template(app, args.template_name, args.input, args.output)
    elif args.command == 'convert':
        convert_to_gestimator(app, args.template_name, args.output)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()