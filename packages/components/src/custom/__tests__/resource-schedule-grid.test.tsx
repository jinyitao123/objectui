import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResourceScheduleGrid } from '../../index';
import type {
  ResourceScheduleDateColumn,
  ResourceScheduleEvent,
  ResourceScheduleResource,
} from '../ResourceScheduleGrid';

const resources: ResourceScheduleResource[] = [
  { id: 'r-1', label: 'Engineer One', description: 'North team' },
  { id: 'r-2', label: 'Engineer Two' },
];

const dateColumns: ResourceScheduleDateColumn[] = [
  { key: '2030-04-01', label: 'Apr 1', description: 'Monday', isToday: true },
  { key: '2030-04-02', label: 'Apr 2' },
  { key: '2030-04-03', label: 'Apr 3' },
];

function renderGrid(overrides: {
  resources?: readonly ResourceScheduleResource[];
  dateColumns?: readonly ResourceScheduleDateColumn[];
  events?: readonly ResourceScheduleEvent[];
  resourceHeaderLabel?: string;
  emptyLabel?: string;
  renderEvent?: (event: ResourceScheduleEvent) => React.ReactNode;
  renderResource?: (resource: ResourceScheduleResource) => React.ReactNode;
  onEventClick?: (event: ResourceScheduleEvent) => void;
} = {}) {
  return render(
    <ResourceScheduleGrid
      aria-label="Engineer schedule"
      resources={resources}
      dateColumns={dateColumns}
      events={[]}
      {...overrides}
    />,
  );
}

