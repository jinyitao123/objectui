import * as React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { TableColumnSettings, TableHorizontalScrollbar } from '../table-controls';
import { Table, TableBody, TableRow, TableCell } from '../profile-table';

describe('shared table controls', () => {
  it('preserves required columns and reorders via keyboard-accessible controls', () => {
    const reorder = vi.fn();
    const toggle = vi.fn();
    render(<TableColumnSettings columns={[{ key: 'name', label: 'Name', required: true }, { key: 'amount', label: 'Amount' }]} hiddenKeys={new Set(['amount'])} onToggle={toggle} onReorder={reorder} onReset={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Column settings' }));
    expect(screen.getByRole('checkbox', { name: 'Name' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Amount' })).not.toBeChecked();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Amount' }));
    expect(toggle).toHaveBeenCalledWith('amount');
    fireEvent.click(screen.getByRole('button', { name: 'Move up Amount' }));
    expect(reorder).toHaveBeenCalledWith(['amount', 'name']);
  });

  it('routes horizontal wheel and keyboard input while restoring viewport ownership', () => {
    const viewport = document.createElement('div');
    Object.defineProperties(viewport, { clientWidth: { value: 200 }, scrollWidth: { value: 600 } });
    const { unmount } = render(<TableHorizontalScrollbar viewportRef={{ current: viewport }} />);
    expect(viewport).toHaveAttribute('data-table-scrollbar-owner', 'custom');
    fireEvent.wheel(viewport, { deltaX: 45, deltaY: 10 });
    expect(viewport.scrollLeft).toBe(45);
    expect(viewport.scrollTop).toBe(10);
    fireEvent.keyDown(screen.getByRole('scrollbar'), { key: 'End' });
    expect(viewport.scrollLeft).toBe(400);
    unmount();
    expect(viewport).not.toHaveAttribute('data-table-scrollbar-owner');
  });

  it('keeps the public table ref and lets the host own scrolling', () => {
    const ref = React.createRef<HTMLTableElement>();
    const { container } = render(<Table ref={ref} containerClassName="overflow-visible"><TableBody><TableRow><TableCell>Record</TableCell></TableRow></TableBody></Table>);
    expect(ref.current).toBe(container.querySelector('table'));
    expect(ref.current?.parentElement?.className).toContain('overflow-visible');
    expect(ref.current?.parentElement).not.toHaveAttribute('data-table-scrollbar-owner');
    expect(container.querySelector('[data-slot="table-horizontal-scrollbar"]')).toBeNull();
  });
});
