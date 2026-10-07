import { useEffect, useState } from 'react';
import { useMetadata } from '../providers/MetadataProvider.js';
import { collectAppNavigationObjectNames } from '../utils/appNavigationObjects.js';

export interface ApplicationObjectReadError {
  name: string;
  error: Error;
}

export interface ApplicationObjectsState {
  objects: any[];
  loading: boolean;
  errors: ApplicationObjectReadError[];
}

/**
 * Read only Object schemas referenced by the active app, plus explicitly named
 * runtime targets. A shared-package fallback is allowed only for an Object
 * the app navigation actually references; transport and permission failures
 * stay distinct from a 404 miss and never trigger that fallback.
 */
export function useApplicationObjects(
  application: unknown,
  additionalNames: readonly string[] = [],
  additionalSharedNames: readonly string[] = [],
): ApplicationObjectsState {
  const metadata = useMetadata();
  const { getItem, getItemScope } = metadata;
  const navigationNames = collectAppNavigationObjectNames(application);
  const navigationNameSet = new Set([...navigationNames, ...additionalSharedNames]);
  const names = [...new Set([
    ...navigationNames,
    ...additionalNames.filter((name) => typeof name === 'string' && name.length > 0),
  ])];
  const packageId = application && typeof application === 'object'
    && typeof (application as { _packageId?: unknown })._packageId === 'string'
    ? (application as { _packageId: string })._packageId
    : undefined;
  const noProvider = getItemScope === 'no-provider' || typeof getItem !== 'function';
  // `MetadataProvider.objects` is a lazy getter that enumerates the complete
  // Object registry. Read it only when a host has no item reader and therefore
  // supplied an already-resolved, in-memory directory.
  const suppliedObjects = noProvider ? metadata.objects : undefined;
  const requestKey = JSON.stringify([
    getItemScope ?? null,
    packageId ?? null,
    names,
    [...additionalSharedNames],
  ]);
  const [snapshot, setSnapshot] = useState<ApplicationObjectsState & { key: string }>(() => ({
    key: requestKey,
    objects: [],
    loading: names.length > 0 && !noProvider,
    errors: [],
  }));

  useEffect(() => {
    if (names.length === 0 || noProvider) return;
    let cancelled = false;
    setSnapshot({ key: requestKey, objects: [], loading: true, errors: [] });
    void Promise.all(names.map(async (name) => {
      try {
        if (packageId) {
          const local = await getItem('object', name, packageId);
          if (local) return { name, item: local, error: null };
          if (!navigationNameSet.has(name)) return { name, item: null, error: null };
        }
        const shared = await getItem('object', name);
        return { name, item: shared, error: null };
      } catch (cause) {
        return {
          name,
          item: null,
          error: cause instanceof Error ? cause : new Error(String(cause)),
        };
      }
    })).then((results) => {
      if (cancelled) return;
      setSnapshot({
        key: requestKey,
        objects: results.flatMap(({ item }) => item ? [item] : []),
        loading: false,
        errors: results.flatMap(({ name, error }) => error ? [{ name, error }] : []),
      });
    });
    return () => { cancelled = true; };
  }, [getItem, noProvider, packageId, requestKey]);

  if (noProvider) {
    // Preview hosts and test providers may supply an already-resolved
    // directory without implementing MetadataProvider's item reader. Filter
    // that in-memory snapshot by name; never enumerate the live collection.
    const suppliedByName = new Map(
      Array.isArray(suppliedObjects)
        ? suppliedObjects.flatMap((item: any) => typeof item?.name === 'string' ? [[item.name, item]] : [])
        : [],
    );
    return {
      objects: names.flatMap((name) => suppliedByName.has(name) ? [suppliedByName.get(name)] : []),
      loading: false,
      errors: [],
    };
  }

  if (snapshot.key === requestKey) return snapshot;
  return {
    objects: [],
    loading: names.length > 0 && !noProvider,
    errors: [],
  };
}
