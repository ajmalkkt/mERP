---
name: erp-ui-guidelines
description: >
  ERP UI design guidelines — layout structure, screen patterns, dashboard design,
  admin capabilities, and UX expectations. Use this skill when building any ERP
  front-end screen to ensure enterprise-grade user experience.
---

# ERP UI Design Guidelines

This skill defines the **UI philosophy, layout patterns, and UX standards**
for the ERP platform. Every screen, component, and interaction must follow
these guidelines to deliver a rich, thick-client-feeling enterprise experience.

## Technology Stack

| Layer             | Technology                                     |
| ----------------- | ---------------------------------------------- |
| Framework         | **React 18+ with TypeScript**                  |
| Build tool        | **Vite**                                       |
| Styling           | **TailwindCSS**                                |
| Component library | **ShadCN UI**                                  |
| Data grid         | **TanStack Table**                             |
| Forms             | **React Hook Form** + Zod                      |
| Server state      | **React Query (TanStack Query)**               |
| Client state      | **Zustand**                                    |

---

## 1. UI Philosophy

The ERP UI must feel like a **modern thick-client application** — not a
minimal consumer web app.

| Principle               | What It Means                                               |
| ----------------------- | ----------------------------------------------------------- |
| **Rich dashboard**      | Surfaces key metrics immediately on login                   |
| **Thick-client feel**   | Dense, information-rich layouts — no wasted whitespace      |
| **Fast navigation**     | Module switching, workspace tabs, context panels            |
| **Keyboard-friendly**   | Every action reachable via keyboard shortcuts               |
| **Data dense but clean**| Show maximum relevant data without visual clutter           |

### Anti-Patterns to Avoid

- ❌ Minimal consumer-style landing pages
- ❌ Large hero sections with no data
- ❌ Excessive whitespace / card-only layouts
- ❌ Mobile-first responsive-only design (desktop is the primary target)
- ❌ Multi-page wizards for simple data entry
- ❌ Custom CSS files — use TailwindCSS utility classes only

---

## 2. Application Layout

The application shell provides the fixed frame for all screens:

```
┌─────────────────────────────────────────────────────────────┐
│                     Top Toolbar                              │
│  [Company Selector] [Branch] [Search] [Notifications] [User]│
├────────┬────────────────────────────────────────────────────┤
│        │  Workspace Tabs                                     │
│  Left  │  ┌──────┬──────┬──────┐                            │
│  Nav   │  │ Tab1 │ Tab2 │ Tab3 │                            │
│        │  └──────┴──────┴──────┘                            │
│ Module │  ┌──────────────────────────────────────────┐      │
│  Menu  │  │                                          │      │
│        │  │           Main Grid / Content Area       │      │
│ [Org]  │  │                                          │      │
│ [Sales]│  │                                          │      │
│ [Purch]│  │                                          │      │
│ [Inv]  │  │                                          │      │
│ [Acct] │  └──────────────────────────────────────────┘      │
│ [Prod] │                                                     │
│ [Rpt]  │                   Context Panel (slide-out) ──────►│
│ [Cfg]  │                                                     │
└────────┴────────────────────────────────────────────────────┘
```

### ShadCN Layout Components

| Component            | ShadCN / Implementation                                     |
| -------------------- | ----------------------------------------------------------- |
| **Left Navigation**  | Custom sidebar with ShadCN `Button`, icons, `Tooltip`       |
| **Top Toolbar**      | ShadCN `Select` (company/branch), `Input` (search), `DropdownMenu` (user) |
| **Workspace Tabs**   | ShadCN `Tabs` — closable, draggable, max 10 open            |
| **Main Grid Area**   | TanStack Table in a flex container                          |
| **Context Panel**    | ShadCN `Sheet` (slide-out right drawer)                     |

### Project Structure

