import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ComponentRegistry } from '@object-ui/core';
import { SchemaRenderer, SchemaRendererProvider } from '@object-ui/react';
import { PermissionProvider } from '@object-ui/permissions';
import type { DataSource, ListViewSchema } from '@object-ui/types';
import { ListView, type ListViewProps } from '../ListView';
// Exercise the published registry wrapper, not a direct ListView invocation.
import '../index';

let previousGrid: ReturnType<typeof ComponentRegistry.get>;
let childProps: Record<string, unknown> | null = null;
const schema: ListViewSchema = {
  type: 'list-view',
  objectName: 'empty_presentation_item',
  columns: [{ field: 'name', label: 'Name' }],
  pagination: { pageSize: 10, pageSizeOptions: [10, 20, 50, 100] },
};
const hideProps = { hideHeaderWhenEmpty: true, hidePaginationWhenEmpty: true, showRowNumbers: false };
const listTypes = ['list-view', 'plugin-list:list-view', 'view:list'];
const authorLocations = ['top', 'props', 'properties'] as const;
type PresentationProps = Pick<ListViewProps, 'hideHeaderWhenEmpty' | 'hidePaginationWhenEmpty' | 'showRowNumbers' | 'emptyStateContent'>;

function makeDataSource(response: unknown = { data: [], total: 0, hasMore: false }) {
  return {
    find: vi.fn(async () => response),
    getObjectSchema: vi.fn(async (name: string) => ({ name, fields: {
      id: { type: 'text' }, name: { type: 'text', label: 'Name' },
    } })),
  } as unknown as DataSource;
}

function renderList(dataSource: DataSource | undefined, props: Partial<ListViewProps> = {}, permissionsLoaded = true) {
  const list = <ListView schema={schema} dataSource={dataSource} {...props} />;
  return render(<SchemaRendererProvider dataSource={dataSource}>
    {permissionsLoaded
      ? <PermissionProvider roles={[]} permissions={[]} userRoles={[]}>{list}</PermissionProvider>
      : list}
  </SchemaRendererProvider>);
}

function renderRegisteredList(type: string, metadata: Record<string, unknown> = {}, hostProps: PresentationProps = {}) {
  const dataSource = makeDataSource();
  return render(<SchemaRendererProvider dataSource={dataSource}>
    <PermissionProvider roles={[]} permissions={[]} userRoles={[]}>
      <SchemaRenderer schema={{ ...schema, ...metadata, type }} {...hostProps} />
    </PermissionProvider>
  </SchemaRendererProvider>);
}

async function childReady() {
  await waitFor(() => expect(screen.queryByTestId('empty-presentation-grid')).not.toBeNull());
}

beforeAll(() => {
  previousGrid = ComponentRegistry.get('object-grid');
  // The list package has no grid dependency. Capture its runtime handoff;
  // ObjectGrid.emptyPresentation and data-table-empty-presentation exercise
  // the actual downstream DOM independently.
  ComponentRegistry.register('object-grid', (props: Record<string, unknown>) => {
    childProps = props;
    return <div data-testid="empty-presentation-grid" />;
  }, { namespace: 'test' });
});
afterAll(() => {
  if (previousGrid) ComponentRegistry.register('object-grid', previousGrid);
  else ComponentRegistry.unregister('object-grid');
});
beforeEach(() => { childProps = null; localStorage.clear(); });
afterEach(cleanup);

