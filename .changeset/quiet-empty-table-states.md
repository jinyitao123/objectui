---
"@object-ui/components": minor
"@object-ui/plugin-grid": minor
"@object-ui/plugin-list": minor
"@object-ui/react": patch
---

Expose opt-in React props for row numbers and confirmed empty table presentation.

ListView and ObjectGrid hosts can hide the number column independently of
selection, and suppress empty headers or pagination after a successful read
with a known zero total, or from explicitly supplied synchronous empty rows.
RecordTable keeps these empty-state choices outside serialized metadata. Default
rendering, populated tables, loading and error states remain unchanged; fixed
columns are measured again when a hidden empty header returns.

The SchemaRenderer bridge keeps these React-only options out of authored table
and view props while preserving explicit host overrides, registered aliases,
and DataTable's existing row-number metadata.
