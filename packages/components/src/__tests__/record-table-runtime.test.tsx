import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ComponentRegistry } from '@object-ui/core';
import type { DataTableSchema } from '@object-ui/types';
import '../renderers/complex/data-table';

describe('RecordTable runtime composition', () => {
  it('retains cell callbacks and server pagination without a second table implementation', () => {
    const registration = ComponentRegistry.getReactRuntimeComponents().find(item => item.name === 'RecordTable');
    expect(registration?.component).toBe(ComponentRegistry.get('data-table'));
    expect(registration?.injectDataSource).toBe(false);
    const RecordTable = registration!.component as React.ComponentType<{ schema: DataTableSchema }>;
    const edit = vi.fn(), nextPage = vi.fn(), open = vi.fn();
    render(<RecordTable schema={{ type: 'data-table', data: [{id:'r1',name:'Aster'}],
      columns: [{accessorKey:'name',header:'Name'}, {accessorKey:'id',header:'Actions',cell:(_value,row)=><button onClick={()=>edit(row.id)}>Edit Aster</button>}],
      manualPagination:true,page:2,pageSize:20,rowCount:81,onPageChange:nextPage,
      onRowClick:open,searchable:false,exportable:false,selectable:false,
    }} />);
    expect(screen.getByRole('table')).toHaveTextContent('Aster');
    fireEvent.click(screen.getByRole('button',{name:'Edit Aster'}));
    expect(edit).toHaveBeenCalledWith('r1');
    expect(open).not.toHaveBeenCalled();
    const buttons=screen.getAllByRole('button').filter(button=>button.getAttribute('aria-label')?.toLowerCase().includes('next'));
    expect(buttons).not.toHaveLength(0);
    fireEvent.click(buttons[0]);
    expect(nextPage).toHaveBeenCalledWith(3);
  });
});
