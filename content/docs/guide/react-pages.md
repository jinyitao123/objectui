---
title: React Pages
description: Author a page body as real React (kind:'react') or as constrained JSX that is parsed and never executed (kind:'html') — and how to choose between them.
---

# React Pages

Most pages in ObjectUI are a **schema tree** — `regions[].components[]` of JSON
nodes. Two page kinds let you write the body as **source** instead, for layouts
that are awkward to express as nested JSON:

| `kind` | Source is | Executed? | Author trust |
|---|---|---|---|
| `"html"` | Constrained JSX/HTML | **No** — parsed into a schema tree | Untrusted OK |
| `"react"` | Real React (hooks, handlers, arbitrary JS) | **Yes** — in the main React tree | Trusted only |

Both set `source` and leave `regions` unused. `"jsx"` is a deprecated alias for
`"html"` and is still accepted.

> Page `kind` also carries the record-page override values `"full"` (default)
> and `"slotted"` — a different axis, covered in [Slotted Pages](./slotted-pages.md).

## Choosing between them

Reach for **`kind:'html'`** by default. It is parsed, whitelisted against the
public block manifest, and never executed, so it is safe for AI-generated and
customer-authored pages. It covers layout, blocks, and styling — styling through
the blocks' own structured props plus a JSON `style` object, **not** Tailwind
(see *Styling*, below; the rule holds on both tiers).

Reach for **`kind:'react'`** only when you need real behaviour the schema tree
cannot express — local state, computed lists, event handlers wiring one block to
another, custom data fetching. It runs **without a sandbox**.

## `kind:'react'`

```json
{
  "type": "home",
  "name": "project_console",
  "kind": "react",
  "source": "function Page() {\n  const [selected, setSelected] = React.useState(null);\n  return (\n    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>\n      <ListView objectName=\"showcase_project\" fields={['name', 'status']} onRowClick={(r) => setSelected(r._id)} />\n      {selected && <ObjectForm objectName=\"showcase_project\" mode=\"edit\" recordId={selected} />}\n    </div>\n  );\n}"
}
```

Written out, that `source` is:

```jsx
function Page() {
  const [selected, setSelected] = React.useState(null);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      <ListView
        objectName="showcase_project"
        fields={['name', 'status']}
        onRowClick={(r) => setSelected(r._id)}
      />
      {selected && <ObjectForm objectName="showcase_project" mode="edit" recordId={selected} />}
    </div>
  );
}
```

### Source-owned page chrome

`@objectstack/spec` declares `template` as a string. ObjectUI reserves
`template: 'react-source'` for a trusted React page whose source owns the whole
page introduction and layout. In this mode the PageRenderer does not add the
Page label as an `<h1>`, the Page description, a width cap, or its default
padding; author the page's accessible `<h1>`, subtitle and layout in `source`.
The mode applies only when `kind: 'react'`. Omitting it keeps the existing shell
title, description and inset, so React pages without their own heading remain
discoverable by default.

```json
{
  "type": "app",
  "name": "project_console",
  "label": "Project Plan",
  "kind": "react",
  "template": "react-source",
  "source": "function Page() { return <main><h1>Project Plan</h1><p>Execution overview</p></main>; }"
}
```

### The security gate

A react page's source is transpiled and evaluated directly in the application —
no isolation, full access to the page's React tree. The platform assumes page
authors are reviewed and draft-gated, so the host capability `react-pages`
defaults **ON**.

A deployment that does not trust its authors turns it off server-side with
`OS_PAGE_REACT=off` (or `disableCapability('react-pages')` in the host). Pages
then render an explanatory notice instead of executing. Existing `kind:'html'`
pages are unaffected.

### What is in scope

Page source imports nothing. The host injects these identifiers as closure variables:

| In scope | What it is |
|---|---|
| `React` | The host's React — call hooks with it (`React.useState`). |
| The public data blocks | Every public non-container block, as a PascalCase tag *on this tier* — but *what resolves* and *what you author against* are two different sets, below. |
| `Block` | Escape hatch for anything not injected. |
| `useAdapter` | The live data source — query/create/update. |
| `navigate` | Navigate to an in-app path through the host router. In ObjectUI Console this keeps navigation inside the mounted app and respects its basename. |
| `data`, `variables`, `page` | The page's own data, local variables, and schema. |
| Trusted runtime components | Direct React components explicitly registered by host code; they are outside the schema block list described below. |

