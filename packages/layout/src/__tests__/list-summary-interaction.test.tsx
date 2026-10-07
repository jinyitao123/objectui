import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListSummary } from '../ListSummary';

const quotationItems = [
  { id: 'all', label: 'Total quotes', icon: 'list', value: 12 },
  { id: 'draft', label: 'Draft', icon: 'file-pen-line', value: 3 },
  { id: 'pending', label: 'Awaiting customer', icon: 'clock-3', value: 2 },
  { id: 'accepted', label: 'Accepted', icon: 'circle-check', value: 4 },
  { id: 'execution', label: 'In execution', icon: 'arrow-right-left', value: 1 },
  { id: 'amount', label: 'Valid quote amount', icon: 'circle-dollar-sign', value: '$1,200', disabled: true },
];

describe('ListSummary interactive host mode', () => {
  it('keeps static summary semantics when the selection callback is absent', () => {
    const { container } = render(
      <ListSummary items={[{ id: 'draft', label: 'Draft', value: 3, disabled: true }]} selectedItemId="draft" />,
    );
    const list = container.querySelector('dl');

    expect(list).toHaveAttribute('data-slot', 'list-summary');
    expect(list?.querySelectorAll('dt')).toHaveLength(1);
    expect(list?.querySelectorAll('dd')).toHaveLength(1);
    expect(list?.querySelector('button')).toBeNull();
    expect(list?.querySelector('[aria-pressed]')).toBeNull();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(list?.querySelector('[data-slot="list-summary-description"]')).toBeNull();
  });

  it('renders supporting descriptions after values in static and interactive cards', async () => {
    const user = userEvent.setup();
    const onItemSelect = vi.fn();
    const items = [
      { id: 'sales', label: 'Sales total', value: '$1,250', description: 'Includes approved orders' },
      { id: 'pending', label: 'Pending', value: 2, description: <span>Awaiting review</span> },
      { id: 'disabled', label: 'Unavailable total', value: '—', description: 'Source unavailable', disabled: true },
      { id: 'plain', label: 'No description', value: 0 },
    ];

    const { container, rerender } = render(<ListSummary items={items} />);
    const definitionList = container.querySelector('dl');
    expect(definitionList).toBeInTheDocument();
    expect(definitionList?.querySelectorAll('dt')).toHaveLength(4);
    expect(definitionList?.querySelectorAll('dd')).toHaveLength(7);
    const salesItem = definitionList?.querySelector('[data-slot="list-summary-item"]');
    expect(salesItem?.children).toHaveLength(3);
    expect(salesItem?.children[0]).toHaveTextContent('Sales total');
    expect(salesItem?.children[1]).toHaveTextContent('$1,250');
    expect(salesItem?.children[2]).toHaveAttribute('data-slot', 'list-summary-description');
    expect(salesItem).toHaveClass('gap-0');
    expect(salesItem?.children[0]).toHaveClass('mb-[var(--ui-list-summary-item-gap,0.125rem)]');
    const description = definitionList?.querySelector('[data-slot="list-summary-description"]');
    expect(description).toHaveTextContent('Includes approved orders');
    expect(description).toHaveClass(
      'mt-[var(--ui-list-summary-description-margin-top,0px)]',
      'text-[length:var(--ui-list-summary-description-font-size,12px)]',
      'leading-[var(--ui-list-summary-description-line-height,16px)]',
      'font-[weight:var(--ui-list-summary-description-font-weight,400)]',
    );
    expect(definitionList?.querySelectorAll('[data-slot="list-summary-description"]')).toHaveLength(3);
    expect(screen.getByText('No description')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();

    rerender(<ListSummary items={items} onItemSelect={onItemSelect} selectedItemId="plain" />);
    const salesButton = screen.getByRole('button', { name: 'Sales total $1,250 Includes approved orders' });
    const disabledButton = screen.getByRole('button', { name: 'Unavailable total — Source unavailable' });
    expect(salesButton).toHaveAttribute('aria-pressed', 'false');
    expect(disabledButton).toBeDisabled();
    expect(screen.getByRole('button', { name: 'No description 0' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(salesButton);
    await user.click(disabledButton);
    expect(onItemSelect).toHaveBeenCalledTimes(1);
    expect(onItemSelect).toHaveBeenCalledWith('sales');
  });

  it('renders multiple icon cards as an accessible labeled group and uses the host column token', () => {
    const { container } = render(
      <div className="[--ui-list-summary-columns:6]">
        <ListSummary
          aria-label="My quotation statistics"
          items={quotationItems}
          onItemSelect={() => {}}
          selectedItemId="all"
        />
      </div>,
    );
    const group = screen.getByRole('group', { name: 'My quotation statistics' });
    const summary = container.querySelector('[data-slot="list-summary"]');
    const selected = screen.getByRole('button', { name: 'Total quotes 12' });

    expect(group).toHaveAttribute('data-slot', 'list-summary');
    expect(screen.getAllByRole('button')).toHaveLength(6);
    expect(selected).toHaveAttribute('aria-pressed', 'true');
    expect(selected).toHaveClass('focus-visible:ring-2', 'aria-pressed:border-primary', 'aria-pressed:ring-1', 'aria-pressed:ring-primary');
    expect(screen.getByRole('button', { name: 'Draft 3' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Valid quote amount $1,200' })).toBeDisabled();
    expect(summary).toHaveClass('@2xl:grid-cols-[repeat(var(--ui-list-summary-columns,4),minmax(0,1fr))]');
    expect(container.firstElementChild).toHaveClass('[--ui-list-summary-columns:6]');
    expect(container.querySelectorAll('[data-slot="list-summary-label-icon"][aria-hidden="true"]')).toHaveLength(6);
    expect(screen.queryByText('circle-check')).not.toBeInTheDocument();
  });

  it('reports only the activated id for click, Enter and Space while selection remains controlled', async () => {
    const user = userEvent.setup();
    const onItemSelect = vi.fn();
    const { rerender } = render(
      <ListSummary items={quotationItems} onItemSelect={onItemSelect} selectedItemId="all" />,
    );

    await user.click(screen.getByRole('button', { name: 'Draft 3' }));
    expect(onItemSelect).toHaveBeenLastCalledWith('draft');
    expect(screen.getByRole('button', { name: 'Total quotes 12' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Draft 3' })).toHaveAttribute('aria-pressed', 'false');

    rerender(<ListSummary items={quotationItems} onItemSelect={onItemSelect} selectedItemId="draft" />);
    expect(screen.getByRole('button', { name: 'Draft 3' })).toHaveAttribute('aria-pressed', 'true');

    const pending = screen.getByRole('button', { name: 'Awaiting customer 2' });
    pending.focus();
    await user.keyboard('{Enter}');
    expect(onItemSelect).toHaveBeenLastCalledWith('pending');

    const accepted = screen.getByRole('button', { name: 'Accepted 4' });
    accepted.focus();
    await user.keyboard(' ');
    expect(onItemSelect).toHaveBeenLastCalledWith('accepted');
    expect(onItemSelect).toHaveBeenCalledTimes(3);
  });

  it('does not call the host for a disabled amount card', async () => {
    const user = userEvent.setup();
    const onItemSelect = vi.fn();
    render(<ListSummary items={quotationItems} onItemSelect={onItemSelect} selectedItemId="all" />);

    await user.click(screen.getByRole('button', { name: 'Valid quote amount $1,200' }));
    expect(onItemSelect).not.toHaveBeenCalled();
  });
});

describe('ListSummary compact navigation mode', () => {
  const items = [
    { id: 'quotes', label: 'My quotations', icon: <span>Decorative icon</span>, value: 0, description: 'Recent customer quotations', actionLabel: 'View details' },
    { id: 'long', label: 'A deliberately long label that must wrap without widening its card', value: 'Unavailable', description: 'Supporting text can wrap within the compact card width without overflowing.', actionLabel: 'Open record details' },
    { id: 'no-action', label: 'No footer action', value: 2 },
    { id: 'disabled', label: 'Unavailable amount', value: '—', actionLabel: 'View details', disabled: true },
  ];

  it('keeps a static compact definition list and adds footer content only when supplied', () => {
    const { container } = render(<ListSummary variant="compact" aria-label="Personal documents" items={items} />);
    const list = container.querySelector('dl');
    expect(list).toBeInTheDocument();
    if (!list) throw new Error('Expected the compact summary definition list');
    expect(list).toHaveAttribute('data-slot', 'list-summary');
    expect(list.querySelectorAll('dt')).toHaveLength(4);
    expect(list.querySelectorAll('button')).toHaveLength(0);
    expect(list.querySelector('[aria-pressed]')).toBeNull();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(list.querySelectorAll('[data-slot="list-summary-action"]')).toHaveLength(3);
    expect(list.querySelectorAll('[data-slot="list-summary-description"]')).toHaveLength(2);
    const cards = [...list.querySelectorAll('[data-slot="list-summary-item"]')];
    expect(cards[0]).toHaveClass('min-h-[var(--ui-list-summary-compact-card-height,84.75px)]');
    expect(cards[0]).toHaveClass('rounded-[var(--ui-list-summary-compact-card-radius,7px)]');
    expect(cards[0]).toHaveClass('p-[var(--ui-list-summary-compact-padding,10.5px)]');
    expect(cards[0]?.querySelector('[data-slot="list-summary-value"]')).toHaveClass('rounded-[var(--ui-list-summary-compact-value-radius,3.5px)]');
    expect(cards[0]?.querySelector('[data-slot="list-summary-value"]')).toHaveClass('self-center');
    expect(cards[1]?.querySelector('dt')).toHaveClass('min-w-0', 'break-words');
    expect(cards[1]?.querySelector('[data-slot="list-summary-value"]')).toHaveClass('max-w-full', 'min-w-0', 'break-words');
    expect(cards[1]?.querySelector('[data-slot="list-summary-description"]')).toHaveClass('max-w-full', 'min-w-0', 'break-words');
    expect(cards[2]?.querySelector('[data-slot="list-summary-action"]')).toBeNull();
    expect(container.querySelector('[data-slot="list-summary"]')).toHaveClass('grid-cols-1');
  });

  it('activates only enabled compact cards by click, Enter, and Space without selection semantics', async () => {
    const user = userEvent.setup();
    const onItemActivate = vi.fn();
    render(<ListSummary variant="compact" aria-label="Personal documents" items={items} onItemActivate={onItemActivate} selectedItemId="quotes" />);

    const group = screen.getByRole('group', { name: 'Personal documents' });
    const quotes = within(group).getByRole('button', { name: 'My quotations 0 Recent customer quotations View details' });
    const disabled = within(group).getByRole('button', { name: 'Unavailable amount — View details' });
    expect(quotes).not.toHaveAttribute('aria-pressed');
    expect(disabled).toBeDisabled();
    expect(within(group).getByRole('button', { name: /No footer action 2/ }).querySelector('[data-slot="list-summary-action"]')).toBeNull();

    await user.click(quotes);
    quotes.focus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    await user.click(disabled);
    expect(onItemActivate.mock.calls).toEqual([['quotes'], ['quotes'], ['quotes']]);
  });

  it('prioritizes controlled selection when both activation callbacks are provided', async () => {
    const user = userEvent.setup();
    const onItemSelect = vi.fn();
    const onItemActivate = vi.fn();
    render(
      <ListSummary
        variant="compact"
        items={items}
        selectedItemId="quotes"
        onItemSelect={onItemSelect}
        onItemActivate={onItemActivate}
      />,
    );

    const quotes = screen.getByRole('button', { name: 'My quotations 0 Recent customer quotations View details' });
    const other = screen.getByRole('button', { name: 'No footer action 2' });
    expect(quotes).toHaveAttribute('aria-pressed', 'true');
    expect(other).toHaveAttribute('aria-pressed', 'false');
    await user.click(other);
    expect(onItemSelect).toHaveBeenCalledExactlyOnceWith('no-action');
    expect(onItemActivate).not.toHaveBeenCalled();
  });

  it('supports default-variant navigation activation without adding selection semantics', async () => {
    const user = userEvent.setup();
    const onItemActivate = vi.fn();
    render(
      <ListSummary
        items={[{ id: 'open', label: 'Open details', value: 1 }]}
        onItemActivate={onItemActivate}
        selectedItemId="open"
      />,
    );

    const button = screen.getByRole('button', { name: 'Open details 1' });
    expect(button).not.toHaveAttribute('aria-pressed');
    expect(button).not.toHaveClass('aria-pressed:border-primary');
    button.focus();
    await user.keyboard('{Enter}');
    expect(onItemActivate).toHaveBeenCalledExactlyOnceWith('open');
  });
});
