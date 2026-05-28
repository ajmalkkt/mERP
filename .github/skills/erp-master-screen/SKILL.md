---
name: erp-master-screen
description: >
  Generate a React ERP master screen following project instructions.
  Must support grid + form layout, dynamic fields, and admin configuration.
---

# ERP Master Screen — Skill Instructions

## Overview

This skill generates **metadata-driven React (TypeScript) master screens** for a
modern ERP platform. Every master screen follows a consistent pattern: a data
grid for browsing/searching records plus a form panel for creating and editing
records. All field definitions, visibility rules, and validation logic are
driven by **JSON metadata** — never hardcoded.

### Technology Stack

| Layer             | Technology                                     |
| ----------------- | ---------------------------------------------- |
| Framework         | **React 18+ with TypeScript**                  |
| Build tool        | **Vite**                                       |
| Styling           | **TailwindCSS**                                |
| Component library | **ShadCN UI**                                  |
| Data grid         | **TanStack Table** (column resize, grouping, filters, keyboard nav) |
| Forms             | **React Hook Form** + Zod validation           |
| Server state      | **React Query (TanStack Query)**               |
| Client state      | **Zustand**                                    |

### ERP Philosophy

Every record in the system belongs to:

| Scope            | Description                                       |
| ---------------- | ------------------------------------------------- |
| **Company**      | Top-level tenant isolation                        |
| **Branch**       | Physical or logical location within a company     |
| **Department**   | Functional grouping (Sales, Purchase, Accounts)   |
| **User**         | The actor creating / modifying the record         |
| **Voucher Type** | Transaction classification (for transactional screens) |

All modules integrate through:
- **Ledger entries** — financial impact
- **Inventory movements** — stock impact
- **Transaction engine** — workflow orchestration
- **Metadata engine** — dynamic fields, tag mapping, UI configuration

---

## Project Directory Structure

All code lives under `src/` with this layout:

```
src/
├── app/
│   ├── layout/                     # Shell, sidebar, toolbar, tabs
│   └── routing/                    # Route definitions, lazy loading
│
├── erp-core/                       # ⭐ ERP ENGINE — shared across all modules
│   ├── layout/
│   │   ├── AppShell.tsx            # Main application frame
│   │   ├── SideNav.tsx             # Module navigation
│   │   ├── TopToolbar.tsx          # Company/branch selector, search, user
│   │   └── WorkspaceTabs.tsx       # Multi-tab workspace manager
│   ├── grid/
│   │   ├── ERPGrid.tsx             # Core TanStack Table wrapper
│   │   ├── useGridLayout.ts        # Saved layout persistence hook
│   │   ├── gridColumns.ts          # Metadata → column definition generator
│   │   └── gridKeyboardNav.ts      # Keyboard navigation handler
│   ├── forms/
│   │   ├── DynamicField.tsx        # Field type switcher component
│   │   ├── DynamicForm.tsx         # Full form rendered from metadata
│   │   ├── useFormSchema.ts        # Metadata → Zod schema generator
│   │   └── fieldRegistry.ts       # Field type → component mapping
│   ├── voucher/
│   │   ├── VoucherEditor.tsx       # Top-level voucher container
│   │   ├── HeaderForm.tsx          # Voucher header fields
│   │   ├── LineGrid.tsx            # Line item editable grid
│   │   ├── TotalsEngine.tsx        # Auto-calculated totals panel
│   │   ├── LedgerPreview.tsx       # Real-time accounting preview
│   │   └── DynamicFieldsPanel.tsx  # Custom fields injected by metadata
│   ├── metadata/
│   │   ├── useFieldConfig.ts       # Fetch field metadata for an entity
│   │   ├── useTag.ts               # Tag mapping hook (dynamic label renaming)
│   │   ├── useVoucherConfig.ts     # Fetch voucher type configuration
│   │   └── metadataStore.ts        # Zustand store for cached metadata
│   └── services/
│       ├── apiClient.ts            # Axios/fetch wrapper with auth + tenant headers
│       ├── crudService.ts          # Generic CRUD factory
│       └── types.ts                # Shared TypeScript interfaces
│
├── modules/
│   ├── masters/
│   │   ├── item/
│   │   │   ├── ItemMaster.tsx
│   │   │   ├── itemService.ts
│   │   │   └── itemFieldConfig.json
│   │   ├── account/
│   │   ├── warehouse/
│   │   └── ...
│   ├── sales/
│   ├── purchase/
│   ├── inventory/
│   └── accounts/
│
└── shared/
    ├── components/                 # Reusable UI (Badge, Card, Dialog, etc.)
    ├── hooks/                      # Generic hooks (useDebounce, useKeyboard)
    ├── utils/                      # Formatters, validators
    └── types/                      # Global TypeScript types
```

