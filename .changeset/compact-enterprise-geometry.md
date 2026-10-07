---
"@object-ui/components": patch
"@object-ui/console": patch
"@object-ui/plugin-form": patch
"@object-ui/app-shell": patch
"@object-ui/plugin-grid": patch
"@object-ui/plugin-list": patch
"@object-ui/plugin-gantt": patch
"@object-ui/fields": patch
"@object-ui/plugin-dashboard": patch
"@object-ui/plugin-charts": patch
---

Add an opt-in compact enterprise geometry profile through custom control wrappers, retaining upstream Shadcn files and default size fallbacks. Extend the profile to field spacing, grouped forms, modal chrome, list toolbars, table cells and inferred form columns. Forward explicitly authored default FormView columns to the native record modal. Collapsible form section headers support Enter and Space. Model validation, permissions and submission continue through the existing renderers.

Remove duplicate desktop modal padding. Preserve registered drafts and validation
when a group collapses, expand invalid groups on submit, and carry collapse from
both authored modal sections and object field groups. Add opt-in section counters
and heading geometry. Compact date fields use the shared localized calendar and
retain date-only values and bounds. Inline master-detail grids share the host
control geometry without changing row computation or atomic submission.
Add public Card wrappers and use them in the JSON card renderer, retaining
primitive refs and caller overrides. Compact card geometry includes radius,
inset divider, padding, title hierarchy and a light resting shadow. Compact
dirty Cancel uses the existing discard guard; the default host remains unchanged.
Reveal a collapsed group when native input validity rejects submission before
react-hook-form receives the event, retaining the invalid draft and write gate.
Expose a host plot-height token in the shared chart container, scoped by native
Dataset dashboards. Retain the 350px fallback and explicit dimension precedence.
Expose a persistent host-controlled list search row. Relay active filters and
search to the native Gantt query, preserve the timeline's full-data ceiling,
and forward only existing host navigation callbacks. Compact timelines can
follow their row height without a 420px minimum canvas.
Dataset KPI headers consume existing icon and description metadata; compact
hosts expose help and emphasis chrome. Declared metric drill actions use the
original query scope and shared drill drawer. Native approvals expose the
existing cancelled status in submitted/all queues without widening pending.