describe('ListView runtime presentation handoff', () => {
  it.each(listTypes.flatMap(type => authorLocations.map(location => [type, location] as const)))(
    'ignores authored presentation props through SchemaRenderer for %s in %s', async (type, location) => {
      const options = { ...hideProps, emptyStateContent: 'Authored empty content' };
      renderRegisteredList(type, location === 'top' ? options : { [location]: options });
      await childReady();
      expect(childProps?.showRowNumbers).toBeUndefined();
      expect(childProps?.hideHeaderWhenEmpty).toBe(false);
      expect(childProps?.hidePaginationWhenEmpty).toBe(false);
      expect(childProps?.emptyStateContent).not.toBe('Authored empty content');
    },
  );

  it.each(listTypes)('preserves real host props over authored options for %s', async type => {
    const authored = { hideHeaderWhenEmpty: false, hidePaginationWhenEmpty: false, showRowNumbers: true, emptyStateContent: 'Authored empty content' };
    const content = <span>Host empty content</span>;
    renderRegisteredList(type, { ...authored, props: authored, properties: authored }, { ...hideProps, emptyStateContent: content });
    await childReady();
    expect(childProps?.showRowNumbers).toBe(false);
    expect(childProps?.hideHeaderWhenEmpty).toBe(true);
    expect(childProps?.hidePaginationWhenEmpty).toBe(true);
    expect(childProps?.emptyStateContent).toBe(content);
  });

  it('keeps the default empty header and pagination choices', async () => {
    renderList(makeDataSource());
    await childReady();
    expect(childProps?.showRowNumbers).toBeUndefined();
    expect(childProps?.hideHeaderWhenEmpty).toBe(false);
    expect(childProps?.hidePaginationWhenEmpty).toBe(false);
  });

  it('forwards the three choices as React props after a successful zero-row read', async () => {
    renderList(makeDataSource(), hideProps);
    await childReady();
    expect(childProps?.showRowNumbers).toBe(false);
    expect(childProps?.hideHeaderWhenEmpty).toBe(true);
    expect(childProps?.hidePaginationWhenEmpty).toBe(true);
    const childSchema = childProps?.schema as Record<string, unknown>;
    for (const key of Object.keys(hideProps)) expect(childSchema[key]).toBeUndefined();
    expect(childSchema.columns).toEqual(schema.columns);
  });

  it('hands authored empty content to a resolved grid without changing its metadata', async () => {
    const content = <div role="status">No matching quotations</div>;
    renderList(makeDataSource(), { ...hideProps, emptyStateContent: content });
    await childReady();
    expect(childProps?.emptyStateContent).toBe(content);
    expect((childProps?.schema as Record<string, unknown>).emptyStateContent).toBeUndefined();
  });

  it('does not replace a forbidden response with authored empty copy', async () => {
    const dataSource = makeDataSource();
    vi.mocked(dataSource.find).mockRejectedValue(Object.assign(new Error('Forbidden'), { httpStatus: 403 }));
    renderList(dataSource, { ...hideProps, emptyStateContent: <div>No matching quotations</div> });
    expect(await screen.findByTestId('list-error-state')).toHaveAttribute('role', 'alert');
    expect(screen.queryByText('No matching quotations')).toBeNull();
  });

  it('authorizes a synchronous empty value provider without a data source', async () => {
    renderList(undefined, { ...hideProps, schema: { ...schema, data: { provider: 'value', items: [] } } });
    await childReady();
    expect(childProps?.hideHeaderWhenEmpty).toBe(true);
    expect(childProps?.hidePaginationWhenEmpty).toBe(true);
  });

  it('keeps a successful nonempty response visible with the configured row-number choice', async () => {
    const rows = [{ id: 'r1', name: 'Aster' }];
    renderList(makeDataSource({ data: rows, total: 1, hasMore: false }), hideProps);
    await childReady();
    expect(childProps?.data).toEqual(rows);
    expect(childProps?.showRowNumbers).toBe(false);
    // The table would also keep its nonempty header/pager. The list does not
    // authorize empty suppression for a response reporting a positive total.
    expect(childProps?.hideHeaderWhenEmpty).toBe(false);
    expect(childProps?.hidePaginationWhenEmpty).toBe(false);
  });

  it.each([
    { total: 0 },
    { data: [], hasMore: false },
    { data: null, total: 0 },
    { data: [], total: 5, hasMore: false },
    { data: [], total: 0, hasMore: true },
    { data: [], total: '0', hasMore: false },
    { data: [], total: null, hasMore: false },
    { data: [], total: 0, hasMore: null },
  ])('does not authorize suppression for an unknown or incomplete read %j', async response => {
    renderList(makeDataSource(response), hideProps);
    await childReady();
    expect(childProps?.hideHeaderWhenEmpty).toBe(false);
    expect(childProps?.hidePaginationWhenEmpty).toBe(false);
  });

  it('keeps an asynchronous row array without a total unconfirmed', async () => {
    renderList(makeDataSource([]), hideProps);
    await childReady();
    expect(childProps?.hideHeaderWhenEmpty).toBe(false);
    expect(childProps?.hidePaginationWhenEmpty).toBe(false);
  });

  it('does not authorize suppression when there is no source to read', async () => {
    renderList(undefined, hideProps);
    await childReady();
    expect(childProps?.hideHeaderWhenEmpty).toBe(false);
    expect(childProps?.hidePaginationWhenEmpty).toBe(false);
  });

  it('keeps the existing empty state without headers while field permissions are unresolved', async () => {
    renderList(makeDataSource(), hideProps, false);
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-presentation-grid')).toBeNull();
    expect(childProps).toBeNull();
  });

  it('keeps the initial loading state while the request remains unfinished', async () => {
    const dataSource = makeDataSource();
    vi.mocked(dataSource.find).mockImplementation(() => new Promise(() => {}));
    renderList(dataSource, hideProps);
    await waitFor(() => expect(dataSource.find).toHaveBeenCalled());
    expect(screen.getByTestId('list-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-presentation-grid')).toBeNull();
    expect(childProps).toBeNull();
  });

  it('keeps the existing forbidden error panel instead of an empty table', async () => {
    const dataSource = makeDataSource();
    vi.mocked(dataSource.find).mockRejectedValue(Object.assign(new Error('Forbidden'), { httpStatus: 403 }));
    renderList(dataSource, hideProps);
    const panel = await screen.findByTestId('list-error-state');
    expect(panel).toHaveAttribute('role', 'alert');
    expect(panel).toHaveAttribute('data-error-kind', 'forbidden');
    expect(screen.queryByTestId('empty-presentation-grid')).toBeNull();
    expect(childProps).toBeNull();
  });
});
