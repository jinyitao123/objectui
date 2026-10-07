/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { act, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nProvider } from '@object-ui/i18n';
import type { FieldMetadata } from '@object-ui/types';
import { GridField } from './GridField.js';
import type { GridSelectionRow, GridSelectionToolbarContext } from './GridField.js';

interface LineRow extends GridSelectionRow {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  locked_flag: string;
  locked_value: number;
}

const GRID_FIELD = {
  name: 'line_items',
  type: 'grid',
  total_field: 'amount',
  min_rows: 0,
  max_rows: 4,
  columns: [
    { name: 'description', label: 'Description', type: 'text' },
    { name: 'quantity', label: 'Quantity', type: 'number' },
    { name: 'unit_price', label: 'Unit price', type: 'currency' },
    {
      name: 'amount',
      label: 'Amount',
      type: 'currency',
      computed: true,
      expr: 'record.quantity * record.unit_price',
      scale: 2,
    },
    { name: 'locked_flag', label: 'Locked flag', type: 'text' },
    {
      name: 'locked_value',
      label: 'Locked value',
      type: 'currency',
      readonlyWhen: "record.locked_flag == 'yes'",
    },
  ],
} as unknown as FieldMetadata;

const INITIAL_ROW: LineRow = {
  id: 'line-a',
  description: 'Alpha',
  quantity: 2,
  unit_price: 5,
  amount: 10,
  locked_flag: 'yes',
  locked_value: 8,
};

const BATCH_PATCH = {
  quantity: 4,
  unit_price: 7,
  amount: 999,
  locked_value: 999,
};

function withI18n(node: React.ReactNode): React.ReactElement {
  return (
    <I18nProvider config={{ defaultLanguage: 'en', detectBrowserLanguage: false }}>
      {node}
    </I18nProvider>
  );
}

function renderWithI18n(node: React.ReactNode) {
  return render(withI18n(node));
}

interface ControlledGridProps {
  initialRows: LineRow[];
  onChange?: (rows: readonly GridSelectionRow[]) => void;
  disabled?: boolean;
  readonly?: boolean;
  field?: FieldMetadata;
  getRowKey?: (row: Readonly<GridSelectionRow>) => string | number;
  useHostRowKey?: boolean;
  contextRef?: { current: GridSelectionToolbarContext | null };
}

function ControlledGrid({
  initialRows,
  onChange,
  disabled,
  readonly,
  field = GRID_FIELD,
  getRowKey,
  useHostRowKey = true,
  contextRef,
}: ControlledGridProps) {
  const [rows, setRows] = useState(initialRows);

  return (
    <>
      <output data-testid="grid-snapshot">{JSON.stringify(rows)}</output>
      <GridField
        field={field}
        value={rows}
        onChange={(nextRows) => {
          onChange?.(nextRows);
          setRows(nextRows as unknown as LineRow[]);
        }}
        getRowKey={useHostRowKey ? (getRowKey ?? ((row) => String(row.id))) : undefined}
        disabled={disabled}
        readonly={readonly}
        renderSelectionToolbar={(context) => {
          if (contextRef) contextRef.current = context;
          return (
            <div className="flex items-center gap-2">
              <output data-testid="selection-summary">
                {context.selectedRows.map((row) => String(row.description ?? '')).join(',')}
              </output>
              <output data-testid="selection-indices">{context.selectedIndices.join(',')}</output>
              <output data-testid="selection-count">
                {context.selectedRows.length}/{context.totalRows}
              </output>
              <button
                type="button"
                disabled={context.disabled || !context.canPatchSelected}
                data-testid="bulk-patch"
                onClick={() => context.patchSelected(BATCH_PATCH)}
              >
                Apply batch
              </button>
              <button
                type="button"
                disabled={context.disabled || !context.canRemoveSelected}
                data-testid="bulk-remove"
                onClick={context.removeSelected}
              >
                Remove selected
              </button>
              <button
                type="button"
                disabled={context.selectedRows.length === 0}
                data-testid="clear-selection"
                onClick={context.clearSelection}
              >
                Clear selection
              </button>
            </div>
          );
        }}
      />
    </>
  );
}