Use `navigate` for internal buttons and actions. It calls the host's SPA
navigation bridge; in a standalone host without that bridge it falls back to a
browser navigation. Use an anchor for external destinations:

```jsx
function Page() {
  return (
    <div>
      <button onClick={() => navigate('/apps/com.acme.crm/forge_customer')}>
        Open customer
      </button>
      <a href="https://example.com" target="_blank" rel="noreferrer">
        External documentation
      </a>
    </div>
  );
}
```

The host navigation function accepts an already-resolved in-app path. It does
not authorize that destination; the destination route still applies normal
metadata and data permissions.

#### Two tiers: what resolves, and what you author against

**The runtime scope** is every block in the curated public contract
(`PUBLIC_BLOCKS`) that is not a layout container. **On this tier** tags are
derived by splitting the registry type on `-`, `_` and `:` and PascalCasing each
part: `object-grid` → `<ObjectGrid>`, `record:details` → `<RecordDetails>`. A
`kind:'html'` page writes the registry type itself instead — `<object-grid>`,
`<record:details>`. Blocks registered lazily are in scope too — you never wait
on a plugin chunk to reference one.

**The authored contract** is the much smaller set that has *published props* —
checked by `os validate` and generated into the reference an author, human or AI,
writes against: **`<ObjectForm>`, `<ListView>`, `<ObjectChart>`, `<Block>`**.
That set is `REACT_BLOCKS` in `@objectstack/spec`, and the generated per-prop
table is `skills/objectstack-ui/references/react-blocks.md` in the framework
repo. **Treat that table as the prop authority, not this page.**

Everything in the runtime scope but outside the contract still resolves and
renders — its props simply are not part of the react-tier contract. Reach those
through the contract instead: a kanban / calendar / gantt / timeline / map of an
object is `<ListView viewType="kanban" …>`, or `<Block type="object-kanban" …>`.

#### Host-registered React runtime components

A trusted host can add reviewed React components to this scope with
`ComponentRegistry.registerReactRuntimeComponent(name, component)`. This is a
code-only runtime extension: it does not add a `PUBLIC_BLOCKS` or
`REACT_BLOCKS` member, JSON component type, or authorable props. The host must
register the component before mounting pages; React page scopes do not refresh
for late registrations. By default the scope supplies its authenticated
`dataSource` after page props so page source cannot replace that adapter. Pure
presentation components can opt out with `{ injectDataSource: false }`.

In development, module replacement releases that module's own runtime
registrations before installing the replacement. Duplicate registration still
fails in production.

`@object-ui/plugin-form` registers `<RelationshipCollectionEditor>` and
`<CompositeDialog>` this way. The former gets the authenticated adapter and
keeps its function-valued `children` slot; the latter is presentation-only and
does not receive an injected `dataSource`. It also registers
`<ExportConfigurationDialog>` as a presentation-only export-configuration
dialog. These tags and their runtime props
are not part of the generated `@objectstack/spec` React Page authoring contract.
Runtime availability does not mean `os validate` or publish validation accepts
them.

`ExportConfigurationDialog` receives permitted field keys and display labels,
row counts, already formatted preview values, and host-selected initial values.
It returns the temporary selection through `onExport(scope, fields, format,
fileName)`. It does not read data, determine permissions, or use the separate
async `ExportJob` lifecycle; the host performs the synchronous export.

Console pre-registers a lazy `GanttView` runtime component before React pages
compile their stable scope; its existing public plugin component loads only
when used. The host bootstrap owns this presentation-only registration. The
host maps rows it already authorized into `GanttTask[]`; `GanttView` does not query an adapter. Pass
`readOnly` to disable timeline edits while keeping `onTaskClick` available for
host navigation. `showToolbar={false}` hides the timeline's controls when the
host owns them; its default is `true`. This runtime alias adds no schema type
or Spec authoring key.

