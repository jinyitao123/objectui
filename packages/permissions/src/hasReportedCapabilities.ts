/**
 * Answer a capability gate only when the backend actually reported a grant
 * set. `hasCapabilities` deliberately fails open for older/unmounted
 * providers; record-ID diagnostics require explicit developer authorization.
 */
import type { PermissionContextValue } from './PermissionContext.js';

export function hasReportedCapabilities(
  permissions: Pick<PermissionContextValue, 'systemPermissions' | 'hasCapabilities'>,
  required: string[],
): boolean {
  return Array.isArray(permissions.systemPermissions) && permissions.hasCapabilities(required);
}
