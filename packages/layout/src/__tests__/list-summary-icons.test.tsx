import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ListSummary } from '../ListSummary';

describe('ListSummary decorative icons', () => {
  it('keeps the existing label DOM when an icon is omitted', () => {
    const { container } = render(<ListSummary items={[{ id: 'count', label: 'Open requests', value: 3 }]} />);
    const label = container.querySelector('dt');
    expect(label?.textContent).toBe('Open requests');
    expect(label?.children).toHaveLength(0);
    expect(container.querySelector('[data-slot="list-summary-label-icon"]')).toBeNull();
  });

  it('hides decorative content from accessibility while retaining the label and host value', () => {
    const { container } = render(<ListSummary items={[{
      id: 'count',
      label: 'Open requests',
      icon: <svg role="img" aria-label="Decorative counter" />,
      value: <><strong>3</strong><small>Assigned to the current user</small></>,
    }]} />);
    expect(screen.getByText('Open requests').closest('dt')).not.toBeNull();
    expect(screen.queryByRole('img', { name: 'Decorative counter' })).toBeNull();
    expect(container.querySelector('[data-slot="list-summary-label-icon"]')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Assigned to the current user').closest('dd')).not.toBeNull();
    expect(screen.getByText('3')).toBeVisible();
  });
});
