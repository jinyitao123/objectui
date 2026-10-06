# @object-ui/components

Standard UI component library for Object UI, built with Shadcn UI + Tailwind CSS.

## Host geometry tokens

Native grouped forms also support optional visual section numbers. A host can
set `--ui-section-step-display: inline-flex` on the form's containing surface;
the default is `none`. Each native form owns a separate counter, and only
rendered, titled section headers contribute a number. Numbers are decorative
and hidden from assistive technology; existing labels, collapse controls,
field membership, validation and filled counts keep their semantics.
`--ui-section-step-size`, `--ui-section-step-font-size` and
`--ui-section-step-font-weight` fall back to the corresponding
`--ui-document-section-step-*` geometry, then `1.25rem`, `0.75rem` and `700`.
These are CSS presentation tokens, not new FormSection or ObjectForm metadata
keys. Keep the section fields in one native form.

Trusted React Pages can use `RecordTable` with a `schema` prop matching the
existing `DataTableSchema`. It is the existing `data-table` renderer, registered
as a runtime-only component so React cell callbacks remain callable. It accepts
the same manual paging/sorting contract and performs no data requests itself.
Use model `ListView` for ordinary object lists; this direct surface is for
composite records whose cells combine authorized related data. The runtime
regression is `src/__tests__/record-table-runtime.test.tsx`. Custom cell callbacks own their display labels and tooltips; raw backing values are not added as hover titles to those cells.

`RecordTable` consumes host-scoped geometry variables on its model column
headers and data cells: `--ui-table-header-height`,
`--ui-table-header-padding-x`, `--ui-table-header-padding-y`,
`--ui-table-header-font-size`, `--ui-table-header-line-height`,
`--ui-table-header-font-weight`, `--ui-table-cell-padding-x`,
`--ui-table-cell-padding-y`, `--ui-table-font-size`, and
`--ui-table-cell-line-height`. Fallbacks preserve the existing Shadcn table
geometry when no host profile supplies these variables. The renderer does not
fix data row height: content, wrapping and supplied cell padding determine each
row. Hosts can scope values through a wrapper or the existing
`DataTableSchema.className`; the table root exposes `data-slot="record-table"`
for a stable selector. Column `className` and `cellClassName` remain explicit
overrides. Selection and action columns keep their utility sizing.

In the default scroll mode, an empty table keeps its header and spacer row but
renders the empty content beside the table track, pinned to the visible
horizontal viewport. A wide `DataTableSchema.className` table therefore does
not move its empty message to the center of the full column width. With
`disableInnerScroll`, the parent owns horizontal scrolling, so the renderer
keeps empty content in its table row instead of guessing the parent's viewport.
Hosts that can produce empty data in this shared-scroll mode must place any
viewport-centered empty content at their own scroll owner.

An embedding React host may supply runtime `emptyStateContent` to replace the
default copy in that viewport. The `DataTableSchema.emptyAction` node remains a
separate `SchemaRenderer` child, so its normal `visibleWhen` evaluation still
applies. `emptyStateContent` is a React composition prop, not a
`DataTableSchema` metadata member. The host-content viewport grows to fit its
node's natural minimum height; the standalone default retains its existing
fixed `h-48` viewport geometry.

Interactive `data-table` columns may set `fixed: 'left'` or `fixed: 'right'`.
The renderer pins both header and body cells and measures rendered header widths
so multiple fixed columns on the same side receive cumulative offsets. The
existing `frozenColumns` option continues to pin the leading data columns and
their selection/row-number utility columns. Existing right-pin declarations in
column `className`/`cellClassName` remain supported; the static `table` renderer
does not accept `fixed`.

## ResourceScheduleGrid

`ResourceScheduleGrid` is a host-driven React layout for resource-by-date
appointments. It reads no data source and owns no period navigation or business
state. The host supplies date columns (including seven, fourteen, or
twenty-eight day ranges), resource rows, and events; only events whose
`resourceId` and `dateKey` exactly match a supplied row and column are placed in
the matrix. The host keeps unmatched or unplanned events in its own list.

```tsx
import { ResourceScheduleGrid } from '@object-ui/components';

<ResourceScheduleGrid
  aria-label="Engineer schedule"
  resourceHeaderLabel="Engineer"
  resources={[{ id: 'r-1', label: 'Engineer One' }]}
  dateColumns={[{ key: '2030-04-01', label: 'Apr 1' }]}
  events={[{ id: 'e-1', resourceId: 'r-1', dateKey: '2030-04-01', title: 'Calibration' }]}
  emptyLabel="No resources in this period"
  onEventClick={openScheduleItem}
/>
```

