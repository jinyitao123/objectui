---
'@object-ui/fields': minor
'@object-ui/core': patch
'@object-ui/components': patch
'@object-ui/plugin-form': patch
---

Render declared single-value options as responsive choice cards with descriptions,
keyboard selection, localization, and the existing cascading-option rules. Bind
document workspace components to the trusted React runtime without introducing
serialized Page or field properties.

Add controlled row selection and a typed React-only toolbar slot to GridField;
batch updates stay on the existing `onChange` path and respect computed, readonly,
delete, and row-limit rules.

Use the shared calendar for date cells in the compact enterprise profile while
preserving the default host's native temporal adapters.