Importing `@object-ui/layout` registers `<WorkspaceHeader>`,
`<WorkspaceToolbar>`, `<ListSummary>`, `<CategoryDistribution>`, `<StatusTabs>`, `<DateRangeControl>`,
`<ResourceScheduleGrid>`, `<DocumentSection>` and `<DocumentWorkspace>` as presentation-only
runtime components. They receive no `dataSource`, add no schema type or Spec
authoring props, and must be registered before the first React Page mounts.
`WorkspaceHeader` uses the existing `PageHeader` React implementation and
accepts its action controls as React children. `ListSummary` renders only the
label/value items supplied by the host. Without `onItemSelect` it retains its
semantic `<dl>` / `<dt>` / `<dd>` structure; with `onItemSelect` it renders a
labeled group of native buttons. In interactive mode, the host controls
selection through `selectedItemId`, receives the activated stable item id in
`onItemSelect`, and may disable individual items with `item.disabled`. It does
not own selection, queries or permission checks. `StatusTabs` is controlled:
the host supplies its current value, tab labels and counts, and the
`onValueChange` handler that updates the page's filter state. `WorkspaceToolbar`
places the host's search controls, filters, secondary actions and primary
action into a responsive group; it does not own their state, queries or
permission checks.

`ListSummary` items may include a decorative `icon` name or React node.
Labels and already resolved values remain host-owned. `--ui-list-summary-columns`
sets the desktop column count (default four); container breakpoints keep one
column at narrow widths and two at medium widths.

`CategoryDistribution` presents host-computed `{ id, label, value }` counts as
a semantic `<dl>` and a decorative relative bar. Widths compare each value to
the maximum in the current collection; they are not percentages of a total.
`minPercent` applies to positive values only, while zero stays zero. An empty
collection renders `emptyText` with status semantics. Any negative or
non-finite value suppresses the entire chart and renders `invalidText` as an
alert instead of presenting a partial distribution. The host owns the
categories, query, permission checks and both messages; the component exposes
no data-source or business schema keys.
`showRank` optionally adds an ordinal per row, and
`truncateLabels` optionally keeps long labels on one line while exposing the
full label in the native `title` attribute. `valueFormatter` formats only the
visible count; the original number still determines the relative bar width.
All three options are off or absent by default, preserving the raw count and
label presentation.
Its geometry tokens are `--ui-category-distribution-label-width` (76px),
`--ui-category-distribution-count-width` (34px),
`--ui-category-distribution-bar-height` (8.75px),
`--ui-category-distribution-row-gap` (5.25px),
`--ui-category-distribution-font-size` (11.5px),
`--ui-category-distribution-rank-width` (14px),
`--ui-category-distribution-rank-font-size` (10.5px), and
`--ui-category-distribution-row-padding` (0px),
`--ui-category-distribution-empty-padding-block` (14px),
`--ui-category-distribution-empty-font-size` (12px), and
`--ui-category-distribution-empty-line-height` (18px).

`ResourceScheduleGrid` renders a host-provided resource-by-date matrix. The host
owns period selection, data, permissions and the unplanned-items list; the
component places only events with an exact `resourceId` and `dateKey` match.
Without `onEventClick`, event cards remain display-only. With it, each card is a
keyboard-operable native button; `renderEvent` and `renderResource` customize
presentation only. The resource label column keeps its configured width while
date columns keep fixed-width tracks; a wider range scrolls inside the same
grid viewport. Short ranges may leave unused space at the right.

```jsx
<ResourceScheduleGrid
  aria-label="Engineer schedule"
  resourceHeaderLabel="Engineer"
  resources={resources}
  dateColumns={visibleDays}
  events={scheduledItems}
  emptyLabel="No resources in this period"
  onEventClick={openScheduleItem}
/>
```

`DateRangeControl` emits a complete local `{ from, to }` date range or
`undefined` on explicit clear. Its two-month calendar keeps the first selection
as a draft; Escape discards that draft and returns focus to the trigger.
The host supplies labels, optional bounds and explicit shortcut offsets:

```jsx
const [dates, setDates] = React.useState(undefined);
<DateRangeControl
  label="Receipt dates"
  value={dates}
  onValueChange={setDates}
  quickRanges={[{ label: 'Previous seven days through today', daysBack: 7 }]}
/>
```

These bounds are date-only local calendar strings. A host filtering timestamp
fields must resolve day boundaries in its business timezone. The component
does not turn offsets into dashboard presets, ObjectQL, permissions or actions.