Without `onEventClick`, event cards are display-only and are not exposed as
buttons. When supplied, events use native buttons; `renderEvent` customizes
their presentational content, and `renderResource` provides the host's resource
label slot without making the component guess avatars or other identity UI. One
internal horizontal scroller keeps the resource column pinned at the left and
does not widen its parent. The resource track stays at its configured width;
date columns keep fixed-width tracks, then use that same scroller when the date
range no longer fits. Short ranges may leave unused space at the right.

| Token | Default | Purpose |
|---|---:|---|
| `--ui-resource-schedule-resource-width` | `132px` | Pinned resource column width |
| `--ui-resource-schedule-date-min-width` | `110px` | Minimum date-column width |
| `--ui-resource-schedule-header-height` | `47.25px` | Date and resource header height |
| `--ui-resource-schedule-row-min-height` | `86px` | Resource row and empty-state minimum height |
| `--ui-resource-schedule-cell-padding` | `5.25px` | Cell inset |

`CompositeDialog` accepts an optional React `sidebar` and `sidebarLabel` for a
profile or document summary. On desktop the summary precedes the form in a
236px column (`--ui-dialog-sidebar-width`); narrow dialogs stack it above the
form. Both columns share body scrolling while the footer stays outside the
scroll region. The sidebar is presentation-only; controlled fields and discard
handling remain in the existing main form. See
`src/__tests__/composite-dialog.test.tsx` for draft preservation during cancellation.

The public `Button`/`buttonVariants`, `Input`, `SelectTrigger`/`SelectItem`, `Textarea`,
`Label`, and `NativeSelect` exports are wrappers in `src/custom/profile-controls.tsx`.
They preserve the Shadcn props and refs while consuming optional host CSS
variables. Upstream `src/ui` files stay untouched. With no variables supplied,
the wrappers retain the primitive size defaults; caller `className` overrides
still take priority.

The host can declare `--ui-control-height`, `--ui-control-small-height`,
`--ui-control-font-size`, `--ui-control-line-height`, `--ui-control-radius`,
`--ui-button-gap`, button/input padding variables, `--ui-label-font-size`,
and textarea height/padding variables. The Console's opt-in
`compact-enterprise` profile supplies a candidate geometry set in
`apps/console/src/index.css`; it changes no palette or data semantics.
The profile supplies a common compact table text and cell-padding baseline.
Surface-specific header and row geometry stays host-scoped because measured
contact, project and quote tables use different dimensions.

The form renderer also consumes `--ui-form-row-gap`, `--ui-form-column-gap`,
`--ui-field-stack-gap`, and section heading variables. Explicit schema layout
classes remain authoritative. Collapsible section headers support Enter and
Space in addition to pointer activation.

Section chrome consumes `--ui-section-border-width`, heading gap, accent
display/width/height, chevron order and count display tokens. The compact
profile places the chevron after the label and shows a filled/readable field
ratio; an empty array or missing value does not count as filled. Collapsing is
layout state: controllers remain registered, retain draft values and still
participate in validation. A submit error expands the relevant group before
focusing its first invalid field. Predicate and permission visibility retain
their separate semantics.
Native input validity is routed through the same reveal path when its control
is collapsed; browser validation runs before the RHF submit callback.

The public Card family and the JSON `card` renderer use custom wrappers over
the unchanged primitives. Host variables control radius, resting shadow,
padding, title typography, an inset header divider and content spacing. The
compact candidate uses a 5.25px radius, 17.5px content inset and a subtle
1px/2px resting shadow. Caller classes still override the defaults. A host
must compose a Card around a workspace that needs a panel boundary; field
controls do not manufacture page-level cards. Solid Dashboard surfaces opt in
through the compact host; default-host transparency and blur remain intact.

## Document workspaces

`DocumentWorkspace` composes a primary document and a complementary sidebar.
It measures its content container: narrow containers stack the two regions,
while wider containers use a flexible main column and a supporting column with
a 15rem minimum. At a 1020px content width the default 2.3:1 tracks land near
the 680px/300px proportions used by the purchase-entry reference. The default
gap is 18px and can be supplied by `--ui-document-workspace-gap`; there is no
resize handle to operate or announce.

