import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailTabs } from '../DetailTabs';

describe('DetailTabs stays pinned on long record sections', () => {
  it('keeps the tab strip sticky with an opaque surface while content scrolls', () => {
    render(
      <DetailTabs
        tabs={[{
          key: 'details',
          label: 'Details',
          content: { type: 'text', label: 'Record details' } as any,
        }]}
      />,
    );

    const tablist = screen.getByRole('tablist');
    expect(tablist.className).toContain('sticky');
    expect(tablist.className).toContain('top-0');
    expect(tablist.className).toContain('bg-background/95');
  });
});
