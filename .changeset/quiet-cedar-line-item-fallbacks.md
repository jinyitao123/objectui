---
'@object-ui/plugin-form': patch
'@object-ui/fields': patch
'@object-ui/i18n': patch
---

Localize the accessible description and default line-items heading in compound
forms, and the column chooser labels in inline grids. Compound line totals now
show an em dash when a masked, omitted, or invalid amount cannot be read; valid
zero values and empty create-mode collections still total zero.
