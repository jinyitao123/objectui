/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * "Does this deployment HAVE that object?", answered by a named metadata read
 * so a surface that reads an OPTIONAL system object can decline to ask rather
 * than asking and being told no. This must not enumerate the whole object
 * directory to answer a question about one object.
 *
 * ## Why (objectui#7476)
 *
 * A tenant environment has no `sys_activity` (no plugin-audit), so the home
 * page's activity card and the bell's Activity tab issued
 * `GET /api/v1/data/sys_activity` on every page load and got a 404. Everything
 * DOWNSTREAM of that 404 is already correct and stays correct: the adapter
 * memoizes the missing collection so no second request goes out, its quiet
 * logger demotes the failure to `debug`, `sharedUserFeeds` retires the feed as
 * an ANSWER (`ready`, not `error`), and the panel renders its earned
 * 「暂无最近动态」 empty state. What was left is one doomed request per load —
 * and `data-objectstack`'s own rule for exactly this case says how to read
 * that: *"The cure for doomed requests is not issuing them, never hiding them
 * once issued."*
 *
 * ## The predicate, and why every uncertainty reads as `unknown`
 *
 * The cost of a wrong `absent` is not one extra request, it is a feed that
 * never loads on a deployment that DOES have the object — so absence has to be
 * evidence, never the default:
 *
 *  - no metadata provider → `unknown`;
 *  - the named read is pending → `unknown` until it settles;
 *  - a named item is returned → `present`;
 *  - the named endpoint returns its 404 miss → `absent`;
 *  - permission, network, and server failures → `unknown`, never `absent`.
 *
 * `sys_*` objects ARE in this list where they exist — `AppHeader` filters them
 * out of the app-object picker by name (`!o.name.startsWith('sys_')`), which
 * it would not need to do if they were absent, and the console resolves
 * `/apps/{any app}/sys_activity` as an ordinary object route (objectui#4074).
 *
 * ## Cost
 *
 * One named metadata request for the optional object. This avoids loading the
 * full Object directory on every console mount and preserves the 404 versus
 * permission/transport distinction.
 */
import { useEffect, useState } from 'react';
import { useMetadata, type MetadataTypeStatus } from '@object-ui/react';

/** What the metadata registry can say about one object name. */
export type ObjectPresence = 'present' | 'absent' | 'unknown';

/** A presence reading plus whether it is worth waiting for a better one. */
export interface ObjectPresenceReading {
  presence: ObjectPresence;
  /**
   * The registry has said its piece — `ready`, or `error` (which will not
   * improve by waiting), or there is no provider to wait on. A caller that
   * gates a read on presence should hold off until this is true, then act on
   * `presence`: `absent` skips the read, anything else performs it.
   */
  settled: boolean;
}

/** @see ObjectPresenceReading.settled */
export function metadataTypeSettled(status: MetadataTypeStatus | undefined): boolean {
  // `undefined` is the documented "always ready" of a hand-rolled context value.
  return status === undefined || status === 'ready' || status === 'error';
}

/**
 * The pure predicate — exported so the decision can be pinned without a
 * provider tree. See the module comment for why absence must be earned.
 */
export function objectPresence(
  name: string,
  status: MetadataTypeStatus | undefined,
  objects: readonly unknown[],
): ObjectPresence {
  if (status !== undefined && status !== 'ready') return 'unknown';
  if (objects.length === 0) return 'unknown';
  const found = objects.some((o) => (o as { name?: unknown } | null | undefined)?.name === name);
  return found ? 'present' : 'absent';
}

/** {@link objectPresence} bound to the shell's by-name metadata endpoint. */
export function useObjectPresence(name: string): ObjectPresenceReading {
  const { getItem, getItemScope } = useMetadata();
  const requestKey = JSON.stringify([name, getItemScope ?? null]);
  const noProvider = getItemScope === 'no-provider';
  const [snapshot, setSnapshot] = useState<ObjectPresenceReading & { key: string }>(() => ({
    key: requestKey,
    presence: 'unknown',
    settled: !name || noProvider,
  }));

  useEffect(() => {
    if (!name || noProvider) {
      setSnapshot({ key: requestKey, presence: 'unknown', settled: true });
      return;
    }
    let cancelled = false;
    setSnapshot({ key: requestKey, presence: 'unknown', settled: false });
    getItem('object', name)
      .then((item) => {
        if (!cancelled) {
          setSnapshot({ key: requestKey, presence: item ? 'present' : 'absent', settled: true });
        }
      })
      .catch(() => {
        // A permission, network, or server failure cannot prove absence.
        if (!cancelled) setSnapshot({ key: requestKey, presence: 'unknown', settled: true });
      });
    return () => { cancelled = true; };
  }, [getItem, name, noProvider, requestKey]);

  if (snapshot.key === requestKey) return snapshot;
  return { presence: 'unknown', settled: !name || noProvider };
}
