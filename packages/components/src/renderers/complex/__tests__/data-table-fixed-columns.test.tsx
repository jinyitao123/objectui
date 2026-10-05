/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * `TableColumn.fixed` is a declared, parsed data-table contract. Pinning must
 * use measured header widths for both sides, while ordinary columns and the
 * existing class-based right-pin channel remain stable.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { ComponentRegistry } from '@object-ui/core';
import type { DataTableSchema } from '@object-ui/types';
import '../data-table';

const ROWS = [{ id: 'row-1', leftA: 'A', leftB: 'B', normal: 'N', rightA: 'RA', rightB: 'RB' }];
let headerWidths = new Map<string, number>();

function mockRect(width: number): DOMRect {
  return {
    width,
    height: 40,
    top: 0,
    left: 0,
    bottom: 40,
    right: width,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

const originalGetRect = HTMLElement.prototype.getBoundingClientRect;

function renderTable(schema: DataTableSchema) {
  const DataTable = ComponentRegistry.get('data-table') as React.ComponentType<{ schema: DataTableSchema }>;
  if (!DataTable) throw new Error('data-table not registered');
  return render(<DataTable schema={schema} />);
}

function makeSchema(columns: DataTableSchema['columns'], data = ROWS): DataTableSchema {
  return {
    type: 'data-table',
    columns,
    data,
    searchable: false,
    sortable: false,
    exportable: false,
    selectable: false,
    pagination: false,
    reorderableColumns: false,
  };
}

describe('data-table fixed columns use measured, side-specific offsets', () => {
  beforeAll(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.tagName === 'TH') {
        return mockRect(headerWidths.get(this.textContent?.trim() || '') ?? 100);
      }
      return originalGetRect.call(this);
    });
  });

  beforeEach(() => {
    headerWidths = new Map();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it('offsets two fixed columns on each side and leaves a normal column unpinned', () => {
    headerWidths = new Map([
      ['Left A', 120],
      ['Left B', 80],
      ['Normal', 150],
      ['Right A', 100],
      ['Right B', 70],
    ]);
    const columns = [
      { header: 'Left A', accessorKey: 'leftA', fixed: 'left', width: 120 },
      { header: 'Left B', accessorKey: 'leftB', fixed: 'left', width: 80 },
      { header: 'Normal', accessorKey: 'normal', width: 150 },
      { header: 'Right A', accessorKey: 'rightA', fixed: 'right', width: 100 },
      { header: 'Right B', accessorKey: 'rightB', fixed: 'right', width: 70 },
    ] satisfies DataTableSchema['columns'];
    const { container } = renderTable(makeSchema(columns));

    const headers = Array.from(container.querySelectorAll('thead th')) as HTMLElement[];
    expect(headers.map((header) => [header.style.left, header.style.right])).toEqual([
      ['0px', ''],
      ['120px', ''],
      ['', ''],
      ['', '70px'],
      ['', '0px'],
    ]);

    const cells = Array.from(container.querySelectorAll('tbody tr:first-child td')) as HTMLElement[];
    expect(cells.map((cell) => [cell.style.left, cell.style.right])).toEqual([
      ['0px', ''],
      ['120px', ''],
      ['', ''],
      ['', '70px'],
      ['', '0px'],
    ]);
  });

  it('adds measured selection, row-number, and frozen-prefix widths before a fixed-right pair', () => {
    headerWidths = new Map([
      ['', 28],
      ['#', 47],
      ['Frozen', 120],
      ['Normal', 150],
      ['Right A', 100],
      ['Right B', 70],
    ]);
    const columns = [
      { header: 'Frozen', accessorKey: 'leftA', width: 120 },
      { header: 'Normal', accessorKey: 'normal', width: 150 },
      { header: 'Right A', accessorKey: 'rightA', fixed: 'right', width: 100 },
      { header: 'Right B', accessorKey: 'rightB', fixed: 'right', width: 70 },
    ] satisfies DataTableSchema['columns'];
    const { container } = renderTable({
      ...makeSchema(columns),
      selectable: true,
      showRowNumbers: true,
      frozenColumns: 1,
    });

    const headers = Array.from(container.querySelectorAll('thead th')) as HTMLElement[];
    expect(headers.map((header) => [header.style.left, header.style.right])).toEqual([
      ['', ''],
      ['28px', ''],
      ['75px', ''],
      ['', ''],
      ['', '70px'],
      ['', '0px'],
    ]);

    const cells = Array.from(container.querySelectorAll('tbody tr:first-child td')) as HTMLElement[];
    expect(cells.map((cell) => [cell.style.left, cell.style.right])).toEqual([
      ['', ''],
      ['28px', ''],
      ['75px', ''],
      ['', ''],
      ['', '70px'],
      ['', '0px'],
    ]);
  });

  it('keeps legacy sticky right classes and measures their offsets for headers and cells', () => {
    headerWidths = new Map([
      ['Legacy right A', 110],
      ['Normal', 150],
      ['Legacy right B', 65],
    ]);
    const columns = [
      { header: 'Legacy right A', accessorKey: 'leftA', className: 'sticky right-0 z-20' },
      { header: 'Normal', accessorKey: 'normal', width: 150 },
      { header: 'Legacy right B', accessorKey: 'rightB', cellClassName: 'sticky right-0 z-10' },
    ] satisfies DataTableSchema['columns'];
    const { container } = renderTable(makeSchema(columns));

    const headers = Array.from(container.querySelectorAll('thead th')) as HTMLElement[];
    const cells = Array.from(container.querySelectorAll('tbody tr:first-child td')) as HTMLElement[];
    expect(headers.map((header) => header.style.right)).toEqual(['65px', '', '0px']);
    expect(cells.map((cell) => cell.style.right)).toEqual(['65px', '', '0px']);
  });

  it('keeps the empty message inside the single horizontal scroll owner', () => {
    const columns = [
      { header: 'Left', accessorKey: 'leftA', fixed: 'left', width: 120 },
      { header: 'Normal', accessorKey: 'normal', width: 150 },
      { header: 'Right', accessorKey: 'rightB', fixed: 'right', width: 70 },
    ] satisfies DataTableSchema['columns'];
    const { container } = renderTable(makeSchema(columns, []));

    const table = container.querySelector('table');
    const emptyViewport = container.querySelector('[data-slot="record-table-empty-viewport"]');
    expect(table).not.toBeNull();
    expect(emptyViewport).not.toBeNull();
    const tableWrapper = table!.parentElement!;
    const scrollOwner = tableWrapper.parentElement!;
    expect(tableWrapper).toHaveClass('overflow-visible');
    expect(scrollOwner).toHaveClass('overflow-auto');
    expect(scrollOwner).toContainElement(emptyViewport as HTMLElement);
    expect(container.querySelectorAll('[data-slot="record-table-empty-viewport"]')).toHaveLength(1);
    expect(table!.querySelector('tbody td')?.getAttribute('colspan')).toBe('3');
  });
});
