import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { SchemaRenderer, SchemaRendererProvider } from '@object-ui/react';
import type { GanttViewProps } from './GanttView';
import './index';

vi.mock('./GanttView', () => ({
  GanttView: ({ tasks, onTaskClick }: Pick<GanttViewProps, 'tasks' | 'onTaskClick'>) => (
    <div>{tasks.map(task => <button key={task.id} onClick={() => onTaskClick?.(task)}>{task.title}</button>)}</div>
  ),
}));

describe('registered Gantt host navigation', () => {
  it('opens the host destination from an adapter row without accepting the host page', async () => {
    const record = { id: 'project-1', name: 'Governed project', starts_on: '2026-09-01', ends_on: '2026-09-30' };
    const adapter = {
      find: vi.fn().mockResolvedValue({ data: [record], total: 1 }),
      findOne: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(),
      getObjectSchema: vi.fn().mockResolvedValue({
        name: 'project', fields: {
          name: { type: 'text' }, starts_on: { type: 'date' }, ends_on: { type: 'date' },
        },
      }),
    };
    const onRowClick = vi.fn();
    const view = render(
      <SchemaRendererProvider dataSource={adapter}>
        <SchemaRenderer schema={{
          type: 'object-gantt', objectName: 'project',
          startDateField: 'starts_on', endDateField: 'ends_on', titleField: 'name',
          navigation: { mode: 'none' },
        }} onRowClick={onRowClick} data={[{ ...record, name: 'Host page' }]} />
      </SchemaRendererProvider>,
    );
    fireEvent.click(await view.findByRole('button', { name: 'Governed project' }));
    expect(onRowClick).toHaveBeenCalledTimes(1);
    expect(onRowClick.mock.calls[0][0]).toMatchObject(record);
    expect(view.queryByText('Host page')).toBeNull();
  });
});
