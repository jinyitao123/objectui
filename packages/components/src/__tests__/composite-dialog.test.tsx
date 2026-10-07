import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function ControlledDraft({ dirty = false, busy = false, keepMounted = false }: { dirty?: boolean; busy?: boolean; keepMounted?: boolean }) {
  const [open, setOpen] = React.useState(false);
  return <>
    <button onClick={() => setOpen(true)}>Open customer draft</button>
    <button onClick={() => setOpen(true)}>Open another customer</button>
    {(open || keepMounted) && <CompositeDialog open={open} title="Customer draft" onOpenChange={setOpen} confirmOnDiscard={dirty} busy={busy}
      footer={({ requestClose }) => <button onClick={requestClose} disabled={busy}>Cancel draft</button>}>
      <input aria-label="Customer name" defaultValue="" />
    </CompositeDialog>}
  </>;
}

describe('CompositeDialog focus and description', () => {
  it('returns keyboard focus to the current opener after Escape or Close when content unmounts', async () => {
    const user = userEvent.setup(); render(<ControlledDraft keepMounted />);
    const first = screen.getByRole('button', { name: 'Open customer draft' });
    const second = screen.getByRole('button', { name: 'Open another customer' });
    await user.click(first);
    await user.type(screen.getByRole('textbox', { name: 'Customer name' }), 'Aster');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(first).toHaveFocus());
    await user.click(second);
    await user.click(screen.getByRole('button', { name: /^Close$/ }));
    await waitFor(() => expect(second).toHaveFocus());
  });

  it('keeps the draft mounted and restores its cancel control after the discard prompt is dismissed', async () => {
    const user = userEvent.setup(); render(<ControlledDraft dirty />);
    await user.click(screen.getByRole('button', { name: 'Open customer draft' }));
    const input = screen.getByRole('textbox', { name: 'Customer name' });
    await user.type(input, 'Aster Motion');
    const cancel = screen.getByRole('button', { name: 'Cancel draft' });
    await user.click(cancel);
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    await waitFor(() => expect(cancel).toHaveFocus());
    expect(screen.getByRole('textbox', { name: 'Customer name' })).toBe(input);
    expect(input).toHaveValue('Aster Motion');
  });

  it('returns to the outer opener after confirmed discard without restoring into the removed draft', async () => {
    const user = userEvent.setup(); render(<ControlledDraft dirty />);
    const opener = screen.getByRole('button', { name: 'Open customer draft' });
    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Cancel draft' }));
    await user.click(screen.getByRole('button', { name: /^Discard$/ }));
    await waitFor(() => expect(opener).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('preserves focus deliberately moved by the host to a replacement view', async () => {
    function ReplacementHost() {
      const [open, setOpen] = React.useState(false);
      const replacement = React.useRef<HTMLButtonElement>(null);
      React.useEffect(() => { if (!open) replacement.current?.focus(); }, [open]);
      return <>
        <button onClick={() => setOpen(true)}>Open draft</button>
        <button ref={replacement}>Replacement view</button>
        {open && <CompositeDialog open title="Draft" onOpenChange={setOpen} />}
      </>;
    }
    const user = userEvent.setup(); render(<ReplacementHost />);
    await user.click(screen.getByRole('button', { name: 'Open draft' }));
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Replacement view' })).toHaveFocus());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps keyboard focus inside a busy draft and ignores Escape', async () => {
    const user = userEvent.setup(); render(<ControlledDraft busy />);
    await user.click(screen.getByRole('button', { name: 'Open customer draft' }));
    await user.keyboard('{Escape}');
    const dialog = screen.getByRole('dialog', { name: 'Customer draft' });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(screen.getByRole('textbox', { name: 'Customer name' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel draft' })).toBeDisabled();
  });

  it('does not announce form instructions for dialogs without a supplied description', () => {
    const { rerender } = render(<CompositeDialog open title="Discard changes?" onOpenChange={() => {}}>
      <p>Unsaved input will be lost.</p>
    </CompositeDialog>);
    expect(screen.getByRole('dialog', { name: 'Discard changes?' })).not.toHaveAccessibleDescription();
    expect(screen.queryByText('Complete the form fields, then submit or cancel.')).not.toBeInTheDocument();
    rerender(<CompositeDialog open title="Discard changes?" description="Unsaved input will be lost." onOpenChange={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'Discard changes?' })).toHaveAccessibleDescription('Unsaved input will be lost.');
  });
});
