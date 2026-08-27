---
name: Industrial Integrity
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#444651'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#757682'
  outline-variant: '#c5c5d3'
  surface-tint: '#4059aa'
  primary: '#00236f'
  on-primary: '#ffffff'
  primary-container: '#1e3a8a'
  on-primary-container: '#90a8ff'
  inverse-primary: '#b6c4ff'
  secondary: '#9d4300'
  on-secondary: '#ffffff'
  secondary-container: '#fd761a'
  on-secondary-container: '#5c2400'
  tertiary: '#4b1c00'
  on-tertiary: '#ffffff'
  tertiary-container: '#6e2c00'
  on-tertiary-container: '#f39461'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b6c4ff'
  on-primary-fixed: '#00164e'
  on-primary-fixed-variant: '#264191'
  secondary-fixed: '#ffdbca'
  secondary-fixed-dim: '#ffb690'
  on-secondary-fixed: '#341100'
  on-secondary-fixed-variant: '#783200'
  tertiary-fixed: '#ffdbcb'
  tertiary-fixed-dim: '#ffb691'
  on-tertiary-fixed: '#341100'
  on-tertiary-fixed-variant: '#773205'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.02em
  h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  h3:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  table-data:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 1.5rem
  gutter: 1rem
  table-row-height: 32px
  stack-gap-xs: 0.25rem
  stack-gap-sm: 0.5rem
  stack-gap-md: 1rem
---

## Brand & Style

This design system is built for the high-utility environment of Peruvian hardware stores (*ferreterías*). The brand personality is rooted in reliability, endurance, and technical precision. It prioritizes the rapid processing of inventory and sales data over decorative flair.

The chosen style is **Corporate / Modern** with a lean toward **High-Contrast Functionalism**. It utilizes a structured framework that feels institutional and secure, ensuring that users—from warehouse staff to store owners—can navigate dense product catalogs and financial reports without visual fatigue. The aesthetic is "Industrial Professional," mimicking the organized efficiency of a well-kept workshop.

## Colors

The palette leverages **Deep Blue (#1E3A8A)** as the primary anchor to establish professional trust and stability. **Industrial Orange (#F97316)** serves as the high-visibility action color, reserved strictly for primary buttons, alerts, and critical status updates, mirroring the safety colors found in hardware environments.

Neutral Grays are used to create a tiered information hierarchy. The interface utilizes a cool-toned slate gray for secondary text and borders to maintain a "clean" feel even when the screen is densely packed with data. High contrast ratios (meeting WCAG AA standards) are maintained throughout to ensure legibility on the varied monitor qualities found in retail settings.

## Typography

The typography system relies exclusively on **Inter** to maximize legibility on standard-definition monitors. The scale is intentionally compact; since hardware store management requires viewing large inventories and long invoices, the base font size is set to 14px, with a 13px variant for dense data tables.

Weight is used strategically to differentiate "Static Labels" from "Dynamic Data." Data points in tables and forms use a Medium (500) weight to stand out against UI labels. Large headings are kept restrained in size to preserve vertical screen real estate.

## Layout & Spacing

The design system employs a **Fluid Grid** with a strict 4px baseline rhythm. To accommodate the "heavy data" requirement, the layout uses a **Compact Spacing Model**. Padding inside table cells and list items is minimized to ensure more rows are visible "above the fold."

Layouts should prioritize a top-down hierarchy: a slim sidebar for navigation, a utility-heavy header for global search (SKU/Product search), and a wide central stage for data grids. Use horizontal density for form fields to allow for side-by-side inputs (e.g., Quantity next to Unit Price).

## Elevation & Depth

To maintain a fast-loading, clean appearance, the system uses **Low-Contrast Outlines** and **Tonal Layers** instead of heavy shadows. 

- **Level 0 (Canvas):** The base background uses a very light gray (#F8FAFC) to define the workspace.
- **Level 1 (Cards/Surface):** White surfaces with a 1px solid border (#E2E8F0) house the main content.
- **Level 2 (Interactive):** Subtle, tight shadows are only used on hovering interactive elements or modal windows to indicate temporary focus.
- **Level 3 (Pop-overs):** Used for tooltips or dropdown menus, featuring a slightly more pronounced border and a 10% opacity shadow.

## Shapes

The shape language is **Soft (0.25rem)**. This slight rounding provides a modern feel without the "playfulness" of more consumer-oriented apps. The conservative radius ensures that UI elements feel efficient and structured, aligning with the industrial nature of the hardware sector. 

Buttons, input fields, and containers all share this consistent 4px radius. Larger containers, such as dashboard cards, may use a "rounded-lg" (8px) radius to distinguish them from smaller UI components.

## Components

### Buttons
- **Primary:** Industrial Orange background with white text. Used for "Complete Sale," "Add Item," or "Print Invoice."
- **Secondary:** White background with Deep Blue border and text. Used for "Cancel" or "Edit."
- **Ghost:** No background or border. Used for tertiary actions within tables.

### Input Fields
- Fields must have visible labels and clear placeholder text (e.g., "Search SKU..."). 
- Focus state: A 2px Deep Blue ring to ensure clear keyboard navigation.

### Data Tables
- The core of the system. Use alternating row colors (Zebra striping) for readability.
- Row height is capped at 32px to maximize data density.
- Numeric columns (Price, Stock) must be right-aligned.

### Status Chips
- Small, high-contrast badges used to indicate "In Stock" (Green), "Low Stock" (Orange), or "Out of Stock" (Red).

### POS Quick-Bar
- A unique component for this system: a sticky bottom bar or side panel that totals current items in a sale, featuring a large "Total" display and a primary Orange button for "Finalize Payment."