```
src/
├── app/
│   ├── layout/                     # Shell, sidebar, toolbar, tabs
│   └── routing/                    # Route definitions, lazy loading
│
├── erp-core/                       # ⭐ ERP ENGINE — shared across modules
│   ├── layout/
│   │   ├── AppShell.tsx
│   │   ├── SideNav.tsx
│   │   ├── TopToolbar.tsx
│   │   └── WorkspaceTabs.tsx
│   ├── grid/                       # ERPGrid — TanStack Table wrapper
│   ├── forms/                      # DynamicForm, DynamicField, useFormSchema
│   ├── voucher/                    # VoucherEditor modules
│   ├── metadata/                   # useFieldConfig, useTag, useVoucherConfig
│   └── services/                   # apiClient, crudService, types
│
├── modules/
│   ├── masters/                    # Item, Account, Warehouse, etc.
│   ├── sales/                      # Sales Invoice, Quotation, etc.
│   ├── purchase/                   # Purchase Invoice, PO, etc.
│   ├── inventory/                  # Stock Transfer, Adjustment, etc.
│   └── accounts/                   # Journal, Payment, Receipt, etc.
│
└── shared/
    ├── components/ui/              # ShadCN component library
    ├── hooks/                      # useDebounce, useKeyboard, etc.
    ├── utils/                      # Formatters, validators
    └── types/                      # Global TypeScript types
```

---

## 3. Required Screen Patterns

### 3.1 Master Screens

Grid + Form layout for managing reference data. See **`erp-master-screen`** skill for full details.

**Must include:**

| Element                | Implementation                                  |
| ---------------------- | ----------------------------------------------- |
| Data grid              | TanStack Table with column resize, grouping     |
| Column filtering       | Per-column filter inputs                        |
| Saved views            | Persist column config to API (per user)         |
| Form panel             | ShadCN `Sheet` drawer with `DynamicForm`        |
| Bulk actions           | Multi-select → delete, export, status change    |
| Global search          | ShadCN `Input` with debounce                    |
| Keyboard navigation    | Arrow keys, Enter, Tab through grid cells       |
| Tag-mapped labels      | All labels via `useTag()` — no hardcoding       |

**Admin adds field → grid auto-updates. NO redeployment.**

### 3.2 Voucher Screens (ERP Heart)

**Voucher ≠ Form. Voucher = Transaction Engine UI.**

The voucher editor is the most critical UI component. It is NOT a simple form — it is a multi-panel transaction engine.

```
┌─ Header Section ──────────────────────────────────────┐
│  Voucher No  │  Date  │  Party  │  Reference  │ Status│
└───────────────────────────────────────────────────────┘
┌─ Line Item Grid ──────────────────────────────────────┐
│  # │ Product │ Qty │ Rate │ Discount │ Tax │ Amount  │
│  1 │ ...     │     │      │          │     │         │
│  2 │ ...     │     │      │          │     │         │
│  + Add Line                                            │
└───────────────────────────────────────────────────────┘
┌─ Totals Panel ─────────────────┬─ Ledger Preview ─────┐
│  Subtotal:    ₹8,475           │  Dr  Receivable 10K  │
│  Tax (GST):   ₹1,525          │  Cr  Sales      8.5K │
│  Round Off:   ₹0              │  Cr  GST        1.5K │
│  Grand Total: ₹10,000         │                       │
└────────────────────────────────┴───────────────────────┘
```

#### VoucherEditor Component Modules

| Module              | File                        | Purpose                                     |
| ------------------- | --------------------------- | ------------------------------------------- |
| **HeaderForm**      | `erp-core/voucher/HeaderForm.tsx` | Master header fields (party, date, branch)  |
| **LineGrid**        | `erp-core/voucher/LineGrid.tsx`   | Editable product grid (TanStack Table)      |
| **TotalsEngine**    | `erp-core/voucher/TotalsEngine.tsx` | Auto-calculated totals (subtotal, tax, discount, net) |
| **LedgerPreview**   | `erp-core/voucher/LedgerPreview.tsx` | Real-time Dr/Cr accounting preview        |
| **DynamicFieldsPanel** | `erp-core/voucher/DynamicFieldsPanel.tsx` | Custom fields injected by metadata engine |

