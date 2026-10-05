import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/lazy-icon', () => ({
  LazyIcon: ({ name }: { name?: string }) => <span data-testid="document-section-icon" data-icon-name={name} />,
}));
import { DocumentSection, DocumentWorkspace } from './document-workspace';

describe('DocumentWorkspace', () => {
  it('keeps the main content and named sidebar in a responsive, non-resizable layout', () => {
    const { container } = render(
      <DocumentWorkspace
        main={<div>Main document</div>}
        sidebarLabel="Order information"
        sidebar={<div>Order summary</div>}
      />,
    );

    const workspace = container.querySelector('[data-slot="document-workspace"]');
    expect(workspace).toHaveClass('grid-cols-1');
    expect(workspace).toHaveClass('@4xl:grid-cols-[minmax(0,2.3fr)_minmax(15rem,1fr)]');
    expect(container.querySelector('[data-slot="document-workspace-container"]')).toHaveClass('@container');
    expect(screen.getByText('Main document')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Order information' })).toHaveTextContent('Order summary');
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
  });
});

describe('DocumentSection', () => {
  it('exposes a named section, semantic heading id, step number, actions, and body', () => {
    render(
      <DocumentSection
        title="Purchase source"
        stepNumber={1}
        headingId="purchase-source-heading"
        actions={<button type="button">Edit</button>}
      >
        <p>Choose a source</p>
      </DocumentSection>,
    );

    const region = screen.getByRole('region', { name: 'Purchase source' });
    expect(region.querySelector('[data-slot="document-section-card"]')).toBeInTheDocument();
    expect(region.querySelector('[data-slot="document-section-count"]')).not.toBeInTheDocument();
    expect(region.querySelector('[data-slot="document-section-description"]')).not.toBeInTheDocument();
    const heading = within(region).getByRole('heading', { level: 2, name: 'Purchase source' });
    expect(heading).toHaveAttribute('id', 'purchase-source-heading');
    expect(region).toHaveAttribute('aria-labelledby', 'purchase-source-heading');
    const step = within(region).getByText('1');
    expect(step).toHaveAttribute('aria-hidden', 'true');
    expect(step).toHaveClass('size-[var(--ui-document-section-step-size,1.25rem)]');
    const header = region.querySelector('[data-slot="document-section-header"]');
    expect(header).toHaveClass('after:inset-x-[var(--ui-document-section-divider-inset,0px)]');
    expect(header).not.toHaveClass('after:inset-x-[var(--ui-card-padding,1.5rem)]');
    expect(region.querySelector('[data-slot="document-section-content"]')).toHaveClass(
      'pt-[var(--ui-document-section-body-padding-top,var(--ui-card-content-padding-top,1.25rem))]',
    );
    expect(within(region).getByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(within(region).getByText('Choose a source')).toBeInTheDocument();
  });

  it('generates distinct heading ids when callers do not supply them', () => {
    const { container } = render(
      <>
        <DocumentSection title="First section">First body</DocumentSection>
        <DocumentSection title="Second section">Second body</DocumentSection>
      </>,
    );

    const headings = [...container.querySelectorAll('[data-slot="document-section-title"]')];
    expect(headings).toHaveLength(2);
    expect(headings[0]?.id).not.toBe('');
    expect(headings[0]?.id).not.toBe(headings[1]?.id);
    for (const section of container.querySelectorAll('section[data-slot="document-section"]')) {
      expect(section.getAttribute('aria-labelledby')).toBe(section.querySelector('h2')?.id);
    }
  });

  it('renders a plain section with icon, zero count, description, and keyboard-operable actions', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const { container } = render(
      <DocumentSection
        variant="plain"
        title="Today plan"
        icon="calendar-days"
        count={0}
        description="Today's scheduled work orders"
        headingId="today-plan-heading"
        actions={<button type="button" onClick={onAction}>Open orders</button>}
      >
        <p>Work order list</p>
      </DocumentSection>,
    );

    const region = screen.getByRole('region', { name: 'Today plan' });
    const heading = within(region).getByRole('heading', { level: 2, name: 'Today plan' });
    expect(heading).toHaveAttribute('id', 'today-plan-heading');
    expect(region).toHaveAttribute('aria-labelledby', 'today-plan-heading');
    expect(region.querySelector('[data-slot="document-section-card"]')).not.toBeInTheDocument();
    expect(within(region).getByTestId('document-section-icon')).toHaveAttribute('data-icon-name', 'calendar-days');
    expect(within(region).getByText('0')).toBeInTheDocument();
    const description = within(region).getByText("Today's scheduled work orders");
    expect(description).toBeInTheDocument();
    expect(description.parentElement).toBe(heading.parentElement);
    expect(within(region).getByText('Work order list')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="document-section-header"]')).toHaveClass('flex-wrap');
    expect(heading.parentElement).toHaveClass('min-h-[var(--ui-document-section-plain-header-height,20px)]');
    expect(heading.parentElement).toHaveClass('gap-[var(--ui-document-section-plain-inline-gap,7px)]');
    expect(within(region).getByText('0').closest('[data-slot="document-section-count"]')).toHaveClass(
      'rounded-[var(--ui-document-section-plain-count-radius,3.5px)]',
    );
    const actions = region.querySelector('[data-slot="document-section-actions"]');
    expect(actions).toHaveClass('max-w-full', 'justify-end');

    const action = within(region).getByRole('button', { name: 'Open orders' });
    action.focus();
    expect(document.activeElement).toBe(action);
    await user.keyboard('{Enter}');
    expect(onAction).toHaveBeenCalledTimes(1);
    await user.keyboard(' ');
    expect(onAction).toHaveBeenCalledTimes(2);
  });

  it('keeps a 20px plain title row when no description is provided', () => {
    render(<DocumentSection variant="plain" title="Today schedule">Body</DocumentSection>);
    const region = screen.getByRole('region', { name: 'Today schedule' });
    const heading = within(region).getByRole('heading', { level: 2, name: 'Today schedule' });
    expect(heading.parentElement).toHaveClass('min-h-[var(--ui-document-section-plain-header-height,20px)]');
    expect(region.querySelector('[data-slot="document-section-description"]')).not.toBeInTheDocument();
  });

  it('keeps new metadata within the existing card variant without dropping a zero count', () => {
    render(
      <DocumentSection variant="card" title="Pending items" count={0} description="Current queue">
        <p>Body</p>
      </DocumentSection>,
    );
    const region = screen.getByRole('region', { name: 'Pending items' });
    expect(region.querySelector('[data-slot="document-section-card"]')).toBeInTheDocument();
    expect(within(region).getByText('0')).toBeInTheDocument();
    expect(within(region).getByText('Current queue')).toBeInTheDocument();
  });
});
