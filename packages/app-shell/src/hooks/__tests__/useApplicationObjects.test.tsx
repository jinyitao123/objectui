import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MetadataCtx } from '@object-ui/react';
import { useApplicationObjects } from '../useApplicationObjects';
import { collectAppNavigationObjectNames, objectNameFromAppPath } from '../../utils/appNavigationObjects';

afterEach(cleanup);

function withMetadata(getItem: ReturnType<typeof vi.fn>, getItemScope = 'test-scope') {
  const getItemsByType = vi.fn(() => []);
  const ensureType = vi.fn(async () => []);
  const context = {
    apps: [], objects: [], dashboards: [], reports: [], pages: [],
    loading: false, error: null, refresh: async () => {}, invalidate: () => {},
    ensureType, getItem, getItemScope, getItemsByType,
  } as any;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MetadataCtx.Provider value={context}>{children}</MetadataCtx.Provider>
  );
  return { wrapper, getItemsByType, ensureType };
}

describe('application object names come from referenced navigation targets', () => {
  it('walks nested areas, object entries, and capability references without fetching a list', async () => {
    const app = {
      _packageId: 'app.sales',
      navigation: [
        { type: 'object', objectName: 'sales_lead' },
        { type: 'page', pageName: 'sales_home' },
      ],
      areas: [{ navigation: [{ type: 'group', children: [
        { type: 'object', objectName: 'forge_customer' },
        { type: 'page', requiresObject: 'sales_contract' },
      ] }] }],
    };
    expect(collectAppNavigationObjectNames(app)).toEqual([
      'sales_lead', 'forge_customer', 'sales_contract',
    ]);
    expect(objectNameFromAppPath('/apps/app.sales/sales_contract/record/r1')).toBe('sales_contract');
    expect(objectNameFromAppPath('/apps/app.sales/metadata/object/sales_contract')).toBeUndefined();
  });

  it('loads app objects by name, falls back only for app-referenced shared objects, and never lists', async () => {
    const application = {
      _packageId: 'app.sales',
      navigation: [
        { type: 'object', objectName: 'sales_lead' },
        { type: 'object', objectName: 'forge_customer' },
      ],
    };
    const getItem = vi.fn(async (type: string, name: string, packageId?: string) => {
      if (type !== 'object') return null;
      if (name === 'sales_lead') return { name, _packageId: packageId };
      if (name === 'forge_customer' && packageId) return null; // exact package 404
      if (name === 'forge_customer') return { name, _packageId: 'forge' };
      if (name === 'unreferenced_route' && packageId) return null;
      return null;
    });
    const metadata = withMetadata(getItem);
    const { result } = renderHook(
      () => useApplicationObjects(application, ['unreferenced_route']),
      { wrapper: metadata.wrapper },
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.objects.map((item) => item.name)).toEqual(['sales_lead', 'forge_customer']);
    expect(getItem).toHaveBeenCalledWith('object', 'sales_lead', 'app.sales');
    expect(getItem).toHaveBeenCalledWith('object', 'forge_customer', 'app.sales');
    expect(getItem).toHaveBeenCalledWith('object', 'forge_customer');
    expect(getItem).toHaveBeenCalledWith('object', 'unreferenced_route', 'app.sales');
    expect(getItem).not.toHaveBeenCalledWith('object', 'unreferenced_route');
    expect(metadata.getItemsByType).not.toHaveBeenCalled();
    expect(metadata.ensureType).not.toHaveBeenCalled();
  });

  it('does not touch the lazy full-directory getter when a by-name reader exists', async () => {
    const app = { navigation: [{ type: 'object', objectName: 'customer' }] };
    const getItem = vi.fn(async () => ({ name: 'customer' }));
    const getItemsByType = vi.fn(() => []);
    const ensureType = vi.fn(async () => []);
    let fullDirectoryReads = 0;
    const context: any = {
      apps: [], dashboards: [], reports: [], pages: [], loading: false, error: null,
      refresh: async () => {}, invalidate: () => {}, ensureType, getItem,
      getItemScope: 'principal/org/preview', getItemsByType,
      get objects() {
        fullDirectoryReads += 1;
        return [{ name: 'customer' }];
      },
    };
    const wrapper = ({ children }: { children: ReactNode }) => (
      <MetadataCtx.Provider value={context}>{children}</MetadataCtx.Provider>
    );
    const { result } = renderHook(() => useApplicationObjects(app), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.objects).toEqual([{ name: 'customer' }]);
    expect(getItem).toHaveBeenCalledWith('object', 'customer');
    expect(fullDirectoryReads).toBe(0);
    expect(getItemsByType).not.toHaveBeenCalledWith('object');
    expect(ensureType).not.toHaveBeenCalledWith('object');
  });

  it('does not use a shared-package fallback after a permission or transport error', async () => {
    const application = {
      _packageId: 'app.sales',
      navigation: [{ type: 'object', objectName: 'customer' }],
    };
    const forbidden = Object.assign(new Error('Forbidden'), { httpStatus: 403 });
    const getItem = vi.fn(async (_type: string, _name: string, packageId?: string) => {
      if (packageId) throw forbidden;
      return { name: 'customer', _packageId: 'forge' };
    });
    const { wrapper } = withMetadata(getItem);
    const { result } = renderHook(() => useApplicationObjects(application), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.objects).toEqual([]);
    expect(result.current.errors).toEqual([{ name: 'customer', error: forbidden }]);
    expect(getItem).toHaveBeenCalledTimes(1);
    expect(getItem).toHaveBeenCalledWith('object', 'customer', 'app.sales');
  });

  it('degrades to an empty directory without a metadata provider', async () => {
    const getItem = vi.fn();
    const { wrapper } = withMetadata(getItem, 'no-provider');
    const { result } = renderHook(
      () => useApplicationObjects({ navigation: [{ type: 'object', objectName: 'customer' }] }),
      { wrapper },
    );
    await act(async () => {});
    expect(result.current).toMatchObject({ objects: [], loading: false, errors: [] });
    expect(getItem).not.toHaveBeenCalled();
  });
});
