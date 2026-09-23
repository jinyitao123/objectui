/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * objectui#7476 — a tenant environment has no `sys_activity`, so opening the
 * home page (or 系统概览) fired `GET /api/v1/data/sys_activity` and took a 404,
 * every load.
 *
 * The card offered two remedies. "Handle the absence quietly" was already done
 * — four layers of it, and none of them changes here. So this is the other
 * one: consult the named object metadata endpoint and DON'T ASK when the
 * environment's by-name lookup answers 404.
 *
 * The risk is entirely one-sided, so the assertions are too. A missed skip
 * costs one request that already degrades correctly; a wrong skip costs a real
 * deployment its activity feed with no error anywhere. A 404 is the only
 * negative answer; no-provider, still-loading, permission, and transport
 * failures remain unknown and keep the data read.
 *
 * The no-provider case is load-bearing: its frozen no-op returns no item, but
 * that is not a server 404 and must not be read as absence.
 */
import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { MetadataCtx, type MetadataContextValue, type MetadataTypeStatus } from '@object-ui/react';

vi.mock('@object-ui/auth', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ user: { id: 'u1' } }),
}));

const ACTIVITY_ROWS = [
  {
    id: 'r1',
    type: 'created',
    summary: 'created the lead',
    object_name: 'crm_lead',
    actor_name: 'Li Si',
    timestamp: '2026-08-20T10:00:00Z',
  },
];

/** Every `find` the hook issues, so "did not ask" is directly observable. */
const finds: string[] = [];
const fakeAdapter = {
  find: (object: string) => {
    finds.push(object);
    return Promise.resolve({ data: object === 'sys_activity' ? ACTIVITY_ROWS : [] });
  },
  getClient: () => undefined,
};
vi.mock('../../providers/AdapterProvider', () => ({ useAdapter: () => fakeAdapter }));

const { useSharedActivityFeed, __resetSharedUserFeeds } = await import('../sharedUserFeeds');
const { objectPresence } = await import('../useObjectPresence');

const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(0); });

/** A metadata context that answers `object` with exactly these items/status. */
function registry(status: MetadataTypeStatus, objects: Array<{ name: string }>): MetadataContextValue {
  const getItem = vi.fn(async (_type: string, name: string) => {
    if (status === 'error') throw Object.assign(new Error('Forbidden'), { httpStatus: 403 });
    if (status === 'loading' || status === 'idle') return new Promise<null>(() => {});
    return objects.find((object) => object.name === name) ?? null;
  });
  return {
    apps: [],
    objects,
    dashboards: [],
    reports: [],
    pages: [],
    loading: false,
    error: null,
    refresh: async () => {},
    invalidate: () => {},
    ensureType: async () => objects,
    getItem,
    getItemScope: 'test-provider',
    getItemsByType: vi.fn((type: string) => (type === 'object' ? objects : [])),
    getTypeStatus: () => status,
  } as unknown as MetadataContextValue;
}

/** Mount the feed under a given registry — or under none at all. */
async function activityReads(ctx: MetadataContextValue | null): Promise<string[]> {
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    ctx ? <MetadataCtx.Provider value={ctx}>{children}</MetadataCtx.Provider> : <>{children}</>;
  renderHook(() => useSharedActivityFeed(), { wrapper });
  await settle();
  return finds.filter((o) => o === 'sys_activity');
}

const TENANT_OBJECTS = [{ name: 'crm_lead' }, { name: 'crm_account' }, { name: 'sys_user' }];
const WITH_AUDIT = [...TENANT_OBJECTS, { name: 'sys_activity' }];

beforeEach(() => {
  vi.useFakeTimers();
  __resetSharedUserFeeds();
  finds.length = 0;
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('{}', { status: 404 }))));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('the activity feed skips the data read only after a named metadata 404 (objectui#7476)', () => {
  it('a named metadata miss ⇒ no data request and no full object list', async () => {
    const ctx = registry('ready', TENANT_OBJECTS);
    expect(await activityReads(ctx)).toEqual([]);
    expect(ctx.getItem).toHaveBeenCalledWith('object', 'sys_activity');
    expect(ctx.getItemsByType).not.toHaveBeenCalled();
  });

  it('a named metadata item ⇒ the data read happens', async () => {
    const ctx = registry('ready', WITH_AUDIT);
    expect(await activityReads(ctx)).toEqual(['sys_activity']);
    expect(ctx.getItemsByType).not.toHaveBeenCalled();
  });
});

describe('every non-404 outcome remains unknown — a wrong skip is the expensive mistake (objectui#7476)', () => {
  it('no MetadataProvider at all ⇒ unchanged behaviour', async () => {
    // The frozen no-op's null is not a server 404.
    expect(await activityReads(null)).toEqual(['sys_activity']);
  });

  it('a named endpoint permission failure ⇒ reads', async () => {
    expect(await activityReads(registry('error', []))).toEqual(['sys_activity']);
  });

  it('a named endpoint transport failure ⇒ reads', async () => {
    const ctx = registry('ready', []);
    (ctx.getItem as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await activityReads(ctx)).toEqual(['sys_activity']);
  });

  it('a named lookup still loading ⇒ asks nothing YET, and claims nothing', async () => {
    // Not the same as "absent": no item verdict yet, so the feed has asked
    // nothing. Its own data request starts once the named read settles.
    expect(await activityReads(registry('loading', []))).toEqual([]);
  });
});

describe('objectPresence — absence has to be earned (objectui#7476)', () => {
  it.each([
    ['idle' as const, [{ name: 'crm_lead' }], 'unknown'],
    ['loading' as const, [{ name: 'crm_lead' }], 'unknown'],
    ['error' as const, [{ name: 'crm_lead' }], 'unknown'],
    ['ready' as const, [], 'unknown'],
    ['ready' as const, [{ name: 'crm_lead' }], 'absent'],
    ['ready' as const, [{ name: 'sys_activity' }], 'present'],
  ])('status=%s objects=%j ⇒ %s', (status, objects, expected) => {
    expect(objectPresence('sys_activity', status, objects)).toBe(expected);
  });

  it('an absent `getTypeStatus` (hand-rolled context) reads as ready', () => {
    // The context type documents the optional member as "absent means always
    // ready"; honouring that is what lets a hand-rolled test context still gate.
    expect(objectPresence('sys_activity', undefined, [{ name: 'crm_lead' }])).toBe('absent');
    expect(objectPresence('sys_activity', undefined, [])).toBe('unknown');
  });

  it('ignores malformed registry entries rather than throwing', () => {
    expect(objectPresence('sys_activity', 'ready', [null, undefined, 'x', { name: 'sys_activity' }])).toBe(
      'present',
    );
  });
});
