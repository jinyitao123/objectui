import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { RelatedList } from '../RelatedList';

const captured = vi.hoisted(() => ({ schema: null as any }));

vi.mock('@object-ui/react', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    SchemaRenderer: (props: any) => {
      captured.schema = props.schema;
      return null;
    },
  };
});

describe('RelatedList labels do not fall back to database keys', () => {
  it.each([
    { data: [{ id: 'line-1', name: 'Alpha' }], expected: '1 record' },
    { data: [{ id: 'line-1', name: 'Alpha' }, { id: 'line-2', name: 'Beta' }], expected: '2 records' },
  ])('uses the localized singular/plural collection count', ({ data, expected }) => {
    render(
      <RelatedList
        title="Lines"
        type="list"
        api="line"
        objectName="line"
        data={data}
      />,
    );

    expect(screen.getByLabelText(expected)).toBeTruthy();
  });

  it('uses the unresolved marker when a referenced record has no readable name', async () => {
    const customerId = 'db-customer-key-123';
    const dataSource = {
      find: vi.fn(async (objectName: string) => (
        objectName === 'customer' ? [{ id: customerId }] : []
      )),
      getObjectSchema: vi.fn(async (objectName: string) => (
        objectName === 'line'
          ? { name: 'line', fields: { customer_id: { type: 'lookup', label: 'Customer', reference: 'customer' } } }
          : { name: 'customer', fields: {} }
      )),
    };

    render(
      <RelatedList
        title="Lines"
        type="table"
        api="line"
        objectName="line"
        referenceField="order_id"
        parentId="order-1"
        data={[{ id: 'line-1', customer_id: customerId }]}
        dataSource={dataSource as any}
      />,
    );

    await waitFor(() => {
      expect(dataSource.find).toHaveBeenCalledWith('customer', expect.anything());
      expect(captured.schema?.columns?.some((column: any) => column.accessorKey === 'customer_id')).toBe(true);
    });

    const customerColumn = captured.schema.columns.find((column: any) => column.accessorKey === 'customer_id');
    render(customerColumn.cell(customerId));

    expect(screen.getByText('Record not resolved on this screen')).toBeTruthy();
    expect(document.body.textContent).not.toContain(customerId);
  });

  it('does not render an explicit primary-key-only column', async () => {
    const dataSource = {
      find: vi.fn(async () => []),
      getObjectSchema: vi.fn(async () => ({ name: 'line', fields: { id: { type: 'text', label: 'ID' } } })),
    };
    render(
      <RelatedList
        title="Lines"
        type="table"
        api="line"
        objectName="line"
        columns={['id']}
        data={[{ id: 'db-line-key' }]}
        dataSource={dataSource as any}
      />,
    );

    await waitFor(() => expect(captured.schema?.type).toBe('data-table'));
    expect(captured.schema.columns).toEqual([]);
    expect(document.body.textContent).not.toContain('db-line-key');
  });
});
