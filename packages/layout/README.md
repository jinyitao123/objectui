# @object-ui/layout

Layout components for Object UI - provides application shell components for building structured layouts with React Router integration.

## Features

- **Application Shell** - Complete app layout structure with header, sidebar, and content areas
- **Page Components** - Standard page layouts with headers and content sections
- **Navigation** - Sidebar navigation with React Router integration
- **Responsive** - Mobile-friendly layouts with collapsible sidebars
- **Tailwind Native** - Built with Tailwind CSS for easy customization

## Installation

```bash
pnpm add @object-ui/layout
```

**Peer Dependencies:**
- `react` ^18.0.0 || ^19.0.0
- `react-dom` ^18.0.0 || ^19.0.0
- `react-router-dom` ^6.0.0 || ^7.0.0

## Registration

Importing this package registers its component keys (`page-header`, `page:card`,
`responsive-grid`, `navigation-renderer`, `app-schema-renderer`) on the
`ComponentRegistry` as a module load side effect, so the side-effect-only import
is enough:

```typescript
import '@object-ui/layout';
```

That is a supported entry point, not an accident of the build: `package.json`
declares the registering modules in `sideEffects`, which is what stops a bundler
from tree-shaking a side-effect-only import away (objectui#3899 — the manifest
used to say `"sideEffects": false`, and a bundler honouring it dropped the
registration silently). `registerLayout()` is also exported for hosts that
prefer to register explicitly.

## Components

### AppShell

Complete application shell with a top navbar, a sidebar, and a main content area.

```typescript
import { AppShell } from '@object-ui/layout';

<AppShell
  navbar={<div>Navbar Content</div>}
  sidebar={<div>Sidebar Content</div>}
>
  <div>Main Content</div>
</AppShell>
```

