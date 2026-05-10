#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Enhanced Import Dialog with preview and selection capabilities
"""

import logging
from pathlib import Path
from typing import List, Dict, Optional, Callable
import gi
gi.require_version('Gtk', '3.0')
from gi.repository import Gtk, GObject, Pango

from ..import_export.excel_importer import EnhancedExcelImporter, ImportPreviewItem

log = logging.getLogger(__name__)

class EnhancedImportDialog:
    """Enhanced import dialog with preview and selection features"""
    
    def __init__(self, parent_window, excel_importer: EnhancedExcelImporter,
                 database_manager=None, template_manager=None):
        """Initialize enhanced import dialog"""
        self.parent_window = parent_window
        self.excel_importer = excel_importer
        self.database_manager = database_manager
        self.template_manager = template_manager
        
        self.dialog = None
        self.preview_items = []
        self.file_analysis = None
        
        self._setup_dialog()
    
    def _setup_dialog(self):
        """Setup the dialog UI"""
        # Create dialog
        self.dialog = Gtk.Dialog(
            title="Enhanced Excel Import",
            parent=self.parent_window,
            flags=Gtk.DialogFlags.MODAL | Gtk.DialogFlags.DESTROY_WITH_PARENT
        )
        
        self.dialog.set_default_size(1000, 700)
        self.dialog.set_border_width(10)
        
        # Add buttons
        self.dialog.add_button("Cancel", Gtk.ResponseType.CANCEL)
        self.import_button = self.dialog.add_button("Import Selected", Gtk.ResponseType.OK)
        self.import_button.set_sensitive(False)
        
        # Create main content
        content_area = self.dialog.get_content_area()
        
        # Create notebook for tabbed interface
        notebook = Gtk.Notebook()
        content_area.pack_start(notebook, True, True, 0)
        
        # File Selection Tab
        self._create_file_selection_tab(notebook)
        
        # Preview Tab
        self._create_preview_tab(notebook)
        
        # Options Tab
        self._create_options_tab(notebook)
    
    def _create_file_selection_tab(self, notebook):
        """Create file selection tab"""
        vbox = Gtk.VBox(spacing=10)
        vbox.set_border_width(10)
        
        # File chooser
        file_frame = Gtk.Frame(label="Select Excel File")
        file_vbox = Gtk.VBox(spacing=5)
        file_vbox.set_border_width(10)
        
        self.file_chooser = Gtk.FileChooserButton(title="Select Excel File")
        self.file_chooser.set_action(Gtk.FileChooserAction.OPEN)
        
        # Add file filters
        excel_filter = Gtk.FileFilter()
        excel_filter.set_name("Excel Files")
        excel_filter.add_pattern("*.xlsx")
        excel_filter.add_pattern("*.xls")
        self.file_chooser.add_filter(excel_filter)
        
        all_filter = Gtk.FileFilter()
        all_filter.set_name("All Files")
        all_filter.add_pattern("*")
        self.file_chooser.add_filter(all_filter)
        
        self.file_chooser.connect("file-set", self._on_file_selected)
        
        file_vbox.pack_start(self.file_chooser, False, False, 0)
        file_frame.add(file_vbox)
        vbox.pack_start(file_frame, False, False, 0)
        
        # Sheet selection
        sheet_frame = Gtk.Frame(label="Select Sheet")
        sheet_vbox = Gtk.VBox(spacing=5)
        sheet_vbox.set_border_width(10)
        
        self.sheet_combo = Gtk.ComboBoxText()
        self.sheet_combo.set_sensitive(False)
        self.sheet_combo.connect("changed", self._on_sheet_changed)
        
        sheet_vbox.pack_start(self.sheet_combo, False, False, 0)
        sheet_frame.add(sheet_vbox)
        vbox.pack_start(sheet_frame, False, False, 0)
        
        # File analysis display
        analysis_frame = Gtk.Frame(label="File Analysis")
        self.analysis_label = Gtk.Label()
        self.analysis_label.set_markup("<i>No file selected</i>")
        self.analysis_label.set_alignment(0, 0)
        analysis_frame.add(self.analysis_label)
        vbox.pack_start(analysis_frame, False, False, 0)
        
        notebook.append_page(vbox, Gtk.Label("File Selection"))
    
    def _create_preview_tab(self, notebook):
        """Create preview tab with item selection"""
        vbox = Gtk.VBox(spacing=10)
        vbox.set_border_width(10)
        
        # Toolbar
        toolbar = Gtk.Toolbar()
        
        # Select All button
        select_all_btn = Gtk.ToolButton()
        select_all_btn.set_label("Select All")
        select_all_btn.connect("clicked", self._on_select_all)
        toolbar.insert(select_all_btn, -1)
        
        # Deselect All button
        deselect_all_btn = Gtk.ToolButton()
        deselect_all_btn.set_label("Deselect All")
        deselect_all_btn.connect("clicked", self._on_deselect_all)
        toolbar.insert(deselect_all_btn, -1)
        
        # Separator
        toolbar.insert(Gtk.SeparatorToolItem(), -1)
        
        # Row range selection
        range_label = Gtk.Label("Rows:")
        range_item = Gtk.ToolItem()
        range_item.add(range_label)
        toolbar.insert(range_item, -1)
        
        self.start_spin = Gtk.SpinButton()
        self.start_spin.set_range(1, 10000)
        self.start_spin.set_value(1)
        start_item = Gtk.ToolItem()
        start_item.add(self.start_spin)
        toolbar.insert(start_item, -1)
        
        to_label = Gtk.Label("to")
        to_item = Gtk.ToolItem()
        to_item.add(to_label)
        toolbar.insert(to_item, -1)
        
        self.end_spin = Gtk.SpinButton()
        self.end_spin.set_range(1, 10000)
        self.end_spin.set_value(100)
        end_item = Gtk.ToolItem()
        end_item.add(self.end_spin)
        toolbar.insert(end_item, -1)
        
        # Select Range button
        select_range_btn = Gtk.ToolButton()
        select_range_btn.set_label("Select Range")
        select_range_btn.connect("clicked", self._on_select_range)
        toolbar.insert(select_range_btn, -1)
        
        vbox.pack_start(toolbar, False, False, 0)
        
        # Preview TreeView
        scrolled = Gtk.ScrolledWindow()
        scrolled.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        
        self.preview_store = Gtk.ListStore(
            bool,    # Selected
            int,     # Row Number
            str,     # Code
            str,     # Description
            str,     # Unit
            float,   # Rate
            float,   # Quantity
            str,     # Category
            str      # Validation Status
        )
        
        self.preview_tree = Gtk.TreeView(model=self.preview_store)
        self.preview_tree.set_rules_hint(True)
        
        # Add columns
        self._add_preview_columns()
        
        scrolled.add(self.preview_tree)
        vbox.pack_start(scrolled, True, True, 0)
        
        # Status bar
        self.status_label = Gtk.Label()
        self.status_label.set_markup("<i>No items loaded</i>")
        vbox.pack_start(self.status_label, False, False, 0)
        
        notebook.append_page(vbox, Gtk.Label("Preview & Selection"))
    
    def _create_options_tab(self, notebook):
        """Create options tab"""
        vbox = Gtk.VBox(spacing=10)
        vbox.set_border_width(10)
        
        # Import options
        import_frame = Gtk.Frame(label="Import Options")
        import_vbox = Gtk.VBox(spacing=5)
        import_vbox.set_border_width(10)
        
        self.skip_header_check = Gtk.CheckButton("Skip header row")
        self.skip_header_check.set_active(True)
        import_vbox.pack_start(self.skip_header_check, False, False, 0)
        
        self.match_ssr_check = Gtk.CheckButton("Match with SSR database")
        self.match_ssr_check.set_active(False)
        import_vbox.pack_start(self.match_ssr_check, False, False, 0)
        
        import_frame.add(import_vbox)
        vbox.pack_start(import_frame, False, False, 0)
        
        # Template options
        template_frame = Gtk.Frame(label="Template Options")
        template_vbox = Gtk.VBox(spacing=5)
        template_vbox.set_border_width(10)
        
        self.create_template_check = Gtk.CheckButton("Save as template")
        self.create_template_check.connect("toggled", self._on_template_check_toggled)
        template_vbox.pack_start(self.create_template_check, False, False, 0)
        
        template_name_hbox = Gtk.HBox(spacing=5)
        template_name_label = Gtk.Label("Template name:")
        self.template_name_entry = Gtk.Entry()
        self.template_name_entry.set_sensitive(False)
        template_name_hbox.pack_start(template_name_label, False, False, 0)
        template_name_hbox.pack_start(self.template_name_entry, True, True, 0)
        template_vbox.pack_start(template_name_hbox, False, False, 0)
        
        template_frame.add(template_vbox)
        vbox.pack_start(template_frame, False, False, 0)
        
        # Validation options
        validation_frame = Gtk.Frame(label="Validation")
        validation_vbox = Gtk.VBox(spacing=5)
        validation_vbox.set_border_width(10)
        
        validate_btn = Gtk.Button("Validate Data")
        validate_btn.connect("clicked", self._on_validate_data)
        validation_vbox.pack_start(validate_btn, False, False, 0)
        
        self.validation_text = Gtk.TextView()
        self.validation_text.set_editable(False)
        validation_scroll = Gtk.ScrolledWindow()
        validation_scroll.set_policy(Gtk.PolicyType.AUTOMATIC, Gtk.PolicyType.AUTOMATIC)
        validation_scroll.add(self.validation_text)
        validation_scroll.set_size_request(-1, 200)
        validation_vbox.pack_start(validation_scroll, True, True, 0)
        
        validation_frame.add(validation_vbox)
        vbox.pack_start(validation_frame, True, True, 0)
        
        notebook.append_page(vbox, Gtk.Label("Options & Validation"))
    
    def _add_preview_columns(self):
        """Add columns to preview tree view"""
        # Selected column (checkbox)
        renderer = Gtk.CellRendererToggle()
        renderer.connect("toggled", self._on_item_toggled)
        column = Gtk.TreeViewColumn("Select", renderer, active=0)
        self.preview_tree.append_column(column)
        
        # Row number
        renderer = Gtk.CellRendererText()
        column = Gtk.TreeViewColumn("Row", renderer, text=1)
        column.set_sort_column_id(1)
        self.preview_tree.append_column(column)
        
        # Code
        renderer = Gtk.CellRendererText()
        column = Gtk.TreeViewColumn("Code", renderer, text=2)
        column.set_resizable(True)
        column.set_min_width(100)
        self.preview_tree.append_column(column)
        
        # Description
        renderer = Gtk.CellRendererText()
        renderer.set_property("ellipsize", Pango.EllipsizeMode.END)
        column = Gtk.TreeViewColumn("Description", renderer, text=3)
        column.set_resizable(True)
        column.set_min_width(300)
        self.preview_tree.append_column(column)
        
        # Unit
        renderer = Gtk.CellRendererText()
        column = Gtk.TreeViewColumn("Unit", renderer, text=4)
        column.set_resizable(True)
        self.preview_tree.append_column(column)
        
        # Rate
        renderer = Gtk.CellRendererText()
        column = Gtk.TreeViewColumn("Rate", renderer, text=5)
        column.set_resizable(True)
        self.preview_tree.append_column(column)
        
        # Quantity
        renderer = Gtk.CellRendererText()
        column = Gtk.TreeViewColumn("Qty", renderer, text=6)
        column.set_resizable(True)
        self.preview_tree.append_column(column)
        
        # Category
        renderer = Gtk.CellRendererText()
        column = Gtk.TreeViewColumn("Category", renderer, text=7)
        column.set_resizable(True)
        self.preview_tree.append_column(column)
        
        # Validation Status
        renderer = Gtk.CellRendererText()
        column = Gtk.TreeViewColumn("Status", renderer, text=8)
        column.set_resizable(True)
        self.preview_tree.append_column(column)
    
    def _on_file_selected(self, file_chooser):
        """Handle file selection"""
        filepath = file_chooser.get_filename()
        if filepath:
            self._analyze_file(Path(filepath))
    
    def _analyze_file(self, filepath: Path):
        """Analyze selected Excel file"""
        try:
            self.file_analysis = self.excel_importer.analyze_excel_file(filepath)
            
            if self.file_analysis['success']:
                # Update sheet combo
                self.sheet_combo.remove_all()
                for sheet_info in self.file_analysis['sheets']:
                    self.sheet_combo.append_text(sheet_info['name'])
                
                # Select recommended sheet
                if self.file_analysis['recommended_sheet']:
                    for i, sheet_info in enumerate(self.file_analysis['sheets']):
                        if sheet_info['name'] == self.file_analysis['recommended_sheet']:
                            self.sheet_combo.set_active(i)
                            break
                else:
                    self.sheet_combo.set_active(0)
                
                self.sheet_combo.set_sensitive(True)
                
                # Update analysis display
                analysis_text = f"<b>File:</b> {self.file_analysis['filename']}\n"
                analysis_text += f"<b>Sheets:</b> {self.file_analysis['total_sheets']}\n"
                analysis_text += f"<b>Recommended:</b> {self.file_analysis['recommended_sheet'] or 'None'}"
                
                self.analysis_label.set_markup(analysis_text)
                
            else:
                self.analysis_label.set_markup(f"<span color='red'>Error: {'; '.join(self.file_analysis['errors'])}</span>")
                
        except Exception as e:
            log.error(f"Error analyzing file: {e}")
            self.analysis_label.set_markup(f"<span color='red'>Error analyzing file: {str(e)}</span>")
    
    def _on_sheet_changed(self, combo):
        """Handle sheet selection change"""
        if combo.get_active() >= 0:
            sheet_name = combo.get_active_text()
            self._load_preview(sheet_name)
    
    def _load_preview(self, sheet_name: str):
        """Load preview data for selected sheet"""
        try:
            filepath = Path(self.file_chooser.get_filename())
            self.preview_items = self.excel_importer.preview_import(filepath, sheet_name)
            
            # Clear and populate preview store
            self.preview_store.clear()
            
            for item in self.preview_items:
                status = "✓" if not item.validation_errors else f"⚠ {len(item.validation_errors)} issues"
                
                self.preview_store.append([
                    item.selected,
                    item.row_number,
                    item.code,
                    item.description[:100] + "..." if len(item.description) > 100 else item.description,
                    item.unit,
                    float(item.rate),
                    float(item.qty),
                    item.category or "",
                    status
                ])
            
            # Update status
            selected_count = sum(1 for item in self.preview_items if item.selected)
            self.status_label.set_markup(
                f"<b>{len(self.preview_items)}</b> items loaded, "
                f"<b>{selected_count}</b> selected"
            )
            
            # Enable import button if items are selected
            self.import_button.set_sensitive(selected_count > 0)
            
        except Exception as e:
            log.error(f"Error loading preview: {e}")
            self.status_label.set_markup(f"<span color='red'>Error: {str(e)}</span>")
    
    def _on_item_toggled(self, renderer, path):
        """Handle item selection toggle"""
        iter = self.preview_store.get_iter(path)
        current_value = self.preview_store.get_value(iter, 0)
        new_value = not current_value
        
        self.preview_store.set_value(iter, 0, new_value)
        
        # Update corresponding preview item
        row_index = int(path)
        if row_index < len(self.preview_items):
            self.preview_items[row_index].selected = new_value
        
        # Update status
        selected_count = sum(1 for item in self.preview_items if item.selected)
        self.status_label.set_markup(
            f"<b>{len(self.preview_items)}</b> items loaded, "
            f"<b>{selected_count}</b> selected"
        )
        
        self.import_button.set_sensitive(selected_count > 0)
    
    def _on_select_all(self, button):
        """Select all items"""
        for i, item in enumerate(self.preview_items):
            item.selected = True
            iter = self.preview_store.get_iter(Gtk.TreePath(i))
            self.preview_store.set_value(iter, 0, True)
        
        self.status_label.set_markup(
            f"<b>{len(self.preview_items)}</b> items loaded, "
            f"<b>{len(self.preview_items)}</b> selected"
        )
        self.import_button.set_sensitive(len(self.preview_items) > 0)
    
    def _on_deselect_all(self, button):
        """Deselect all items"""
        for i, item in enumerate(self.preview_items):
            item.selected = False
            iter = self.preview_store.get_iter(Gtk.TreePath(i))
            self.preview_store.set_value(iter, 0, False)
        
        self.status_label.set_markup(
            f"<b>{len(self.preview_items)}</b> items loaded, "
            f"<b>0</b> selected"
        )
        self.import_button.set_sensitive(False)
    
    def _on_select_range(self, button):
        """Select items in specified range"""
        start_row = int(self.start_spin.get_value())
        end_row = int(self.end_spin.get_value())
        
        for i, item in enumerate(self.preview_items):
            if start_row <= item.row_number <= end_row:
                item.selected = True
                iter = self.preview_store.get_iter(Gtk.TreePath(i))
                self.preview_store.set_value(iter, 0, True)
        
        selected_count = sum(1 for item in self.preview_items if item.selected)
        self.status_label.set_markup(
            f"<b>{len(self.preview_items)}</b> items loaded, "
            f"<b>{selected_count}</b> selected"
        )
        self.import_button.set_sensitive(selected_count > 0)
    
    def _on_template_check_toggled(self, check_button):
        """Handle template checkbox toggle"""
        self.template_name_entry.set_sensitive(check_button.get_active())
    
    def _on_validate_data(self, button):
        """Validate preview data"""
        if not self.preview_items:
            return
        
        try:
            from ..import_export.data_validator import DataValidator
            
            validator = DataValidator(self.excel_importer.ssr_manager)
            
            # Convert preview items to validation format
            data_for_validation = []
            for item in self.preview_items:
                data_for_validation.append({
                    'code': item.code,
                    'description': item.description,
                    'unit': item.unit,
                    'rate': item.rate,
                    'qty': item.qty,
                    'category': item.category
                })
            
            validation_result = validator.validate_imported_data(data_for_validation)
            report = validator.generate_validation_report(validation_result)
            
            # Display validation report
            buffer = self.validation_text.get_buffer()
            buffer.set_text(report)
            
        except Exception as e:
            log.error(f"Error validating data: {e}")
            buffer = self.validation_text.get_buffer()
            buffer.set_text(f"Validation error: {str(e)}")
    
    def run(self) -> Optional[Dict]:
        """Run the dialog and return import results"""
        self.dialog.show_all()
        
        response = self.dialog.run()
        
        if response == Gtk.ResponseType.OK:
            try:
                # Perform import
                save_template = self.create_template_check.get_active()
                template_name = self.template_name_entry.get_text() if save_template else None
                match_ssr = self.match_ssr_check.get_active()
                
                result = self.excel_importer.import_selected_items(
                    self.preview_items,
                    self.database_manager,
                    save_as_template=save_template,
                    template_name=template_name,
                    match_with_ssr=match_ssr
                )
                
                self.dialog.destroy()
                return result
                
            except Exception as e:
                log.error(f"Import error: {e}")
                # Show error dialog
                error_dialog = Gtk.MessageDialog(
                    parent=self.dialog,
                    flags=Gtk.DialogFlags.MODAL,
                    type=Gtk.MessageType.ERROR,
                    buttons=Gtk.ButtonsType.OK,
                    message_format=f"Import failed: {str(e)}"
                )
                error_dialog.run()
                error_dialog.destroy()
                return None
        
        else:
            self.dialog.destroy()
            return None
      