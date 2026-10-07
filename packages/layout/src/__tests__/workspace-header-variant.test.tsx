import React from 'react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentRegistry } from '@object-ui/core';
import { registerLayout } from '../index';
import { PageHeader } from '../PageHeader';

beforeAll(() => {
  registerLayout();
});

describe('WorkspaceHeader workspace variant', () => {
  it('keeps the existing default header without adding breadcrumb chrome', () => {
    render(<PageHeader title="Shipments" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Shipments' })).toHaveClass('truncate');
    expect(screen.queryByRole('navigation', { name: 'breadcrumb' })).not.toBeInTheDocument();
    expect(document.querySelector('[data-slot="workspace-header-breadcrumb"]')).toBeNull();
  });

  it('renders canonical breadcrumb items, one title, a separate subtitle and the action slot', async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();

    render(
      <PageHeader
        variant="workspace"
        title="Shipments"
        subtitle="Orders ready for dispatch"
        breadcrumbItems={[
          { label: 'Sales', href: '/sales' },
          { label: 'Orders', href: '/sales/orders' },
          { label: 'Shipments' },
        ]}
      >
        <button type="button" onClick={onCreate}>New shipment</button>
      </PageHeader>,
    );

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('Shipments');
    expect(screen.getByText('Orders ready for dispatch')).toBeInTheDocument();

    const breadcrumb = screen.getByRole('navigation', { name: 'breadcrumb' });
    expect(within(breadcrumb).getByRole('link', { name: 'Sales' })).toHaveAttribute('href', '/sales');
    expect(within(breadcrumb).getByRole('link', { name: 'Orders' })).toHaveAttribute('href', '/sales/orders');
    expect(breadcrumb.querySelector('[aria-current="page"]')).toHaveTextContent('Shipments');
    expect(breadcrumb.compareDocumentPosition(headings[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const action = screen.getByRole('button', { name: 'New shipment' });
    expect(action.closest('[data-slot="page-header-actions"]')).toBeInTheDocument();

    await user.tab();
    expect(within(breadcrumb).getByRole('link', { name: 'Sales' })).toHaveFocus();
    await user.tab();
    expect(within(breadcrumb).getByRole('link', { name: 'Orders' })).toHaveFocus();
    await user.tab();
    expect(action).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  it('lets long workspace titles wrap and keeps their full text in the document', () => {
    const title = 'A shipment title that needs more than one line in a narrow workspace';

    render(
      <div style={{ width: '12rem' }}>
        <PageHeader variant="workspace" title={title} />
      </div>,
    );

    const heading = screen.getByRole('heading', { level: 1, name: title });
    const frame = heading.closest('[data-slot="page-header"]');
    expect(frame).toBeInTheDocument();
    expect(heading).toHaveClass('whitespace-normal', 'break-words');
    expect(heading).not.toHaveClass('truncate');
    expect(heading.textContent).toBe(title);
  });

  it('keeps workspace-only props off both schema authoring surfaces', () => {
    const legacyInputs = ComponentRegistry.getConfig('page-header', 'layout')?.inputs ?? [];
    const canonicalInputs = ComponentRegistry.getConfig('header', 'page')?.inputs ?? [];
    const legacyNames = legacyInputs.map((input) => input.name);
    const canonicalNames = canonicalInputs.map((input) => input.name);

    expect(legacyNames).not.toContain('variant');
    expect(legacyNames).not.toContain('breadcrumbItems');
    expect(canonicalNames).toContain('breadcrumb');
    expect(canonicalNames).not.toContain('variant');
    expect(canonicalNames).not.toContain('breadcrumbItems');
  });
});
