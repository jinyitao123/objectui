---
"@object-ui/components": patch
"@object-ui/console": patch
"@object-ui/plugin-form": patch
"@object-ui/app-shell": patch
"@object-ui/plugin-grid": patch
"@object-ui/plugin-list": patch
"@object-ui/fields": patch
---

Add an opt-in compact enterprise geometry profile through custom control wrappers, retaining upstream Shadcn files and default size fallbacks. Extend the profile to field spacing, grouped forms, modal chrome, list toolbars, table cells and inferred form columns. Forward explicitly authored default FormView columns to the native record modal. Collapsible form section headers support Enter and Space. Model validation, permissions and submission continue through the existing renderers.
