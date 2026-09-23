---
'@object-ui/app-shell': patch
---

Resolve app Object schemas by referenced names so ordinary Console entry does not load the full Object catalog. Load the full registry only for record detail, whose reverse related-list graph requires child schemas.
