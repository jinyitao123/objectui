import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { ComponentRegistry } from '@object-ui/core';
import { SchemaRendererProvider } from '@object-ui/react';
import { ListView } from '../ListView';

let childProps: Record<string, any> | null = null;
let previousObjectGrid: any;

const rows = [{ id: 'row-1', name: 'Northwind' }];
const dataSource = {
  find: vi.fn(async () => ({ data: rows, total: rows.length, hasMore: false, pageSize: 20 })),
  getObjectSchema: vi.fn(async (name: string) => ({
    name,
    fields: { id: { type: 'text' }, name: { type: 'text', label: 'Name' } },
  })),
} as any;

beforeAll(() => {
  previousObjectGrid = ComponentRegistry.get('object-grid');
  ComponentRegistry.register('object-grid', (props: Record<string, any>) => {
    childProps = props;
    return <div data-testid="object-grid-mobile-layout-spy" />;
  });
});

afterAll(() => {
  if (previousObjectGrid) ComponentRegistry.register('object-grid', previousObjectGrid);
  else ComponentRegistry.unregister('object-grid');
});

beforeEach(() => {
  childProps = null;
  dataSource.find.mockClear();
  dataSource.getObjectSchema.mockClear();
});

afterEach(() => cleanup());

describe('ListView forwards the code-only mobileLayout React prop', () => {
  it('sends table layout to ObjectGrid as a React prop, not as schema data', async () => {
    render(
      <SchemaRendererProvider dataSource={dataSource}>
        <ListView
          schema={{
            type: 'list-view',
            objectName: 'mobile_layout_item',
            columns: [{ field: 'name', label: 'Name' }],
          } as never}
          dataSource={dataSource}
          mobileLayout="table"
        />
      </SchemaRendererProvider>,
    );

    await waitFor(() => expect(childProps).not.toBeNull());
    expect(childProps?.mobileLayout).toBe('table');
    expect(childProps?.schema.mobileLayout).toBeUndefined();
    expect(childProps?.schema.columns).toEqual([{ field: 'name', label: 'Name' }]);
  });
});