```jsx
function ContactsPage({ refreshContacts, openContactForm }) {
  const [status, setStatus] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const [role, setRole] = React.useState('all');
  const stats = [
    { id: 'all', label: 'All contacts', value: 128 },
    { id: 'active', label: 'Active', value: 96 },
    { id: 'inactive', label: 'Inactive', value: 32 },
    { id: 'prospect', label: 'Prospect', value: 14 },
  ];
  const statuses = [
    { value: 'all', label: 'All', count: 128 },
    { value: 'active', label: 'Active', count: 96 },
    { value: 'inactive', label: 'Inactive', count: 32 },
  ];

  return (
    <>
      <WorkspaceHeader title="Contacts">
        <button type="button" onClick={() => openContactForm()}>New contact</button>
      </WorkspaceHeader>
      <ListSummary aria-label="Contact summary" items={stats} />
      <StatusTabs
        aria-label="Contact status"
        panelId="contact-results"
        items={statuses}
        value={status}
        onValueChange={setStatus}
      />
      <WorkspaceToolbar
        aria-label="Contact list controls"
        search={<input aria-label="Search contacts" value={query} onChange={event => setQuery(event.target.value)} />}
        filters={<select aria-label="Contact role" value={role} onChange={event => setRole(event.target.value)}>
          <option value="all">All roles</option>
          <option value="buyer">Buyer</option>
        </select>}
        auxiliaryActions={<button type="button" onClick={() => refreshContacts()}>Refresh</button>}
        primaryAction={<button type="button" onClick={() => openContactForm()}>New contact</button>}
      />
      <section id="contact-results" role="tabpanel" aria-label="Contact results" tabIndex={0}>
        {/* Render the host's already-filtered list here. */}
      </section>
    </>
  );
}
```

Counts and filters must use the same scope when the host provides both. The
summary grid uses container queries and shrinks from four columns to two or one
as the available width narrows; its cards have no fixed width. `StatusTabs`
requires an accessible tab-list label and the id of its matching `tabpanel`.
The components expose `className` or named slot class props for host styling.
Their geometry can also be set with the public `--ui-page-title-*`,
`--ui-list-summary-*`, `--ui-status-tabs-*` and `--ui-button-gap` CSS custom
properties.
For a status-tab surface, the host may scope
`--ui-status-tabs-height`, `--ui-status-tabs-padding-inline`,
`--ui-status-tabs-padding-block`, `--ui-status-tabs-font-size`,
`--ui-status-tabs-line-height` and `--ui-status-tabs-radius` on its wrapper.
The CSS-variable fallbacks retain the current default sizes, and Radix
continues to own tab roles, selection and arrow-key navigation.

`CompositeDialog` can also receive a read-only `sidebar` React node and its
`sidebarLabel`. It places a profile summary to the left of the form on desktop
and above it on narrow screens. The host may set `--ui-dialog-sidebar-width`;
the default is 236px. Keep editable model fields in `children` so validation,
busy disabling and the discard guard continue to use the same mounted draft.

For compact related rows, `RelationshipCollectionEditor` renders a declared
boolean `primaryField` as a pressed star action beside removal. The field's
permissions and readonly predicates remain authoritative. `onPrimaryChange`
can update sibling draft rows when the host requires one primary item.

The host also registers `<DocumentWorkspace>` and `<DocumentSection>` from
`@object-ui/components` as presentation-only runtime components. A workspace
receives `main` and `sidebar` React nodes and an optional `sidebarLabel`; it
stacks them according to the content container width and does not add a resize
control. A section receives `title`, optional `stepNumber`, `headingId` and
`actions`, plus body `children`. The section renders an `h2` linked to its
containing section and uses the public host-aware Card geometry. Their props are
React composition slots, not serialized component schema or business actions.
The ObjectUI package ships their styling, so page source should not add Tailwind
classes for these layouts. Hosts can tune section geometry with the
`--ui-document-section-*` CSS variables; the `@object-ui/components` README
lists their defaults and root-font scaling.

`DocumentWorkspace` can omit `sidebar` and compose existing actions below the
document through `footer`, with an accessible `footerLabel`. The main column
then occupies the full available width. The named footer group stays in normal
flow and uses sticky positioning within its scroll container; hosts can tune
its inset and offset with `--ui-document-footer-*` tokens. Keep business amounts,
action handlers, busy flags and cancel guards in the host. These are React slots,
not metadata or an alternative form controller.

For a native grouped `ObjectForm`, a containing surface can opt into visual
section numbers with `--ui-section-step-display: inline-flex` (default `none`).
Each form resets its own counter; hidden and untitled headers contribute no
number. The optional number is decorative, while the existing group label and
collapse control remain accessible. The size, font size and weight tokens are
`--ui-section-step-size`, `--ui-section-step-font-size` and
`--ui-section-step-font-weight`; they share the DocumentSection step fallbacks.
This is presentation only and adds no section metadata key or separate form
state. Keep the original fields and one native validation controller.