function snapshot(): LineRow[] {
  return JSON.parse(screen.getByTestId('grid-snapshot').textContent || '[]') as LineRow[];
}

describe('GridField React-only row selection and toolbar', () => {
  it('patches a controlled draft once, recomputes computed columns, and skips read-only columns', () => {
    const onChange = vi.fn((_rows: readonly GridSelectionRow[]) => {});
    renderWithI18n(<ControlledGrid initialRows={[INITIAL_ROW]} onChange={onChange} />);

    expect(screen.getByTestId('bulk-patch')).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    expect(screen.getByTestId('selection-count')).toHaveTextContent('1/1');
    expect(screen.getByTestId('bulk-patch')).toBeEnabled();

    fireEvent.click(screen.getByTestId('bulk-patch'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(snapshot()[0]).toMatchObject({
      quantity: 4,
      unit_price: 7,
      amount: 28,
      locked_value: 8,
    });
    expect(screen.getByTestId('line-items-total')).toHaveTextContent('28');
    expect(screen.getByTestId('selection-summary')).toHaveTextContent('Alpha');
    expect(screen.getByTestId('selection-indices')).toHaveTextContent('0');
  });

  it('keeps selection attached to the keyed row across deletion, insertion, and reorder', () => {
    const rows: LineRow[] = [
      INITIAL_ROW,
      { ...INITIAL_ROW, id: 'line-b', description: 'Beta' },
      { ...INITIAL_ROW, id: 'line-c', description: 'Gamma' },
    ];
    renderWithI18n(<ControlledGrid initialRows={rows} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 2' }));
    expect(screen.getByTestId('selection-summary')).toHaveTextContent('Beta');

    fireEvent.click(screen.getByTestId('line-items-remove-0'));
    expect(screen.getByTestId('selection-summary')).toHaveTextContent('Beta');
    expect(screen.getByTestId('selection-indices')).toHaveTextContent('0');

    fireEvent.click(screen.getByTestId('line-items-add'));
    expect(screen.getByTestId('selection-summary')).toHaveTextContent('Beta');

    fireEvent.dragStart(screen.getByTestId('line-items-drag-0'));
    const destination = screen.getByTestId('line-items-remove-2').closest('tr');
    if (!destination) throw new Error('The third line row is missing.');
    fireEvent.dragOver(destination);
    fireEvent.drop(destination);

    expect(snapshot().map((row) => row.description)).toEqual(['Gamma', null, 'Beta']);
    expect(screen.getByTestId('selection-summary')).toHaveTextContent('Beta');
    expect(screen.getByTestId('selection-indices')).toHaveTextContent('2');
    expect(screen.getByRole('checkbox', { name: 'Select row 3' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Select row 1' })).not.toBeChecked();
  });

  it('removes selected rows through one controlled change and respects min_rows', () => {
    const onChange = vi.fn((_rows: readonly GridSelectionRow[]) => {});
    const field = { ...GRID_FIELD, min_rows: 1 } as unknown as FieldMetadata;
    const rows = [INITIAL_ROW, { ...INITIAL_ROW, id: 'line-b', description: 'Beta' }];
    renderWithI18n(<ControlledGrid initialRows={rows} field={field} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('line-items-select-all'));
    expect(screen.getByTestId('selection-count')).toHaveTextContent('2/2');
    fireEvent.click(screen.getByTestId('bulk-remove'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(snapshot().map((row) => row.description)).toEqual(['Beta']);
    expect(screen.getByTestId('selection-summary')).toHaveTextContent('Beta');
    expect(screen.getByTestId('bulk-remove')).toBeDisabled();
  });

  it('keeps max_rows enforcement while batch edits only existing rows', () => {
    const onChange = vi.fn((_rows: readonly GridSelectionRow[]) => {});
    const field = { ...GRID_FIELD, max_rows: 1 } as unknown as FieldMetadata;
    renderWithI18n(<ControlledGrid initialRows={[INITIAL_ROW]} field={field} onChange={onChange} />);

    expect(screen.getByTestId('line-items-add')).toBeDisabled();
    expect(screen.getByTestId('line-items-duplicate-0')).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    fireEvent.click(screen.getByTestId('bulk-patch'));

    expect(snapshot()).toHaveLength(1);
    expect(snapshot()[0].quantity).toBe(4);
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('does not remove selected rows when allow_delete is false', () => {
    const onChange = vi.fn((_rows: readonly GridSelectionRow[]) => {});
    const contextRef: { current: GridSelectionToolbarContext | null } = { current: null };
    const field = { ...GRID_FIELD, allow_delete: false } as unknown as FieldMetadata;
    renderWithI18n(
      <ControlledGrid
        initialRows={[INITIAL_ROW]}
        field={field}
        onChange={onChange}
        contextRef={contextRef}
      />,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    expect(contextRef.current?.canRemoveSelected).toBe(false);
    expect(screen.getByTestId('bulk-remove')).toBeDisabled();
    act(() => contextRef.current?.removeSelected());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('drops selection after an unkeyed external clone instead of selecting by index', () => {
    const rows = [INITIAL_ROW];
    const renderGrid = (value: LineRow[]) => (
      <GridField
        field={GRID_FIELD}
        value={value}
        onChange={() => {}}
        renderSelectionToolbar={(context) => (
          <output data-testid="external-selection">
            {context.selectedRows.map((row) => String(row.description ?? '')).join(',')}
          </output>
        )}
      />
    );
    const { rerender } = renderWithI18n(renderGrid(rows));

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));
    expect(screen.getByTestId('external-selection')).toHaveTextContent('Alpha');

    rerender(withI18n(renderGrid(rows.map((row) => ({ ...row })))));
    expect(screen.getByTestId('external-selection')).toBeEmptyDOMElement();
  });

  it('keeps sidecar identity through its own insert, reorder, and cell edit without a host key', () => {
    const rows = [
      INITIAL_ROW,
      { ...INITIAL_ROW, id: 'line-b', description: 'Beta' },
    ];
    renderWithI18n(<ControlledGrid initialRows={rows} useHostRowKey={false} />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 2' }));
    fireEvent.click(screen.getByTestId('line-items-add'));
    expect(screen.getByTestId('selection-summary')).toHaveTextContent('Beta');

    fireEvent.dragStart(screen.getByTestId('line-items-drag-1'));
    const destination = screen.getByTestId('line-items-remove-2').closest('tr');
    if (!destination) throw new Error('The third line row is missing.');
    fireEvent.dragOver(destination);
    fireEvent.drop(destination);
    expect(screen.getByTestId('selection-summary')).toHaveTextContent('Beta');
    expect(screen.getByTestId('selection-indices')).toHaveTextContent('2');

    fireEvent.change(screen.getAllByLabelText('Quantity')[2], { target: { value: '9' } });
    expect(screen.getByTestId('selection-summary')).toHaveTextContent('Beta');
    expect(screen.getByTestId('selection-indices')).toHaveTextContent('2');
    expect(snapshot()[2]).toMatchObject({ description: 'Beta', quantity: 9 });
  });

  it('renders disabled context and rejects direct mutations when disabled or readonly', () => {
    const onChange = vi.fn((_rows: readonly GridSelectionRow[]) => {});
    const contextRef: { current: GridSelectionToolbarContext | null } = { current: null };
    const props = { initialRows: [INITIAL_ROW], onChange, contextRef };
    const { rerender } = renderWithI18n(<ControlledGrid {...props} />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select row 1' }));

    rerender(withI18n(<ControlledGrid {...props} disabled />));
    expect(contextRef.current?.disabled).toBe(true);
    expect(screen.getByTestId('bulk-patch')).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Select row 1' })).toBeDisabled();
    act(() => {
      contextRef.current?.patchSelected({ quantity: 99 });
      contextRef.current?.removeSelected();
    });
    expect(onChange).not.toHaveBeenCalled();

    rerender(withI18n(<ControlledGrid {...props} readonly />));
    expect(contextRef.current?.disabled).toBe(true);
    expect(screen.getByTestId('bulk-patch')).toBeDisabled();
    expect(screen.queryByRole('checkbox', { name: 'Select row 1' })).not.toBeInTheDocument();
    act(() => {
      contextRef.current?.patchSelected({ quantity: 99 });
      contextRef.current?.removeSelected();
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
