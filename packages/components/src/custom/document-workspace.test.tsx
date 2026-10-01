import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
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
});