`RecordTable` is the standard `data-table` renderer exposed to trusted React
pages through its existing `schema` prop. A host may compose React cell callbacks
for related business data and pass controlled server paging/sorting. Custom
cell callbacks own their visible content and tooltips; the table does not add
the raw backing value as a hover title to those cells. This introduces no second
table schema or data-fetching service. Ordinary object lists continue to use
`ListView`; callbacks belong to React source, not persisted JSON metadata.
When an empty ListView grid has resolved field permissions, its authorized
column headers stay visible beside the ListView's configured empty state. While
the field policy is unresolved, the empty state remains visible without
mounting headers. This is a React-only composition across ListView, ObjectGrid
and the existing table viewport; it adds no metadata key, and the table's
`emptyAction` remains independently gated by `visibleWhen`.
For a host that needs a full-width table on a narrow screen, pass
`mobileLayout="table"` to `<ListView>`; the default `"cards"` keeps the existing
populated mobile card layout. This is a React runtime prop, not a serialized
ListView or ObjectGrid schema key.
For a direct `data-table` schema, a column may declare `fixed: 'left'` or
`fixed: 'right'`; the renderer pins its header and body cells using offsets
measured from the rendered column widths, so multiple fixed columns do not
overlap. `frozenColumns` retains its separate leading-column behavior, including
the selection and row-number columns. Existing right-pin classes on
`className`/`cellClassName` remain a compatibility path.
The existing table accepts host-scoped geometry variables for its model-column
headers and data cells: `--ui-table-header-height`,
`--ui-table-header-padding-x`, `--ui-table-header-padding-y`,
`--ui-table-header-font-size`, `--ui-table-header-line-height`,
`--ui-table-header-font-weight`, `--ui-table-cell-padding-x`,
`--ui-table-cell-padding-y`, `--ui-table-font-size` and
`--ui-table-cell-line-height`. Scope them through a wrapper or the schema's
existing `className`; no new table schema is needed. The table root exposes
`data-slot="record-table"`. Data row height remains content-driven, so wrapping
or longer values can expand a row instead of being clipped to a fixed height.
When the table owns its scroll container, its empty message is a viewport-width
sibling to the table track, so wide columns do not shift the message off center.
The ListView host-provided empty state lets that viewport grow to its content;
the standalone table keeps its existing fixed empty-viewport height.
`disableInnerScroll` means the parent owns horizontal scrolling; in that mode the
renderer keeps empty content inside the table row rather than guessing the
parent viewport. A host that can return an empty shared-scroll table should
position its empty content at that parent scroll owner.

The form plugin also registers `<GridField>` as a direct React component. Use
this tag for a controlled line editor with `getRowKey` and
`renderSelectionToolbar` callbacks. The toolbar receives selected rows and safe
draft mutation helpers; it does not write records. Keep callback props out of
`<Block type="field:grid">` and serialized metadata. See the field guide for the
runtime toolbar contract and readonly rules.

#### The `record:*` family is excluded from this tier

The tag derivation above is real — `<RecordDetails>` and `<RecordHighlights>`
*are* defined in the scope — but every `record:*` block reads its record from the
record context a **record page** mounts, and a `kind:'react'` page never mounts
one. The block renders empty however you bind it: its `objectName`/`recordId` are
not read by the renderer. `os validate` rejects them at publish time:

```
  ✗ Author-time rules failed (1 issue)
  • page "showcase_renewals_pipeline" › RecordHighlights: RecordHighlights renders
    "record:highlights", which reads its record from the record context a record page
    mounts — a kind:'react' page never mounts one, so the block renders empty no matter
    how it is bound (its objectName/recordId are not read by the renderer).
      rule: react-block-needs-record-context
```

The rule matches by **type**, so `<Block type="record:details" />` is rejected
the same way. On a react page, bind the record yourself:

| Instead of | Write |
|---|---|
| `<RecordDetails>` | `<ObjectForm objectName="…" mode="view" recordId={…} fields={[…]} />` — it binds by its own props. |
| `<RecordHighlights>` | `<ObjectForm … mode="view" />`, or read the record with `useAdapter().findOne` and lay the strip out in JSX. |
| `<RecordRelatedList>` | `<ListView objectName="child_object" filters={['lookup_field', '=', parentId]} />` — the parent binding is an ordinary filter here. |
| `<RecordPath>` | Read the record with `useAdapter().findOne` and render the stage bar in JSX. |

