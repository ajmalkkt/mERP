# Field Metadata JSON Schema

This document defines the JSON schema for field configuration objects used
by ERP master screens. Each field in a master entity is described by one
object in the configuration array.

---

## Top-Level Structure

The field configuration is a **JSON array** of field objects:

```json
[
  { /* field 1 */ },
  { /* field 2 */ },
  ...
]
```

---

## Field Object Schema

### Required Properties

| Property       | Type     | Description                                          |
| -------------- | -------- | ---------------------------------------------------- |
| `fieldName`    | string   | Unique identifier matching the database column / API property. camelCase. |
| `label`        | string   | Human-readable display label.                        |
| `type`         | string   | One of the types defined in `field-types.md`.        |

### Grid Properties

| Property       | Type     | Default  | Description                                  |
| -------------- | -------- | -------- | -------------------------------------------- |
| `gridVisible`  | boolean  | `true`   | Show this column in the data grid.           |
| `gridOrder`    | number   | `99`     | Column display order (lower = leftmost).     |
| `gridWidth`    | number   | `150`    | Column width in pixels.                      |
| `sortable`     | boolean  | `true`   | Allow sorting by this column.                |
| `searchable`   | boolean  | `false`  | Include in quick-filter / global search.     |

### Form Properties

| Property       | Type     | Default     | Description                                 |
| -------------- | -------- | ----------- | ------------------------------------------- |
| `formVisible`  | boolean  | `true`      | Show this field in the form.                |
| `formOrder`    | number   | `99`        | Field display order within its section.     |
| `formSection`  | string   | `"General"` | Section/tab name to group this field into.  |
| `required`     | boolean  | `false`     | Is this field mandatory?                    |
| `readOnly`     | boolean  | `false`     | Is this field non-editable?                 |
| `defaultValue` | any      | —           | Pre-populated value for new records.        |
| `placeholder`  | string   | —           | Hint text inside the input.                 |

### Validation Properties

| Property         | Type     | Applies To          | Description                         |
| ---------------- | -------- | ------------------- | ----------------------------------- |
| `required`       | boolean  | All                 | Field must have a value.            |
| `minLength`      | number   | text, textarea      | Minimum string length.              |
| `maxLength`      | number   | text, textarea, email | Maximum string length.            |
| `min`            | number   | number, currency, % | Minimum numeric value.              |
| `max`            | number   | number, currency, % | Maximum numeric value.              |
| `pattern`        | string   | text, phone         | Regex validation pattern.           |
| `patternMessage` | string   | text, phone         | Custom error message for pattern.   |
| `unique`         | boolean  | text                | Server-side uniqueness constraint.  |

### Type-Specific Properties

| Property           | Type     | Applies To       | Description                           |
| ------------------ | -------- | ---------------- | ------------------------------------- |
| `options`          | array    | dropdown, multiSelect | Static `[{ value, label }]` list. |
| `lookupConfig`     | object   | lookup, multiSelect  | Dynamic option source (see below). |
| `decimalPlaces`    | number   | number, currency, %  | Decimal precision.                |
| `currencyCode`     | string   | currency             | ISO 4217 code.                    |
| `step`             | number   | number               | Increment step.                   |
| `countryCode`      | string   | phone                | Default dial code.                |
| `minDate`          | string   | date, datetime       | Earliest date (ISO 8601).         |
| `maxDate`          | string   | date, datetime       | Latest date (ISO 8601).           |
| `format`           | string   | date, datetime       | Display format string.            |
| `trueLabel`        | string   | boolean              | Label when value is true.         |
| `falseLabel`       | string   | boolean              | Label when value is false.        |
| `maxFileSizeMB`    | number   | image, file          | Max upload size.                  |
| `acceptedFormats`  | array    | image, file          | Allowed file extensions.          |
| `multiple`         | boolean  | file                 | Allow multiple uploads.           |
| `maxSelections`    | number   | multiSelect          | Maximum selectable items.         |
| `computeFormula`   | string   | computed             | JS expression for derived value.  |
| `displayType`      | string   | computed             | Render format for result.         |
| `rows`             | number   | textarea             | Visible text rows.                |

---

## `lookupConfig` Schema

Used by `lookup` and `multiSelect` fields to fetch options from an API.

```json
{
  "endpoint": "/api/masters/warehouse",
  "valueField": "id",
  "labelField": "warehouseName",
  "filterByCompany": true,
  "filterByBranch": false,
  "dependsOn": "region"
}
```

| Property           | Type     | Required | Description                                  |
| ------------------ | -------- | -------- | -------------------------------------------- |
| `endpoint`         | string   | ✅       | API URL to fetch options.                    |
| `valueField`       | string   | ✅       | Response property to use as `value`.         |
| `labelField`       | string   | ✅       | Response property to display as `label`.     |
| `filterByCompany`  | boolean  | ❌       | Auto-filter by the current `companyId`.      |
| `filterByBranch`   | boolean  | ❌       | Auto-filter by the current `branchId`.       |
| `dependsOn`        | string   | ❌       | Another field whose value is sent as a filter. |

---

## `visibilityRule` Schema

Controls conditional field visibility based on the value of another field.

```json
{
  "dependsOn": "itemGroup",
  "operator": "neq",
  "value": "service"
}
```

| Property     | Type          | Required | Description                                |
| ------------ | ------------- | -------- | ------------------------------------------ |
| `dependsOn`  | string        | ✅       | Field name to observe.                     |
| `operator`   | string        | ✅       | Comparison: `eq`, `neq`, `in`, `gt`, `lt`. |
| `value`      | any \| array  | ✅       | Value(s) to compare against.               |

**Operator reference:**

| Operator | Meaning            | Value Type |
| -------- | ------------------ | ---------- |
| `eq`     | Equals             | any        |
| `neq`    | Not equals         | any        |
| `in`     | Included in list   | array      |
| `gt`     | Greater than       | number     |
| `lt`     | Less than          | number     |

---

## Reserved Form Sections

| Section Name | Purpose                                          |
| ------------ | ------------------------------------------------ |
| `_audit`     | Audit fields (`createdAt`, `modifiedBy`, etc.). Always rendered last, read-only. |
| `_system`    | System fields hidden from regular users. Visible only to admins. |

All other section names are user-defined and rendered as collapsible groups
in the order they first appear in the field array.

---

## Complete Example

```json
{
  "fieldName": "defaultWarehouse",
  "label": "Default Warehouse",
  "type": "lookup",
  "required": false,
  "gridVisible": false,
  "gridOrder": 22,
  "formVisible": true,
  "formOrder": 11,
  "formSection": "Inventory",
  "lookupConfig": {
    "endpoint": "/api/masters/warehouse",
    "valueField": "id",
    "labelField": "warehouseName",
    "filterByCompany": true,
    "filterByBranch": true
  },
  "visibilityRule": {
    "dependsOn": "itemGroup",
    "operator": "neq",
    "value": "service"
  }
}
```

This field:
1. Uses the `lookup` type → options loaded from `/api/masters/warehouse`
2. Is **not shown** in the grid (`gridVisible: false`)
3. Appears in the **Inventory** form section at position 11
4. Is **only visible** when `itemGroup ≠ "service"`
5. Filters warehouse options by the current company **and** branch
