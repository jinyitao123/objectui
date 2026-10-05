import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentRegistry } from '@object-ui/core';
import { ListSummary } from '../ListSummary';
import { PageHeader } from '../PageHeader';
import { StatusTabs } from '../StatusTabs';
import { WorkspaceToolbar } from '../WorkspaceToolbar';
import { DateRangeControl, ResourceScheduleGrid } from '@object-ui/components';
import '../index';

describe('ListSummary', () => {
  it('renders only supplied values in a fluid responsive grid', () => {
    render(
      <ListSummary
        aria-label="Contact summary"
        items={[
          { id: 'all', label: 'All contacts', value: 12 },
          { id: 'active', label: 'Active', value: 9 },
          { id: 'inactive', label: 'Inactive', value: 3 },
          { id: 'prospect', label: 'Prospect', value: 4 },
        ]}
      />,
    );

    const summary = screen.getByLabelText('Contact summary');
    expect(summary).toHaveAttribute('data-slot', 'list-summary');
    expect(summary).toHaveClass('grid-cols-1', '@sm:grid-cols-2', '@2xl:grid-cols-[repeat(var(--ui-list-summary-columns,4),minmax(0,1fr))]', 'min-w-0');
    expect(summary.parentElement).toHaveAttribute('data-slot', 'list-summary-container');
    expect(summary.parentElement).toHaveClass('@container', 'min-w-0', 'max-w-full');
    expect(screen.getByText('All contacts')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(summary.querySelectorAll('[data-slot="list-summary-item"]')).toHaveLength(4);
    expect(summary.querySelectorAll('[data-slot="list-summary-item"].min-w-0')).toHaveLength(4);
    expect(summary.querySelector('[style*="width"]')).toBeNull();
  });
});

describe('StatusTabs', () => {
  it('updates from its controlled host value and supports arrow-key focus and selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    function ControlledTabs() {
      const [value, setValue] = React.useState('all');
      return (
        <StatusTabs
          aria-label="Contact status"
          panelId="contact-results"
          value={value}
          onValueChange={(next) => {
            onChange(next);
            setValue(next);
          }}
          items={[
            { value: 'all', label: 'All', count: 12 },
            { value: 'active', label: 'Active', count: 9, icon: 'list' },
            { value: 'inactive', label: 'Inactive', count: 3 },
          ]}
        />
      );
    }

    render(
      <>
        <ControlledTabs />
        <section id="contact-results" role="tabpanel" aria-label="Contact results" tabIndex={0} />
      </>,
    );

    const tabList = screen.getByRole('tablist', { name: 'Contact status' });
    const allTab = screen.getByRole('tab', { name: 'All 12' });
    const activeTab = screen.getByRole('tab', { name: 'Active 9' });
    const inactiveTab = screen.getByRole('tab', { name: 'Inactive 3' });
    expect(activeTab).toHaveClass(
      'h-[var(--ui-status-tabs-height,2rem)]',
      'py-[var(--ui-status-tabs-padding-block,0.25rem)]',
      'text-[length:var(--ui-status-tabs-font-size,0.75rem)]',
      'leading-[var(--ui-status-tabs-line-height,1.25)]',
    );
    expect(tabList).toBeInTheDocument();
    expect(allTab).toHaveAttribute('aria-controls', 'contact-results');
    expect(screen.getByRole('tabpanel', { name: 'Contact results' })).toBeInTheDocument();
    expect(allTab).toHaveAttribute('aria-selected', 'true');
    expect(allTab.querySelector('svg')).toBeNull();

    await user.click(activeTab);
    expect(onChange).toHaveBeenLastCalledWith('active');
    expect(activeTab).toHaveAttribute('aria-selected', 'true');
    const activeIcon = activeTab.querySelector('svg');
    expect(activeIcon).toHaveAttribute('aria-hidden', 'true');
    expect(activeIcon).toHaveAttribute('focusable', 'false');
    expect(activeIcon).toHaveClass('shrink-0');
    expect(activeTab).toHaveAccessibleName('Active 9');

    activeTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(inactiveTab).toHaveFocus();
    expect(inactiveTab).toHaveAttribute('aria-selected', 'true');
    expect(onChange).toHaveBeenLastCalledWith('inactive');
  });
});