If you want the whole record-page composition, author the page as `type:'record'`
instead — that is the page kind that mounts the context these blocks render from.

**Layout containers are deliberately not injected.** The scope builder skips
every container (`if (!tag || cfg.isContainer) continue;`), so `<flex>`, `<grid>`,
`<card>` and friends have no injected wrapper. In react mode you compose layout
with real HTML, which React is better at than a schema-children renderer — styled
inline, not with Tailwind: `<div style={{ display: 'flex', gap: 16 }}>`.

### Styling — page source is metadata, not build input

**Do not author Tailwind utility classes in page source** — on either tier. A
page's `source` is *runtime metadata*. The console's Tailwind is compiled at
**build** time by scanning the console's own `src`, and there is no safelist, so
it never sees your page. A utility class in page source produces CSS only if that
exact class happens to already appear in objectui's own source, and otherwise
produces **nothing, with no error anywhere**.

This is the most expensive mistake on this tier: the page still renders — correct
structure, correct data, no styling — and nothing reports it. It is recorded as a
2026-06-30 amendment to ADR-0080 under ADR-0065, after a modal's `bg-black/50`
backdrop rendered fully transparent in production. `os validate` reports it as
`page-source-className-tailwind` (a warning, on both tiers).

Each tier has its own styling primitive:

| `kind` | Style with |
|---|---|
| `"react"` | Inline `style={{ … }}`, with `hsl(var(--token))` for colour. |
| `"html"` | The blocks' own structured props (`<flex direction gap>`, `<grid columns>`) plus a JSON `style` object. |

Colours come from the active theme, so the page follows light/dark and whatever
theme the deployment installs:

```jsx
<div
  style={{
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 'var(--radius)',
    padding: 12,
    color: 'hsl(var(--foreground))',
  }}
>
  …
</div>
```

Common tokens: `--background`, `--foreground`, `--card`, `--muted`,
`--muted-foreground`, `--border`, `--primary`, `--destructive`, plus the
spacing/radius tokens `--space-*` and `--radius`.

For overlays, do not hand-roll a `position: fixed; inset: 0` backdrop — render
the form in its built-in Sheet or Dialog, which arrives already styled:
`<ObjectForm … formType="drawer" drawerSide="right" />`.

### Blocks take flat props

An injected block folds its JSX props into the block's schema, so you write
flat props rather than a nested `schema` object:

```jsx
<ListView objectName="showcase_project" fields={['name', 'status']} pagination={{ pageSize: 25 }} />
```

`ListView` keeps its search term while data refreshes and while the desktop
search popover closes with Escape. Search clear buttons return focus to their
input. In dropdown `userFilters`, each active filter has a separate localized
clear button; clearing returns focus to the filter trigger, while Escape only
dismisses the open filter picker.

Use the **canonical** spelling of each prop — the one the contract publishes.
Several blocks still read older flat spellings as back-compat fallbacks but do
not declare them, so they are not authoring surface: on `<ObjectGrid>`, for
instance, `pageSize` and `fields` are deprecated aliases of `pagination` and
`columns`.

Function props (`onRowClick`, `onSelect`) are passed through as real callbacks —
that is how you wire one block to another.

`ObjectForm` also accepts the React-runtime props `values`, `onValuesChange`,
and `onControllerReady` for a host-owned save workflow. These are callback and
state props, **not** `ObjectFormSchema` / Spec / JSON keys. Controlled mode
supports simple create/edit forms, including grouped simple forms; other
variants or forms with subforms show an explicit unsupported-mode error.
`onControllerReady` publishes a controller while the form is loading as well;
`validate()` then returns an invalid `formError` until the form is ready, and
the callback receives `null` when the ObjectForm unmounts.

**Authoring boundary:** these props are absent from the generated
`@objectstack/spec` React Page contract. The example below describes the
trusted React runtime forwarding path only; it does not establish
`os validate`/publish acceptance for authored Pages. Wait for that contract to
include these props before treating such a Page as publishable.

The controller validates the same mounted form without submitting it. It
returns sanitized writable values only when valid, and reports RHF/native
validity errors (including revealing a collapsed group) otherwise:

