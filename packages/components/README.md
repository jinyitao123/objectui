# @object-ui/components

Standard UI component library for Object UI, built with Shadcn UI + Tailwind CSS.

## Host geometry tokens

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
draft policy. `busy` disables Close and rejects cancellation while saving. The
exported types are `CompositeDialogProps` and `CompositeDialogControls`.

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