`DocumentWorkspace` also accepts optional `footer`, `footerLabel` and
`footerClassName` React slots. Without a sidebar, the main content uses the full
container width; existing sidebar consumers keep their responsive tracks. The
footer is a named action group in normal document flow with sticky positioning
inside the nearest scroll container. Its offset, spacing and inset use
`--ui-document-footer-offset` (0px), `--ui-document-footer-gap` (10px),
`--ui-document-footer-padding-x` (18px) and
`--ui-document-footer-padding-y` (14px). The host owns each action, summary,
disabled state and draft guard. This adds no business action, serialized schema
key, form instance or financial calculation.

`DocumentSection` wraps a title, optional visible step number, optional header
actions and body in the public host-aware Card family. It renders a real `h2`
and labels its section from that heading. Its divider defaults to the full card
width; a section-local token changes its inset without changing other cards.
The other section tokens control title and step typography, step-circle size,
header and body spacing, and action gaps. Tokens inherit from the section's
host, and the rem-based defaults remain proportional when the compact profile
uses a 14px root font.

`variant="plain"` keeps the same section/heading association without a Card,
border, background or divider. Optional `icon`, `count` (including zero) and
`description` share a wrapping header row; actions remain at its end. Hosts
supply every label and count. Plain-header defaults are 20px height, 7px gaps,
a 14px icon, 13px/19.5px/600 title and 11px/16.5px/700 count with 3.5px radius.
The `--ui-document-section-plain-*` tokens override these dimensions; the
existing card variant remains the default.

`DataEmptyState` provides a status landmark for an empty result. Its optional
`titleClassName` and `descriptionClassName` override the existing typography
without becoming DOM attributes. Hosts can use `className` to choose compact
height/padding and pass a custom icon with `iconWrapperClassName=""`; omitting
`action` adds no control. It never infers whether an inaccessible or incomplete
result is empty.

| Token | Default | At a 14px root font |
|---|---:|---:|
| `--ui-document-section-divider-inset` | `0px` | full-width divider |
| `--ui-document-section-title-font-size` | `0.875rem` | `12.25px` |
| `--ui-document-section-title-line-height` | `1.25rem` | `17.5px` |
| `--ui-document-section-title-font-weight` | `700` | `700` |
| `--ui-document-section-step-size` | `1.25rem` | `17.5px` |
| `--ui-document-section-step-font-size` | `0.75rem` | `10.5px` |
| `--ui-document-section-step-font-weight` | `700` | `700` |
| `--ui-document-section-heading-gap` | `0.5rem` | `7px` |
| `--ui-document-section-action-gap` | `0.5rem` | `7px` |
| `--ui-document-section-header-padding-top` | `var(--ui-card-padding, 1.5rem)` | host Card padding |
| `--ui-document-section-header-padding-bottom` | `var(--ui-card-header-padding-bottom, 1.5rem)` | host Card header padding |
| `--ui-document-section-body-padding-top` | `var(--ui-card-content-padding-top, 1.25rem)` | host Card content padding |

These are React composition components, not serialized schema nodes; they own
layout and semantics, never document data or actions.

```tsx
import { DocumentSection, DocumentWorkspace } from '@object-ui/components';

<DocumentWorkspace
  sidebarLabel="Document summary"
  main={
    <DocumentSection title="Document details" stepNumber={1}>
      <p>Document fields</p>
    </DocumentSection>
  }
  sidebar={
    <DocumentSection title="Summary">
      <p>Supporting information</p>
    </DocumentSection>
  }
/>
```

## Controlled date ranges

`DateRangeControl` is a code-authored React control built from the shared
Calendar, Popover and profile Button. It accepts `value?: { from: string;
to: string }` in local `YYYY-MM-DD` form and calls `onValueChange` only after
two calendar selections complete a range. Closing an unfinished selection
discards the draft; the clear action emits `undefined`. Reopening starts at
the committed range's first month. `disabled`, `minDate` and `maxDate` apply
to calendar selection and shortcuts.

```tsx
import { DateRangeControl } from '@object-ui/components';

<DateRangeControl
  value={range}
  onValueChange={setRange}
  label="Receipt dates"
  quickRanges={[{ label: 'Previous week through today', daysBack: 7 }]}
/>
```

`quickRanges` contains host-owned labels and calendar-day offsets. An offset
of seven subtracts seven local calendar days and includes both endpoints;
the default inclusive seven-day shortcut uses six. This control does not
emit dashboard macros or query data. Trigger geometry uses profile Button
tokens and `--ui-date-range-control-width` (260px),
`--ui-date-range-control-icon-size` (14px) and
`--ui-date-range-control-gap` (7px). There is no serialized schema type.

