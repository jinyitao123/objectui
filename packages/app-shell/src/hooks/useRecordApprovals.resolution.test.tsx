/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@object-ui/auth';
import { useRecordApprovals } from './useRecordApprovals';

vi.mock('@object-ui/auth', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: vi.fn(),
}));

function response(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => status >= 400 ? { error: 'unavailable' } : { data },
  } as any;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function authScope(userId = 'actor-a', organizationId = 'org-a'): ReturnType<typeof useAuth> {
  return {
    user: userId ? { id: userId } : null,
    activeOrganization: organizationId ? { id: organizationId } : null,
  } as ReturnType<typeof useAuth>;
}

const mockUseAuth = vi.mocked(useAuth);

beforeEach(() => mockUseAuth.mockReturnValue(authScope()));
afterEach(() => {
  vi.unstubAllGlobals();
  mockUseAuth.mockReset();
});

describe('useRecordApprovals — resolution is scoped to the current record', () => {
  it('resolves an empty/rejected native result instead of inheriting a pending mirror', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => response([
      { id: 'req-rejected', object_name: 'orders', record_id: 'A', status: 'rejected' },
    ])));

    const { result } = renderHook(() => useRecordApprovals('orders', 'A'));
    await waitFor(() => expect(result.current.resolved).toBe(true));

    expect(result.current.available).toBe(true);
    expect(result.current.pendingRequest).toBeNull();
    expect(result.current.requests.map((request) => request.status)).toEqual(['rejected']);
  });

  it('does not expose the previous record result while the next record is loading', async () => {
    const next = deferred<any>();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('recordId=A')) {
        return response([{ id: 'req-a', object_name: 'orders', record_id: 'A', status: 'rejected' }]);
      }
      return next.promise;
    }));

    const { result, rerender } = renderHook(
      ({ recordId }) => useRecordApprovals('orders', recordId),
      { initialProps: { recordId: 'A' } },
    );
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.latestRequest?.id).toBe('req-a');

    rerender({ recordId: 'B' });
    expect(result.current.resolved).toBe(false);
    expect(result.current.pendingRequest).toBeNull();
    expect(result.current.requests).toEqual([]);

    next.resolve(response([]));
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.requests).toEqual([]);
  });

  it('does not expose the previous object result after the object scope changes', async () => {
    const next = deferred<any>();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('object=orders')) {
        return response([{ id: 'req-order', object_name: 'orders', record_id: 'A', status: 'rejected' }]);
      }
      return next.promise;
    }));

    const { result, rerender } = renderHook(
      ({ objectName }) => useRecordApprovals(objectName, 'A'),
      { initialProps: { objectName: 'orders' } },
    );
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.latestRequest?.id).toBe('req-order');

    rerender({ objectName: 'contracts' });
    expect(result.current.resolved).toBe(false);
    expect(result.current.requests).toEqual([]);

    next.resolve(response([]));
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.latestRequest).toBeNull();
  });

  it('ignores a late response from the record that was left', async () => {
    const first = deferred<any>();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      if (String(url).includes('recordId=A')) return first.promise;
      return response([{ id: 'req-b', object_name: 'orders', record_id: 'B', status: 'rejected' }]);
    }));

    const { result, rerender } = renderHook(
      ({ recordId }) => useRecordApprovals('orders', recordId),
      { initialProps: { recordId: 'A' } },
    );
    rerender({ recordId: 'B' });
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.latestRequest?.id).toBe('req-b');

    first.resolve(response([{ id: 'req-a', object_name: 'orders', record_id: 'A', status: 'rejected' }]));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current.latestRequest?.id).toBe('req-b');
  });

  it('ignores a late 404 from an older read of the same scope', async () => {
    const first = deferred<any>();
    let requestCount = 0;
    const fetch = vi.fn(async () => {
      requestCount += 1;
      return requestCount === 1 ? first.promise : response([]);
    });
    vi.stubGlobal('fetch', fetch);

    const { result } = renderHook(() => useRecordApprovals('orders', 'A'));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    let secondRead!: Promise<void>;
    act(() => { secondRead = result.current.refresh(); });
    await act(async () => { await secondRead; });
    expect(result.current.resolved).toBe(true);

    await act(async () => {
      first.resolve(response([], 404));
      await first.promise;
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    expect(result.current.resolved).toBe(true);

    const countBeforeRefresh = fetch.mock.calls.length;
    await act(async () => { await result.current.refresh(); });
    expect(fetch).toHaveBeenCalledTimes(countBeforeRefresh + 1);
    expect(result.current.resolved).toBe(true);
  });

  it('invalidates approval rows when the user or active organization changes', async () => {
    const organizationARead = deferred<any>();
    const organizationBRead = deferred<any>();
    const identityBRead = deferred<any>();
    let requestCount = 0;
    const fetch = vi.fn(async () => {
      requestCount += 1;
      if (requestCount === 1) return organizationARead.promise;
      if (requestCount === 2) return organizationBRead.promise;
      return identityBRead.promise;
    });
    vi.stubGlobal('fetch', fetch);

    let currentAuth = authScope('actor-a', 'org-a');
    mockUseAuth.mockImplementation(() => currentAuth);
    const { result, rerender } = renderHook(() => useRecordApprovals('orders', 'A'));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));

    currentAuth = authScope('actor-a', 'org-b');
    rerender();
    expect(result.current.resolved).toBe(false);
    expect(result.current.requests).toEqual([]);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    currentAuth = authScope('actor-b', 'org-b');
    rerender();
    expect(result.current.resolved).toBe(false);
    expect(result.current.requests).toEqual([]);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

    identityBRead.resolve(response([
      { id: 'req-actor-b', object_name: 'orders', record_id: 'A', status: 'rejected' },
    ]));
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.latestRequest?.id).toBe('req-actor-b');

    organizationBRead.resolve(response([
      { id: 'req-org-b', object_name: 'orders', record_id: 'A', status: 'rejected' },
    ]));
    organizationARead.resolve(response([
      { id: 'req-org-a', object_name: 'orders', record_id: 'A', status: 'rejected' },
    ]));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(result.current.latestRequest?.id).toBe('req-actor-b');
  });

  it('keeps a resolved empty Native result authoritative during a same-scope refresh', async () => {
    const next = deferred<any>();
    const fetch = vi.fn()
      .mockResolvedValueOnce(response([]))
      .mockImplementationOnce(() => next.promise);
    vi.stubGlobal('fetch', fetch);

    const { result } = renderHook(() => useRecordApprovals('orders', 'A'));
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.pendingRequest).toBeNull();

    let refresh!: Promise<void>;
    act(() => { refresh = result.current.refresh(); });
    expect(result.current.loading).toBe(true);
    expect(result.current.resolved).toBe(true);
    expect(result.current.pendingRequest).toBeNull();
    expect(result.current.requests).toEqual([]);

    await act(async () => {
      next.resolve(response([]));
      await refresh;
    });
    expect(result.current.resolved).toBe(true);
  });

  it('does not refetch or drop resolution when auth objects change but scope IDs do not', async () => {
    const fetch = vi.fn(async () => response([]));
    vi.stubGlobal('fetch', fetch);

    let currentAuth = authScope('actor-a', 'org-a');
    mockUseAuth.mockImplementation(() => currentAuth);
    const { result, rerender } = renderHook(() => useRecordApprovals('orders', 'A'));
    await waitFor(() => expect(result.current.resolved).toBe(true));

    currentAuth = authScope('actor-a', 'org-a');
    rerender();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(result.current.loading).toBe(false);
    expect(result.current.resolved).toBe(true);
    expect(result.current.pendingRequest).toBeNull();
  });

  it('uses mirror fallback when the endpoint is unsupported or the list read fails', async () => {
    const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
      const status = String(init?.headers ?? '').includes('unsupported') ? 404 : 503;
      return response([], status);
    });
    vi.stubGlobal('fetch', fetch);

    const unsupported = renderHook(() => useRecordApprovals('legacy', 'A'));
    // The endpoint status is selected by the URL in the second half below.
    await waitFor(() => expect(unsupported.result.current.error).toBe(true));
    expect(unsupported.result.current.resolved).toBe(false);
    expect(unsupported.result.current.available).toBe(true);
    unsupported.unmount();

    fetch.mockImplementation(async (url: string) => response([], String(url).includes('unsupported') ? 404 : 503));
    const unavailable = renderHook(() => useRecordApprovals('unsupported', 'B'));
    await waitFor(() => expect(unavailable.result.current.available).toBe(false));
    expect(unavailable.result.current.resolved).toBe(false);
    expect(unavailable.result.current.error).toBe(false);
    expect(unavailable.result.current.requests).toEqual([]);
    unavailable.unmount();

    const failed = renderHook(() => useRecordApprovals('orders', 'C'));
    await waitFor(() => expect(failed.result.current.error).toBe(true));
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('object=orders&recordId=C'), expect.any(Object),
    );
    expect(failed.result.current.available).toBe(true);
    expect(failed.result.current.resolved).toBe(false);
    expect(failed.result.current.error).toBe(true);
    expect(failed.result.current.requests).toEqual([]);
  });

  it('clears resolved authority when a later refresh fails', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response([
        { id: 'req-rejected', object_name: 'orders', record_id: 'D', status: 'rejected' },
      ]))
      .mockResolvedValueOnce(response([], 503));
    vi.stubGlobal('fetch', fetch);

    const { result } = renderHook(() => useRecordApprovals('orders', 'D'));
    await waitFor(() => expect(result.current.resolved).toBe(true));
    expect(result.current.error).toBe(false);
    expect(result.current.requests).toHaveLength(1);

    await act(async () => { await result.current.refresh(); });
    expect(result.current.resolved).toBe(false);
    expect(result.current.error).toBe(true);
    expect(result.current.requests).toEqual([]);
  });

  it('does not resolve malformed successful responses as an empty request list', async () => {
    const malformed = deferred<any>();
    vi.stubGlobal('fetch', vi.fn(async () => malformed.promise));

    const { result } = renderHook(() => useRecordApprovals('orders', 'E'));
    await waitFor(() => expect(result.current.loading).toBe(true));
    malformed.resolve({
      ok: true,
      status: 200,
      json: async () => ({ requests: [] }),
    } as any);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.resolved).toBe(false);
    expect(result.current.available).toBe(true);
    expect(result.current.requests).toEqual([]);
  });
});
