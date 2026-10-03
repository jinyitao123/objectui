---
title: "Field Registry"
---

Object UI uses a **Field Registry** system to decouple the core engine from specific UI implementations of fields. This allows for rich extensibility and plugin support.

In the compact enterprise profile, editable grid date cells reuse the standard
`DateField` calendar. The default profile retains its native temporal adapters.

## Concept

The `@object-ui/fields` package serves as the "Universal Language" for rendering values. 

When a component like `<ObjectGrid>` needs to render a `date` field, it doesn't import a DatePicker directly. Instead, it asks the registry:

> *"Hey, give me the component responsible for rendering type 'date'."*

This architecture allows you to:
1.  **Override standard fields** (e.g. replace the native date picker with a fancy one).
2.  **Add new field types** (e.g. add a `rating` or `signature` field).
3.  **Keep bundles small** (heavy components like Code Editors are loaded only if their plugin is registered).

## Usage

### 1. Registering a Custom Field

You can register a custom renderer globally, typically at your app's entry point.

```tsx
// src/setup.tsx
import { registerFieldRenderer, type CellRendererProps } from '@object-ui/fields';

const MyRatingField = ({ value, onChange }: CellRendererProps) => {
  return (
    <div className="rating">
      {[1, 2, 3, 4, 5].map(star => (
        <span 
          key={star} 
          onClick={() => onChange?.(star)}
          style={{ color: star <= value ? 'gold' : 'grey' }}
        >
          ★
        </span>
      ))}
    </div>
  );
};

// Register it
registerFieldRenderer('rating', MyRatingField);
```

### 2. Using in Schema

Once registered, you can simply use the new type in your JSON schema.

```json
{
  "type": "form",
  "fields": [
    {
      "name": "customer_satisfaction",
      "type": "rating", 
      "label": "Satisfaction"
    }
  ]
}
```

## Standard Fields

