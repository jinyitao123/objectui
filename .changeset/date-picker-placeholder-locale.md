---
'@object-ui/components': patch
'@object-ui/i18n': patch
---

`DatePicker` now uses the active locale's calendar placeholder when no authored
placeholder is supplied. Explicit placeholder text, including an empty string,
continues to take precedence.