---

## Step-by-Step Generation Guide

### Step 1 — Identify the Master Entity

Ask or infer:

1. **Entity name** (e.g., `Item`, `Customer`, `Ledger`, `Warehouse`)
2. **Module** it belongs to (e.g., Masters Management, Inventory)
3. **Multi-company scoping** — does it need Company, Branch, Department columns?
4. **Parent–child** — flat master or hierarchical (e.g., Item → Item Variants)?

### Step 2 — Define the Field Metadata

Create a field configuration JSON array. Each entry describes one field.
Refer to `resources/field-types.md` for the full catalog and
`resources/metadata-schema.md` for the JSON schema.

**Minimum field definition:**

```json
{
  "fieldName": "itemName",
  "label": "Item Name",
  "type": "text",
  "required": true,
  "gridVisible": true,
  "gridOrder": 2,
  "formOrder": 1,
  "formSection": "basic",
  "maxLength": 200,
  "searchable": true,
  "sortable": true
}
```

**Dynamic fields from backend** are merged into this array at runtime:

```json
{
  "customFields": [
    { "name": "VehicleNo", "type": "text" },
    { "name": "DeliverySlot", "type": "select", "options": ["Morning","Evening"] }
  ]
}
```

The UI **automatically injects** these fields — **no redeployment** required.

### Step 3 — Scaffold the Component Files

```
src/modules/<module>/masters/<EntityName>/
├── <EntityName>Master.tsx        # Container — orchestrates grid + form
├── <entityName>Service.ts        # API layer (typed, uses crudService factory)
├── <entityName>FieldConfig.json  # Default field metadata (overridable via API)
└── <entityName>Types.ts          # TypeScript interfaces for this entity
```

The master screen **reuses** shared components from `erp-core/`:

- `ERPGrid` from `erp-core/grid/`
- `DynamicForm` from `erp-core/forms/`
- `useFieldConfig` from `erp-core/metadata/`
- `useTag` from `erp-core/metadata/`

### Step 4 — Build the Master Screen Component

The top-level `<EntityName>Master.tsx` must:

1. **Fetch field metadata** — `useFieldConfig(entityName, companyId)`.
2. **Render the grid** — `<ERPGrid>` with columns generated from metadata.
3. **Render the form panel** — `<DynamicForm>` in a ShadCN `<Sheet>` drawer.
4. **Wire CRUD operations** — via the typed service + React Query mutations.
5. **Support admin config** — toggle `<AdminConfigPanel>` for field management.
6. **Apply tag mapping** — `useTag('warehouse')` returns the company-specific label.
7. **Scope by tenant** — all API calls include `companyId`, `branchId`.

### Step 5 — Implement the ERP Grid

The grid **MUST** use TanStack Table wrapped in the `ERPGrid` component from
`erp-core/grid/`. This is the most important UI component in the system.

**Required features:**

| Feature                | Implementation                                    |
| ---------------------- | ------------------------------------------------- |
| Column resize          | TanStack `columnResizeMode: 'onChange'`            |
| Saved layouts          | Persist column widths/order/visibility to Zustand + API |
| Column filters         | Per-column filter inputs (text, select, date range) |
| Grouping               | Drag column header to group bar                   |
| Keyboard navigation    | Arrow keys, Enter to edit, Tab between cells      |
| Server-side pagination | Page size selector (10, 25, 50, 100)              |
| Sorting                | Click headers, multi-column sort                  |
| Row selection          | Checkbox selection, single or multi               |
| Row actions            | Edit, Delete, View (icon buttons in action column)|
| Export                 | CSV / Excel export button                         |
| Responsive             | Horizontal scroll on small viewports              |

