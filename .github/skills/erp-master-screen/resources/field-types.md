# Supported Field Types

This document catalogs all field types supported by the ERP master screen
field metadata system. The `type` property in each field config entry must
be one of the values listed below.

---

## Text Fields

### `text`

Standard single-line text input.

| Property       | Type     | Description                          |
| -------------- | -------- | ------------------------------------ |
| `maxLength`    | number   | Maximum character count              |
| `minLength`    | number   | Minimum character count              |
| `pattern`      | string   | Regex pattern for validation         |
| `patternMessage` | string | Custom error message for pattern fail |
| `placeholder`  | string   | Input placeholder text               |
| `unique`       | boolean  | Enforce uniqueness (server-side)     |

**Grid renderer:** Plain text.
**Form input:** `<input type="text" />`

---

### `textarea`

Multi-line text area.

| Property       | Type     | Description               |
| -------------- | -------- | ------------------------- |
| `maxLength`    | number   | Maximum character count   |
| `rows`         | number   | Visible text rows (default 3) |
| `placeholder`  | string   | Input placeholder text    |

**Grid renderer:** Truncated text with tooltip.
**Form input:** `<textarea />`

---

### `email`

Email address field with built-in email format validation.

| Property       | Type     | Description               |
| -------------- | -------- | ------------------------- |
| `maxLength`    | number   | Maximum character count   |
| `placeholder`  | string   | Input placeholder text    |

**Grid renderer:** Clickable `mailto:` link.
**Form input:** `<input type="email" />`

---

### `phone`

Phone number field.

| Property       | Type     | Description                         |
| -------------- | -------- | ----------------------------------- |
| `pattern`      | string   | Regex pattern (default: international) |
| `countryCode`  | string   | Default country dial code           |

**Grid renderer:** Clickable `tel:` link.
**Form input:** Phone input with country selector.

---

## Numeric Fields

### `number`

Integer or decimal number input.

| Property         | Type     | Description                       |
| ---------------- | -------- | --------------------------------- |
| `min`            | number   | Minimum allowed value             |
| `max`            | number   | Maximum allowed value             |
| `decimalPlaces`  | number   | Decimal precision (default: 0)    |
| `step`           | number   | Increment step (default: 1)       |

**Grid renderer:** Right-aligned, formatted number.
**Form input:** `<input type="number" />`

---

### `currency`

Monetary value with currency symbol.

| Property         | Type     | Description                     |
| ---------------- | -------- | ------------------------------- |
| `min`            | number   | Minimum value                   |
| `max`            | number   | Maximum value                   |
| `decimalPlaces`  | number   | Decimal precision (default: 2)  |
| `currencyCode`   | string   | ISO 4217 currency code (e.g. `INR`, `USD`) |

**Grid renderer:** Formatted with currency symbol & locale grouping.
**Form input:** Numeric input with currency prefix/suffix.

---

### `percentage`

Percentage value (0–100 or configurable range).

| Property         | Type     | Description                     |
| ---------------- | -------- | ------------------------------- |
| `min`            | number   | Minimum (default: 0)           |
| `max`            | number   | Maximum (default: 100)         |
| `decimalPlaces`  | number   | Decimal precision (default: 2) |

**Grid renderer:** Value followed by `%` symbol.
**Form input:** Numeric input with `%` suffix.

---

## Selection Fields

### `dropdown`

Single-value selection from a static list of options.

| Property   | Type     | Description                              |
| ---------- | -------- | ---------------------------------------- |
| `options`  | array    | `[{ value, label }]` pairs               |

**Grid renderer:** Label text of the selected option.
**Form input:** `<select>` or searchable dropdown component.

---

### `lookup`

Single-value selection from a **dynamic** list loaded via API.

| Property        | Type     | Description                              |
| --------------- | -------- | ---------------------------------------- |
| `lookupConfig`  | object   | Configuration for the API lookup         |

**`lookupConfig` properties:**

| Property           | Type     | Description                          |
| ------------------ | -------- | ------------------------------------ |
| `endpoint`         | string   | API endpoint to fetch options        |
| `valueField`       | string   | Property to use as the option value  |
| `labelField`       | string   | Property to display as the label     |
| `filterByCompany`  | boolean  | Filter results by current company    |
| `filterByBranch`   | boolean  | Filter results by current branch     |
| `dependsOn`        | string   | Field name; value sent as filter param |

**Grid renderer:** Resolved label text (requires joining data).
**Form input:** Searchable async dropdown with debounced API call.

---

### `multiSelect`

Multi-value selection (tags).

| Property   | Type     | Description                              |
| ---------- | -------- | ---------------------------------------- |
| `options`  | array    | `[{ value, label }]` for static options  |
| `lookupConfig` | object | Same as `lookup` for dynamic options   |
| `maxSelections` | number | Maximum selectable items              |

**Grid renderer:** Comma-separated labels or tag chips.
**Form input:** Multi-select combo box with chips.

---

## Date & Time Fields

### `date`

Date picker (no time component).

| Property    | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `minDate`   | string   | Earliest selectable date (ISO 8601) |
| `maxDate`   | string   | Latest selectable date (ISO 8601)   |
| `format`    | string   | Display format (default: `YYYY-MM-DD`) |

**Grid renderer:** Formatted date string.
**Form input:** Date picker component.

---

### `datetime`

Date + time picker.

| Property    | Type     | Description                          |
| ----------- | -------- | ------------------------------------ |
| `minDate`   | string   | Earliest selectable datetime         |
| `maxDate`   | string   | Latest selectable datetime           |
| `format`    | string   | Display format (default: `YYYY-MM-DD HH:mm`) |

**Grid renderer:** Formatted datetime string.
**Form input:** DateTime picker component.

---

## Boolean Fields

### `boolean`

True / false toggle.

| Property       | Type     | Description                       |
| -------------- | -------- | --------------------------------- |
| `defaultValue` | boolean  | Default state (default: `false`)  |
| `trueLabel`    | string   | Label when true (e.g. `"Active"`) |
| `falseLabel`   | string   | Label when false (e.g. `"Inactive"`) |

**Grid renderer:** Badge/chip with color (`green` = true, `grey` = false).
**Form input:** Toggle switch or checkbox.

---

## File Fields

### `image`

Image upload field.

| Property           | Type     | Description                       |
| ------------------ | -------- | --------------------------------- |
| `maxFileSizeMB`    | number   | Maximum file size in MB           |
| `acceptedFormats`  | array    | Allowed extensions, e.g. `["jpg", "png"]` |
| `maxWidth`         | number   | Maximum image width in px         |
| `maxHeight`        | number   | Maximum image height in px        |

**Grid renderer:** Thumbnail image (40×40).
**Form input:** Image uploader with preview.

---

### `file`

Generic file attachment.

| Property           | Type     | Description                       |
| ------------------ | -------- | --------------------------------- |
| `maxFileSizeMB`    | number   | Maximum file size in MB           |
| `acceptedFormats`  | array    | Allowed extensions, e.g. `["pdf", "xlsx"]` |
| `multiple`         | boolean  | Allow multiple files              |

**Grid renderer:** File name link.
**Form input:** File picker with drag-and-drop zone.

---

## Computed Fields

### `computed`

Read-only value calculated from other fields. Not stored directly in the
database; derived at render time.

| Property          | Type     | Description                       |
| ----------------- | -------- | --------------------------------- |
| `computeFormula`  | string   | Expression, e.g. `"unitPrice * quantity"` |
| `displayType`     | string   | How to render result: `number`, `currency`, `text` |

**Grid renderer:** Formatted computed value.
**Form input:** Read-only display.
