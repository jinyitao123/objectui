import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MetadataCtx, type MetadataContextValue, useMetadataItem } from '../AppShellContext';

function context(getItem: MetadataContextValue['getItem'], getItemScope = 'session-a:org-a'): MetadataContextValue {
  return {
    apps: [],
    objects: [],
    dashboards: [],
    reports: [],
    pages: [],
    loading: false,
    error: null,
    refresh: async () => {},
    invalidate: () => {},
    ensureType: async () => [],
    getItem,
    getItemScope,
    getItemsByType: () => [],
  };
}

function PageProbe({ packageId }: { packageId: string }) {
  const state = useMetadataItem('page', 'home', packageId);
  return (
    <div data-testid="page-state" data-loading={String(state.loading)}>
      {state.item?.label ?? state.error?.message ?? ''}
    </div>
  );
}

describe('useMetadataItem package-scoped requests', () => {
  it('does not let an older package response replace the current app page', async () => {
    let resolveCrm!: (page: { name: string; label: string }) => void;
    let resolveReports!: (page: { name: string; label: string }) => void;
    const crmRequest = new Promise<{ name: string; label: string }>(resolve => { resolveCrm = resolve; });
    const reportsRequest = new Promise<{ name: string; label: string }>(resolve => { resolveReports = resolve; });
    const getItem = vi.fn((_type: string, _name: string, packageId?: string) => (
      packageId === 'app.crm' ? crmRequest : reportsRequest
    ));
    const metadata = context(getItem);
    const view = render(
      <MetadataCtx.Provider value={metadata}>
        <PageProbe packageId="app.crm" />
      </MetadataCtx.Provider>,
    );

    await waitFor(() => expect(getItem).toHaveBeenCalledWith('page', 'home', 'app.crm'));
    view.rerender(
      <MetadataCtx.Provider value={metadata}>
        <PageProbe packageId="app.reports" />
      </MetadataCtx.Provider>,
    );
    await waitFor(() => expect(getItem).toHaveBeenCalledWith('page', 'home', 'app.reports'));

    await act(async () => { resolveCrm({ name: 'home', label: 'CRM Home' }); });
    expect(screen.getByTestId('page-state').textContent).toBe('');
    expect(screen.getByTestId('page-state').getAttribute('data-loading')).toBe('true');

    await act(async () => { resolveReports({ name: 'home', label: 'Reports Home' }); });
    expect(screen.getByTestId('page-state').textContent).toBe('Reports Home');
    expect(screen.getByTestId('page-state').getAttribute('data-loading')).toBe('false');
  });

  it('clears the visible page immediately when the account or organization scope changes', async () => {
    let resolveOld!: (page: { name: string; label: string }) => void;
    let resolveNew!: (page: { name: string; label: string }) => void;
    const oldRequest = new Promise<{ name: string; label: string }>(resolve => { resolveOld = resolve; });
    const newRequest = new Promise<{ name: string; label: string }>(resolve => { resolveNew = resolve; });
    const oldGetItem = vi.fn(() => oldRequest);
    const newGetItem = vi.fn(() => newRequest);
    const view = render(
      <MetadataCtx.Provider value={context(oldGetItem)}>
        <PageProbe packageId="app.crm" />
      </MetadataCtx.Provider>,
    );
    await waitFor(() => expect(oldGetItem).toHaveBeenCalled());

    view.rerender(
      <MetadataCtx.Provider value={context(newGetItem, 'session-bob:org-a')}>
        <PageProbe packageId="app.crm" />
      </MetadataCtx.Provider>,
    );
    await waitFor(() => expect(newGetItem).toHaveBeenCalled());

    await act(async () => { resolveOld({ name: 'home', label: 'Alice Home' }); });
    expect(screen.getByTestId('page-state').textContent).toBe('');
    expect(screen.getByTestId('page-state').getAttribute('data-loading')).toBe('true');

    await act(async () => { resolveNew({ name: 'home', label: 'Bob Home' }); });
    expect(screen.getByTestId('page-state').textContent).toBe('Bob Home');
  });
});
