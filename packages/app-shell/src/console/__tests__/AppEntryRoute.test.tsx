import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

const routeState = vi.hoisted(() => ({
  appPackageId: 'app.crm',
  appNavigation: [] as Array<{ type: string; objectName?: string }>,
  page: null as { name: string; label?: string } | null,
  object: null as { name: string; label?: string } | null,
  sharedObject: null as { name: string; label?: string; _packageId?: string } | null,
  pageError: null as Error | null,
  objectError: null as Error | null,
  sharedObjectError: null as Error | null,
  getItem: vi.fn(),
}));

vi.mock('../../providers/ExpressionProvider.js', () => ({
  useExpressionContext: () => ({
    app: { _packageId: routeState.appPackageId, navigation: routeState.appNavigation },
  }),
}));

vi.mock('../../providers/MetadataProvider.js', () => ({
  useMetadataItem: (type: string, name?: string, packageId?: string) => {
    routeState.getItem(type, name, packageId);
    return type === 'page'
      ? { item: routeState.page, loading: false, error: routeState.pageError }
      : packageId
        ? { item: routeState.object, loading: false, error: routeState.objectError }
        : {
          item: name ? routeState.sharedObject : null,
          loading: false,
          error: name ? routeState.sharedObjectError : null,
        };
  },
}));

vi.mock('../../context/RecentItemsProvider.js', () => ({
  useRecentItems: () => ({ addRecentItem: vi.fn() }),
}));

vi.mock('../../views/ObjectView.js', () => ({
  ObjectView: () => <div data-testid="object-entry">Object surface</div>,
}));

vi.mock('../../views/PageView.js', () => ({
  PageView: ({ pageNameOverride }: { pageNameOverride?: string }) => (
    <div data-testid="page-entry">{pageNameOverride}</div>
  ),
}));

vi.mock('@object-ui/i18n', async importOriginal => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useObjectTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string; name?: string }) =>
      options?.defaultValue?.replace('{name}', options.name ?? '') ?? _key,
  }),
}));

import { AppEntryRoute } from '../AppEntryRoute';

function renderEntry(url = '/apps/app.crm/home?package=app.reports') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/apps/:appName/:objectName"
          element={(
            <Suspense fallback={<div data-testid="route-loading" />}>
              <AppEntryRoute dataSource={null} objects={[]} externalRefreshKey={0} />
            </Suspense>
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  routeState.appPackageId = 'app.crm';
  routeState.appNavigation = [];
  routeState.page = null;
  routeState.object = null;
  routeState.sharedObject = null;
  routeState.pageError = null;
  routeState.objectError = null;
  routeState.sharedObjectError = null;
  routeState.getItem.mockReset();
});

describe('AppEntryRoute resolves bare entries with package ownership and explicit shared references', () => {
  it('renders the package page and ignores a stale package query parameter', async () => {
    routeState.page = { name: 'home', label: 'CRM Home' };
    renderEntry();

    expect(await screen.findByTestId('page-entry')).toHaveTextContent('home');
    expect(routeState.getItem).toHaveBeenCalledWith('page', 'home', 'app.crm');
    expect(routeState.getItem).toHaveBeenCalledWith('object', 'home', 'app.crm');
  });

  it('renders an object when no page with the same name exists', async () => {
    routeState.object = { name: 'contract', label: 'Contracts' };
    renderEntry('/apps/app.crm/contract');

    expect(await screen.findByTestId('object-entry')).toBeTruthy();
  });

  it('resolves an app-visible object from a shared package after the app package misses', async () => {
    routeState.appNavigation = [{ type: 'object', objectName: 'forge_customer' }];
    routeState.sharedObject = { name: 'forge_customer', label: 'Customers', _packageId: 'forge' };
    renderEntry('/apps/app.crm/forge_customer');

    expect(await screen.findByTestId('object-entry')).toBeTruthy();
    expect(routeState.getItem).toHaveBeenCalledWith('object', 'forge_customer', 'app.crm');
    expect(routeState.getItem).toHaveBeenCalledWith('object', 'forge_customer', undefined);
  });

  it('does not resolve an unreferenced object from another package', async () => {
    routeState.sharedObject = { name: 'hidden_customer', label: 'Hidden customer', _packageId: 'other' };
    renderEntry('/apps/app.crm/hidden_customer');

    expect(await screen.findByTestId('app-entry-not-found')).toBeTruthy();
    expect(screen.queryByTestId('object-entry')).toBeNull();
    expect(routeState.getItem).not.toHaveBeenCalledWith('object', 'hidden_customer', undefined);
  });

  it('refuses a page/object name collision instead of choosing one silently', async () => {
    routeState.page = { name: 'contract', label: 'Contract page' };
    routeState.appNavigation = [{ type: 'object', objectName: 'contract' }];
    routeState.sharedObject = { name: 'contract', label: 'Contracts', _packageId: 'forge' };
    renderEntry('/apps/app.crm/contract');

    expect(await screen.findByTestId('app-entry-ambiguous')).toBeTruthy();
    expect(screen.queryByTestId('page-entry')).toBeNull();
    expect(screen.queryByTestId('object-entry')).toBeNull();
  });

  it('reports a missing package entry', async () => {
    renderEntry('/apps/app.crm/unknown');

    expect(await screen.findByTestId('app-entry-not-found')).toBeTruthy();
  });

  it('preserves package access failures instead of treating them as a missing entry', async () => {
    routeState.objectError = Object.assign(new Error('Forbidden'), { httpStatus: 403 });
    renderEntry('/apps/app.crm/contract');

    expect(await screen.findByTestId('app-entry-error')).toBeTruthy();
    expect(screen.getByText('You do not have permission to open this entry.')).toBeTruthy();
    expect(screen.queryByTestId('app-entry-not-found')).toBeNull();
  });

  it('preserves lookup transport failures instead of treating them as a missing entry', async () => {
    routeState.objectError = new Error('Network unavailable');
    renderEntry('/apps/app.crm/contract');

    expect(await screen.findByTestId('app-entry-error')).toBeTruthy();
    expect(screen.getByText('Unable to load this app entry.')).toBeTruthy();
    expect(screen.queryByTestId('app-entry-not-found')).toBeNull();
  });
});
