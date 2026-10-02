import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentRegistry } from '@object-ui/core';
import { ListSummary } from '../ListSummary';
import { PageHeader } from '../PageHeader';
import { StatusTabs } from '../StatusTabs';
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
    expect(summary).toHaveClass('grid-cols-1', '@sm:grid-cols-2', '@2xl:grid-cols-4', 'min-w-0');
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
            { value: 'active', label: 'Active', count: 9 },
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
    expect(tabList).toBeInTheDocument();
    expect(allTab).toHaveAttribute('aria-controls', 'contact-results');
    expect(screen.getByRole('tabpanel', { name: 'Contact results' })).toBeInTheDocument();
    expect(allTab).toHaveAttribute('aria-selected', 'true');

    await user.click(activeTab);
    expect(onChange).toHaveBeenLastCalledWith('active');
    expect(activeTab).toHaveAttribute('aria-selected', 'true');

    activeTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(inactiveTab).toHaveFocus();
    expect(inactiveTab).toHaveAttribute('aria-selected', 'true');
    expect(onChange).toHaveBeenLastCalledWith('inactive');
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
    const registered = ['WorkspaceHeader', 'ListSummary', 'StatusTabs'].map((name) =>
      registrations.find((entry) => entry.name === name),
    );

    // The record plugin exposes page:header as the schema-derived PageHeader name.
    const schemaDerivedNames = new Set(['PageHeader']);
    expect(registered.every(entry => entry && !schemaDerivedNames.has(entry.name))).toBe(true);
    expect(registrations.find(entry => entry.name === 'PageHeader')).toBeUndefined();
    expect(registered[0]?.component).toBe(PageHeader);
    expect(registered.every(Boolean)).toBe(true);
    expect(registered.every((entry) => entry?.injectDataSource === false)).toBe(true);
    expect(ComponentRegistry.getConfig('ListSummary')).toBeUndefined();
    expect(ComponentRegistry.getConfig('StatusTabs')).toBeUndefined();
  });
});
