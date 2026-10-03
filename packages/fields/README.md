# @object-ui/fields

Grid date cells in the `compact-enterprise` profile use the same `DateField`
calendar as ordinary forms. Edits retain sibling cell values; the default profile
keeps its existing native date, datetime, and time adapters.

The standard field library and registry for Object UI.

## Host geometry

Table cell text uses `--ui-table-font-size` with the previous size as its
fallback. This is a display-only token: value formatting, empty-value carriers
and field metadata remain unchanged. Editable widgets use the components
package's control wrappers, so host control geometry applies consistently to
the object form and inline editor paths.

The `date` field follows the host's `compact-enterprise` profile: when the host
sets `document.documentElement.dataset.uiProfile` to `compact-enterprise`,
editing uses localized full-year text and a trailing shared calendar popover;
without that profile, it keeps the
native `input[type=date]`.
Valid changes in both paths write date-only `YYYY-MM-DD` values. Invalid text
remains a draft with an announced error and blocks normal form submission.
API ISO timestamps are
normalized to their leading calendar day, and the field metadata's `min_date`
and `max_date` bound selectable days in either path. Read-only fields remain
formatted display values. See the [fields guide](../../content/docs/guide/fields.md#editing-date-fields)
for the date, locale, accessibility and keyboard behavior.

## Features

- 📚 **Standard Fields** - Implementation of all ObjectStack protocol fields (Text, Number, Date, Lookup, etc.)
- 🔌 **Plugin System** - `registerFieldRenderer` registers custom renderers, or overrides standard ones.
- 🛠 **Helpers** - Utilities for schema mapping, validation, and expression evaluation.

## Installation

```bash
npm install @object-ui/fields
```

## Field Registry

The Field Registry is the core mechanism that allows decoupling view components from specific field implementations.

### Registering a Custom Field

You can override standard fields or add new ones:

```tsx
import { registerFieldRenderer, type CellRendererProps } from '@object-ui/fields';
import type { FC } from 'react';

// Your own renderer — anywhere in your app; it takes the standard props bag.
declare const MyCustomColorPicker: FC<CellRendererProps>;

// ⚠️ `color` is a SHIPPED type (`ColorSwatchCellRenderer`), and `getCellRenderer`
// reads the registry BEFORE the standard map — so this call OVERRIDES the
// built-in renderer. To ADD a type instead, register a name nothing ships.
registerFieldRenderer('color', MyCustomColorPicker);
```

### Using Standard Fields

View components use `getCellRenderer` to resolve the correct component for a field type.

```tsx
import { getCellRenderer, resolveCellRendererType, type CellRendererProps } from '@object-ui/fields';

const MyGridCell = ({ field, value }: CellRendererProps) => {
  // Resolve the renderer KEY first, then the renderer. A field's declared
  // `type` is not always the renderer's key: a textual field carrying a
  // format hint (`Field.text({ format: 'phone' })`) resolves to the richer
  // renderer. Passing `field.type` raw skips that mapping and draws such a
  // column as bare text, silently. Resolving first is never worse: with no
  // format hint the resolver returns the declared `type` unchanged.
  const Renderer = getCellRenderer(resolveCellRendererType(field));
  return <Renderer field={field} value={value} />;
};
```

## Standard Field Types

Supported types out of the box:

- **Basic**: `text`, `textarea`, `number`, `boolean`
- **Format**: `currency`, `percent`
- **Date**: `date`, `datetime`, `time`
- **Selection**: `select`, `lookup`, `master_detail`
- **Contact**: `email`, `phone`, `url`
- **Media**: `file`, `image`
- **System**: `formula`, `summary`, `auto_number`

### `type="number"` widgets: what is announced and what is not

`NumberField`, `CurrencyField`, `PercentField` and `GeolocationField` all render
a native `type="number"` input, so the **browser** decides what the box accepts.
They share one reading of that, in `widgets/numberBadInput.tsx`:

- **Announced.** When the browser reports `validity.badInput` — the box is
  holding text it cannot convert, e.g. a typed `1e`, which Chromium keeps
  DISPLAYING while `.value` reads `''` — the control is marked `aria-invalid`
  and draws a `Not saved: …` message, reusing objectui#6716's refusal shape.
  Both a change arm and a blur arm are wired, because pasting into an empty box
  never moves `.value` and so fires no React change event at all. The sentence
  resolves through the `fields.number.badInput` locale key (objectui#8148), so
  it follows the reader's language; the example numeral each box quotes is the
  widget's own and is interpolated rather than translated.
- ⚠️ **Not announced, and not announceable.** Entries the browser silently
  **truncates**: `1.2.3` stores `1.23`, `0x10` stores `10`. The characters are
  discarded as they arrive, before any handler here runs, so no widget-side
  guard can refuse them. Recovering them would mean abandoning `type="number"`
  and with it the mobile numeric keyboard and the `min`/`max`/`step` spinner
  (objectui#2572).

⛔ Silence therefore means "the browser read *something*", never "the value is
correct". User-facing wording lives in
[the fields guide](../../content/docs/guide/fields.md). The measured browser vs
happy-dom matrix is in `src/__tests__/numberInputBrowserReadings.ts`.

### Rendering form field widgets outside the form

The full widget surface is exported for consumers that render field widgets
outside a record form (ADR-0059):

- `FORM_FIELD_TYPES` — the frozen list of every type the form can render.
- `resolveFormWidgetType(type)` — resolves any field-type spelling to its
  widget key (spec aliases like `toggle`/`json`/`secret` included; unknown
  types fall back to `text`, mirroring the form).
- `getLazyFieldWidget(type)` — the widget wrapped in `React.lazy` (cached per
  type; render inside `<Suspense>`), sharing the same loaders `registerField`
  uses so nothing is bundled eagerly.

The app-shell `ActionParamDialog` uses these to render declared action params
through the exact same widgets as the object form — with a drift test pinning
param support ⊇ form support.

### Enumerating the CELL renderer registry

`listCellRendererTypes()` is the read-side twin of `FORM_FIELD_TYPES`: every
field type `getCellRenderer` resolves to a renderer **of its own**, as opposed
to the `TextCellRenderer` fallback every other spelling lands on.

⚠️ It is a **function**, not a frozen constant, and the difference is
load-bearing. `registerFieldRenderer` is published, so the cell registry can
grow after this module is evaluated; a constant would be a snapshot taken at
import time. Consumers that reason about "all registered cell types" — the two
censuses in `@object-ui/fields` and `@object-ui/plugin-detail` that measure what
every type draws — reconcile their tables against this reading so a newly
registered type fails them by name instead of slipping past a frozen
population (objectui#8734).

### File uploads in line-item grids

`GridField` (the master-detail line-items grid) supports `type: 'file'` columns:
the cell renders a compact upload button plus removable file chips (thumbnails
for images) instead of degrading to a text input, so users can attach a receipt
or photo per row without opening the row form (objectui#2360). Columns accept
`accept?: string[]` and `multiple?: boolean`; uploads run through the same
`UploadProvider` pipeline as the full-size `FileField` (the compact control is
exported as `FileCell`). Auto-derived subform columns map `file`/`image`/
`avatar` fields to file columns instead of dropping them.

### Controlled row selection in GridField

`GridField` adds a row-selection column when a direct React host supplies
`renderSelectionToolbar`. The slot receives selected rows, their current
indices, the total row count, mutation eligibility, and `patchSelected`,
`removeSelected`, and `clearSelection`. Use `getRowKey` if the controlled host
may clone rows; it must return a stable, unique key. Without it, selection stays
with rows across GridField's own edits, insertions, deletes and reorders, and is
cleared when an external replacement cannot be matched safely.

```tsx
<GridField
  field={gridField}
  value={rows}
  onChange={setRows}
  getRowKey={(row) => String(row.id)}
  renderSelectionToolbar={(selection) => (
    <div>
      <span>{selection.selectedRows.length}/{selection.totalRows}</span>
      <button
        type="button"
        disabled={selection.disabled || !selection.canPatchSelected}
        onClick={() => selection.patchSelected({ status: 'ready' })}
      >
        Mark selected
      </button>
      <button
        type="button"
        disabled={selection.disabled || !selection.canRemoveSelected}
        onClick={selection.removeSelected}
      >
        Remove selected
      </button>
    </div>
  )}
/>
```

Batch patches ignore unconfigured, computed and `readonlyWhen` columns, recompute
computed cells, and emit one updated array through `onChange`. Removal respects
`allow_delete` and `min_rows`; the existing `max_rows`, `readonly`, and
`disabled` rules remain in force. These callbacks are React-only props, not
ObjectStack field or column metadata. A React Page host must expose GridField as
a direct React runtime component; do not put callback functions into `<Block>`
schema props or persisted JSON.

### Multi-value selects

A `select` field declared `multiple: true` selects zero-or-more values (spec
allows `multiple` on `select`). `SelectField` delegates to the multi-value chip
picker (the same widget the `multiselect` type uses) and stores a `string[]`.
Delegating inside `SelectField` — rather than at a type-resolution layer — means
every surface that renders the `select` widget (the object form, the inline grid
editor, and the app-shell `ActionParamDialog`) gets multi-select identically,
with no per-surface drift. Both single- and multi-value selects resolve
per-option `visibleWhen` cascading and `dependsOn` gating through the same
[`useCascadingOptions`](./src/widgets/useCascadingOptions.ts) hook, so the
offered chips narrow (and now-invalid selections are pruned) exactly as the
single dropdown does.

### Cascading & role-gated select options

`select`, `multiselect`, `radio`, and `checkboxes` options support a per-option
`visibleWhen` CEL predicate (offered only when TRUE, evaluated against the live
record + `current_user`) and a field-level `dependsOn`. Together they drive
dependent selects (country → province → city) and role-gated options with no
bespoke matrix — the same primitives dependent lookups use. All four widgets
resolve this through the shared [`useCascadingOptions`](./src/widgets/useCascadingOptions.ts)
hook, which wraps the pure `resolveCascadingOptions` helper in `@object-ui/core`
(also used by the form renderer's inline pre-filter, so gating and filtering
never drift). While a `dependsOn` parent is empty the control is gated; a parent
change re-filters the list and clears a now-invalid value (scalar `select` /
`radio` drop the value; multi-value `multiselect` / `checkboxes` prune just the
offered-out entries).
An option whose `label` is blank (the empty string is a legal label; an absent one is
not) displays its `value` instead of an empty row, on the editable and the read-only
path alike — all eight read sites across the four widgets share the one
`optionDisplayLabel` helper in `@object-ui/core` (objectui#9230).
Client-side hiding is UX only — gate authorization-sensitive values on the
server too. See
[`content/docs/fields/select.mdx`](../../content/docs/fields/select.mdx).

### Label-stored text selects

`widget: 'declared-label-select'` renders a text field as a dropdown while
storing the selected option's original `label` string. The required option
`value` remains the lowercase machine key used for `fieldOptions` translations;
it is never written as the field value. For example:

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

The widget resolves labels with the form's object name and field name, so a
locale can display a translated option while a selection still writes the
authored label. Existing text values absent from the option list remain visible
as an “Existing value” choice instead of being cleared. Configure plain string
labels with unique machine values and unique labels, including after
translation. `I18nLabel` objects, repeated labels, option `visibleWhen`, and
option-level defaults are refused: the ObjectStack write path still treats the
field as text and cannot enforce those select semantics. This is a UI control,
not server-side membership validation. See the [fields guide](../../content/docs/guide/fields.md#label-stored-text-selects).

The named React export `DeclaredLabelSelectField` uses the same lazy loader as
the widget registry. Direct React consumers render it inside `Suspense`; it
does not add the widget implementation to the Console's initial chunk.

### Select choice cards

Set `widget: 'choice-cards'` on a single-value `select` field to present its
options as descriptive cards. Each option keeps its machine `value` as the
stored field value; the option `label` is displayed (and translated through
the form's object and field names), while the optional plain-text `description`
appears below it:

```ts
Field.select({
  label: 'Display mode',
  widget: 'choice-cards',
  options: [
    { value: 'basic', label: 'Basic view', description: 'Show a concise summary.' },
    { value: 'guided', label: 'Guided view', description: 'Include explanatory detail.' },
  ],
});
```

The cards use the native radio-group keyboard, disabled, readonly, validation,
and field-level accessibility behavior. Existing `dependsOn` and option
`visibleWhen` rules are resolved by the shared select-option evaluator. This
widget is single-value; use `multiselect` for multiple selections.

The cards default to a 68px minimum height. The title stays on one visual line
and the description is clamped to two lines so ordinary source choices keep
that height. Hosts can tune the geometry with `--ui-choice-card-min-height`,
`--ui-choice-card-gap`, `--ui-choice-card-padding-x`,
`--ui-choice-card-padding-y`, `--ui-choice-card-icon-size`,
`--ui-choice-card-icon-gap`, `--ui-choice-card-title-font-size`,
`--ui-choice-card-title-line-height`, `--ui-choice-card-description-font-size`,
`--ui-choice-card-description-line-height`, and
`--ui-choice-card-content-gap`.

## Code-owned choice icons

ObjectStack Spec 17.3 does not permit `icon` on `Field.options`. Keep icons in
application code and pass the typed React-only `renderOptionIcon` slot through
a registered widget adapter. This does not add a serializable metadata key or
change the stored machine value:

```tsx
import type { ComponentType } from 'react';
import { ComponentRegistry } from '@object-ui/core';
import { ChoiceCardsField, type ChoiceCardsFieldProps } from '@object-ui/fields';
import { BookOpen, Layers } from 'lucide-react';

const iconsByValue: Record<string, ComponentType<{ className?: string }>> = {
  basic: Layers,
  guided: BookOpen,
};

function RuntimeChoiceCards(props: ChoiceCardsFieldProps) {
  return (
    <ChoiceCardsField
      {...props}
      renderOptionIcon={(option) => {
        const Icon = iconsByValue[option.value];
        return Icon ? <Icon className="size-3.5" /> : null;
      }}
    />
  );
}

ComponentRegistry.register('choice-cards', RuntimeChoiceCards, {
  namespace: 'field',
  labelling: 'group',
  skipFallback: true,
});
```

Register the adapter after the fields package initializes and before mounting
the native `ObjectForm`. The ObjectStack field still declares only
`widget: 'choice-cards'`, `value`, `label`, and optional `description`; the
adapter supplies icons by machine value in runtime code. The named React export
is lazy and should be rendered inside `Suspense` when used directly.

## Links

- 📚 [Documentation](https://www.objectui.org/docs/guide/fields)
- 📦 [npm package](https://www.npmjs.com/package/@object-ui/fields)
- 📝 [Changelog](./CHANGELOG.md)
- 🐛 [Report an issue](https://github.com/objectstack-ai/objectui/issues)
- 🤝 [Contributing Guide](https://github.com/objectstack-ai/objectui/blob/main/CONTRIBUTING.md)
- 🗺️ [Roadmap](https://github.com/objectstack-ai/objectui/blob/main/ROADMAP.md)

## License

MIT — see [LICENSE](./LICENSE).

Compact currency grid cells display the authored `prefix` and `scale` (two decimal places when unspecified). The default profile retains its existing formatting.

`GridFieldMetadata.columns` uses the same strict `GridColumnDefinition` contract as inline grids. Computed columns declare `computed: true`, an arithmetic `expr`, and optional `scale`; `record.field` and bare field references read numeric sibling cells. `GridColumnDefinitionSchema` is exported from `@object-ui/types/zod`. Initial rows and externally replaced controlled rows show derived values without firing `onChange`; user edits and batch patches still emit the computed result through the controlled row array.
# Compact single-record relations

The `compact-enterprise` host profile puts a single lookup or user field's
selected title inside its picker trigger. The clear action remains keyboard
accessible and follows the existing disabled/readonly rules. Multi-selection
retains chips. No lookup query, hydration or stored value changes. See
`src/widgets/LookupField.compactProfile.test.tsx` and the existing picker tests.
