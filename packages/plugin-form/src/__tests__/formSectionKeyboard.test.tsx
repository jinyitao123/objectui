import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormSectionContainer } from '../FormSection';

describe('collapsible form section keyboard navigation', () => {
  it('collapses with Enter and reopens with Space without submitting the form', () => {
    const submits: string[] = [];
    render(
      <form onSubmit={(event) => { event.preventDefault(); submits.push('submitted'); }}>
        <FormSectionContainer label="Company details" collapsible>
          <input aria-label="Company name" />
        </FormSectionContainer>
      </form>,
    );
    const header = screen.getByRole('button', { name: 'Company details' });
    header.focus();
    expect(document.activeElement).toBe(header);
    expect(header.getAttribute('aria-expanded')).toBe('true');
    fireEvent.keyDown(header, { key: 'Enter' });
    expect(header.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('textbox', { name: 'Company name' })).toBeNull();
    fireEvent.keyDown(header, { key: ' ' });
    expect(header.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('textbox', { name: 'Company name' })).toBeDefined();
    expect(submits).toEqual([]);
  });
});
