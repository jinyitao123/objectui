/**
 * Icon utilities
 *
 * ⛔ NOT a resolver. This is a re-export of `@object-ui/components`'
 * `getLazyIcon`, kept only so the call sites in this package can go on saying
 * `getIcon(name)`.
 *
 * It used to be a third transcription of the same twenty lines — its own
 * `toKebab`, its own `Set(iconNames)` over `lucide-react/dynamic.mjs`, its own
 * memo cache. Three copies meant three vocabularies that could drift, and each
 * `Set(iconNames)` paid for lucide's 120,683-byte import map on the eager path
 * (objectui#9204). One resolver, one vocabulary, one memo.
 */

export { getLazyIcon as getIcon } from '@object-ui/components';
