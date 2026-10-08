---
"@object-ui/fields": minor
"@object-ui/react": patch
---

Add an opt-in labelled rows presentation to GridField with host-controlled
column options and calculations. Preserve saved read-only values and keep
editable computed results consistent with emitted rows, including columns
hidden by the standard grid. Retain row identity and keyboard/IME navigation.

Limit row resolver overrides to input presentation. Keep the new host props
and input bounds out of authored field:grid metadata while preserving native
columns and explicit React host overrides.