**Admin adds a field → grid auto-updates.** No redeployment.

Grid column definitions **generated dynamically** from metadata:

```tsx
import { ColumnDef } from '@tanstack/react-table';

function buildColumns<T>(fieldConfig: FieldMeta[]): ColumnDef<T>[] {
  return fieldConfig
    .filter(f => f.gridVisible)
    .sort((a, b) => a.gridOrder - b.gridOrder)
    .map(f => ({
      id: f.fieldName,
      accessorKey: f.fieldName,
      header: f.label,  // or useTag(f.fieldName) for tag-mapped labels
      enableSorting: f.sortable ?? true,
      enableColumnFilter: f.searchable ?? false,
      size: f.gridWidth ?? 150,
      cell: ({ getValue }) => renderCell(f.type, getValue(), f),
    }));
}
```

### Step 6 — Implement the Dynamic Form

Use `DynamicForm` from `erp-core/forms/` backed by React Hook Form + Zod.

**Requirements:**

| Feature              | Implementation                                    |
| -------------------- | ------------------------------------------------- |
| Dynamic rendering    | Fields rendered by `formOrder`, grouped by `formSection` |
| ShadCN components    | All inputs use ShadCN `<Input>`, `<Select>`, `<DatePicker>`, etc. |
| Validation           | Zod schema generated from metadata via `useFormSchema` |
| Dependent fields     | `visibilityRule` evaluated at runtime              |
| Lookup / dropdown    | Populated via API or static options from metadata  |
| Computed fields      | Read-only, derived from other fields               |
| Custom dynamic fields| Merged from backend `customFields` array           |
| Sections / tabs      | ShadCN `<Tabs>` or collapsible `<Collapsible>`     |
| Audit fields         | `createdBy`, `createdAt`, etc. — read-only, auto-populated |

**Dynamic field renderer (TypeScript):**

```tsx
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { DatePicker } from '@/shared/components/ui/date-picker';

interface DynamicFieldProps {
  field: FieldMeta;
  value: unknown;
  onChange: (val: unknown) => void;
  error?: string;
  readOnly?: boolean;
}

export function DynamicField({ field, value, onChange, error, readOnly }: DynamicFieldProps) {
  const label = useTag(field.fieldName) ?? field.label;

  switch (field.type) {
    case 'text':        return <Input label={label} ... />;
    case 'number':      return <Input type="number" label={label} ... />;
    case 'dropdown':    return <Select label={label} options={field.options} ... />;
    case 'date':        return <DatePicker label={label} ... />;
    case 'boolean':     return <Checkbox label={label} ... />;
    case 'lookup':      return <LookupSelect label={label} config={field.lookupConfig} ... />;
    case 'multiSelect': return <MultiSelect label={label} ... />;
    case 'textarea':    return <Textarea label={label} ... />;
    case 'email':       return <Input type="email" label={label} ... />;
    case 'phone':       return <PhoneInput label={label} ... />;
    case 'currency':    return <CurrencyInput label={label} ... />;
    case 'percentage':  return <PercentInput label={label} ... />;
    case 'image':       return <ImageUpload label={label} ... />;
    case 'file':        return <FileUpload label={label} ... />;
    default:            return <Input label={label} ... />;
  }
}
```

### Step 7 — Tag Mapping System

Labels in the UI are **not hardcoded**. Companies can rename entities:

| System Name    | Company A Label | Company B Label |
| -------------- | --------------- | --------------- |
| `warehouse`    | Stock Point     | Warehouse       |
| `department`   | Division        | Department      |
| `item`         | Product         | Material        |

**Backend API:**

```
GET /api/system/tags?companyId=comp_001
→ { "warehouse": "Stock Point", "department": "Division", "item": "Product" }
```

**Frontend hook:**

```tsx
// erp-core/metadata/useTag.ts
import { useMetadataStore } from './metadataStore';

export function useTag(systemName: string): string {
  const tags = useMetadataStore(state => state.tags);
  return tags[systemName] ?? systemName;
}

// Usage in any component
const warehouseLabel = useTag('warehouse'); // → "Stock Point"
```

