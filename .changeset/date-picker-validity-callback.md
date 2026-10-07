---
'@object-ui/components': patch
---

Allow DatePicker hosts to retain its existing date parsing/range validity
through an optional onValidityChange callback when a collapsible section
unmounts the input. Keep required checks, native custom validity and date
parsing behavior unchanged.
