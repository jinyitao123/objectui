import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ActionProvider, SchemaRenderer, SchemaRendererProvider } from '@object-ui/react';
import type { DataSource, ObjectGridSchema } from '@object-ui/types';
import { ObjectGrid, type ObjectGridComponentProps } from '../ObjectGrid';
// Load the actual registry wrapper before SchemaRenderer exercises its bridge.
import '../index';

const schema: ObjectGridSchema = {
  type: 'object-grid',
  objectName: 'empty_presentation_item',
  columns: [{ field: 'name', label: 'Name' }],
  pagination: { pageSize: 10, pageSizeOptions: [10, 20, 50, 100] },
  selection: { type: 'multiple' },
};
const rows = [{ id: 'r1', name: 'Aster' }];
const gridTypes = ['object-grid', 'plugin-grid:object-grid', 'view:grid'];
const authorLocations = ['top', 'props', 'properties'] as const;
type PresentationProps = Pick<ObjectGridComponentProps, 'hideHeaderWhenEmpty' | 'hidePaginationWhenEmpty' | 'showRowNumbers' | 'emptyStateContent'>;

function makeDataSource(response: unknown = { data: [], total: 0, hasMore: false }) {
  return {
    find: vi.fn(async () => response),
    getObjectSchema: vi.fn(async (name: string) => ({ name, fields: {
      id: { type: 'text' }, name: { type: 'text', label: 'Name' },
    } })),
  } as unknown as DataSource;
}

function renderGrid(dataSource: DataSource, props: Partial<ObjectGridComponentProps> = {}) {
  return render(<ActionProvider><SchemaRendererProvider dataSource={dataSource}>
    <ObjectGrid schema={schema} dataSource={dataSource} mobileLayout="table" {...props} />
  </SchemaRendererProvider></ActionProvider>);
}

function renderRegisteredGrid(type: string, metadata: Record<string, unknown> = {}, hostProps: PresentationProps = {}) {
  const dataSource = makeDataSource();
  return render(<ActionProvider><SchemaRendererProvider dataSource={dataSource}>
    <SchemaRenderer schema={{ ...schema, ...metadata, type }} mobileLayout="table" {...hostProps} />
  </SchemaRendererProvider></ActionProvider>);
}

