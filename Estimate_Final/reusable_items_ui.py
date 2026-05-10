"""
Reusable Items Manager UI - Streamlit Integration
==================================================
UI for managing reusable items with SSR/BSR integration
"""

from datetime import datetime

import streamlit as st

from item_code_manager import ItemCodeManager, MultiRowMeasurementManager


def show_reusable_items_manager():
    """Main UI for managing reusable items"""
    st.title("🔄 Reusable Items Manager")
    
    st.markdown("""
    Manage standardized item codes (5.4.6 format) for reuse across projects.
    Create items once, use them everywhere with multiple measurement rows.
    """)
    
    # Initialize managers
    if 'item_manager' not in st.session_state:
        st.session_state.item_manager = ItemCodeManager()
    
    if 'multi_row_manager' not in st.session_state:
        st.session_state.multi_row_manager = MultiRowMeasurementManager()
    
    item_manager = st.session_state.item_manager
    multi_row_manager = st.session_state.multi_row_manager
    
    # Tabs
    tab1, tab2, tab3, tab4 = st.tabs([
        "➕ Create Item",
        "🔍 Search & Reuse",
        "📊 Multiple Measurements",
        "📈 Popular Items"
    ])
    
    # Tab 1: Create Reusable Item
    with tab1:
        st.subheader("Create Reusable Item")
        
        st.info("💡 Items are assigned standardized codes (e.g., 5.4.6) for easy reuse")
        
        col1, col2 = st.columns(2)
        
        with col1:
            category = st.selectbox(
                "Category",
                options=[
                    "1 - Earthwork",
                    "2 - Concrete",
                    "3 - Masonry",
                    "4 - Steel",
                    "5 - Finishing",
                    "6 - Plumbing",
                    "7 - Electrical",
                    "8 - Carpentry",
                    "9 - Painting",
                    "10 - Miscellaneous"
                ]
            )
            
            subcategory = st.selectbox(
                "Subcategory",
                options=[
                    "1 - General",
                    "2 - Foundation",
                    "3 - Superstructure",
                    "4 - Roof",
                    "5 - Flooring",
                    "6 - Doors & Windows",
                    "7 - Fixtures",
                    "8 - External Works"
                ]
            )
        
        with col2:
            unit = st.selectbox(
                "Unit",
                options=["Cum", "Sqm", "Kg", "Nos", "Rmt", "Tonne", "Ltr", "Bag"]
            )
            
            rate = st.number_input(
                "Standard Rate (₹)",
                min_value=0.0,
                value=0.0,
                step=10.0
            )
        
        description = st.text_area(
            "Item Description",
            placeholder="e.g., Brick work in cement mortar 1:6 in superstructure",
            height=100
        )
        
        col1, col2 = st.columns(2)
        with col1:
            ssr_code = st.text_input("SSR Code (optional)", placeholder="e.g., SSR-3.1.1")
        with col2:
            bsr_code = st.text_input("BSR Code (optional)", placeholder="e.g., BSR-3.1.1")
        
        if st.button("💾 Create Reusable Item", type="primary"):
            if not description:
                st.error("❌ Description is required")
            else:
                item_data = {
                    'category': category.split(' - ')[0],
                    'subcategory': subcategory.split(' - ')[0],
                    'description': description,
                    'unit': unit,
                    'rate': rate,
                    'ssr_code': ssr_code,
                    'bsr_code': bsr_code
                }
                
                item_code = item_manager.add_reusable_item(item_data)
                
                if item_code:
                    st.success(f"✅ Item created with code: **{item_code}**")
                    st.balloons()
                else:
                    st.error("❌ Failed to create item")
    
    # Tab 2: Search & Reuse
    with tab2:
        st.subheader("Search & Reuse Items")
        
        search_term = st.text_input(
            "🔍 Search existing items",
            placeholder="Enter description or item code..."
        )
        
        if search_term:
            results = item_manager.search_reusable_items(search_term)
            
            if not results.empty:
                st.write(f"**Found {len(results)} items:**")
                
                # Display results
                display_df = results[['item_code', 'description', 'standard_unit', 
                                     'standard_rate', 'usage_frequency']].copy()
                display_df.columns = ['Code', 'Description', 'Unit', 'Rate (₹)', 'Usage']
                
                st.dataframe(display_df, use_container_width=True)
                
                # Select item for reuse
                selected_idx = st.selectbox(
                    "Select item to reuse",
                    options=range(len(results)),
                    format_func=lambda x: f"{results.iloc[x]['item_code']} - {results.iloc[x]['description'][:50]}..."
                )
                
                if st.button("🔄 Use This Item"):
                    selected_item = results.iloc[selected_idx]
                    st.session_state.selected_reusable_item = selected_item.to_dict()
                    item_manager.increment_usage(selected_item['item_code'])
                    st.success(f"✅ Selected: {selected_item['item_code']}")
                    st.info("👉 Go to 'Multiple Measurements' tab to add measurements")
            else:
                st.warning("No items found. Try different search terms or create a new item.")
        else:
            st.info("👆 Enter a search term to find reusable items")
    
    # Tab 3: Multiple Measurements
    with tab3:
        st.subheader("📊 Add Multiple Measurements")
        
        if 'selected_reusable_item' in st.session_state:
            item = st.session_state.selected_reusable_item
            
            st.success(f"**Item:** {item['item_code']} - {item['description']}")
            st.info(f"**Unit:** {item['standard_unit']} | **Rate:** ₹{item['standard_rate']:,.2f}")
            
            # Project selection
            project_id = st.number_input("Project ID", min_value=1, value=1)
            
            # Number of measurement rows
            num_rows = st.number_input(
                "Number of measurement rows",
                min_value=1,
                max_value=50,
                value=3,
                help="Add multiple rows for different locations/specifications"
            )
            
            st.markdown("---")
            
            # Dynamic measurement rows
            measurements = []
            total_quantity = 0
            total_amount = 0
            
            for i in range(num_rows):
                with st.expander(f"📏 Row {i+1}", expanded=True):
                    col1, col2 = st.columns([2, 1])
                    
                    with col1:
                        location = st.text_input(
                            "Location/Description",
                            value=f"Location {i+1}",
                            key=f"location_{i}"
                        )
                    
                    with col2:
                        nos = st.number_input(
                            "Nos",
                            value=1.0,
                            min_value=0.0,
                            step=0.1,
                            key=f"nos_{i}"
                        )
                    
                    col1, col2, col3 = st.columns(3)
                    
                    with col1:
                        length = st.number_input(
                            "Length (m)",
                            value=0.0,
                            min_value=0.0,
                            step=0.1,
                            key=f"length_{i}"
                        )
                    
                    with col2:
                        breadth = st.number_input(
                            "Breadth (m)",
                            value=0.0,
                            min_value=0.0,
                            step=0.1,
                            key=f"breadth_{i}"
                        )
                    
                    with col3:
                        height = st.number_input(
                            "Height (m)",
                            value=0.0,
                            min_value=0.0,
                            step=0.1,
                            key=f"height_{i}"
                        )
                    
                    # Calculate total
                    if length and breadth and height:
                        total = nos * length * breadth * height
                    elif length and breadth:
                        total = nos * length * breadth
                    elif length:
                        total = nos * length
                    else:
                        total = nos
                    
                    amount = total * item['standard_rate']
                    
                    st.metric(
                        "Calculated",
                        f"{total:.3f} {item['standard_unit']}",
                        f"₹{amount:,.2f}"
                    )
                    
                    total_quantity += total
                    total_amount += amount
                    
                    measurements.append({
                        'description': item['description'],
                        'location': location,
                        'nos': nos,
                        'length': length,
                        'breadth': breadth,
                        'height': height,
                        'unit': item['standard_unit'],
                        'rate': item['standard_rate']
                    })
            
            # Summary
            st.markdown("---")
            col1, col2, col3 = st.columns(3)
            
            with col1:
                st.metric("Total Rows", num_rows)
            with col2:
                st.metric("Total Quantity", f"{total_quantity:.3f} {item['standard_unit']}")
            with col3:
                st.metric("Total Amount", f"₹{total_amount:,.2f}")
            
            # Save button
            if st.button("💾 Add All Measurements", type="primary"):
                success = multi_row_manager.add_measurement_rows(
                    project_id,
                    item['item_code'],
                    measurements
                )
                
                if success:
                    st.success(f"✅ Added {len(measurements)} measurement rows!")
                    st.balloons()
                else:
                    st.error("❌ Failed to add measurements")
        else:
            st.info("👆 First select an item from the 'Search & Reuse' tab")
            
            # Show button to go back
            if st.button("🔍 Go to Search"):
                st.session_state.active_tab = 1
    
    # Tab 4: Popular Items
    with tab4:
        st.subheader("📈 Most Used Items")
        
        limit = st.slider("Number of items to show", 5, 50, 20)
        
        popular = item_manager.get_popular_items(limit)
        
        if not popular.empty:
            st.write(f"**Top {len(popular)} most frequently used items:**")
            
            display_df = popular.copy()
            display_df.columns = ['Code', 'Description', 'Unit', 'Rate (₹)', 
                                 'Times Used', 'Last Used']
            
            st.dataframe(display_df, use_container_width=True)
            
            # Export option
            if st.button("📥 Export Item Master"):
                output_path = f"item_master_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
                if item_manager.export_item_master(output_path):
                    st.success(f"✅ Exported to: {output_path}")
        else:
            st.info("No items have been used yet. Start creating and using items!")


if __name__ == "__main__":
    st.set_page_config(
        page_title="Reusable Items Manager",
        page_icon="🔄",
        layout="wide"
    )
    
    show_reusable_items_manager()