describe('WorkspaceToolbar', () => {
  it('lays out host-owned controls in accessible, normal tab order', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    const onCreate = vi.fn();

    render(
      <WorkspaceToolbar
        aria-label="Project task controls"
        search={<input aria-label="Search tasks" onChange={onSearch} />}
        filters={(
          <select aria-label="Task status" defaultValue="all">
            <option value="all">All statuses</option>
            <option value="open">Open</option>
          </select>
        )}
        auxiliaryActions={<button type="button">Refresh</button>}
        primaryAction={<button type="button" onClick={onCreate}>New task</button>}
      />,
    );

    const group = screen.getByRole('group', { name: 'Project task controls' });
    const search = screen.getByRole('textbox', { name: 'Search tasks' });
    const filter = screen.getByRole('combobox', { name: 'Task status' });
    const refresh = screen.getByRole('button', { name: 'Refresh' });
    const create = screen.getByRole('button', { name: 'New task' });

    expect(group).toHaveAttribute('data-slot', 'workspace-toolbar');
    expect(group).toHaveClass('w-full', 'min-w-0', 'flex-wrap', 'max-w-full');
    expect(group.querySelector('[data-slot="workspace-toolbar-search"]')).toContainElement(search);
    expect(group.querySelector('[data-slot="workspace-toolbar-filters"]')).toContainElement(filter);
    expect(group.querySelector('[data-slot="workspace-toolbar-auxiliary-actions"]')).toContainElement(refresh);
    expect(group.querySelector('[data-slot="workspace-toolbar-primary-action"]')).toContainElement(create);

    await user.tab();
    expect(search).toHaveFocus();
    await user.type(search, 'handoff');
    expect(onSearch).toHaveBeenCalled();
    await user.tab();
    expect(filter).toHaveFocus();
    await user.tab();
    expect(refresh).toHaveFocus();
    await user.tab();
    expect(create).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('places the primary action before auxiliary actions when requested', async () => {
    const user = userEvent.setup();

    render(
      <WorkspaceToolbar
        aria-label="Sales order controls"
        primaryActionPlacement="start"
        primaryAction={<button type="button">Create order</button>}
        auxiliaryActions={<button type="button">Import or export</button>}
      />,
    );

    const group = screen.getByRole('group', { name: 'Sales order controls' });
    const create = screen.getByRole('button', { name: 'Create order' });
    const importExport = screen.getByRole('button', { name: 'Import or export' });
    const buttons = Array.from(group.querySelectorAll('button'));

    expect(buttons).toEqual([create, importExport]);
    await user.tab();
    expect(create).toHaveFocus();
    await user.tab();
    expect(importExport).toHaveFocus();
  });
});

describe('PageHeader action slot', () => {
  it('isolates action clicks from a clickable page container', () => {
    const pageClick = vi.fn();
    const actionClick = vi.fn();

    render(
      <main onClick={pageClick}>
        <PageHeader title="Contacts">
          <button type="button" onClick={actionClick}>New contact</button>
        </PageHeader>
      </main>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'New contact' }));

    expect(actionClick).toHaveBeenCalledTimes(1);
    expect(pageClick).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1, name: 'Contacts' })).toBeInTheDocument();
  });
});

describe('React Page runtime registration', () => {
  it('registers the composition components as data-source-free runtime capabilities', () => {
    const registrations = ComponentRegistry.getReactRuntimeComponents();
    const registered = ['WorkspaceHeader', 'WorkspaceToolbar', 'ListSummary', 'StatusTabs', 'DateRangeControl', 'ResourceScheduleGrid', 'DocumentSection', 'DocumentWorkspace'].map((name) =>
      registrations.find((entry) => entry.name === name),
    );

    // The record plugin exposes page:header as the schema-derived PageHeader name.
    const schemaDerivedNames = new Set(['PageHeader']);
    expect(registered.every(entry => entry && !schemaDerivedNames.has(entry.name))).toBe(true);
    expect(registrations.find(entry => entry.name === 'PageHeader')).toBeUndefined();
    expect(registered[0]?.component).toBe(PageHeader);
    expect(registered[1]?.component).toBe(WorkspaceToolbar);
    expect(registered[4]?.component).toBe(DateRangeControl);
    expect(registered[5]?.component).toBe(ResourceScheduleGrid);
    expect(registered.every(Boolean)).toBe(true);
    expect(registered.every((entry) => entry?.injectDataSource === false)).toBe(true);
    expect(ComponentRegistry.getConfig('ListSummary')).toBeUndefined();
    expect(ComponentRegistry.getConfig('WorkspaceToolbar')).toBeUndefined();
    expect(ComponentRegistry.getConfig('StatusTabs')).toBeUndefined();
    expect(ComponentRegistry.getConfig('DateRangeControl')).toBeUndefined();
    expect(ComponentRegistry.getConfig('ResourceScheduleGrid')).toBeUndefined();
    expect(ComponentRegistry.getConfig('DocumentSection')).toBeUndefined();
    expect(ComponentRegistry.getConfig('DocumentWorkspace')).toBeUndefined();
  });
});
