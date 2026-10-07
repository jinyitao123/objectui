// Copyright (c) 2026 ObjectStack. Licensed under the Apache-2.0 license.

import React, { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { ActiveOrganizationStorage, TokenStorage } from '@object-ui/auth';
import { MetadataProvider, useMetadata, type MetadataContextValue } from '../MetadataProvider';

const previewState = vi.hoisted(() => ({ enabled: false, get: vi.fn() }));

vi.mock('../../preview/PreviewModeContext.js', () => ({
  usePreviewDrafts: () => previewState.enabled,
}));

vi.mock('../../views/metadata-admin/metadataClientFactory.js', () => ({
  createConsoleMetadataClient: ({ previewDrafts = false }: { previewDrafts?: boolean } = {}) => ({
    get: previewDrafts ? previewState.get : vi.fn(),
  }),
}));

interface MetadataHarness {
  context: MetadataContextValue | null;
  listCalls: string[];
  getItem: ReturnType<typeof vi.fn>;
  view: ReturnType<typeof render>;
  rerender: () => void;
}

function renderMetadata(): MetadataHarness {
  const harness: MetadataHarness = {
    context: null,
    listCalls: [],
    rerender: () => {},
    getItem: vi.fn(async (type: string, name: string, options?: { packageId?: string }) => ({
      item: {
        type,
        name,
        packageId: options?.packageId ?? null,
        token: TokenStorage.get(),
        organizationId: ActiveOrganizationStorage.get(),
      },
    })),
    view: null as unknown as ReturnType<typeof render>,
  };
  const adapter = {
    clearCache: vi.fn(),
    getClient: () => ({
      meta: {
        getItems: vi.fn(async (type: string) => {
          harness.listCalls.push(type);
          return { type, items: [] };
        }),
        getItem: harness.getItem,
      },
    }),
  } as any;
  function Probe() {
    const context = useMetadata();
    useEffect(() => { harness.context = context; }, [context]);
    return null;
  }
  harness.view = render(
    <MetadataProvider adapter={adapter}>
      <Probe />
    </MetadataProvider>,
  );
  harness.rerender = () => {
    harness.view.rerender(
      <MetadataProvider adapter={adapter}>
        <Probe />
      </MetadataProvider>,
    );
  };
  return harness;
}

beforeEach(() => {
  previewState.enabled = false;
  previewState.get.mockReset();
  TokenStorage.clear();
  ActiveOrganizationStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('MetadataProvider named item reads are package and identity scoped', () => {
  it('keeps same-name package entries separate and does not enumerate pages or objects', async () => {
    TokenStorage.set('token-alice');
    ActiveOrganizationStorage.set('org-a');
    const harness = renderMetadata();
    await waitFor(() => expect(harness.context).not.toBeNull());

    const crmPage = await harness.context!.getItem('page', 'home', 'app.crm');
    const billingPage = await harness.context!.getItem('page', 'home', 'app.billing');
    const cachedCrmPage = await harness.context!.getItem('page', 'home', 'app.crm');

    expect(crmPage?.packageId).toBe('app.crm');
    expect(billingPage?.packageId).toBe('app.billing');
    expect(cachedCrmPage).toBe(crmPage);
    expect(harness.getItem).toHaveBeenNthCalledWith(1, 'page', 'home', { packageId: 'app.crm' });
    expect(harness.getItem).toHaveBeenNthCalledWith(2, 'page', 'home', { packageId: 'app.billing' });
    expect(harness.getItem).toHaveBeenCalledTimes(2);
    expect(harness.listCalls).toContain('app');
    expect(harness.listCalls).toContain('view');
    expect(harness.listCalls).not.toContain('page');
    expect(harness.listCalls).not.toContain('object');
  });

  it('treats a 200 empty metadata envelope as a miss for the requested type', async () => {
    TokenStorage.set('token-alice');
    const harness = renderMetadata();
    await waitFor(() => expect(harness.context).not.toBeNull());

    const salesPage = 'page_sales_contract_workspace';
    const sharedObject = 'forge_customer';
    harness.getItem.mockImplementation(async (type: string, name: string, options?: { packageId?: string }) => {
      if (type === 'page' && name === salesPage) {
        return { type: 'page', name, item: { name, type: 'page', _packageId: options?.packageId } };
      }
      if (type === 'object' && name === salesPage) {
        // ObjectStack 17.3 returns HTTP 200 with an incomplete envelope for a
        // missing item; it has no `item` key, only the metadata identity and
        // protection fields.
        return { type: 'object', name, lock: 'none', editable: true, deletable: true, resettable: false };
      }
      if (type === 'page' && name === sharedObject) {
        return { type: 'page', name, lock: 'none', editable: true, deletable: true, resettable: false };
      }
      if (type === 'object' && name === sharedObject) {
        return { type: 'object', name, item: { name, type: 'object', _packageId: 'forge' } };
      }
      return { type, name, item: null };
    });

    const page = await harness.context!.getItem('page', salesPage, 'com.inoforge.forge.sales');
    const pageAsObject = await harness.context!.getItem('object', salesPage, 'com.inoforge.forge.sales');
    const objectAsPage = await harness.context!.getItem('page', sharedObject, 'com.inoforge.forge.sales');
    const sharedCustomer = await harness.context!.getItem('object', sharedObject, 'com.inoforge.forge.sales');

    expect(page).toMatchObject({ name: salesPage, type: 'page' });
    expect(pageAsObject).toBeNull();
    expect(objectAsPage).toBeNull();
    expect(sharedCustomer).toMatchObject({ name: sharedObject, type: 'object', _packageId: 'forge' });
    expect(harness.listCalls).not.toContain('page');
    expect(harness.listCalls).not.toContain('object');
  });

  it('does not reuse a page cached under another account or organization', async () => {
    TokenStorage.set('token-alice');
    ActiveOrganizationStorage.set('org-a');
    const harness = renderMetadata();
    await waitFor(() => expect(harness.context).not.toBeNull());

    const alicePage = await harness.context!.getItem('page', 'home', 'app.crm');
    TokenStorage.set('token-bob');
    const bobPage = await harness.context!.getItem('page', 'home', 'app.crm');
    ActiveOrganizationStorage.set('org-b');
    const orgBPage = await harness.context!.getItem('page', 'home', 'app.crm');

    expect(alicePage?.token).toBe('token-alice');
    expect(bobPage?.token).toBe('token-bob');
    expect(orgBPage?.organizationId).toBe('org-b');
    expect(harness.getItem).toHaveBeenCalledTimes(3);
  });

  it('uses the draft metadata client in preview and does not reuse the published item', async () => {
    TokenStorage.set('token-alice');
    ActiveOrganizationStorage.set('org-a');
    previewState.get.mockResolvedValue({
      name: 'home',
      type: 'page',
      packageId: 'app.crm',
      label: 'Draft Home',
    });
    const harness = renderMetadata();
    await waitFor(() => expect(harness.context).not.toBeNull());

    const published = await harness.context!.getItem('page', 'home', 'app.crm');
    previewState.enabled = true;
    await act(async () => {
      harness.rerender();
    });
    const draft = await harness.context!.getItem('page', 'home', 'app.crm');

    expect(published?.packageId).toBe('app.crm');
    expect(draft?.label).toBe('Draft Home');
    expect(harness.getItem).toHaveBeenCalledTimes(1);
    expect(previewState.get).toHaveBeenCalledWith('page', 'home', { packageId: 'app.crm' });
  });

  it('keeps 404 as a missing item while propagating network failures', async () => {
    TokenStorage.set('token-alice');
    const harness = renderMetadata();
    await waitFor(() => expect(harness.context).not.toBeNull());

    harness.getItem.mockRejectedValueOnce(Object.assign(new Error('Not found'), { httpStatus: 404 }));
    await expect(harness.context!.getItem('page', 'missing', 'app.crm')).resolves.toBeNull();

    harness.getItem.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(harness.context!.getItem('page', 'offline', 'app.crm')).rejects.toThrow('Failed to fetch');
  });
});
