import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LookupField } from './LookupField';

afterEach(() => { cleanup(); delete document.documentElement.dataset.uiProfile; });
const field = { name: 'customer', label: 'Customer', type: 'lookup', options: [{ value: 'c1', label: 'Aster Equipment' }] };
describe('compact profile single lookup', () => {
  it('shows the selected record in the trigger and clears through the existing change callback', () => {
    document.documentElement.dataset.uiProfile = 'compact-enterprise';
    const onChange = vi.fn();
    render(<LookupField field={field as never} value="c1" onChange={onChange} />);
    expect(screen.getByTestId('lookup-trigger-customer')).toHaveTextContent('Aster Equipment');
    expect(screen.getAllByText('Aster Equipment')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Remove Aster Equipment' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
  it('keeps the readable selected title but removes the clear action when disabled', () => {
    document.documentElement.dataset.uiProfile = 'compact-enterprise';
    render(<LookupField field={field as never} value="c1" onChange={vi.fn()} disabled />);
    expect(screen.getByTestId('lookup-trigger-customer')).toHaveTextContent('Aster Equipment');
    expect(screen.getByTestId('lookup-trigger-customer')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Remove Aster Equipment' })).not.toBeInTheDocument();
  });
});