#### Voucher Screen Requirements

| Feature                 | Implementation                                     |
| ----------------------- | -------------------------------------------------- |
| Header section          | React Hook Form, ShadCN inputs, party lookup       |
| Line item grid          | TanStack Table, editable cells, add/remove rows    |
| Totals panel            | Zustand store, reactive calculations               |
| Ledger preview          | Real-time Dr/Cr entries computed from lines         |
| Dynamic custom fields   | Auto-injected from backend metadata, no redeploy   |
| Print / PDF             | Generate printable voucher document                |
| Workflow actions        | ShadCN `Button` group: Submit, Approve, Reject, Cancel |
| Keyboard shortcuts      | Tab between cells, Enter to save line, Ctrl+S save  |

#### Dynamic Fields Injection

Backend returns custom fields per voucher type:

```json
{
  "customFields": [
    { "name": "VehicleNo", "type": "text" },
    { "name": "DeliverySlot", "type": "select", "options": ["Morning", "Afternoon", "Evening"] }
  ]
}
```

The `DynamicFieldsPanel` automatically renders these fields. When admin adds a
new field, the UI updates immediately — **no redeployment**.

### 3.3 Dashboard Screens

Data-rich landing screens showing operational KPIs.

**Required widgets:**

| Widget                | Type           | Description                        |
| --------------------- | -------------- | ---------------------------------- |
| Sales Today           | KPI card       | Total sales amount, invoice count  |
| Receivables Aging     | Chart + table  | Outstanding by age bucket          |
| Stock Alerts          | Alert list     | Items below reorder level          |
| Production Status     | Status cards   | Orders in progress, completed      |
| Cash Position         | KPI card       | Bank balances, cash in hand        |
| Payables              | Chart + table  | Outstanding to vendors             |
| Recent Transactions   | Table          | Last 10 vouchers                   |
| Quick Actions         | Button group   | New Invoice, Payment, Transfer     |

**Dashboard design rules:**

- Card-based widget layout with drag-to-rearrange
- Charts: bar, line, donut — no 3D
- KPI cards: large number + trend indicator (↑↓) + sparkline
- All widgets filterable by date range and branch
- Each widget loads independently (parallel React Query)

---

## 4. Tag Mapping System

Labels in the UI are **never hardcoded**. Companies can rename any entity:

| System Name    | Company A Label | Company B Label |
| -------------- | --------------- | --------------- |
| `warehouse`    | Stock Point     | Warehouse       |
| `department`   | Division        | Department      |
| `item`         | Product         | Material        |

### Tag API

```
GET /api/system/tags?companyId=comp_001
→ { "warehouse": "Stock Point", "department": "Division", "item": "Product" }
```

### useTag Hook

```tsx
// erp-core/metadata/useTag.ts
import { useMetadataStore } from './metadataStore';

export function useTag(systemName: string): string {
  const tags = useMetadataStore(state => state.tags);
  return tags[systemName] ?? systemName;
}
```

### Usage Rules

- **All** grid column headers → `useTag(fieldName)`
- **All** form field labels → `useTag(fieldName)`
- **All** sidebar nav items → `useTag(moduleName)`
- **All** breadcrumbs → `useTag(entityName)`
- **All** page titles → `useTag(entityName) + ' Master'`

---

## 5. Admin / Super User Capabilities

The admin UI provides configuration screens accessible only to admin-role users.

| Capability                   | Screen / Feature                                     |
| ---------------------------- | ---------------------------------------------------- |
| **Create fields**            | Dynamic field builder — add fields to any entity     |
| **Configure voucher types**  | Define header/line fields, numbering, workflow        |
| **Rename tags**              | Change entity display labels per company             |
| **Workflow rules**           | Define approval chains, auto-actions                 |
| **Approval chains**          | Set multi-level approvers per voucher type           |
| **Manage numbering**         | Auto-number patterns per voucher type, per branch    |
| **User management**          | Create users, assign roles, set defaults             |
| **Field visibility**         | Show/hide fields per company                         |
| **Import / Export**          | Bulk CSV/Excel import with mapping and validation    |