## Features

- 🎨 **Tailwind Native** - Built entirely with Tailwind CSS utility classes
- 🧩 **Shadcn UI** - Based on Radix UI primitives for accessibility
- 📦 **60+ Components** - Complete set of UI components (46 from Shadcn + 14 custom)
- ♿ **Accessible** - WCAG compliant components
- 🎯 **Type-Safe** - Full TypeScript support
- 🔌 **Extensible** - Easy to customize and extend
- 🔄 **Sync Tools** - Scripts to keep components updated with latest Shadcn

## Keeping Components Updated

ObjectUI provides tools to sync components with the latest Shadcn UI versions:

```bash
# Analyze components (offline)
pnpm shadcn:analyze

# Check for updates (online)
pnpm shadcn:check

# Update a component
pnpm shadcn:update button --backup
```

**📚 See [README_SHADCN_SYNC.md](./README_SHADCN_SYNC.md) for the complete guide.**

## Installation

```bash
npm install @object-ui/components @object-ui/react @object-ui/core
```

**Peer Dependencies:**
- `react` ^18.0.0 || ^19.0.0
- `react-dom` ^18.0.0 || ^19.0.0
- `tailwindcss` ^4.2.1

## Setup

There is no `tailwind.config.js` step. This package is Tailwind 4, which is
configured in CSS: it has no such file of its own, and consuming it does not need
one on your side either.

### 1. Import Styles

Add to your main CSS file, after your own Tailwind entry:

```css
@import 'tailwindcss';
@import '@object-ui/components/style.css';
```

`style.css` is the stylesheet this package compiles at build time from its own
sources. It already carries every utility its components use **and** the theme
tokens those utilities are built on — `bg-primary`, `border-input`, `ring-ring`
and the rest of the Shadcn palette — so importing it is the whole of the styling
setup.

You do **not** add a `@source` line for `node_modules/@object-ui/components`.
Pointing Tailwind at the published files generates the shape-only utilities a
second time and still cannot produce the themed ones, because the `@theme` block
they come from lives in this package's unpublished source. Your own Tailwind
entry goes on generating the classes your own source uses, as it always did.

### 2. Register Components

```tsx
import { initializeComponents } from '@object-ui/components'

initializeComponents()
```

Importing the package already registers its components as a side effect;
`initializeComponents()` is the explicit call for bundlers that would otherwise
tree-shake that import away.

## Usage

### With SchemaRenderer

```tsx
import { SchemaRenderer } from '@object-ui/react'
import { initializeComponents } from '@object-ui/components'

initializeComponents()

const schema = {
  type: 'card',
  title: 'Welcome',
  children: {
    type: 'text',
    content: 'Hello from Object UI!'
  }
}

function App() {
  return <SchemaRenderer schema={schema} />
}
```

### Direct Import

You can also import UI components directly:

```tsx
import { Button, Input, Card } from '@object-ui/components'

function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter text" />
      <Button>Submit</Button>
    </Card>
  )
}
```

## Available Components

### Form Components
- `input` - Text input
- `textarea` - Multi-line text
- `select` - Dropdown select
- `checkbox` - Checkbox
- `radio` - Radio button
- `date-picker` - Date selection
- `switch` - Toggle switch

### Layout Components
- `container` - Container wrapper
- `grid` - Grid layout
- `flex` - Flexbox layout
- `card` - Card container
- `tabs` - Tab navigation
- `accordion` - Collapsible sections

### Data Display
- `table` - Data table
- `list` - List view
- `badge` - Badge label
- `avatar` - User avatar
- `progress` - Progress bar

### Feedback
- `alert` - Alert messages
- `toast` - Toast notifications
- `dialog` - Modal dialog
- `popover` - Popover overlay

### Navigation
- `button` - Button component
- `link` - Link component
- `breadcrumb` - Breadcrumb navigation

## Notification Surfaces

Direct-import React components (not schema blocks) that render the notifications
raised through `NotificationProvider` from `@object-ui/react`. One per spec
`displayType`, so a `banner` no longer presents as a toast:

