# Design Guidelines: Construction Estimation App

## Design Approach

**System Selected:** Fluent Design System (Microsoft)

**Rationale:** This is a data-intensive productivity application requiring Excel-like interactions, complex table management, and professional reliability. Fluent Design excels at information-dense interfaces and provides established patterns for spreadsheet-like components, multi-pane layouts, and enterprise workflows.

**Core Design Principles:**
1. Data clarity and readability above all else
2. Professional, trust-inspiring interface for engineering professionals
3. Efficient workflows minimizing clicks for common tasks
4. Clear hierarchy between navigation, data, and actions

---

## Typography System

**Font Family:** 
- Primary: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif
- Monospace (for numerical data): 'Consolas', 'Monaco', monospace

**Type Scale:**
- H1 (Page Titles): text-3xl (30px), font-semibold
- H2 (Section Headers): text-2xl (24px), font-semibold
- H3 (Sheet Names, Card Titles): text-xl (20px), font-medium
- Body (Primary Text): text-base (16px), font-normal
- Body Small (Labels, Secondary): text-sm (14px), font-normal
- Table Headers: text-sm (14px), font-semibold, uppercase tracking
- Numerical Data: text-base (16px), font-mono, tabular-nums

---

## Layout System

**Spacing Primitives:** Use Tailwind units of **2, 4, 6, and 8** for consistency
- Micro spacing (gaps between related items): p-2, gap-2
- Component padding: p-4, p-6
- Section spacing: p-8, py-8
- Major layout breaks: mt-8, mb-8

**Grid System:**
- Container: max-w-7xl mx-auto px-4 lg:px-8
- Dashboard cards: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Table container: w-full overflow-x-auto

---

## Component Library

### Navigation & Shell

**Top Navigation Bar:**
- Height: h-16
- Layout: flex items-center justify-between px-6
- Logo/App Name: left-aligned, text-xl font-semibold
- Actions: right-aligned (User profile, Settings icon)
- Breadcrumbs: below main nav when in estimate editing mode

**Sidebar Navigation (Left Panel):**
- Width: w-64 (desktop), collapsible on tablet/mobile
- Sections: "Dashboard," "All Estimates," "SSR Database," "Templates," "Settings"
- Active state: Subtle left border indicator (border-l-4)
- Menu items: py-2 px-4, text-sm

### Dashboard

**Statistics Cards:**
- Layout: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- Card structure: Rounded corners (rounded-lg), shadow (shadow-md)
- Card padding: p-6
- Icon placement: Top-left or inline with stat
- Content hierarchy: Label (text-sm), Value (text-3xl font-bold), Change indicator (text-sm)

**Recent Estimates List:**
- Table layout with columns: Project Name, Date, Parts Count, Total Amount, Status, Actions
- Row height: py-4
- Hover state: Subtle background change
- Action buttons: Icon buttons (Edit, Duplicate, Download, Delete) - size-8 with p-2

### Estimate Editor (Core Interface)

**Multi-Sheet Tab Interface:**
- Tab bar: flex gap-2 border-b, overflow-x-auto
- Individual tabs: px-4 py-2, rounded-t-lg, min-w-32
- Active tab: border-b-2 indicator
- Add Part button: ml-auto, icon + text
- Sheet types clearly distinguished (measurements vs. cost abstract)

**Excel-Like Table Interface:**
- Container: w-full overflow-auto, max-h-screen
- Table: border-collapse, w-full
- Headers: sticky top-0, bg treatment, py-3 px-4, text-left
- Cells: py-2 px-4, border-b, text-sm
- Editable cells: Focus ring, cursor-text
- Row numbers: w-12, text-center, text-xs
- Column resize handles: Visual indicator on header borders

**Toolbar Above Table:**
- Height: h-12
- Layout: flex items-center gap-4 px-4
- Button groups: Add Row, Delete Row, Insert SSR Item, Format, Calculate
- Search/Filter: ml-auto, w-64

### SSR Item Selection Modal

**Modal Structure:**
- Size: max-w-4xl, max-h-[80vh]
- Header: p-6, border-b
- Search bar: w-full, mb-4
- Content area: Two-column layout (Categories sidebar + Item list)
- Category sidebar: w-48, border-r
- Item list: Scrollable, grid or table format
- Each item card: p-4, hover effect, includes Code, Description, Unit, Rate
- Footer: Sticky bottom with Cancel and Select buttons