All grid headers, form labels, nav items, and breadcrumbs **must** use `useTag()`.

### Step 8 — Admin Configuration Panel

Accessible only to admin-role users. Allows:

1. **Reorder fields** — drag-and-drop `gridOrder` / `formOrder`
2. **Toggle visibility** — show/hide in grid or form
3. **Set required / optional** — mark fields as mandatory
4. **Create custom fields** — dynamic fields stored in metadata (no redeploy)
5. **Rename tags** — change entity labels per company
6. **Configure voucher types** — define header/line fields, numbering, workflow
7. **Save per-company config** — scoped to `companyId`

### Step 9 — Wire the Service Layer

Every master module uses a typed service built from the `crudService` factory:

```tsx
// erp-core/services/crudService.ts
export function createCrudService<T>(entityEndpoint: string) {
  return {
    list:   (params: ListParams) => apiClient.get<PagedResponse<T>>(entityEndpoint, { params }),
    getById:(id: string) => apiClient.get<T>(`${entityEndpoint}/${id}`),
    create: (data: Partial<T>) => apiClient.post<T>(entityEndpoint, data),
    update: (id: string, data: Partial<T>) => apiClient.put<T>(`${entityEndpoint}/${id}`, data),
    remove: (id: string) => apiClient.delete(`${entityEndpoint}/${id}`),
    bulk:   (data: BulkRequest<T>) => apiClient.post(`${entityEndpoint}/bulk`, data),
    export: (params: ExportParams) => apiClient.get(`${entityEndpoint}/export`, { params, responseType: 'blob' }),
  };
}

// modules/masters/item/itemService.ts
import { createCrudService } from '@/erp-core/services/crudService';
import { Item } from './itemTypes';

export const itemService = createCrudService<Item>('/api/masters/item');
```

**Field config endpoints:**

```
GET  /api/config/fields/{entity}?companyId=xxx     → field metadata array
PUT  /api/config/fields/{entity}                   → save admin field changes
GET  /api/system/tags?companyId=xxx                → tag mappings
PUT  /api/system/tags                              → save tag changes
```

---

## Component Hierarchy Diagram

```
MasterScreen
├── Toolbar
│   ├── SearchBar (global search)
│   ├── FilterChips (active filters, ShadCN Badge)
│   ├── AddButton (ShadCN Button, opens form)
│   ├── ExportButton (CSV / Excel)
│   └── AdminConfigToggle (gear icon, admin only)
│
├── ERPGrid (TanStack Table)
│   ├── Column headers (generated from metadata + useTag)
│   ├── Column resize handles
│   ├── Group bar (drag to group)
│   ├── Data rows (paginated, sortable, filterable)
│   ├── Row action buttons (Edit / Delete / View)
│   ├── Keyboard navigation handler
│   └── Pagination bar
│
├── ShadCN Sheet (slide-out drawer)
│   └── DynamicForm (React Hook Form)
│       ├── ShadCN Tabs (form sections)
│       │   └── DynamicField per field meta
│       ├── Custom fields (injected from backend)
│       ├── Save / Cancel (ShadCN Button)
│       └── Audit info footer
│
└── AdminConfigPanel (ShadCN Dialog, admin-only)
    ├── Field list (drag-to-reorder)
    ├── Visibility toggles
    ├── Custom field builder
    ├── Tag editor
    └── Save config button
```

---

## Checklist Before Completion

- [ ] Grid loads with TanStack Table — pagination, sort, filter, resize, grouping
- [ ] Keyboard navigation works (arrow keys, Enter, Tab)
- [ ] Saved layouts persist column config
- [ ] Form creates and updates via React Hook Form + Zod
- [ ] All UI labels use `useTag()` — no hardcoded labels
- [ ] Custom fields from backend are auto-injected (no redeploy)
- [ ] Admin config panel can reorder, toggle, and create fields
- [ ] All API calls include tenant scoping (`companyId`, `branchId`)
- [ ] ShadCN components used for all UI elements
- [ ] TailwindCSS used for all styling — no custom CSS files
- [ ] TypeScript — no `any` types, all interfaces defined
- [ ] Responsive layout works on desktop and tablet
