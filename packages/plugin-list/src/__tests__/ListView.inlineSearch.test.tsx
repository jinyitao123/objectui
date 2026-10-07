import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('preserves the popover search on Escape and returns focus after keyboard clear', async () => {
    const user = userEvent.setup();
    const { getByTestId, queryByTestId, adapter } = mount();
    await waitFor(() => expect(adapter.find).toHaveBeenCalled());

    const trigger = getByTestId('search-icon-button');
    trigger.focus();
    await user.keyboard('{Enter}');
    let popover = getByTestId('search-popover');
    let input = popover.querySelector('input') as HTMLInputElement;
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: 'Delivery' } });
    await waitFor(() => expect(adapter.find.mock.lastCall?.[1]).toMatchObject({ $search: 'Delivery' }));

    await user.keyboard('{Escape}');
    expect(queryByTestId('search-popover')).toBeNull();
    expect(trigger).toHaveFocus();

    await user.keyboard('{Enter}');
    popover = getByTestId('search-popover');
    input = popover.querySelector('input') as HTMLInputElement;
    expect(input).toHaveValue('Delivery');
    expect(input).toHaveFocus();

    await user.tab();
    const clear = popover.querySelector('button[aria-label="Clear"]')!;
    expect(clear).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(adapter.find.mock.lastCall?.[1]).not.toHaveProperty('$search'));
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();
  });
});
