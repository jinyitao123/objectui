/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * ListView must not repeat the total already rendered by DataTable's server
 * pager, while a surface without that pager keeps its count and cap warning.
 */
import React from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { ComponentRegistry } from '@object-ui/core';
import { registerAllFields } from '@object-ui/fields';
import { ActionProvider, SchemaRendererProvider } from '@object-ui/react';
import { ListView } from '../ListView';

const PAGE_SIZE = 5;
const objectDefinition = {
  name: 'paged_record',
  label: 'Paged record',
  fields: {
    id: { name: 'id', type: 'text' },
    name: { name: 'name', type: 'text', label: 'Name' },
  },
};

function makeDataSource(total: number | undefined, rowsPerPage = PAGE_SIZE) {
  const find = vi.fn(async (_object: string, params: Record<string, unknown>) => {
    const skip = Number(params.$skip || 0);
    const top = Number(params.$top || rowsPerPage);
    const count = total == null ? top : Math.max(0, Math.min(top, total - skip));
    const rows = Array.from({ length: count }, (_, index) => ({
      id: `row-${skip + index + 1}`,
      name: `Row ${skip + index + 1}`,
    }));
    return total == null ? { data: rows } : { data: rows, total };
  });
  return {
    find,
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getObjectSchema: vi.fn(async () => objectDefinition),
  } as any;
}

function makeSchema(overrides: Record<string, unknown> = {}) {
  return {
    type: 'list-view',
    objectName: 'paged_record',
    viewType: 'grid',
    fields: ['name'],
    columns: ['name'],
    pagination: { pageSize: PAGE_SIZE },
    searchableFields: [],
    ...overrides,
  } as any;
}

function renderList(dataSource: any, schema = makeSchema()) {
  return render(
    <SchemaRendererProvider dataSource={dataSource}>
      <ActionProvider>
        <ListView schema={schema} dataSource={dataSource} />
      </ActionProvider>
    </SchemaRendererProvider>,
  );
}

let previousGrid: any;
let previousKanban: any;
beforeAll(() => {
  registerAllFields();
  previousGrid = ComponentRegistry.get('object-grid');
  previousKanban = ComponentRegistry.get('object-kanban');
  // The heavy DOM setup registers the real grid before this test module loads.
  // Keep the package test program from following sibling source into unfinished dist declarations.
  expect(previousGrid).toBeDefined();
  ComponentRegistry.register('object-kanban', () => <div data-testid="kanban-surface" />, {
    namespace: 'test', label: 'Kanban', category: 'view',
  });
});
afterEach(cleanup);
afterAll(() => {
  if (previousGrid) ComponentRegistry.register('object-grid', previousGrid);
  else ComponentRegistry.unregister('object-grid');
  if (previousKanban) ComponentRegistry.register('object-kanban', previousKanban);
  else ComponentRegistry.unregister('object-kanban');
});

describe('ListView record-count feedback and the DataTable pager', () => {
  it('keeps the zero-result empty state without adding a second count bar', async () => {
    renderList(makeDataSource(0));

    await screen.findByTestId('empty-state');
    expect(screen.queryByTestId('record-count-bar')).toBeNull();
  });

  it('uses the DataTable footer total for a one-page server result', async () => {
    renderList(makeDataSource(3));

    await screen.findByText('3 total');
    expect(screen.queryByTestId('record-count-bar')).toBeNull();
  });

  it('uses the DataTable footer total and page count for a multi-page server result', async () => {
    const { container } = renderList(makeDataSource(12));

    await screen.findByText('12 total');
    await waitFor(() => expect(container.textContent).toContain('Page 1 of 3'));
    expect(screen.queryByTestId('record-count-bar')).toBeNull();
  });

  it('retains total and cap warning when grid pagination is explicitly disabled', async () => {
    const schema = makeSchema({ options: { grid: { showPagination: false } } });
    renderList(makeDataSource(12), schema);

    const bar = await screen.findByTestId('record-count-bar');
    expect(bar.textContent).toContain('12');
    expect(await screen.findByTestId('data-limit-warning')).toBeTruthy();
  });

  it('retains row count and cap warning on a non-grid surface with an unknown total', async () => {
    const schema = makeSchema({ viewType: 'kanban' });
    renderList(makeDataSource(undefined), schema);

    await screen.findByTestId('kanban-surface');
    const bar = await screen.findByTestId('record-count-bar');
    expect(bar.textContent).toContain(String(PAGE_SIZE));
    expect(await screen.findByTestId('data-limit-warning')).toBeTruthy();
  });
});
