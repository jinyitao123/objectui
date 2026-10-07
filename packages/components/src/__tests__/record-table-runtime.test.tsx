import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ComponentRegistry } from '@object-ui/core';
import type { DataTableSchema } from '@object-ui/types';
import '../renderers/complex/data-table';

describe('RecordTable runtime composition', () => {
  it('applies compact header height to utility columns without replacing their widths', () => {
    const registration = ComponentRegistry.getReactRuntimeComponents().find(item => item.name === 'RecordTable');
    const RecordTable = registration!.component as React.ComponentType<{ schema: DataTableSchema }>;

    render(<RecordTable schema={{
      type: 'data-table',
      data: [{ id: 'r1', name: 'Aster' }],
      columns: [{ accessorKey: 'name', header: 'Name' }],
      searchable: false,
      exportable: false,
      selectable: true,
      showRowNumbers: true,
      rowActions: true,
    }} />);

    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(4);
    for (const header of headers) {
      expect(header).toHaveClass(
        'h-[var(--ui-table-header-height,3rem)]',
        'text-[length:var(--ui-table-header-font-size,0.875rem)]',
        'leading-[var(--ui-table-header-line-height,1.25rem)]',
      );
    }
    expect(headers[0]).toHaveClass('w-10', 'px-3');
    expect(headers[1]).toHaveClass('w-10', 'px-3');
    expect(headers[3]).toHaveClass('w-24');
  });

  it('retains cell callbacks and server pagination without a second table implementation', () => {
    const registration = ComponentRegistry.getReactRuntimeComponents().find(item => item.name === 'RecordTable');
    expect(registration?.component).toBe(ComponentRegistry.get('data-table'));
    expect(registration?.injectDataSource).toBe(false);
    const RecordTable = registration!.component as React.ComponentType<{ schema: DataTableSchema }>;
    const edit = vi.fn(), nextPage = vi.fn(), open = vi.fn();
    render(<RecordTable schema={{ type: 'data-table', data: [{id:'r1',name:'Aster'}],
      className: 'contact-record-table',
      columns: [{accessorKey:'name',header:'Name'}, {accessorKey:'id',header:'Actions',cell:(_value,row)=><button onClick={()=>edit(row.id)}>Edit Aster</button>}],
      manualPagination:true,page:2,pageSize:20,rowCount:81,onPageChange:nextPage,
      onRowClick:open,searchable:false,exportable:false,selectable:false,
    }} />);
    expect(screen.getByRole('table')).toHaveTextContent('Aster');
    expect(screen.getByRole('table').closest('[data-slot="record-table"]')).toHaveClass('contact-record-table');
    expect(screen.getByRole('columnheader', { name: 'Name' })).toHaveClass(
      'h-[var(--ui-table-header-height,3rem)]',
      'px-[var(--ui-table-header-padding-x,var(--ui-table-cell-padding-x,1rem))]',
    );
    expect(screen.getByText('Aster').closest('td')).toHaveClass(
      'px-[var(--ui-table-cell-padding-x,1rem)]',
      'py-[var(--ui-table-cell-padding-y,1rem)]',
      'text-[length:var(--ui-table-font-size,inherit)]',
      'leading-[var(--ui-table-cell-line-height,inherit)]',
    );
    expect(screen.getByText('Aster').closest('[title]')).toHaveAttribute('title', 'Aster');
    expect(screen.getByRole('button',{name:'Edit Aster'}).closest('[title]')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'Edit Aster'}));
    expect(edit).toHaveBeenCalledWith('r1');
    expect(open).not.toHaveBeenCalled();
    const buttons=screen.getAllByRole('button').filter(button=>button.getAttribute('aria-label')?.toLowerCase().includes('next'));
    expect(buttons).not.toHaveLength(0);
    fireEvent.click(buttons[0]);
    expect(nextPage).toHaveBeenCalledWith(3);
  });
});
