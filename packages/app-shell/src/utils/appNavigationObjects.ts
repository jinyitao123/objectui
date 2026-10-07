/**
 * Object names an application actually references in its navigation tree.
 * This is the lightweight name directory used to scope runtime metadata reads.
 */
export function collectAppNavigationObjectNames(application: unknown): string[] {
  if (!application || typeof application !== 'object') return [];
  const app = application as { navigation?: unknown; areas?: unknown };
  const roots: unknown[] = [
    ...(Array.isArray(app.navigation) ? app.navigation : []),
    ...(Array.isArray(app.areas)
      ? app.areas.flatMap((area) => {
          if (!area || typeof area !== 'object') return [];
          const navigation = (area as { navigation?: unknown }).navigation;
          return Array.isArray(navigation) ? navigation : [];
        })
      : []),
  ];
  const names = new Set<string>();
  const visit = (items: unknown[]) => {
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const entry = item as { type?: unknown; objectName?: unknown; requiresObject?: unknown; children?: unknown };
      if (entry.type === 'object' && typeof entry.objectName === 'string' && entry.objectName) {
        names.add(entry.objectName);
      }
      if (typeof entry.requiresObject === 'string' && entry.requiresObject) names.add(entry.requiresObject);
      if (Array.isArray(entry.children)) visit(entry.children);
    }
  };
  visit(roots);
  return [...names];
}

/** Object entry in `/apps/:app/:entry` or a typed Object route, if present. */
export function objectNameFromAppPath(pathname: string): string | undefined {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'apps' || !segments[1] || !segments[2]) return undefined;
  const routePrefixes = new Set([
    'metadata', 'system', 'dashboard', 'report', 'design', 'component',
    'create-app', 'edit-app', 'search', 'setup',
  ]);
  if (routePrefixes.has(segments[2])) return undefined;
  try {
    return decodeURIComponent(segments[2]);
  } catch {
    return segments[2];
  }
}