### Forms & Inputs

**Input Fields:**
- Height: h-10 (standard), h-12 (prominent)
- Padding: px-4
- Border: border, rounded-md
- Label: mb-2, text-sm font-medium
- Helper text: mt-1, text-xs

**Project Metadata Form:**
- Two-column layout on desktop: grid grid-cols-2 gap-6
- Fields: Project Name, Location, Date, Engineer Name, Reference Number
- Full-width on mobile

### Action Buttons

**Primary Actions:**
- Height: h-10, px-6
- Text: text-sm font-medium
- Border radius: rounded-md
- Examples: "Save Estimate," "Download Excel," "Add SSR Item"

**Secondary Actions:**
- Height: h-10, px-4
- Border treatment
- Examples: "Cancel," "Duplicate," "View History"

**Icon-Only Buttons:**
- Size: w-8 h-8, p-2
- For: Edit, Delete, Download in tables

**Button Groups:**
- gap-2 for related actions
- Grouped with border or background container

### Data Display

**Summary Cards (Abstract View):**
- Layout: Grid of cost breakdowns
- Card: p-6, rounded-lg, shadow
- Hierarchy: Part name (text-lg font-semibold), line items (text-sm), total (text-xl font-bold)

**Measurement Table:**
- Specialized columns: Serial No. (w-16), Description (flexible), Length/Breadth/Height (w-24 each), Quantity (w-24), Unit (w-20)
- Numerical alignment: text-right for all number columns
- Formula cells: Slightly different treatment to indicate calculation

### Status & Feedback

**Status Badges:**
- Size: px-3 py-1, text-xs, rounded-full
- States: Draft, Submitted, Approved, Archived
- Inline with text or standalone

**Toast Notifications:**
- Position: Fixed bottom-right
- Size: min-w-80, max-w-md
- Padding: p-4
- Icons: Left-aligned with message
- Auto-dismiss after 5s

---

## Page-Specific Layouts

### Dashboard View
1. Top stats cards (4 columns)
2. Action shortcuts (2-3 prominent buttons)
3. Recent estimates table
4. Quick access to templates

### Estimate List View
1. Search and filters bar (top)
2. Sort options
3. Table with estimates (paginated)
4. Bulk actions toolbar (when items selected)

### Estimate Editor View
1. Top bar: Breadcrumb, Project name, Save/Download actions
2. Left sidebar: Sheet navigator (collapsible)
3. Main area: Tab interface for parts
4. Content: Excel-like table with toolbar
5. Right panel (optional, collapsible): Properties, calculations, validation errors

### SSR Database View
1. Search bar (prominent, top)
2. Left: Category tree navigation (w-64)
3. Right: Results grid or table
4. Filters: Rate range, unit type

---

## Responsive Behavior

**Desktop (lg: 1024px+):**
- Full multi-column layouts
- Sidebar always visible
- Tables show all columns

**Tablet (md: 768px - 1023px):**
- Collapsible sidebar with toggle button
- Dashboard: 2-column card grid
- Tables: Horizontal scroll for wide data

**Mobile (< 768px):**
- Single column layouts
- Hamburger menu for navigation
- Cards stack vertically
- Tables: Consider card-based view alternative
- Bottom tab bar for main sections

---

## Animations

**Minimal, Purposeful Animations:**
- Modal enter/exit: Fade + scale (150ms)
- Dropdown menus: Slide down (100ms)
- Toast notifications: Slide in from right (200ms)
- Tab switching: Instant (no animation)
- Avoid: Page transitions, unnecessary hover effects on data tables

---

## Accessibility

- All interactive elements: Focus visible ring
- Table navigation: Arrow key support
- Screen reader labels for icon-only buttons
- Sufficient contrast for all text on backgrounds
- Skip links for keyboard navigation
- ARIA labels for complex table structures

---

## Images

**No hero images.** This is a utility application focused on data and functionality.

**Icon Usage:**
- Heroicons (via CDN) for UI elements
- System icons: Document, Table, Calculator, Download, Upload, Plus, Trash, Edit, Search, Filter, Settings
- Size: w-5 h-5 for inline, w-6 h-6 for standalone buttons