/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * PageView mounts the shared console action runtime (#1605), so a metadata
 * `action:button` rendered on a page can collect params and call an
 * authenticated API — the same runtime ObjectView uses. We render PageView with
 * a stubbed SchemaRenderer that consumes `useAction()` (as action:button does)
 * and assert the api action reaches the authenticated fetch.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

const pageLookup = vi.hoisted(() => ({
  activePackageId: undefined as string | undefined,
  search: '',
  page: { name: 'home', type: 'page', label: 'Home' },
  getItem: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useParams: () => ({ pageName: 'home' }),
  useSearchParams: () => [new URLSearchParams(pageLookup.search), vi.fn()],
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/apps/cloud/home', search: '' }),
}));

const authFetchSpy = vi.fn();
vi.mock('@object-ui/auth', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ user: { id: 'u1', name: 'User', role: 'user', image: null }, activeOrganization: null }),
  useWorkspaceAdminStatus: () => ({ isAdmin: false, isResolved: true }),
  createAuthenticatedFetch: () => authFetchSpy,
}));

vi.mock('@object-ui/i18n', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useObjectTranslation: () => ({ t: (k: string, o?: any) => o?.defaultValue ?? o?.name ?? k }),
  useObjectLabel: () => ({
    fieldLabel: (_o: any, _n: any, l: any) => l,
    fieldOptionLabel: (_o: any, _f: any, _v: any, l: any) => l,
    actionParamText: (_o: any, _a: any, _p: any, _attr: any, fallback: any) => fallback,
  }),
  // ObjectForm → Modal/DrawerForm build their discard-guard strings with this;
  // return a hook that just echoes the supplied English defaults.
  createSafeTranslation:
    (defaults: Record<string, string>) => () => ({
      t: (k: string) => defaults?.[k] ?? k,
    }),
}));

vi.mock('../../providers/MetadataProvider', () => ({
  useMetadataItem: pageLookup.getItem,
}));

vi.mock('../../providers/ExpressionProvider.js', () => ({
  useExpressionContext: () => ({
    app: pageLookup.activePackageId ? { _packageId: pageLookup.activePackageId } : undefined,
  }),
}));

vi.mock('../MetadataInspector', () => ({
  MetadataPanel: () => null,
  useMetadataInspector: () => ({ showDebug: false }),
}));

// Keep ActionProvider + useAction real; stub the renderer to a consumer that
// fires an api action exactly like an `action:button` would, and stub the
// adapter so PageView can mount.
vi.mock('@object-ui/react', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    useAdapter: () => ({}),
    SchemaRenderer: ({ schema }: { schema: Record<string, unknown> }) => {
      const { execute } = actual.useAction();
      return (
        <>
          <div data-testid="resolved-page">{String(schema.label)}</div>
          <button
            data-testid="page-api-action"
            onClick={() => execute({ type: 'api', name: 'createEnv', target: '/api/v1/environments' })}
          >
            Create environment
          </button>
        </>
      );
    },
  };
});

import { PageView } from '../PageView';

beforeEach(() => {
  authFetchSpy.mockReset();
  authFetchSpy.mockResolvedValue({ ok: true, json: async () => ({ id: 'env_1' }) });
  pageLookup.activePackageId = undefined;
  pageLookup.search = '';
  pageLookup.getItem.mockReset();
  pageLookup.getItem.mockImplementation((_type: string, name?: string) => ({
    item: name === 'home' ? pageLookup.page : null,
    loading: false,
    error: null,
  }));
});

describe('PageView — console action runtime', () => {
  it('renders the page and runs a page-level api action through the authenticated runtime', async () => {
    render(<PageView />);

    const btn = await screen.findByTestId('page-api-action');
    fireEvent.click(btn);

    await waitFor(() => expect(authFetchSpy).toHaveBeenCalled());
    expect(String(authFetchSpy.mock.calls[0][0])).toContain('/api/v1/environments');
  });

  it('resolves a same-name page from the active app package before the unscoped fallback', () => {
    pageLookup.activePackageId = 'app.crm';
    // A stale cross-app package filter in the URL must not override the app
    // context selected by the navigation shell.
    pageLookup.search = 'package=app.reports';
    const packagePage = { ...pageLookup.page, label: 'CRM Home' };
    pageLookup.getItem.mockImplementation((_type: string, name?: string, packageId?: string) => ({
      item: name === 'home' && packageId === 'app.crm' ? packagePage : null,
      loading: false,
      error: null,
    }));

    render(<PageView />);

    expect(screen.getByTestId('resolved-page').textContent).toBe('CRM Home');
    expect(pageLookup.getItem).toHaveBeenCalledWith('page', 'home', 'app.crm');
    expect(pageLookup.getItem).toHaveBeenCalledWith('page', undefined);
  });

  it('falls back to the unscoped page only after the package lookup returns not found', () => {
    pageLookup.activePackageId = 'app.crm';
    const fallbackPage = { ...pageLookup.page, label: 'Shared Home' };
    pageLookup.getItem.mockImplementation((_type: string, name?: string, packageId?: string) => ({
      item: name === 'home' && packageId === undefined ? fallbackPage : null,
      loading: false,
      error: null,
    }));

    render(<PageView />);

    expect(screen.getByTestId('resolved-page').textContent).toBe('Shared Home');
    expect(pageLookup.getItem).toHaveBeenCalledWith('page', 'home', 'app.crm');
    expect(pageLookup.getItem).toHaveBeenCalledWith('page', 'home');
  });

  it('shows a load error and does not fall back when the package lookup fails', () => {
    pageLookup.activePackageId = 'app.crm';
    pageLookup.getItem.mockImplementation((_type: string, name?: string, packageId?: string) => ({
      item: null,
      loading: false,
      error: name === 'home' && packageId === 'app.crm' ? new Error('503 unavailable') : null,
    }));

    render(<PageView />);

    expect(screen.getByTestId('page-load-error')).toBeTruthy();
    expect(screen.getByText('Unable to load page')).toBeTruthy();
    expect(pageLookup.getItem).toHaveBeenCalledWith('page', 'home', 'app.crm');
    expect(pageLookup.getItem).toHaveBeenCalledWith('page', undefined);
    expect(pageLookup.getItem).not.toHaveBeenCalledWith('page', 'home');
  });
});
