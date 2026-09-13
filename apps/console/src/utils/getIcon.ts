/**
 * Icon utilities
 *
 * ⛔ NOT a resolver. This is a re-export of `@object-ui/components`'
 * `getLazyIcon`, kept only so the call sites in this app can go on saying
 * `getIcon(name)`.
 *
 * It used to wrap `lucide-react/dynamic.mjs`'s `DynamicIcon` directly, with no
 * membership check at all, which put that module's 120,683-byte import map on
 * the eager path for a lookup the shared resolver already does — and did it
 * against a vocabulary this copy never consulted (objectui#9204).
 *
 * The result is still memoised per name in the shared resolver, so call sites
 * still get a stable component reference across renders; the targeted
 * `react-hooks/static-components` disables at those sites point back here.
 */

export { getLazyIcon as getIcon } from '@object-ui/components';