```jsx
function Page() {
  const [values, setValues] = React.useState({ code: '' });
  const [controller, setController] = React.useState(null);
  const [error, setError] = React.useState('');

  async function saveThroughWorkflow() {
    if (!controller) return;
    const result = await controller.validate();
    if (!result.valid) {
      setError(result.formError ?? Object.values(result.errors).join(', '));
      return;
    }
    setError('');
    await runExistingBusinessAction(result.values);
  }

  return (
    <div>
      <ObjectForm
        objectName="purchase_order"
        mode="create"
        values={values}
        onValuesChange={setValues}
        onControllerReady={setController}
        showSubmit={false}
        submitHandler={(draft) => setValues(draft)}
      />
      {error && <p role="alert">{error}</p>}
      <button type="button" onClick={saveThroughWorkflow}>Save</button>
    </div>
  );
}
```

`runExistingBusinessAction` represents the page's existing workflow call; the
validate-only controller never invokes `submitHandler` or adapter
`create`/`update`. Hiding the form's submit button does not disable native
Enter-key submission. When an ObjectForm is used as a row collector with a data
source, provide `submitHandler` so Enter hands the values to the collector
instead of invoking generic CRUD. Echoing `onValuesChange` values back does not
reset the active form, and model defaults still fill keys omitted from the
host's `values` object.

While a host-owned save is pending, use a disabled fieldset or the dialog's
busy guard to block editing. Do not use `readOnly` as a generic busy flag:
field readonly semantics affect validation and the outbound values ObjectForm
allows through.

#### Composing relationship drafts in a native React host

