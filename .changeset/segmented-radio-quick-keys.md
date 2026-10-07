---
'@object-ui/components': patch
---

Keep segmented-radio focus and selection in the same keyboard event so a quick
keyup cannot leave the focused option unselected. Preserve disabled choices,
RTL direction, optional non-looping navigation, focus-only Home/End and a
single controlled change callback per navigation event.
