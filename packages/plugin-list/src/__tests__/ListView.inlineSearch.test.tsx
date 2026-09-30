import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { SchemaRendererProvider } from '@object-ui/react';
import { ListView } from '../ListView';

afterEach(cleanup);

function mount(search = true) {
  const adapter = {
    find: vi.fn().mockResolvedValue({ data: [], total: 0 }),
    findOne: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
    getObjectSchema: vi.fn().mockResolvedValue({
      name: 'project', fields: [
        { name: 'name', type: 'text', label: 'Project name' },
        { name: 'code', type: 'text', label: 'Project code' },
      ],
    }),
  };
  const view = render(
    <SchemaRendererProvider dataSource={adapter}>
      <ListView
        schema={{
          type: 'list-view', objectName: 'project', columns: ['name'],
          searchableFields: ['name', 'code'], userActions: { search },
        }}
        dataSource={adapter}
      />
    </SchemaRendererProvider>,
  );
  return { ...view, adapter };
}

describe('ListView persistent host search', () => {
  it('uses the declared search fields, retains the keyword on refresh and clears it', async () => {
    const { getByTestId, adapter } = mount();
    await waitFor(() => expect(adapter.find).toHaveBeenCalled());
    const row = getByTestId('list-inline-search');
    const input = row.querySelector('input')!;
    fireEvent.change(input, { target: { value: 'Delivery' } });
    await waitFor(() => expect(adapter.find.mock.lastCall?.[1]).toMatchObject({
      $search: 'Delivery', $searchFields: ['name', 'code'],
    }));
    const calls = adapter.find.mock.calls.length;
    fireEvent.click(getByTestId('refresh-button'));
    await waitFor(() => expect(adapter.find.mock.calls.length).toBeGreaterThan(calls));
    expect(adapter.find.mock.lastCall?.[1]).toMatchObject({ $search: 'Delivery' });
    expect(input.value).toBe('Delivery');
    fireEvent.click(row.querySelector('button')!);
    await waitFor(() => expect(adapter.find.mock.lastCall?.[1]).not.toHaveProperty('$search'));
    expect(input.value).toBe('');
    expect(document.activeElement).toBe(input);
  });

  it('respects the metadata search action toggle on both surfaces', async () => {
    const { queryByTestId, adapter } = mount(false);
    await waitFor(() => expect(adapter.find).toHaveBeenCalled());
    expect(queryByTestId('list-inline-search')).toBeNull();
    expect(queryByTestId('search-icon-button')).toBeNull();
  });
});