describe('ResourceScheduleGrid', () => {
  it('places events only in exact resource/date intersections', () => {
    const events: ResourceScheduleEvent[] = [
      { id: 'e-1', resourceId: 'r-1', dateKey: '2030-04-01', title: 'Calibration' },
      { id: 'e-2', resourceId: 'r-1', dateKey: '2030-04-03', title: 'Safety check' },
      { id: 'e-3', resourceId: 'r-2', dateKey: '2030-04-02', title: 'Inspection' },
      { id: 'e-4', resourceId: 'unknown-resource', dateKey: '2030-04-02', title: 'Unknown resource' },
      { id: 'e-5', resourceId: 'r-2', dateKey: 'unknown-date', title: 'Unknown date' },
      { id: 'e-6', resourceId: 'r-1', dateKey: '', title: 'Unplanned' },
    ];
    const { container } = renderGrid({ events });

    const table = screen.getByRole('table', { name: 'Engineer schedule' });
    const rows = table.querySelectorAll('tbody tr');
    expect(table.querySelectorAll('thead th')).toHaveLength(4);
    expect(rows).toHaveLength(2);
    expect(container.querySelectorAll('[data-slot="resource-schedule-cell"]')).toHaveLength(6);
    expect(container.querySelectorAll('[data-slot="resource-schedule-event"]')).toHaveLength(3);
    expect(within(rows[0] as HTMLElement).getByText('Calibration')).toBeInTheDocument();
    expect(within(rows[0] as HTMLElement).getByText('Safety check')).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText('Inspection')).toBeInTheDocument();
    expect(screen.queryByText('Unknown resource')).toBeNull();
    expect(screen.queryByText('Unknown date')).toBeNull();
    expect(screen.queryByText('Unplanned')).toBeNull();
    expect(table.innerHTML).not.toContain('r-1');
    expect(table.innerHTML).not.toContain('e-1');
    expect(Array.from(table.querySelectorAll('[title]')).some((node) =>
      node.getAttribute('title')?.includes('r-1') || node.getAttribute('title')?.includes('e-1'),
    )).toBe(false);
  });

  it('uses a native button for clickable events and supports keyboard activation', async () => {
    const user = userEvent.setup();
    const event: ResourceScheduleEvent = {
      id: 'e-1',
      resourceId: 'r-1',
      dateKey: '2030-04-01',
      title: 'Calibration',
      subtitle: 'Unit 12',
    };
    const onEventClick = vi.fn();
    const renderEvent = vi.fn((item: ResourceScheduleEvent) => (
      <span data-testid="custom-event-content">{item.title} card</span>
    ));

    renderGrid({ events: [event], onEventClick, renderEvent });

    const button = screen.getByRole('button', { name: 'Calibration, Engineer One, Apr 1' });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAttribute('type', 'button');
    expect(screen.getByTestId('custom-event-content')).toBeInTheDocument();
    expect(renderEvent).toHaveBeenCalledWith(event);

    await user.tab();
    expect(document.activeElement).toBe(button);
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onEventClick).toHaveBeenCalledTimes(2);
    expect(onEventClick).toHaveBeenNthCalledWith(1, event);
  });

  it('does not make display-only event content look clickable without a callback', () => {
    const event: ResourceScheduleEvent = {
      id: 'e-1', resourceId: 'r-1', dateKey: '2030-04-01', title: 'Calibration',
    };
    renderGrid({ events: [event] });

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Calibration').closest('button')).toBeNull();
    expect(screen.getByText('Calibration').closest('[data-slot="resource-schedule-event"]')?.tagName).toBe('DIV');
  });

  it('lets the host supply resource-row content without exposing the resource id', () => {
    const resource = resources[0];
    const renderResource = vi.fn((item: ResourceScheduleResource) => (
      <span data-testid="resource-display">Badge for {item.label}</span>
    ));
    const { container } = renderGrid({
      resources: [resource],
      dateColumns: [dateColumns[0]],
      renderResource,
    });

    expect(screen.getByTestId('resource-display')).toHaveTextContent('Badge for Engineer One');
    expect(screen.getByRole('rowheader', { name: 'Engineer One' })).toBeInTheDocument();
    expect(renderResource).toHaveBeenCalledWith(resource);
    expect(container.innerHTML).not.toContain('r-1');
  });

  it.each([7, 14, 28])('renders %i supplied date columns without adding period logic', (count) => {
    const columns = Array.from({ length: count }, (_, index) => ({
      key: `day-${index}`,
      label: `Day ${index + 1}`,
    }));
    const { container } = renderGrid({ dateColumns: columns });

    expect(screen.getAllByRole('columnheader')).toHaveLength(count + 1);
    expect(container.querySelectorAll('[data-slot="resource-schedule-cell"]')).toHaveLength(count * resources.length);
  });

  it('keeps horizontal scrolling inside one bounded viewport and pins resource labels left', () => {
    const { container } = renderGrid();
    const root = screen.getByRole('table').closest('[data-slot="resource-schedule-grid"]');
    const scroll = container.querySelector('[data-slot="resource-schedule-scroll"]');
    const firstHeader = screen.getByRole('columnheader', { name: 'Resource' });
    const rowHeader = screen.getByRole('rowheader', { name: 'Engineer One' });
    const dateHeader = screen.getByRole('columnheader', { name: /Apr 1/ });
    const firstResourceRow = rowHeader.closest('tr');

    expect(root).toHaveClass('min-w-0', 'max-w-full');
    expect(container.querySelectorAll('[data-slot="resource-schedule-scroll"]')).toHaveLength(1);
    expect(scroll).toHaveClass('overflow-x-auto');
    expect(root).not.toHaveClass('overflow-x-auto');
    expect(firstHeader).toHaveClass('sticky', 'left-0');
    expect(firstHeader).toHaveClass('w-[var(--ui-resource-schedule-resource-width,132px)]');
    expect(rowHeader).toHaveClass('sticky', 'left-0');
    expect(firstResourceRow).toHaveClass('h-[var(--ui-resource-schedule-row-min-height,86px)]');
    expect(dateHeader).not.toHaveClass('sticky', 'left-0');
    expect(dateHeader).toHaveClass('min-w-[var(--ui-resource-schedule-date-min-width,110px)]');
  });

  it('renders the host empty label and leaves resource presentation to its slot', () => {
    const renderResource = vi.fn((resource: ResourceScheduleResource) => (
      <span data-testid="custom-resource">Badge for {resource.label}</span>
    ));
    const { container } = renderGrid({
      resources: [],
      dateColumns: dateColumns.slice(0, 2),
      resourceHeaderLabel: 'Technicians',
      emptyLabel: 'No resources in this period',
      renderResource,
    });

    expect(screen.getByText('No resources in this period')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Technicians' })).toBeInTheDocument();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);
    expect(container.querySelector('tbody td')).toBeNull();
    expect(container.querySelector('[data-slot="resource-schedule-empty-state"]')).toHaveClass('sticky', 'left-0');
    expect(screen.queryByTestId('custom-resource')).toBeNull();
    expect(renderResource).not.toHaveBeenCalled();
  });
});