### Admin Config UI Components

```
AdminPanel (ShadCN Tabs)
├── Field Manager
│   ├── Entity selector (dropdown)
│   ├── Field list (drag-to-reorder, ShadCN sortable)
│   ├── Add Field dialog
│   └── Edit Field dialog (type, label, required, options)
│
├── Voucher Config
│   ├── Voucher type dropdown
│   ├── Header fields config
│   ├── Line fields config
│   ├── Numbering pattern editor
│   └── Workflow stages editor
│
├── Tag Manager
│   ├── System name → Custom label mapping table
│   └── Save per company
│
└── Workflow Builder
    ├── Stage list (Submit → Review → Approve)
    ├── Approver assignment per stage
    └── Auto-action rules (e.g., auto-approve below threshold)
```

---

## 6. UX Expectations

### Instant Feedback

| Interaction          | Response Time    | Feedback Type              |
| -------------------- | ---------------- | -------------------------- |
| Button click         | < 100ms          | Visual press state (ShadCN)|
| Form save            | < 300ms perceived| Optimistic update + toast  |
| Grid load            | < 500ms          | Skeleton loader            |
| Search               | < 300ms debounced| Inline results             |

### Lazy Loading

- Grid data: paginate with TanStack Table
- Form panel: mount ShadCN `Sheet` only when opened
- Dashboard widgets: load independently (parallel React Query)
- Module screens: Vite code-split per route (`React.lazy`)

### Keyboard Shortcuts

| Shortcut       | Action                    |
| -------------- | ------------------------- |
| `Ctrl+N`       | New record                |
| `Ctrl+S`       | Save form                 |
| `Ctrl+F`       | Focus search bar          |
| `Escape`       | Close panel / modal       |
| `Enter`        | Submit form / confirm     |
| `Tab`          | Next field / next cell    |
| `Ctrl+Delete`  | Delete selected record    |
| `Alt+1..9`     | Switch workspace tab      |
| `↑↓←→`        | Navigate grid cells       |

### Modal Editing

- Use ShadCN `Sheet` (slide-out drawer) for form editing
- Use ShadCN `AlertDialog` for confirmations
- Use ShadCN `Dialog` for quick actions
- **Never** navigate away from the grid to edit a record

### Inline Validation

- Validate on blur (React Hook Form `mode: 'onBlur'`)
- Show error via ShadCN form error styling
- Red border + error message below field
- Disable save button while critical errors exist

---

## 7. Visual Design Tokens (TailwindCSS)

Use TailwindCSS classes and these custom tokens in `tailwind.config.ts`:

### Color Palette (via ShadCN theme)

```ts
// tailwind.config.ts — extend theme colors via CSS variables
colors: {
  primary:    'hsl(var(--primary))',
  secondary:  'hsl(var(--secondary))',
  destructive:'hsl(var(--destructive))',
  muted:      'hsl(var(--muted))',
  accent:     'hsl(var(--accent))',
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
}
```

### Typography (Inter font via Google Fonts)

| Element    | TailwindCSS Class             |
| ---------- | ----------------------------- |
| H1         | `text-2xl font-semibold`      |
| H2         | `text-xl font-semibold`       |
| H3         | `text-base font-semibold`     |
| Body       | `text-sm`                     |
| Caption    | `text-xs text-muted-foreground` |
| Grid cells | `text-[13px]`                 |

### Spacing

Use Tailwind's default 4px-based scale: `p-1` (4px) → `p-2` (8px) → `p-3` (12px) → `p-4` (16px) → `p-6` (24px) → `p-8` (32px).