| Component | `displayType` | Where to mount it |
| --- | --- | --- |
| `<NotificationSnackbar />` | `snackbar` | anywhere inside the provider — it anchors itself bottom-center |
| `<NotificationBanners />` | `banner` | top of the content area (it takes space in the flow) |
| `<NotificationAlerts />` | `alert` | anywhere inside the provider — blocking dialog, FIFO queue |
| `<NotificationInline scope="…" />` | `inline` | in the surface that raises them |

`toast` stays with the host's `onToast` delegate (sonner in the console). All of
them draw the notification's `severity` icon unless it declares an `icon`
override naming a real Lucide icon. See the
[notifications guide](https://objectui.org/docs/guide/notifications).

<!-- doc-snippet: fragment — router-layout excerpt: `Outlet` is react-router's, supplied by the host application -->
```tsx
import { NotificationBanners, NotificationAlerts } from '@object-ui/components';

<main>
  <NotificationBanners />
  <Outlet />
  <NotificationAlerts />
</main>
```

## Customization

### Override Styles

All components accept `className` for Tailwind classes:

```json
{
  "type": "button",
  "label": "Click Me",
  "className": "bg-blue-500 hover:bg-blue-700 text-white"
}
```

### Custom Components

`CompositeDialog` is a native React frame for compound forms. Its controlled
`open`, `onOpenChange`, `title`, optional `description`, and `children` compose
multiple sibling ObjectForms without nested HTML forms. It uses the same
MobileDialogContent, modal geometry tokens, accessible title/description, and
independent body scrolling as the form containers. It is not a serialized
FormView variant or a persistence API.

`footer` accepts a React node or `({ requestClose, busy }) => ReactNode`. Route
footer cancellation through `requestClose` to share the Escape/backdrop/Close
guard. With `confirmOnDiscard`, closing requests confirmation and continuing
editing preserves the mounted draft. The host sets this flag from its compound
draft policy. `busy` disables Close, rejects cancellation, and disables the body
form controls through a fieldset while saving. This keeps validate-only form
values intact; do not turn model fields read-only merely to block busy input. The
exported types are `CompositeDialogProps` and `CompositeDialogControls`. Each modal level records the focused control when it
opens and returns focus there when it closes, provided that control still exists
and remains enabled. An intentionally focused replacement view retains focus.
Dismissed discard prompts return to the draft control without remounting fields.
A supplied `description` remains linked to the dialog; without one, only the title
labels the dialog and no generic form instruction is added. The behavioral
regressions live in `src/__tests__/composite-dialog.test.tsx`.

Trusted React Pages retain their runtime scope when normalization or metadata
refresh clones the same Page payload. This preserves an open form and its draft.
Changed metadata or a different adapter still rebuilds the page scope; opaque
runtime values compare by identity.

Register your own components:

```tsx
import { ComponentRegistry } from '@object-ui/core'
import { Button } from '@object-ui/components'

function CustomButton(props: Record<string, unknown>) {
  return <Button {...props} className="my-custom-style" />
}

ComponentRegistry.register('custom-button', CustomButton)
```

`ComponentRegistry` is a process-level singleton exported by `@object-ui/core`;
`SchemaRenderer` resolves every `type` against it, so a component registered
here is renderable from schema anywhere in the app.

Trusted `kind: 'react'` pages receive a `navigate(to, options?)` function in
their source scope. It uses the host's SPA router for internal paths when the
host supplies `HostNavigationContext`; a standalone host without that context
retains browser navigation. Use an anchor for external destinations.

For a React page whose source renders its own `<h1>`, subtitle and full layout,
set the standard Page `template` string to `react-source`. PageRenderer then
omits its automatic label, description, width cap and default padding for that
page. This applies only to `kind: 'react'`; omitting the template preserves the
existing shell, including its title for React pages without an authored heading.

```jsx
function Page() {
  return <button onClick={() => navigate('/apps/crm/accounts')}>Accounts</button>;
}
```

## API Reference

See [full documentation](https://objectui.org/docs/components) for detailed API reference.

## Links

- 📚 [Documentation](https://www.objectui.org/docs/components)
- 📦 [npm package](https://www.npmjs.com/package/@object-ui/components)
- 📝 [Changelog](./CHANGELOG.md)
- 🐛 [Report an issue](https://github.com/objectstack-ai/objectui/issues)
- 🤝 [Contributing Guide](https://github.com/objectstack-ai/objectui/blob/main/CONTRIBUTING.md)
- 🗺️ [Roadmap](https://github.com/objectstack-ai/objectui/blob/main/ROADMAP.md)

## License

MIT — see [LICENSE](./LICENSE).