The top bar's content goes in `navbar`. `AppShell` renders the `<header>`
element itself (`src/AppShell.tsx:248`) and `{navbar}` is the only thing that
fills it (`:249`) — there is no `header` prop. This example used to pass one
(objectui#4817), and because the component destructures a fixed key list with
**no rest element** (`:233-241`), the node was built and then dropped on the
floor: copied verbatim, the snippet rendered an empty top bar and said nothing.

Like `SidebarNav` below, `AppShell` is composed in JSX and is **not** on the
`ComponentRegistry`: four of its seven props are `React.ReactNode` slots that no
JSON document can fill, so the `app-shell` key was retired in objectui#4841 and
`{ "type": "app-shell" }` now reports `Unknown component type`. When the whole
shell has to come from metadata, the key for that is `app-schema-renderer`.

#### `AppShellProps`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `children` | `React.ReactNode` | — (required) | Main content, rendered inside the `<main>` element. |
| `navbar` | `React.ReactNode` | — | Top bar content. `AppShell` supplies the sticky `<header>` around it, so pass only what goes inside. |
| `sidebar` | `React.ReactNode` | — | Left sidebar node, rendered as a flex sibling of the content. Pass `SidebarNav`, or your own node. |
| `rightRail` | `React.ReactNode` | — | Optional right-side rail. It reflows the content beside it rather than overlaying it (ADR-0057 P3a); absent → unchanged single-pane layout. |
| `className` | `string` | — | Tailwind overrides for the `<main>` content element — **not** for the outer container. |
| `defaultOpen` | `boolean` | `true` | Initial open state of the underlying Shadcn `SidebarProvider`. |
| `branding` | `AppShellBranding` | — | App branding, applied by `useAppShellBranding`: `primaryColor` / `accentColor` become CSS custom properties on the document root (re-derived for dark mode), `favicon` sets the icon link's `href`, and `title` sets `document.title`. |

### PageHeader

Page title block with an optional subtitle, used at the top of a page's
content area.

```typescript
import { PageHeader } from '@object-ui/layout';

<PageHeader title="Dashboard" subtitle="View your metrics" />
```

`subtitle` is the only spelling for the secondary line — it is the key
`@objectstack/spec/ui`'s `PageHeaderProps` declares. The legacy `description`
alias this component used to read as well was retired in objectui#3789; stored
metadata still carrying it is rewritten to `subtitle` at load time by the
ADR-0087 D2 conversion `page-header-subtitle-alias`.

Pass action controls as React children. They render in the right-aligned action
slot, and clicks in that slot do not bubble to a clickable page container.
`titleClassName` and `subtitleClassName` provide element-level overrides. The
title also consumes `--ui-page-title-font-size`, `--ui-page-title-line-height`
and `--ui-page-title-font-weight`, with CSS fallbacks for hosts without a
profile.

```tsx
<PageHeader title="Contacts" subtitle="Manage customer contacts">
  <button type="button" onClick={createContact}>New contact</button>
</PageHeader>
```

### ListSummary

`ListSummary` renders a host-provided collection of labels and values as a
responsive one-, two- or four-column summary. It does not read a data source or
derive business counts.

```tsx
import { ListSummary, type ListSummaryItem } from '@object-ui/layout';

const summary: ListSummaryItem[] = [
  { id: 'all', label: 'All contacts', value: 128 },
  { id: 'active', label: 'Active', value: 96 },
];

<ListSummary aria-label="Contact summary" items={summary} />
```

Each item's `id` is the stable React key. `className`, `itemClassName`,
`labelClassName` and `valueClassName` are Tailwind override points. Hosts may
also tune the geometry with `--ui-list-summary-gap`,
`--ui-list-summary-item-gap`, `--ui-list-summary-card-height`,
`--ui-list-summary-card-radius`,
`--ui-list-summary-padding-inline`, `--ui-list-summary-padding-block`,
`--ui-list-summary-label-*` and `--ui-list-summary-value-*` custom properties.
The responsive grid uses its own container width, so four cards do not depend
on a fixed card width.

### StatusTabs

`StatusTabs` is a controlled status filter strip. The host supplies the selected
value, status counts and change handler; the tab component does not translate a
status into a query.

```tsx
import { StatusTabs, type StatusTabItem } from '@object-ui/layout';

const statuses: StatusTabItem[] = [
  { value: 'all', label: 'All', count: 128 },
  { value: 'active', label: 'Active', count: 96 },
  { value: 'inactive', label: 'Inactive', count: 32 },
];

<StatusTabs
  aria-label="Contact status"
  panelId="contact-results"
  items={statuses}
  value={status}
  onValueChange={setStatus}
/>
<section id="contact-results" role="tabpanel" aria-label="Contact results" tabIndex={0}>
  {/* Render the host's already-filtered list here. */}
</section>
```

The existing Radix Tabs primitive supplies tab roles, roving focus and arrow-key
navigation. `aria-label` names the tab list; `panelId` must match the id of the
host's `role="tabpanel"` list region. `listClassName`, `tabClassName` and
`countClassName` expose styling slots; hosts can set `--ui-status-tabs-height`,
`--ui-status-tabs-padding-inline`, `--ui-status-tabs-padding-block`,
`--ui-status-tabs-font-size`, `--ui-status-tabs-line-height` and
`--ui-status-tabs-radius` per surface. The default fallbacks preserve the
existing tab geometry; hosts can scope measured surface values on the
component or an ancestor without changing its controlled state or Radix
keyboard behavior.

### WorkspaceToolbar

`WorkspaceToolbar` lays out host-owned search, filter, secondary-action, and
primary-action content in a wrapping workspace control group. It does not
create controls, hold filter state, issue queries, or decide whether actions
are permitted. The required `aria-label` names the group; controls keep their
own labels and normal keyboard tab order.

```tsx
import { StatusTabs, WorkspaceToolbar } from '@object-ui/layout';

<WorkspaceToolbar
  aria-label="Project task controls"
  search={<input aria-label="Search tasks" value={search} onChange={onSearchChange} />}
  filters={
    <StatusTabs
      aria-label="Task status"
      panelId="task-results"
      items={statuses}
      value={status}
      onValueChange={setStatus}
    />
  }
  auxiliaryActions={<button type="button" onClick={refresh}>Refresh</button>}
  primaryAction={<button type="button" onClick={createTask}>New task</button>}
/>
```

The search slot flexes into available width; filters and action groups wrap
when their content no longer fits. `className` lets a host scope additional layout
geometry. The default group gap uses the existing `--ui-button-gap` token.
Control state, queries, and permission checks stay in the host.

Importing `@object-ui/layout` also registers `WorkspaceHeader`, `WorkspaceToolbar`,
`ListSummary` and `StatusTabs` as presentation-only React Page runtime
components. This is a code-only runtime capability: the names are not schema component keys or
`@objectstack/spec` authoring props. The registration happens when the package
loads, before a React Page builds its stable component scope.

> **Rendering a whole `page` node?** That belongs to `PageRenderer` in
> `@object-ui/components`, which is what the `page` component key resolves to —
> it handles page types (record/home/app/utility), named regions and page
> variables. This package deliberately does not register or export a second
> renderer for that key (objectui#3223).

### SidebarNav

Navigation sidebar component with React Router integration.

```typescript
import { SidebarNav, type NavItem } from '@object-ui/layout';
import { Home, Settings, Users } from 'lucide-react';

const navItems: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: Home },
  { title: 'Users', href: '/users', icon: Users },
  { title: 'Settings', href: '/settings', icon: Settings },
];

<SidebarNav items={navItems} />
```

An item's label is `title` and its target is `href` — and `icon` is a **component**,
not an icon name: it is rendered as `<item.icon />` (`src/SidebarNav.tsx:60`, `:109`),
so pass the imported Lucide component itself. This example used to be written with
`label` / `path` / `icon: 'home'`, none of which `NavItem` declares (objectui#3999);
copied as-is it produced rows with no label at all, a `NavLink` whose `to` was
`undefined`, and the string `'home'` handed to React as an unknown lowercase tag.
Annotating the array as `NavItem[]` is what turns that whole class of typo back into
a compile error where it is written, instead of a blank sidebar at runtime.

Console application navigation built by `NavigationRenderer.resolveHref` maps a
page target to the bare app entry segment (`/apps/<appName>/<pageName>`), the
same route used for object entries. The app shell resolves pages in the active
package and only permits shared objects that the app references in navigation;
it reports a page/object name collision instead of choosing one surface
silently.

#### `SidebarNavProps`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `items` | `NavItem[] \| NavGroup[]` | — (required) | Flat item list, or grouped sections. The array must be homogeneous: only the **first** element is probed to decide which of the two it is. |
| `title` | `string` | `'Application'` | Section label shown above a flat `NavItem[]`. Ignored when `items` is a `NavGroup[]` — each group prints its own `label`. |
| `className` | `string` | — | Tailwind overrides, forwarded to the root `Sidebar`. |
| `collapsible` | `'offcanvas' \| 'icon' \| 'none'` | `'icon'` | Collapse behaviour of the underlying Shadcn `Sidebar`. |
| `searchEnabled` | `boolean` | `false` | Renders a search box that filters items by `title` (an item also survives when one of its `children` matches). |
| `searchPlaceholder` | `string` | `'Search…'` | Placeholder for that search box. |

#### `NavItem`

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `title` | `string` | — (required) | The visible label, and what search matches against. |
| `href` | `string` | — (required) | `NavLink` target; also the React key, so keep it unique within its list. Active state is `pathname === href`. |
| `icon` | `React.ComponentType<{ className?: string }>` | — | The icon **component** (e.g. `Home` from `lucide-react`), not its name. |
| `badge` | `string \| number` | — | Trailing badge content. Rendered whenever it is not `null`/`undefined`, so `0` shows. |
| `badgeVariant` | `'default' \| 'destructive' \| 'outline'` | `'default'` | Badge styling. |
| `children` | `NavItem[]` | — | Nested sub-items. A non-empty list turns the row into a collapsible group: the parent's own `href` is then no longer a link, only the children are. |

#### `NavGroup`

| Key | Type | Description |
| --- | --- | --- |
| `label` | `string` | Section heading printed above the group. |
| `items` | `NavItem[]` | The group's items — same `NavItem` shape as above, nesting included. |

```typescript
import { SidebarNav, type NavGroup } from '@object-ui/layout';
import { FolderOpen, Home, Settings } from 'lucide-react';

const navGroups: NavGroup[] = [
  {
    label: 'Workspace',
    items: [
      { title: 'Dashboard', href: '/dashboard', icon: Home },
      {
        title: 'Projects',
        href: '/projects',
        icon: FolderOpen,
        badge: 3,
        children: [
          { title: 'Active', href: '/projects/active' },
          { title: 'Archived', href: '/projects/archived', badge: 'WIP', badgeVariant: 'outline' },
        ],
      },
    ],
  },
  {
    label: 'System',
    items: [{ title: 'Settings', href: '/settings', icon: Settings }],
  },
];

<SidebarNav items={navGroups} searchEnabled />
```

Note that `SidebarNav` is a plain React component: unlike the keys listed under
[Registration](#registration) it is **not** on the `ComponentRegistry`, so it is
composed in JSX rather than authored as a JSON node. Full guide:
[SidebarNav docs](https://www.objectui.org/docs/layout/sidebar-nav).

## Usage with React Router

The layout components are designed to work seamlessly with React Router:

```typescript
import type { ComponentType, ReactNode } from 'react';
import { AppShell, SidebarNav } from '@object-ui/layout';
import { Home, Users } from 'lucide-react';

// `react-router-dom` is a PEER dependency (see Installation above): your app
// installs it, this package does not. These three stand in for what you would
// import from it, so the composition below is still checked against the shipped
// `@object-ui/layout` types.
declare const BrowserRouter: ComponentType<{ children?: ReactNode }>;
declare const Routes: ComponentType<{ children?: ReactNode }>;
declare const Route: ComponentType<{ path: string; element: ReactNode }>;

// Your own page components, one per route.
declare const Dashboard: ComponentType;
declare const UsersPage: ComponentType;

function App() {
  return (
    <BrowserRouter>
      <AppShell
        navbar={<div className="p-4">My App</div>}
        sidebar={
          <SidebarNav
            items={[
              { title: 'Dashboard', href: '/', icon: Home },
              { title: 'Users', href: '/users', icon: Users },
            ]}
          />
        }
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/users" element={<UsersPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
```

A route's `element` takes **your page component**, never the `lucide-react` icon
of the same name. This example used to route `/users` to `Users` — the icon it
imports for the sidebar — so the page rendered a 24-pixel glyph where its content
belonged. Nothing catches that for you: an icon is a valid component, so the
route type-checks either way, which is why the two are named apart here.

## Customization

`AppShell` takes a single `className`, and it lands on the `<main>` content
element (`src/AppShell.tsx:256`) rather than on the outer container. There is no
per-slot `headerClassName` / `sidebarClassName` — the navbar and the sidebar are
nodes **you** build, so style them where you build them:

```typescript
import { AppShell } from '@object-ui/layout';

<AppShell
  className="bg-gray-50"
  navbar={<div className="border-b px-4">My App</div>}
  sidebar={<div className="bg-white shadow-lg">Sidebar Content</div>}
>
  <div>Main Content</div>
</AppShell>
```

## API Reference

For detailed API documentation, visit the [Object UI Documentation](https://www.objectui.org/docs/layout/app-shell).

## Links

- 📚 [Documentation](https://www.objectui.org/docs/guide/layout)
- 📦 [npm package](https://www.npmjs.com/package/@object-ui/layout)
- 📝 [Changelog](./CHANGELOG.md)
- 🐛 [Report an issue](https://github.com/objectstack-ai/objectui/issues)
- 🤝 [Contributing Guide](https://github.com/objectstack-ai/objectui/blob/main/CONTRIBUTING.md)
- 🗺️ [Roadmap](https://github.com/objectstack-ai/objectui/blob/main/ROADMAP.md)

## License

MIT — see [LICENSE](./LICENSE).


### AppShell geometry profile

`AppShell` consumes host CSS custom properties `--ui-app-sidebar-width` and `--ui-app-topbar-height`. Their defaults remain `16rem` and `3.5rem`. The compact Console profile supplies `240px` and `68px`; these dimensions belong to application chrome, independently of dialog summary columns and page content. Sidebar collapse and mobile behavior continue to use the native sidebar component.
