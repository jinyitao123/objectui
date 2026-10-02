import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { CompositeDialog } from '../custom/composite-dialog';

afterEach(cleanup);

describe('CompositeDialog', () => {
  it('keeps the optional summary beside the same controlled draft through discard cancellation', async () => {
    const onOpenChange = vi.fn();
    render(<CompositeDialog open title="Contact draft" sidebarLabel="Contact summary"
      sidebar={<p>Draft contact</p>} onOpenChange={onOpenChange} confirmOnDiscard
      footer={({ requestClose }) => <button onClick={requestClose}>Cancel draft</button>}>
      <input aria-label="Contact name" defaultValue="" />
    </CompositeDialog>);
    expect(screen.getByRole('complementary', { name: 'Contact summary' })).toHaveTextContent('Draft contact');
    const input = screen.getByRole('textbox', { name: 'Contact name' });
    fireEvent.change(input, { target: { value: 'Aster' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel draft' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Keep editing' }));
    expect(screen.getByRole('textbox', { name: 'Contact name' })).toBe(input);
    expect(input).toHaveValue('Aster');
    expect(onOpenChange).not.toHaveBeenCalled();
  });
  it('guards footer cancellation and preserves the mounted draft when editing continues', async () => {
    const onOpenChange = vi.fn();
    render(
      <CompositeDialog open title="Customer draft" onOpenChange={onOpenChange} confirmOnDiscard
        footer={({ requestClose }) => <button onClick={requestClose}>Cancel draft</button>}>
        <label>Name<input aria-label="Name" defaultValue="" /></label>
      </CompositeDialog>,
    );
    const input = screen.getByRole('textbox', { name: 'Name' });
    fireEvent.change(input, { target: { value: 'Aster Motion Equipment' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel draft' }));
    expect(await screen.findByRole('alertdialog')).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByRole('textbox', { name: 'Name' })).toBe(input);
    expect((input as HTMLInputElement).value).toBe('Aster Motion Equipment');
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel draft' }));
    fireEvent.click(await screen.findByRole('button', { name: /^Discard$/ }));
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('blocks close and footer cancellation while the host is saving', () => {
    const onOpenChange = vi.fn();
    render(
      <CompositeDialog open title="Saving draft" busy onOpenChange={onOpenChange}
        footer={({ requestClose }) => <button onClick={requestClose}>Cancel draft</button>}>
        <label>Name<input aria-label="Name" defaultValue="Draft name" /></label>
      </CompositeDialog>,
    );
    const close = screen.getByRole('button', { name: /^Close$/ }) as HTMLButtonElement;
    expect(close.disabled).toBe(true);
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeDisabled();
    fireEvent.click(close);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel draft' }));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('does not restore a stale discard prompt after the host closes and reopens', async () => {
    const onOpenChange = vi.fn();
    const content = (open: boolean) => (
      <CompositeDialog open={open} title="Customer draft" onOpenChange={onOpenChange} confirmOnDiscard
        footer={({ requestClose }) => <button onClick={requestClose}>Cancel draft</button>}>
        <p>Draft fields</p>
      </CompositeDialog>
    );
    const { rerender } = render(content(true));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel draft' }));
    expect(await screen.findByRole('alertdialog')).toBeTruthy();
    rerender(content(false));
    rerender(content(true));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Customer draft' })).toBeTruthy();
  });
});
