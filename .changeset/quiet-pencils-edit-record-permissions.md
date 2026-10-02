---
"@object-ui/app-shell": patch
"@object-ui/plugin-detail": patch
---

Require resolved object-update and field-write permission before offering generic inline record edits, while keeping API-operation and record-level gates. Restrict copying internal record IDs to principals with reported `studio.access` or `setup.access` capability.