`RelationshipCollectionEditor` is directly imported by native React hosts and
is also injected into trusted React Page scopes when the host eagerly imports
`@object-ui/plugin-form`. It resolves a declared child lookup or master-detail
relationship, renders each draft with the same ObjectForm, and exposes one
aggregate validate-only controller. A React `children` slot composes another
collection; it does not add recursive FormView metadata or change lookup
ownership. See the package's
[relationship draft API](https://github.com/objectstack-ai/objectui/blob/main/packages/plugin-form/README.md#relationship-collection-drafts)
for controlled rows, inclusion rules, and card/row presentation. The standalone
Console preview at `?sample=relationships` exercises the host composition and
does not persist records or prove transaction atomicity.

Row form edits merge against the editor's latest local draft collection. A
late value event from an existing row therefore preserves a sibling added
while the host is still applying an earlier `onChange`; hosts that defer their
controlled `value` updates should apply emitted snapshots in order or use
latest-state semantics.

The editor accepts existing React-only `sections` from
`@objectstack/spec/ui` `FormSection[]` and passes them through ObjectForm's
section pipeline. A `primaryField` names one declared boolean child field;
its localized header checkbox stays in the same controlled row values and
validation payload, while an optional `onPrimaryChange` lets the host enforce
mutual exclusion. The header respects field read/write access, static and
conditional readonly rules, and `visibleWhen`; pass the actual containing row
as `parentRecord` when child rules reference `parent.*`. No new persistent
field or relationship lifecycle is implied.

For `presentation="rows"`, `fieldWidths` maps row fields to the fixed 112px or
132px templates; unlisted fields fill the remaining space and order follows
`fields`. Only the built-in supported width signatures are accepted, with
unsupported combinations reported as configuration errors. At narrow
containers the row form and its single header stack to one column. Omitting
`fieldWidths` preserves the default layout.

One collision to know about: `type` is both the schema's component
discriminator and a legitimate prop name on some blocks (a chart's family, for
instance). The discriminator wins the `type` slot, and your value is preserved
next to it as `specType` for the block to read.

### `Block` — the escape hatch

Any registered component, including ones outside the public contract:

```jsx
<Block type="object-tree" objectName="showcase_category" />
```

### Live data

```jsx
function Page() {
  const adapter = useAdapter();
  const [rows, setRows] = React.useState([]);

  React.useEffect(() => {
    adapter
      .find('showcase_project', { $filter: ['status', '=', 'open'] })
      .then((res) => setRows(res.data ?? []));
  }, [adapter]);

  return <ul>{rows.map((r) => <li key={r._id}>{r.name}</li>)}</ul>;
}
```

Two things in that call are easy to get wrong, and neither one errors:

**The `$` prefixes are load-bearing.** Every query key starts with `$` —
`$select`, `$filter`, `$orderby`, `$skip`, `$top`, `$expand`, `$search`,
`$searchFields`, `$count`. An unprefixed `filters:` or `top:` is not a query option — the adapter
reads only the `$`-prefixed keys, so anything else is dropped and the call comes
back **unfiltered**, or with the default page size, with no error. `$filter`
takes an ObjectQL filter array — `['field', 'op', value]`, with `and`/`or`
compounds spelled `['and', [...], [...]]`.

**`find` resolves to a `QueryResult`, not an array.** It is
`{ data, total, page, pageSize, hasMore }`; the rows are `res.data`. Passing the
result straight to `setRows` and then calling `.map` on it throws.

### Source shapes

The page renders the source's **default export**. An implicit `export default`
is added when the source *starts with* JSX, a `function` declaration, `()`, or
`class`:

```jsx
function Page() { return <p/>; }     // ✅
<p>hi</p>                            // ✅
() => <p>hi</p>                      // ✅

const Page = () => <p/>;             // ❌ exports nothing
const Page = () => <p/>;
export default Page;                 // ✅
```

The `const Page = …` form does **not** get the implicit export — export it
explicitly. Getting this wrong reports an error in the page error panel; it does
not silently render blank.

### When something throws

Transpile errors, evaluation errors, and errors thrown while rendering all
surface in a **React page error** panel with the message. The error is held
until the page source or its data changes, so it does not flicker or escape to
the generic renderer error.

Referencing an identifier that is not in scope is the common case, and reads as
`ReferenceError: <Name> is not defined` — usually a layout container (not
injected — use HTML) or a block outside the public contract (use `Block`).

### Page state

A react page keeps its own `useState` across re-renders, lazy plugin loads, and
metadata refreshes that clone an unchanged Page payload. The renderer retains
the scope explicitly rather than relying on a React memo cache for correctness.
Changed Page metadata (including `source` or data/variables) and a **new data
source** rebuild the scope and reset page state. Opaque runtime values compare
by identity; JSON metadata compares by content.

That last one is a requirement on the **host**, not the author. The page is
recompiled when the adapter's *identity* changes, because recompiling is the
only way the new adapter reaches the blocks inside the page. So a host that
constructs a new adapter on every render resets every react page on every
render. Provide it from state or a module constant:

<!-- doc-snippet: fragment — a bad/good contrast of two bare JSX opening tags: neither half is a closed element, and showing them closed would hide the difference the section is about -->
```tsx
// ❌ new adapter object every render — every react page below loses its state
<AdapterCtx.Provider value={new ObjectStackAdapter(config)}>

// ✅
const [adapter, setAdapter] = useState<ObjectStackAdapter | null>(null);
<AdapterCtx.Provider value={adapter}>
```

`@object-ui/app-shell`'s `AdapterProvider` already does this correctly; the rule
matters for custom hosts and preview surfaces.

## `kind:'html'`

The constrained tier. Same JSX-looking syntax, but the source is **parsed**
into a schema tree and rendered through the normal renderer — never executed.
Only tags in the public block manifest are allowed, props are validated against
each block's declared inputs, and unknown tags are a hard error at save time.

Those tags are the **registered type names, written verbatim** — whatever the
registry spells, character for character, including a `record:` / `page:` /
`element:` / `action:` namespace prefix and any underscore inside the name:
`<list-view>`, `<object-form>`, `<record:related_list>`, `<record:quick_actions>`.
The whitelist is an exact string comparison, so nothing is normalised for you:
the **PascalCase** tags this page shows for `kind:'react'` are the other tier's
convention and are not registered names (`<ListView>` is rejected with
`<ListView> is not an allowed component`), and neither is a name re-spelled to
look uniform — `<record:related-list>` is not registered, only
`<record:related_list>` is.

Use it for anything author- or AI-generated. Expressions are limited to what the
schema supports (`${data.x}`), and there is no local state or event handling
beyond the action system.

Styling works the same way as on the react tier — *page source is never scanned
by the build* — but with this tier's own primitive: lay out with the blocks'
structured props (`<flex direction gap>`, `<grid columns>`) and add CSS as a JSON
`style` object. See *Styling*, above.

## Related

- [Slotted Pages](./slotted-pages.md) — `kind:'full'` / `kind:'slotted'` record pages.
- [Schema Rendering](./schema-rendering.md) — the schema tree the other kinds compile to.
- [Component Registry](./component-registry.md) — how blocks are registered and what makes one public.
