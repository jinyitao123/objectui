import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SegmentedRadioGroup, type SegmentedRadioOption } from '../segmented-radio-group';

const options: readonly SegmentedRadioOption[] = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

function ControlledChoice({ disabled = false, choices = options }: {
  disabled?: boolean;
  choices?: readonly SegmentedRadioOption[];
}) {
  const [value, setValue] = React.useState('high');
  return <SegmentedRadioGroup aria-label="Priority" name="priority" value={value}
    onValueChange={setValue} options={choices} disabled={disabled} />;
}

describe('SegmentedRadioGroup', () => {
  it('announces one controlled choice and leaves updates to the host', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<SegmentedRadioGroup aria-label="Priority" className="host-priority" id="priority"
      value="medium" onValueChange={onValueChange} options={options} />);

    const group = screen.getByRole('radiogroup', { name: 'Priority' });
    expect(group).toHaveAttribute('id', 'priority');
    expect(group).toHaveClass('host-priority');
    expect(group).toHaveAttribute('aria-orientation', 'horizontal');
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: 'Low' }));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('low');
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Low' })).not.toBeChecked();
  });

  it('selects with arrows and Space while Home and End move focus past disabled choices', async () => {
    const user = userEvent.setup();
    render(<ControlledChoice choices={options.map(option => ({ ...option, disabled: option.value === 'medium' }))} />);
    const high = screen.getByRole('radio', { name: 'High' });
    const low = screen.getByRole('radio', { name: 'Low' });

    await user.tab();
    expect(high).toHaveFocus();
    // Radix defers roving focus; retain keydown until that focus event runs.
    await user.keyboard('{ArrowRight>}');
    await waitFor(() => expect(low).toHaveFocus());
    expect(low).toBeChecked();
    await user.keyboard('{/ArrowRight}');
    await user.keyboard('{Home}');
    await waitFor(() => expect(high).toHaveFocus());
    expect(low).toBeChecked();
    await user.keyboard(' ');
    expect(high).toBeChecked();
    await user.keyboard('{End}');
    await waitFor(() => expect(low).toHaveFocus());
    expect(high).toBeChecked();
    await user.keyboard(' ');
    expect(low).toBeChecked();
    await user.keyboard('{ArrowRight>}');
    await waitFor(() => expect(high).toHaveFocus());
    expect(high).toBeChecked();
    await user.keyboard('{/ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Medium' })).toBeDisabled();
  });

  it('blocks disabled groups and disabled options without changing the controlled value', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(<SegmentedRadioGroup aria-label="Priority" value="high"
      onValueChange={onValueChange} options={options} disabled />);
    for (const radio of screen.getAllByRole('radio')) {
      expect(radio).toBeDisabled();
      fireEvent.click(radio);
    }
    await user.tab();
    expect(screen.getAllByRole('radio')).not.toContain(document.activeElement);
    expect(onValueChange).not.toHaveBeenCalled();

    rerender(<SegmentedRadioGroup aria-label="Priority" value="high" onValueChange={onValueChange}
      options={options.map(option => ({ ...option, disabled: option.value === 'low' }))} />);
    fireEvent.click(screen.getByRole('radio', { name: 'Low' }));
    expect(onValueChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('radio', { name: 'Medium' }));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith('medium');
  });

  it('participates in native forms without submitting when a choice is clicked', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    render(<form aria-label="Draft" onSubmit={onSubmit}><ControlledChoice /></form>);
    await user.click(screen.getByRole('radio', { name: 'Low' }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(new FormData(screen.getByRole('form', { name: 'Draft' }) as HTMLFormElement).get('priority')).toBe('low');
  });
});
