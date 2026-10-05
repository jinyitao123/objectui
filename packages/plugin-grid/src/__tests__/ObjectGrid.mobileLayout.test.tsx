import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ActionProvider, SchemaRendererProvider } from '@object-ui/react';
import { ObjectGrid } from '../ObjectGrid';

const ORIGINAL_INNER_WIDTH = window.innerWidth;
const MOBILE_WIDTH = 390;
const OBJECT = 'mobile_layout_item';
const COLUMNS = [
  { field: 'name', label: 'Name' },
  { field: 'status', label: 'Status' },
];
const ROWS = [{ id: 'row-1', name: 'Northwind', status: 'Active' }];

function setViewport(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
}

function makeDataSource(rows: typeof ROWS | []) {
  return {
    find: vi.fn(async () => ({ data: rows, total: rows.length, hasMore: false, pageSize: 20 })),
    getObjectSchema: vi.fn(async (name: string) => ({
      name,
      fields: {
        id: { type: 'text' },
        name: { type: 'text', label: 'Name' },
        status: { type: 'text', label: 'Status' },
      },
    })),
  } as any;
}

function renderGrid(rows: typeof ROWS | [], mobileLayout?: 'cards' | 'table') {
  const dataSource = makeDataSource(rows);
  const schema = {
    type: 'object-grid',
    objectName: OBJECT,
    columns: COLUMNS,
    pagination: { pageSize: 20 },
  } as never;
  const result = render(
    <ActionProvider>
      <SchemaRendererProvider dataSource={dataSource}>
        <ObjectGrid schema={schema} dataSource={dataSource} mobileLayout={mobileLayout} />
      </SchemaRendererProvider>
    </ActionProvider>,
  );
  return { ...result, dataSource };
}

beforeEach(() => {
  setViewport(MOBILE_WIDTH);
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  setViewport(ORIGINAL_INNER_WIDTH);
});

describe('ObjectGrid mobileLayout React prop', () => {
  it('keeps every authored column header on a narrow empty grid', async () => {
    const { container } = renderGrid([]);

    await waitFor(() => expect(container.querySelector('[data-slot="record-table"]')).not.toBeNull());

    const headers = Array.from(container.querySelectorAll('thead th'));
    expect(headers.map((header) => header.textContent?.trim())).toEqual(['#', 'Name', 'Status']);
    expect(headers.slice(1).every((header) => !header.className.split(/\s+/).includes('hidden'))).toBe(true);
  });

  it('keeps the horizontally scrollable table when a host selects table layout', async () => {
    const { container } = renderGrid(ROWS, 'table');

    await waitFor(() => expect(container.querySelector('[data-slot="record-table"]')).not.toBeNull());
    expect(await screen.findByText('Northwind')).toBeInTheDocument();
    expect(Array.from(container.querySelectorAll('thead th')).map((header) => header.textContent?.trim()))
      .toEqual(['#', 'Name', 'Status']);
    expect(container.querySelector('tbody tr')).not.toBeNull();
    const scrollport = container.querySelector('[data-slot="record-table"] > div.relative.bg-background');
    expect(scrollport?.classList.contains('overflow-auto')).toBe(true);
  });

  it('keeps the existing mobile card layout as the default for populated grids', async () => {
    const { container } = renderGrid(ROWS);

    expect(await screen.findByText('Northwind')).toBeInTheDocument();
    await waitFor(() => expect(container.querySelector('[data-slot="record-table"]')).toBeNull());
    expect(screen.getByText('Northwind').closest('div[class*="p-2.5"]')).not.toBeNull();
  });
});
