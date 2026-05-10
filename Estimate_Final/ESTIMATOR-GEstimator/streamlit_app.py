"""
Streamlit Web Interface for GEstimator Dynamic Excel Template Processor
"""
import streamlit as st
import json
import pandas as pd
from main_app import EnhancedGEstimatorApp
from pathlib import Path

# Initialize session state
if 'app' not in st.session_state:
    st.session_state.app = EnhancedGEstimatorApp()
    st.session_state.selected_template = None
    st.session_state.inputs = {}

# Page configuration
st.set_page_config(
    page_title="GEstimator Dynamic Template Processor",
    page_icon="📊",
    layout="wide"
)

# Title
st.title("📊 GEstimator Dynamic Excel Template Processor")
st.markdown("---")

# Sidebar
with st.sidebar:
    st.header("_templates")
    templates = st.session_state.app.list_templates()
    
    if templates:
        selected = st.selectbox(
            "Select Template",
            templates,
            key="template_selector"
        )
        
        if selected != st.session_state.selected_template:
            st.session_state.selected_template = selected
            st.session_state.inputs = {}
        
        # Show template info
        if st.session_state.selected_template:
            info = st.session_state.app.get_template_info(st.session_state.selected_template)
            if info:
                st.subheader("Template Info")
                st.write(f"**Filename**: {info['filename']}")
                st.write(f"**Format**: {info['format']}")
                st.write(f"**Sheets**: {info['sheet_count']}")
                st.write(f"**Input Fields**: {info['input_count']}")
                st.write(f"**Output Fields**: {info['output_count']}")
                st.write(f"**Formulas**: {info['formula_count']}")
    else:
        st.warning("No templates found. Please check your Attached_Assets directory.")

# Main content
if st.session_state.selected_template:
    st.subheader(f"Processing Template: {st.session_state.selected_template}")
    
    # Get template structure
    structure = st.session_state.app.template_structures.get(st.session_state.selected_template, {})
    input_fields = structure.get('input_fields', {})
    
    if input_fields:
        st.subheader("Input Parameters")
        cols = st.columns(2)
        
        for i, (cell_ref, cell_info) in enumerate(input_fields.items()):
            with cols[i % 2]:
                current_value = st.session_state.inputs.get(cell_ref, cell_info.get('value', ''))
                new_value = st.text_input(
                    f"{cell_ref} - {cell_info.get('name', 'Unknown')}",
                    value=str(current_value) if current_value is not None else "",
                    key=f"input_{cell_ref}"
                )
                st.session_state.inputs[cell_ref] = new_value
    else:
        st.info("No input fields detected in this template.")
    
    # Process button
    if st.button("Process Template", type="primary", use_container_width=True):
        if st.session_state.inputs:
            with st.spinner("Processing template..."):
                # Convert inputs to appropriate types
                processed_inputs = {}
                for cell_ref, value in st.session_state.inputs.items():
                    try:
                        # Try to convert to number if possible
                        if value.strip() == '':
                            processed_inputs[cell_ref] = None
                        elif '.' in value:
                            processed_inputs[cell_ref] = float(value)
                        else:
                            processed_inputs[cell_ref] = int(value)
                    except ValueError:
                        processed_inputs[cell_ref] = value
                
                # Process the template
                result = st.session_state.app.process_user_input(
                    st.session_state.selected_template,
                    processed_inputs
                )
                
                if result['success']:
                    st.success("Template processed successfully!")
                    
                    # Display results
                    output_fields = structure.get('output_fields', {})
                    if output_fields:
                        st.subheader("Results")
                        results_data = []
                        for cell_ref, value in result['results'].items():
                            if cell_ref in output_fields:
                                field_info = output_fields[cell_ref]
                                results_data.append({
                                    'Cell Reference': cell_ref,
                                    'Description': field_info.get('name', 'Unknown'),
                                    'Value': value
                                })
                        
                        if results_data:
                            df = pd.DataFrame(results_data)
                            st.dataframe(df, use_container_width=True)
                        else:
                            st.json(result['results'])
                    else:
                        st.json(result['results'])
                else:
                    st.error(f"Processing failed: {result['error']}")
        else:
            st.warning("Please enter at least one input value.")
    
    # Convert to GEstimator format
    st.markdown("---")
    st.subheader("GEstimator Conversion")
    
    if st.button("Convert to GEstimator Format", use_container_width=True):
        with st.spinner("Converting to GEstimator format..."):
            if st.session_state.selected_template in st.session_state.app.template_structures:
                structure = st.session_state.app.template_structures[st.session_state.selected_template]
                gestimator_data = st.session_state.app.gestimator_adapter.convert_to_gestimator_format(structure)
                
                st.success("Conversion completed!")
                
                # Display metadata
                metadata = gestimator_data.get('template_metadata', {})
                if metadata:
                    st.subheader("Template Metadata")
                    st.json(metadata)
                
                # Display schedule items
                schedule_items = gestimator_data.get('schedule_items', [])
                if schedule_items:
                    st.subheader("Schedule Items")
                    df = pd.DataFrame(schedule_items)
                    st.dataframe(df, use_container_width=True)
                
                # Download button
                json_str = json.dumps(gestimator_data, indent=2)
                st.download_button(
                    label="Download GEstimator JSON",
                    data=json_str,
                    file_name=f"{st.session_state.selected_template}_gestimator.json",
                    mime="application/json"
                )
else:
    st.info("Please select a template from the sidebar to begin.")

# Footer
st.markdown("---")
st.caption("GEstimator Dynamic Excel Template Processor - Enhanced by RAJKUMAR SINGH CHAUHAN")