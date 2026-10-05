import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { describe, expect, it } from 'vitest';
import { ComponentRegistry } from '@object-ui/core';
import { CategoryDistribution } from '../index';

describe('CategoryDistribution', () => {
  it('renders semantic terms, raw counts, and bar widths relative to the largest category', () => {
    const items = [
      { id: 'service', label: 'Service orders', value: 100 },
      { id: 'sales', label: 'Sales orders', value: 50 },
      { id: 'unknown', label: 'Unknown source', value: 0 },
      { id: 'small', label: 'Small group', value: 1 },
    ];
    const { container } = render(
      <CategoryDistribution
        title="By source"
        aria-label="Warranty cards by source"
        items={items}
        minPercent={6}
      />,
    );

    expect(screen.getByRole('group', { name: 'Warranty cards by source' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'By source' })).toBeInTheDocument();
    expect(container.querySelectorAll('dl dt')).toHaveLength(4);
    expect(container.querySelectorAll('dl dd')).toHaveLength(4);
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(container.querySelector('[data-slot="category-distribution-rank"]')).toBeNull();
    expect(container.querySelector('dt')).toHaveClass('break-words');
    expect(container.querySelector('dt')).not.toHaveAttribute('title');

    const bars = [...container.querySelectorAll('[data-slot="category-distribution-bar"]')];
    expect(bars.map(bar => bar.getAttribute('width'))).toEqual(['100', '50', '0', '6']);
    expect(container.querySelector('dl')).toHaveClass(
      'gap-y-[var(--ui-category-distribution-row-gap,5.25px)]',
      'text-[length:var(--ui-category-distribution-font-size,11.5px)]',
    );
    expect(container.querySelector('dl > div')).toHaveClass(
      'grid-cols-[minmax(0,var(--ui-category-distribution-label-width,76px))_minmax(0,1fr)]',
    );
    expect(container.querySelector('dd')).toHaveClass(
      'grid-cols-[minmax(0,1fr)_var(--ui-category-distribution-count-width,34px)]',
    );
    expect(container.querySelectorAll('svg[aria-hidden="true"]')).toHaveLength(4);
    expect(container.querySelector('svg')).not.toHaveAttribute('style');
    expect(bars[0]).not.toHaveAttribute('style');
  });

  it('adds optional ordinal ranks, truncates labels with a title, and formats only displayed values', () => {
    const longLabel = 'Customer '.repeat(12).trim();
    const { container } = render(
      <CategoryDistribution
        aria-label="Customer service counts"
        className="[--ui-category-distribution-rank-width:14px] [--ui-category-distribution-rank-font-size:10.5px] [--ui-category-distribution-label-width:157.5px] [--ui-category-distribution-count-width:42px] [--ui-category-distribution-bar-height:5.25px] [--ui-category-distribution-row-padding:5.25px] [--ui-category-distribution-row-gap:5.25px]"
        items={[
          { id: 'first', label: longLabel, value: 3 },
          { id: 'second', label: 'Other customer', value: 1 },
        ]}
        showRank
        truncateLabels
        valueFormatter={value => <strong>{value} orders</strong>}
      />,
    );

    expect(screen.getByRole('group', { name: 'Customer service counts' })).toBeInTheDocument();
    expect([...container.querySelectorAll('[data-slot="category-distribution-rank"]')].map(node => node.textContent)).toEqual(['1', '2']);
    const ranks = container.querySelectorAll('[data-slot="category-distribution-rank"]');
    expect(ranks[0]).not.toHaveAttribute('aria-hidden');
    expect(ranks[0]).toHaveClass(
      'text-[length:var(--ui-category-distribution-rank-font-size,10.5px)]',
    );
    const firstLabel = container.querySelector('dt');
    expect(firstLabel).toHaveTextContent(longLabel);
    expect(firstLabel).toHaveAttribute('title', longLabel);
    expect(firstLabel).toHaveClass('overflow-hidden', 'text-ellipsis', 'whitespace-nowrap');
    expect(screen.getByText('3 orders')).toBeInTheDocument();
    expect(screen.getByText('1 orders')).toBeInTheDocument();

    const row = container.querySelector('dl > div');
    expect(row).toHaveClass(
      'grid-cols-[var(--ui-category-distribution-rank-width,14px)_minmax(0,var(--ui-category-distribution-label-width,76px))_minmax(0,1fr)]',
      'py-[var(--ui-category-distribution-row-padding,0px)]',
    );
    expect(container.querySelector('dd')).toHaveClass(
      'grid-cols-[minmax(0,1fr)_var(--ui-category-distribution-count-width,34px)]',
    );
    const bars = [...container.querySelectorAll('[data-slot="category-distribution-bar"]')];
    expect(bars.map(bar => bar.getAttribute('width'))).toEqual(['100', '33.33']);
    expect(container.querySelector('svg')).toHaveClass('h-[var(--ui-category-distribution-bar-height,8.75px)]');
    expect(screen.getByRole('group')).toHaveClass('[--ui-category-distribution-label-width:157.5px]');
    expect(screen.getByRole('group')).not.toHaveAttribute('style');
  });

  it('renders the host empty message without rows or a chart for empty input', () => {
    const { container } = render(
      <CategoryDistribution aria-label="Warranty source" items={[]} emptyText="No source data" />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('No source data');
    expect(screen.getByRole('status')).toHaveClass(
      'py-[var(--ui-category-distribution-empty-padding-block,14px)]',
      'text-[length:var(--ui-category-distribution-empty-font-size,12px)]',
      'leading-[var(--ui-category-distribution-empty-line-height,18px)]',
    );
    expect(container.querySelector('dl')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });

  it.each([
    [{ id: 'negative', label: 'Negative', value: -1 }],
    [{ id: 'not-a-number', label: 'Invalid', value: Number.NaN }],
  ])('does not draw a chart when any value is invalid: %o', item => {
    const { container } = render(
      <CategoryDistribution
        aria-label="Warranty source"
        items={[{ id: 'valid', label: 'Valid', value: 4 }, item]}
        emptyText="No active categories"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Distribution unavailable.');
    expect(screen.queryByText('No active categories')).not.toBeInTheDocument();
    expect(container.querySelector('dl')).toBeNull();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('uses a separate host invalid-data message without pretending the set is empty', () => {
    render(
      <CategoryDistribution
        aria-label="Warranty source"
        items={[{ id: 'invalid', label: 'Invalid', value: Number.NaN }]}
        emptyText="No active categories"
        invalidText="Counts need review"
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Counts need review');
    expect(screen.queryByText('No active categories')).not.toBeInTheDocument();
  });

  it('keeps long labels within the host-controlled layout and exposes runtime registration without a data source', () => {
    const longLabel = 'A'.repeat(90);
    const { container } = render(
      <CategoryDistribution
        className="[--ui-category-distribution-label-width:90px] [--ui-category-distribution-count-width:40px]"
        items={[{ id: 'long', label: longLabel, value: 3 }]}
      />,
    );

    const root = screen.getByRole('group', { name: 'Category distribution' });
    expect(root).toHaveClass('[--ui-category-distribution-label-width:90px]');
    expect(root).toHaveClass('[--ui-category-distribution-count-width:40px]');
    expect(screen.getByText(longLabel)).toHaveClass('min-w-0', 'break-words');
    expect(container.querySelector('svg')).toHaveClass('h-[var(--ui-category-distribution-bar-height,8.75px)]');

    const registration = ComponentRegistry.getReactRuntimeComponents()
      .find(entry => entry.name === 'CategoryDistribution');
    expect(registration?.component).toBe(CategoryDistribution);
    expect(registration?.injectDataSource).toBe(false);
  });
});