Object UI comes with built-in support for the standard [ObjectStack Protocol](https://github.com/objectstack-ai/objectstack/tree/main/packages/spec) types:

| Type | Description |
|---|---|
| `text` | Single line text |
| `textarea` | Multi-line text |
| `number` | Numeric input |
| `currency` | Currency formatting |
| `percent` | Percentage values |
| `date` | Date picker |
| `datetime` | Date & Time picker |
| `boolean` | Checkbox / Switch |
| `select` | Dropdown |
| `lookup` | Reference to another object |
| `master_detail` | Parent-child relationship |
| `user` | Person picker — searches the `sys_user` object (a lookup specialized to users) |
| `owner` | Record owner — a `user` field, typically read-only and stamped with the current user |
| `tags` | Removable string chips; each chip's remove button has a localized accessible name |

The built-in `TagsField` translates its chip-removal button with
`fields.tags.remove`, interpolating the tag value. Read-only fields continue to
display the tags without edit controls.

## Label-stored text selects

Use the registered `declared-label-select` widget when a field must remain
`text` while offering a fixed dropdown whose selected value is the exact,
authored option label. The machine `value` identifies the translation key; the
widget translates the display label by the form's object and field name, but
stores the original label string regardless of the active locale.

```ts
Field.text({
  label: 'Gender',
  widget: 'declared-label-select',
  options: [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
  ],
});
```

The widget requires `type: 'text'`, non-empty options, unique machine values,
and unique plain-string labels. It refuses repeated labels (including labels
that collide after translation), `I18nLabel` objects, option `visibleWhen`, and
option-level defaults. `visibleWhen` and option defaults are validated and
applied against machine values by ObjectStack, while this widget stores labels;
accepting them would make the display and write paths disagree. Use a normal
`select` field when machine option values should be stored and enforced by the
server.

If a record already contains text absent from the declared labels, the widget
shows it as an “Existing value” choice rather than clearing it on mount. This
widget changes presentation only. ObjectStack still validates the field as
text, so API writes are not restricted to the options.

The named React export is lazy. Use a `Suspense` boundary when rendering it
directly; metadata-backed forms provide their existing loading boundary.

## Select choice cards

Use `widget: 'choice-cards'` on a single-value `select` field when each choice
needs a short description. The option's machine `value` remains the stored
value; the `label` is translated for display using the owning object and field,
and `description` remains the declared plain text.

```ts
Field.select({
  label: 'Purchase reason',
  widget: 'choice-cards',
  options: [
    { value: 'stock', label: 'Stock replenishment', description: 'Restock materials for normal operations.' },
    { value: 'project', label: 'Project purchase', description: 'Buy items for a defined project.' },
  ],
});
```

Choice cards retain the shared select-option `dependsOn` and `visibleWhen`
behavior, and inherit the form's disabled, readonly, validation, and accessible
field-label handling. Use a multi-value widget when the field allows more than
one selection. The named React export is lazy; render it inside `Suspense` when
using the component outside metadata-backed forms.

## Controlled GridField row selection

Direct React hosts can opt into row selection by passing a
`renderSelectionToolbar` slot to `GridField`. Its typed context contains
`selectedRows`, their current `selectedIndices`, `totalRows`, `disabled`, and
`canPatchSelected` / `canRemoveSelected`, plus `patchSelected` and
`removeSelected` mutators and `clearSelection`.

```tsx
<GridField
  field={gridField}
  value={rows}
  onChange={setRows}
  getRowKey={(row) => String(row.id)}
  renderSelectionToolbar={(selection) => (
    <button
      type="button"
      disabled={selection.disabled || !selection.canPatchSelected}
      onClick={() => selection.patchSelected({ status: 'ready' })}
    >
      Mark selected
    </button>
  )}
/>
```

`getRowKey` should return a stable, unique identity when the controlled host
clones rows. Without it, the grid keeps selection through its own row edits,
insertion, deletion and reorder, then clears selection if an external row
replacement cannot be matched. Batch patches pass only configured editable
columns through the shared computed-row path; computed and `readonlyWhen`
columns are skipped. `removeSelected` respects `allow_delete` and `min_rows`,
and both mutators are inert in disabled or readonly context. Changes go through
the field's single controlled `onChange` array; the widget performs no CRUD.
These callbacks are React-only. Register `GridField` as a direct React runtime
component for trusted React Pages rather than passing functions through
`<Block>` schema or field metadata.

## GridField computed columns

Serialized `GridFieldMetadata.columns` can declare read-only computed cells with
`computed: true`, `expr`, and optional `scale`:

```ts
{
  name: 'taxed_subtotal',
  type: 'currency',
  computed: true,
  expr: 'record.quantity * record.taxed_unit_price * (1 - record.discount_rate / 100)',
  scale: 4,
}
```

`expr` supports arithmetic operators, parentheses, numeric literals, and
numeric sibling-field references written as `record.field` or `field`. Missing
or nonnumeric inputs display as an em dash. The grid derives these cells for
initial and externally replaced rows without calling `onChange`; editing or
batch-patching a row includes recomputed values in the controlled update.
`GridColumnDefinition` is available from `@object-ui/types`, and its strict
validator is `GridColumnDefinitionSchema` from `@object-ui/types/zod`.

## Editing date fields

`DateField` keeps the browser's native `input[type=date]` unless the host sets
`document.documentElement.dataset.uiProfile` to `compact-enterprise`. Under
that profile, it uses an editable text control with a trailing calendar button
and the shared calendar popover. Valid selections and text commits write a
date-only `YYYY-MM-DD` string. Invalid text remains a draft, is announced as
an error and sets native validity, so normal form submission cannot silently
persist the previous date.

When a stored value is an ISO timestamp such as
`2026-06-17T00:00:00.000Z`, the field normalizes it to the leading
`2026-06-17` calendar day. It does not convert that date through UTC midnight,
which could shift the day in a viewer's time zone. Selecting a day in the
calendar writes the same local calendar day back as `YYYY-MM-DD`.

The existing date-field metadata keys `min_date` and `max_date` apply to both
presentations. The native input receives its `min` and `max` attributes; the
calendar disables days before `min_date` and after `max_date`, so both endpoints
remain selectable. `disabled` disables the editing control, while `readonly`
keeps the existing locale-formatted display and does not open a picker.

The calendar and full-year date text use the shared display locale. The input
preserves the field's id, name, descriptions, validation state and focus
handlers. The 280px popover has a six-week grid, a custom month/year panel, Today
and Clear controls; bounds apply to both typed values and these actions.
Keyboard users can open it from the calendar button, navigate the grid, select
a day and return to the input. Error text follows the active UI language.

## What a number field silently rewrites

`number`, `currency`, `percent` and `geolocation` render a native
`type="number"` input. The browser — not ObjectUI — decides what that box will
accept, and it rewrites some entries **before any widget code runs**. Two
different things can happen, and only one of them is announced.

### Announced: text the browser cannot read

If the box is left holding something that is not a complete number, the browser
reports `validity.badInput` and these widgets now say so: the control is marked
`aria-invalid="true"` and a message is drawn under it —

> Not saved: the text in this box is not a number. Enter a plain decimal (example: 1234.56).

The sentence follows the reader's language (objectui#8148) — it resolves through
the `fields.number.badInput` locale key, so a console running in Chinese,
Japanese or Arabic refuses in that language. The example numeral is the
widget's own (`1234` for `number`, `1234.56` for `currency`, `12.5` for
`percent`, `30.2741` / `120.1551` for the two `geolocation` boxes) and stays
verbatim in every language.