async function settled(container: HTMLElement) {
  await waitFor(() => expect(container.querySelector('[data-slot="record-table"]')).not.toBeNull());
}

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('ObjectGrid React-only row numbers and empty presentation', () => {
  it.each(gridTypes.flatMap(type => authorLocations.map(location => [type, location] as const)))(
    'ignores authored presentation props through SchemaRenderer for %s in %s', async (type, location) => {
      const options = { hideHeaderWhenEmpty: true, hidePaginationWhenEmpty: true, showRowNumbers: false, emptyStateContent: 'Authored empty content' };
      const { container } = renderRegisteredGrid(type, location === 'top' ? options : { [location]: options });
      await settled(container);
      expect(screen.getAllByRole('columnheader').map(header => header.textContent?.trim())).toEqual(['', '#', 'Name']);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.queryByText('Authored empty content')).toBeNull();
    },
  );

  it.each(gridTypes)('preserves real host props over authored options for %s', async type => {
    const authored = { hideHeaderWhenEmpty: false, hidePaginationWhenEmpty: false, showRowNumbers: true, emptyStateContent: 'Authored empty content' };
    const { container } = renderRegisteredGrid(type, { ...authored, props: authored, properties: authored }, {
      hideHeaderWhenEmpty: true, hidePaginationWhenEmpty: true, showRowNumbers: false,
      emptyStateContent: <span>Host empty content</span>,
    });
    await settled(container);
    expect(container.querySelector('thead')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('Host empty content')).toBeInTheDocument();
  });

  it('preserves row numbers, selection and an empty server pager by default', async () => {
    const { container } = renderGrid(makeDataSource());
    await settled(container);
    expect(screen.getAllByRole('columnheader').map(header => header.textContent?.trim())).toEqual(['', '#', 'Name']);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveTextContent('10');
  });

  it('removes the number column while preserving selection for populated rows', async () => {
    const select = vi.fn();
    const { container } = renderGrid(makeDataSource({ data: rows, total: 1, hasMore: false }), { showRowNumbers: false, onRowSelect: select });
    await settled(container);
    expect(screen.getAllByRole('columnheader').map(header => header.textContent?.trim())).toEqual(['', 'Name']);
    expect(screen.getByText('Aster')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(select).toHaveBeenCalledWith(rows);
  });

  it('keeps the external server-page row numbers when empty presentation is enabled', async () => {
    const dataSource = makeDataSource();
    const { container } = renderGrid(dataSource, {
      data: rows, manualPagination: true, rowCount: 25, page: 2, onPageChange: vi.fn(),
      hideHeaderWhenEmpty: true, hidePaginationWhenEmpty: true,
    });
    await settled(container);
    expect(Array.from(container.querySelectorAll('tbody tr:first-child td')).map(cell => cell.textContent?.trim())).toEqual(['', '11', 'Aster']);
    expect(screen.getByRole('combobox')).toHaveTextContent('10');
    expect(dataSource.find).not.toHaveBeenCalled();
  });

  it('keeps headers when only the successful empty pager is hidden', async () => {
    const { container } = renderGrid(makeDataSource(), { showRowNumbers: false, hidePaginationWhenEmpty: true });
    await settled(container);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.queryByText('#')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });

  it('hides both chrome regions for a successful zero-row response', async () => {
    const { container } = renderGrid(makeDataSource(), { hideHeaderWhenEmpty: true, hidePaginationWhenEmpty: true });
    await settled(container);
    expect(container.querySelector('thead')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('accepts explicitly supplied synchronous empty rows', async () => {
    const dataSource = makeDataSource();
    const { container } = renderGrid(dataSource, {
      data: [], manualPagination: true, rowCount: 0, onPageChange: vi.fn(),
      hideHeaderWhenEmpty: true, hidePaginationWhenEmpty: true,
    });
    await settled(container);
    expect(container.querySelector('thead')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(dataSource.find).not.toHaveBeenCalled();
  });

  it('retains headers and paging on populated responses even with both flags', async () => {
    const { container } = renderGrid(makeDataSource({ data: rows, total: 1, hasMore: false }), { hideHeaderWhenEmpty: true, hidePaginationWhenEmpty: true });
    await settled(container);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByText('Aster')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it.each([
    { total: 0 },
    { data: [], hasMore: false },
    { data: [], total: 4, hasMore: false },
    { data: [], total: 0, hasMore: true },
    { data: [], total: '0', hasMore: false },
    { data: [], total: null, hasMore: false },
    { data: [], total: 0, hasMore: null },
  ])('preserves chrome for an unconfirmed empty response %j', async response => {
    const { container } = renderGrid(makeDataSource(response), { hideHeaderWhenEmpty: true, hidePaginationWhenEmpty: true });
    await settled(container);
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('keeps the loading presentation while the first read is unfinished', async () => {
    const dataSource = makeDataSource();
    vi.mocked(dataSource.find).mockImplementation(() => new Promise(() => {}));
    const { container } = renderGrid(dataSource, { hideHeaderWhenEmpty: true, hidePaginationWhenEmpty: true });
    await waitFor(() => expect(dataSource.find).toHaveBeenCalled());
    expect(screen.getByText('Loading grid…')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="record-table"]')).toBeNull();
    expect(screen.queryByText('No results found')).toBeNull();
  });

  it('keeps the existing error presentation for a rejected read', async () => {
    const dataSource = makeDataSource();
    vi.mocked(dataSource.find).mockRejectedValue(Object.assign(new Error('Forbidden'), { httpStatus: 403 }));
    const { container } = renderGrid(dataSource, { hideHeaderWhenEmpty: true, hidePaginationWhenEmpty: true });
    expect(await screen.findByText('Error loading grid')).toBeInTheDocument();
    expect(screen.getByText('Forbidden')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="record-table"]')).toBeNull();
    expect(screen.queryByText('No results found')).toBeNull();
  });
});
