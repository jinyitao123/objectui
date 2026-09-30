import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { SchemaRendererProvider } from '@object-ui/react';
// Exercise the real query owner behind the registered lazy Gantt boundary.
import '@object-ui/plugin-gantt';
import { ListView } from '@object-ui/plugin-list';

afterEach(cleanup);

describe('ListView search on the native Gantt query', () => {
  it('combines search with the base filter, refreshes that slice and clears only search', async () => {
    const adapter = {
      find: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      findOne: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
      getObjectSchema: vi.fn().mockResolvedValue({
        name: 'project', fields: {
          name: { type: 'text', label: 'Project name' },
          code: { type: 'text', label: 'Project code' },
          status: { type: 'text', label: 'Status' },
          starts_on: { type: 'date', label: 'Start' },
          ends_on: { type: 'date', label: 'End' },
        },
      }),
    };
    const view = render(
      <SchemaRendererProvider dataSource={adapter}>
        <ListView schema={{
          type: 'list-view', objectName: 'project', viewType: 'gantt',
          data: { provider: 'object', object: 'project' },
          columns: ['name'], searchableFields: ['name', 'code'],
          filter: [{ field: 'status', operator: '=', value: 'pending' }],
          gantt: { startDateField: 'starts_on', endDateField: 'ends_on', titleField: 'name', viewMode: 'week' },
        }} dataSource={adapter} />
      </SchemaRendererProvider>,
    );
    const input = view.getByTestId('list-inline-search').querySelector('input')!;
    const ownQueries = () => adapter.find.mock.calls.map(call => call[1]).filter(query => !('$search' in query) && query.$top > 100);
    await waitFor(() => expect(ownQueries().length).toBeGreaterThan(0));
    fireEvent.change(input, { target: { value: 'Delivery' } });
    const base = [['status', '=', 'pending']];
    const expected = ['and', base, ['or', ['name', 'contains', 'Delivery'], ['code', 'contains', 'Delivery']]];
    await waitFor(() => expect(ownQueries().slice(-1)[0]?.$filter).toEqual(expected));
    expect(view.queryByTestId('refresh-button')).toBeNull();
    const beforeRefresh = ownQueries().length;
    fireEvent.click(await view.findByRole('button', { name: 'Refresh' }));
    await waitFor(() => expect(ownQueries().length).toBeGreaterThan(beforeRefresh));
    expect(ownQueries().slice(-1)[0]?.$filter).toEqual(expected);
    fireEvent.click(view.getByTestId('list-inline-search').querySelector('button')!);
    await waitFor(() => expect(ownQueries().slice(-1)[0]?.$filter).toEqual(base));
    expect(input.value).toBe('');
  });
});