Measured in Chromium 141, typing any of `1e`, `1e-`, `1e+`, `5e`, `-`, `.`,
`+`, `-.` or `e` leaves the box **visibly displaying** what was typed while its
value reads empty. Before this was announced, the field simply stored nothing
and said nothing.

### ⚠️ NOT announced: entries the browser silently truncates

This is the important limitation, and it is deliberate rather than an oversight.

| you paste / type | the field stores |
|---|---|
| `1.2.3` | `1.23` |
| `0x10` | `10` |
| `12abc` | `12` |

**No warning is shown for these, and no widget-side check can add one.** The
browser filters the keystrokes or the pasted text as it arrives, so by the time
ObjectUI sees the field the discarded characters are already gone — there is
nothing left to detect. This is native `type="number"` behaviour; recovering it
would mean giving up the numeric keyboard on mobile and the `min`/`max`/`step`
spinner on every numeric field in the product.

⛔ **So do not read "no warning" as "the value is correct."** A warning means the
browser could not read the box at all. Silence means the browser read
*something* — which may be less than you typed. When exact input matters
(reference codes, serial numbers, anything where `1.2.3` is meaningful), declare
a `text` field, not a numeric one.

## Using Renderers in Custom Components

If you are building your own custom component (like a Kanban board card), you can leverage the registry to render fields without reinventing the wheel.

```tsx
import { getCellRenderer } from '@object-ui/fields';

export const KanbanCard = ({ task }: { task: { name: string; assignee: string } }) => {
  // Get the standard renderer for a 'user' type field
  const UserRenderer = getCellRenderer('user');
  
  return (
    <div className="card">
      <h3>{task.name}</h3>
      <div className="assignee">
        <UserRenderer 
          value={task.assignee} 
          field={{ type: 'user', name: 'assignee' }} 
        />
      </div>
    </div>
  );
};
```

Compact currency grid cells display the authored `prefix` and `scale` (two decimal places when unspecified). The default profile retains its existing formatting.

Use the direct React runtime `columns` prop for code-derived `GridColumn` configuration. Do not place richer runtime column properties into serialized field metadata.
# Compact single-record selection

With the `compact-enterprise` host profile, single-record lookup and user
selectors display their selected title inside the trigger rather than adding a
separate chip row. Their clear action retains the field's disabled/readonly
boundary. Multiple-value selectors keep their chip layout.
