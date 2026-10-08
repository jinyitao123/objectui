import React, { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SchemaRenderer, SchemaRendererProvider } from '@object-ui/react';
import type { DataSource } from '@object-ui/types';
import { registerField } from '../index.js';
import { GridField, type GridColumn, type GridFieldRuntimeProps, type GridSelectionRow } from './GridField';

afterEach(() => cleanup());

const rowField = {
  name: 'line_items',
  type: 'grid',
  allow_add: false,
  min_rows: 1,
  columns: [
    { name: 'description', label: '说明', type: 'text' },
    { name: 'quantity', label: '数量', type: 'number', step: 0.01 },
  ],
};

const moneyField = {
  name: 'line_items',
  type: 'grid',
  allow_add: false,
  total_field: 'amount',
  columns: [
    { name: 'description', label: 'Description', type: 'text' },
    { name: 'quantity', label: 'Quantity', type: 'number', step: 0.01 },
    { name: 'unit_price', label: 'Unit price', type: 'currency', step: 0.01 },
    { name: 'amount', label: 'Amount', type: 'currency', computed: true, expr: 'record.quantity * record.unit_price', scale: 2 },
  ],
};

// The host's integer-cent rule rounds half cents up, independently of the
// expression engine's floating-point toFixed result. These fixtures use
// nonnegative quantities and prices with at most two decimal places.
const computeMoneyRow: NonNullable<GridFieldRuntimeProps['computeRow']> = (row) => {
  const hundredths = (value: unknown): bigint => {
    const [whole, fraction = ''] = String(value).split('.');
    return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'));
  };
  const cents = (hundredths(row.quantity) * hundredths(row.unit_price) + 50n) / 100n;
  return { amount: Number(cents) / 100 };
};

const amountText = (rowIndex = 0): string | null | undefined =>
  screen.getByTestId(`line-items-row-${rowIndex}`).querySelector('[data-computed="amount"]')?.textContent;

describe('GridField labelled rows presentation', () => {
  it('keeps the controlled input mounted and focused during consecutive Chinese edits', () => {
    function ControlledGrid() {
      const [value, setValue] = useState<Array<Record<string, unknown>>>([{ description: '', quantity: 1 }]);
      return <GridField field={rowField as never} value={value} onChange={setValue} displayMode="rows" />;
    }

    render(<ControlledGrid />);
    const input = screen.getByLabelText('说明');
    input.focus();
    fireEvent.change(input, { target: { value: '备' } });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: '备件' } });
    expect(screen.getByLabelText('说明')).toBe(input);
    expect(document.activeElement).toBe(input);
  });

  it('keeps the focused row attached to its stable key when rows reorder', () => {
    const rows = [
      { id: 'row-a', description: 'First', quantity: 1 },
      { id: 'row-b', description: 'Second', quantity: 2 },
    ];
    const onChange = vi.fn();
    const getRowKey = (row: Readonly<Record<string, unknown>>) => String(row.id);
    const { rerender } = render(
      <GridField
        field={rowField as never}
        value={rows}
        onChange={onChange}
        displayMode="rows"
        getRowKey={getRowKey}
      />,
    );
    const firstRowInput = screen.getAllByLabelText('说明')[0];
    firstRowInput.focus();

    rerender(
      <GridField
        field={rowField as never}
        value={[rows[1], rows[0]]}
        onChange={onChange}
        displayMode="rows"
        getRowKey={getRowKey}
      />,
    );

    expect(screen.getAllByLabelText('说明')[1]).toBe(firstRowInput);
    expect(document.activeElement).toBe(firstRowInput);
  });

  it('shows required state and only a min_rows-gated Remove action', () => {
    const onAdd = vi.fn();
    const onRowExpand = vi.fn();
    const rowsField = {
      ...rowField,
      allow_add: true,
      allow_duplicate: true,
      columns: [
        { ...rowField.columns[0], required: true },
        rowField.columns[1],
        { name: 'internal_note', label: 'Internal note', type: 'text', defaultHidden: true },
      ],
    };

    render(
      <GridField
        field={rowsField as never}
        value={[{ description: '', quantity: 1, internal_note: 'Keep visible' }]}
        onChange={() => {}}
        displayMode="rows"
        onAdd={onAdd}
        onRowExpand={onRowExpand}
        renderSelectionToolbar={() => <button type="button">Selection toolbar</button>}
      />,
    );

    expect(screen.getByText('说明')).toBeInTheDocument();
    expect(screen.getByText('数量')).toBeInTheDocument();
    expect(screen.getByText('Internal note')).toBeInTheDocument();
    expect(screen.getByLabelText('说明')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByTestId('line-items-add')).toBeNull();
    expect(screen.queryByTestId('line-items-duplicate-0')).toBeNull();
    expect(screen.queryByTestId('line-items-select-all')).toBeNull();
    expect(screen.queryByTestId('line-items-drag-0')).toBeNull();
    expect(screen.queryByTestId('line-items-columns')).toBeNull();
    expect(screen.queryByText('Selection toolbar')).toBeNull();
    expect(screen.queryByRole('button', { name: /open row/i })).toBeNull();
    expect(screen.getByTestId('line-items-remove-0')).toBeDisabled();
    expect(screen.getByTestId('line-items-row-0')).toBeInTheDocument();
    expect(screen.queryByTestId('line-items-row-1')).toBeNull();
    expect(onAdd).not.toHaveBeenCalled();
    expect(onRowExpand).not.toHaveBeenCalled();
  });

  it('keeps existing disabled and readonly behavior in rows mode', () => {
    const { rerender } = render(
      <GridField
        field={rowField as never}
        value={[{ description: 'Locked line', quantity: 2 }]}
        onChange={() => {}}
        displayMode="rows"
        disabled
      />
    );
    expect(screen.getByLabelText('说明')).toBeDisabled();
    expect(screen.getByTestId('line-items-remove-0')).toBeDisabled();

    rerender(
      <GridField
        field={rowField as never}
        value={[{ description: 'Read only line', quantity: 2 }]}
        onChange={() => {}}
        displayMode="rows"
        readonly
      />,
    );
    expect(screen.queryByLabelText('说明')).toBeNull();
    expect(screen.getByTestId('line-items-readonly-rows').textContent).toContain('Read only line');
    expect(screen.queryByLabelText('Remove row')).toBeNull();
  });

  it('resolves per-row static lookup options and numeric bounds without querying or changing values', () => {
    const dataSource = {
      find: vi.fn(async () => []),
      getObjectSchema: vi.fn(),
    } as unknown as DataSource;
    const onChange = vi.fn();
    const field = {
      name: 'line_items',
      type: 'grid',
      allow_add: false,
      columns: [
        { name: 'line_type', label: '类型', type: 'select', options: [{ value: 'service', label: 'Service' }, { value: 'material', label: 'Material' }] },
        { name: 'item_id', label: '项目', type: 'lookup', reference: 'service_catalog' },
        { name: 'quantity', label: '数量', type: 'number', step: 0.01 },
      ],
    };
    const value = [{ line_type: 'service', item_id: 'svc-1', quantity: 1 }];
    const resolveColumn = (column: { name: string }, row: Readonly<Record<string, unknown>>) => {
      if (column.name === 'item_id') {
        return {
          options: row.line_type === 'service' ? [{ value: 'svc-1', label: 'On-site inspection' }] : [],
          placeholder: row.line_type === 'service' ? 'Select service' : 'No static options',
        };
      }
      if (column.name === 'quantity') return { min: 0.01, max: 500 };
      return undefined;
    };
    const { rerender } = render(
      <SchemaRendererProvider dataSource={dataSource}>
        <GridField field={field as never} value={value} onChange={onChange} displayMode="rows" resolveColumn={resolveColumn} />
      </SchemaRendererProvider>,
    );

    expect(screen.getByText('On-site inspection')).toBeInTheDocument();
    const quantity = screen.getByLabelText('数量') as HTMLInputElement;
    expect(quantity).toHaveAttribute('min', '0.01');
    expect(quantity).toHaveAttribute('max', '500');
    expect(quantity).toHaveAttribute('step', '0.01');
    expect(dataSource.find).not.toHaveBeenCalled();
    expect(dataSource.getObjectSchema).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();

    rerender(
      <SchemaRendererProvider dataSource={dataSource}>
        <GridField
          field={field as never}
          value={[{ ...value[0], line_type: 'unknown' }]}
          onChange={onChange}
          displayMode="rows"
          resolveColumn={resolveColumn}
        />
      </SchemaRendererProvider>,
    );
    expect(screen.getByText('No static options')).toBeInTheDocument();
    expect(dataSource.find).not.toHaveBeenCalled();
    expect(dataSource.getObjectSchema).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses a readonly snapshot option for a saved lookup without showing its ID or querying', () => {
    const dataSource = {
      find: vi.fn(async () => []),
      getObjectSchema: vi.fn(),
    } as unknown as DataSource;
    const itemId = 'c32482d1-d8b1-4c4c-a9a2-8470b7a82f13';
    const resolveColumn = (column: { name: string }) => column.name === 'item_id'
      ? { options: [{ value: itemId, label: 'Legacy service snapshot' }], placeholder: 'Service name unavailable' }
      : undefined;

    const { container } = render(
      <SchemaRendererProvider dataSource={dataSource}>
        <GridField
          field={{
            name: 'line_items',
            type: 'grid',
            columns: [{ name: 'item_id', label: 'Service item', type: 'lookup', reference: 'service_catalog' }],
          } as never}
          value={[{ item_id: itemId }]}
          onChange={() => {}}
          displayMode="rows"
          readonly
          resolveColumn={resolveColumn}
        />
      </SchemaRendererProvider>,
    );

    expect(screen.getByText('Legacy service snapshot')).toBeInTheDocument();
    expect(container.textContent).not.toContain(itemId);
    expect(dataSource.find).not.toHaveBeenCalled();
    expect(dataSource.getObjectSchema).not.toHaveBeenCalled();
  });

  it('recomputes calculated cells and emits the derived value through onChange', () => {
    const onChange = vi.fn();
    const computedField = {
      name: 'line_items',
      type: 'grid',
      allow_add: false,
      columns: [
        { name: 'quantity', label: '数量', type: 'number' },
        { name: 'unit_price', label: '单价', type: 'currency' },
        { name: 'amount', label: '金额', type: 'currency', computed: true, expr: 'record.quantity * record.unit_price', scale: 2 },
      ],
    };
    render(
      <GridField
        field={computedField as never}
        value={[{ quantity: 2, unit_price: 10, amount: null }]}
        onChange={onChange}
        displayMode="rows"
      />,
    );

    expect(screen.getByLabelText('数量')).toBeInTheDocument();
    expect(screen.queryByLabelText('金额')).toBeNull();
    expect(document.querySelector('[data-computed="amount"]')?.textContent).toContain('20');
    fireEvent.change(screen.getByLabelText('数量'), { target: { value: '3' } });
    expect(onChange).toHaveBeenCalledWith([{ quantity: 3, unit_price: 10, amount: 30 }]);
  });

  it('uses host cents computation for initial rows and resolved columns without mutating the source', () => {
    const source = { id: 'line-a', description: 'Service', quantity: 1.15, unit_price: 0.10, amount: 9.99, snapshot: 'Retained' };
    const compute = vi.fn(computeMoneyRow);
    const onChange = vi.fn();
    render(
      <GridField
        field={moneyField as never}
        value={[source]}
        onChange={onChange}
        displayMode="rows"
        resolveColumn={(column) => column.name === 'quantity' ? { min: 0.01, max: 50 } : undefined}
        computeRow={compute}
      />,
    );

    expect(amountText()).toContain('0.12');
    expect(screen.getByTestId('line-items-total')).toHaveTextContent('0.12');
    expect(compute).toHaveBeenCalledWith(source, [
      moneyField.columns[0],
      { ...moneyField.columns[1], min: 0.01, max: 50 },
      moneyField.columns[2],
      moneyField.columns[3],
    ]);
    expect(source.amount).toBe(9.99);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('emits accurate host amounts with the complete row and keeps Chinese input and focus stable', () => {
    const onChange = vi.fn();
    function ControlledMoneyGrid() {
      const [value, setValue] = useState<GridSelectionRow[]>([
        { id: 'line-a', description: '', quantity: 1.15, unit_price: 0.10, amount: null, snapshot: 'Retained' },
      ]);
      return (
        <GridField
          field={moneyField as never}
          value={value}
          onChange={(next) => { onChange(next); setValue(next); }}
          displayMode="rows"
          computeRow={computeMoneyRow}
        />
      );
    }
    render(<ControlledMoneyGrid />);

    const description = screen.getByLabelText('Description');
    description.focus();
    fireEvent.compositionStart(description);
    fireEvent.change(description, { target: { value: '备' } });
    fireEvent.change(description, { target: { value: '备件' } });
    fireEvent.compositionEnd(description, { data: '备件' });
    expect(screen.getByLabelText('Description')).toBe(description);
    expect(description).toHaveValue('备件');
    expect(document.activeElement).toBe(description);
    expect(amountText()).toContain('0.12');

    const quantity = screen.getByLabelText('Quantity');
    quantity.focus();
    fireEvent.change(quantity, { target: { value: '2.15' } });
    expect(screen.getByLabelText('Quantity')).toBe(quantity);
    expect(document.activeElement).toBe(quantity);
    expect(amountText()).toContain('0.22');
    expect(onChange).toHaveBeenLastCalledWith([
      { id: 'line-a', description: '备件', quantity: 2.15, unit_price: 0.10, amount: 0.22, snapshot: 'Retained' },
    ]);
    expect(screen.getByTestId('line-items-total')).toHaveTextContent('0.22');
  });

  it('supports host-computed columns without expr and leaves unfilled prices unavailable', () => {
    const columns = [
      ...moneyField.columns.slice(0, 3),
      { name: 'amount', label: 'Amount', type: 'currency', computed: true },
    ] as GridColumn[];
    const compute: NonNullable<GridFieldRuntimeProps['computeRow']> = (row, columns) =>
      row.unit_price == null ? { amount: null } : computeMoneyRow(row, columns);
    const onChange = vi.fn();
    function ControlledGrid() {
      const [value, setValue] = useState<GridSelectionRow[]>([
        { id: 'line-a', description: '', quantity: 1.15, unit_price: null },
      ]);
      return (
        <GridField
          field={moneyField as never}
          columns={columns}
          value={value}
          onChange={(next) => { onChange(next); setValue(next); }}
          displayMode="rows"
          computeRow={compute}
        />
      );
    }
    render(<ControlledGrid />);
    expect(amountText()).toBe('—');
    expect(screen.getByLabelText('Unit price')).toHaveValue(null);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Unpriced line' } });
    expect(amountText()).toBe('—');
    expect(onChange).toHaveBeenLastCalledWith([
      { id: 'line-a', description: 'Unpriced line', quantity: 1.15, unit_price: null, amount: null },
    ]);
    fireEvent.change(screen.getByLabelText('Unit price'), { target: { value: '0.10' } });
    expect(amountText()).toContain('0.12');
    expect(onChange).toHaveBeenLastCalledWith([
      { id: 'line-a', description: 'Unpriced line', quantity: 1.15, unit_price: 0.10, amount: 0.12 },
    ]);
  });

  it('rederives host-added and reordered rows and recomputes all remaining rows on removal', () => {
    const field = {
      ...moneyField,
      sort_field: 'position',
      columns: [...moneyField.columns, { name: 'sequence', label: 'Sequence', type: 'number', computed: true, expr: '0' }],
    };
    const onChange = vi.fn();
    const compute: NonNullable<GridFieldRuntimeProps['computeRow']> = (row, columns) => ({
      ...computeMoneyRow(row, columns),
      sequence: columns.find((column) => column.name === 'quantity')?.min,
    });
    function HostGrid() {
      const [value, setValue] = useState<GridSelectionRow[]>([
        { id: 'line-a', description: 'First', quantity: 1.15, unit_price: 0.10, amount: 0, position: 7, snapshot: 'A' },
        { id: 'line-b', description: 'Second', quantity: 1.15, unit_price: 0.10, amount: 0, position: 8, snapshot: 'B' },
      ]);
      return (
        <>
          <button type="button" onClick={() => setValue((rows) => [
            ...rows,
            { id: 'line-c', description: 'Third', quantity: 1.15, unit_price: 0.10, amount: 0, snapshot: 'C' },
          ])}>Add from host</button>
          <button type="button" onClick={() => setValue((rows) => [...rows].reverse().map((row) => ({ ...row })))}>Reorder from host</button>
          <GridField
            field={field as never}
            value={value}
            onChange={(next) => { onChange(next); setValue(next); }}
            displayMode="rows"
            getRowKey={(row) => String(row.id)}
            resolveColumn={(column, _row, index) => column.name === 'quantity' ? { min: index + 1 } : undefined}
            computeRow={compute}
          />
        </>
      );
    }
    render(<HostGrid />);
    const firstInput = screen.getAllByLabelText('Description')[0];
    firstInput.focus();
    fireEvent.click(screen.getByRole('button', { name: 'Add from host' }));
    expect(screen.getAllByLabelText('Description')).toHaveLength(3);
    expect(amountText(2)).toContain('0.12');

    fireEvent.click(screen.getByRole('button', { name: 'Reorder from host' }));
    expect(screen.getAllByLabelText('Description')[2]).toBe(firstInput);
    expect(document.activeElement).toBe(firstInput);
    expect(screen.getByTestId('line-items-row-2').querySelector('[data-computed="sequence"]')).toHaveTextContent('3');
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('line-items-remove-0'));
    expect(onChange).toHaveBeenLastCalledWith([
      { id: 'line-b', description: 'Second', quantity: 1.15, unit_price: 0.10, amount: 0.12, position: 0, snapshot: 'B', sequence: 1 },
      { id: 'line-a', description: 'First', quantity: 1.15, unit_price: 0.10, amount: 0.12, position: 1, snapshot: 'A', sequence: 2 },
    ]);
    expect(screen.getAllByLabelText('Description')[1]).toBe(firstInput);
    expect(document.activeElement).toBe(firstInput);
    expect(amountText(0)).toContain('0.12');
    expect(amountText(1)).toContain('0.12');
    expect(screen.getByTestId('line-items-total')).toHaveTextContent('0.24');
  });

  it('preserves readonly row snapshots and totals with or without a host computer', () => {
    const field = {
      ...moneyField,
      columns: [...moneyField.columns, { name: 'state', label: 'State', type: 'select', options: [{ value: 'saved', label: 'Saved snapshot' }] }],
    };
    const source = [{ description: 'Saved line', quantity: 2, unit_price: 10, amount: 7.25, state: 'saved' }];
    const compute = vi.fn(computeMoneyRow);
    const onChange = vi.fn();
    const { rerender } = render(
      <GridField field={field as never} value={source} onChange={onChange} displayMode="rows" readonly computeRow={compute} />,
    );
    expect(screen.getByTestId('line-items-readonly-rows')).toHaveTextContent('7.25');
    expect(screen.getByTestId('line-items-total')).toHaveTextContent('7.25');
    expect(compute).not.toHaveBeenCalled();
    expect(screen.getByText('Saved snapshot')).toBeInTheDocument();

    rerender(<GridField field={moneyField as never} value={source} onChange={onChange} displayMode="rows" readonly />);
    expect(screen.getByTestId('line-items-total')).toHaveTextContent('7.25');
    expect(onChange).not.toHaveBeenCalled();
    expect(source[0].amount).toBe(7.25);
  });

  it('emits the displayed result of a default-hidden computed column', () => {
    const field = {
      ...moneyField,
      columns: moneyField.columns.map((column) => column.name === 'amount' ? { ...column, defaultHidden: true } : column),
    };
    const onChange = vi.fn();
    function Editor() {
      const [value, setValue] = useState<GridSelectionRow[]>([{ quantity: 2, unit_price: 10, amount: 20 }]);
      return <GridField field={field as never} value={value} displayMode="rows" onChange={(next) => { onChange(next); setValue(next); }} />;
    }
    render(<Editor />);
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '3' } });
    expect(amountText()).toContain('30');
    expect(onChange).toHaveBeenLastCalledWith([{ quantity: 3, unit_price: 10, amount: 30 }]);
  });

  it('moves between real rows with Enter and arrows without interrupting IME composition', () => {
    const onChange = vi.fn();
    render(<GridField field={rowField as never} value={[{ description: 'First' }, { description: 'Second' }]} onChange={onChange} displayMode="rows" />);
    const [first, second] = screen.getAllByLabelText('说明');
    first.focus();
    fireEvent.keyDown(first, { key: 'Enter', isComposing: true });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'Enter' });
    expect(second).toHaveFocus();
    fireEvent.keyDown(second, { key: 'ArrowUp' });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: 'ArrowDown' });
    expect(second).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('restricts resolver output to input presentation without changing column identity or rules', () => {
    const columns: GridColumn[] = [
      { name: 'locked', label: 'Locked value', type: 'number', readonlyWhen: 'true', requiredWhen: 'true' },
      { name: 'derived', label: 'Derived', type: 'number', computed: true, expr: '2' },
    ];
    const resolveColumn: NonNullable<GridFieldRuntimeProps['resolveColumn']> = (column) => ({
      options: [], placeholder: 'Host placeholder', min: 1, max: 10,
      name: `renamed_${column.name}`, type: 'text', computed: false,
      readonlyWhen: 'false', requiredWhen: 'false',
    });
    const onChange = vi.fn();
    render(<GridField field={rowField as never} columns={columns} value={[{ locked: null, derived: 2 }]} onChange={onChange} displayMode="rows" resolveColumn={resolveColumn} />);
    expect(screen.getByLabelText('Locked value')).toBeDisabled();
    expect(screen.getByLabelText('Locked value')).toHaveAttribute('type', 'number');
    expect(screen.getByLabelText('Locked value')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Locked value')).toHaveAttribute('min', '1');
    expect(screen.getByLabelText('Locked value')).toHaveAttribute('max', '10');
    expect(screen.getByLabelText('Locked value')).toHaveAttribute('placeholder', 'Host placeholder');
    expect(screen.queryByLabelText('Derived')).toBeNull();
    expect(screen.getByTestId('line-items-row-0').querySelector('[data-computed="derived"]')).toHaveTextContent('2');
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each(['top', 'props', 'properties'] as const)('keeps authored %s controls out of the registered field:grid host props', async (location) => {
    registerField('grid');
    const authoredCompute = vi.fn(() => ({ amount: 999 }));
    const authoredResolver = vi.fn(() => ({ min: -99 }));
    const authoredControls = { displayMode: 'rows', computeRow: authoredCompute, resolveColumn: authoredResolver };
    const schema = {
      ...moneyField, type: 'field:grid',
      columns: moneyField.columns.map((column) => ({ ...column, min: -10, max: 999, placeholder: 'Authored bound' })),
      ...(location === 'top' ? authoredControls : { [location]: authoredControls }),
    };
    const value = [{ quantity: 2, unit_price: 10, amount: 20 }];
    const onChange = vi.fn();
    const { rerender } = render(<SchemaRenderer schema={schema} value={value} onChange={onChange} />);
    const quantity = await screen.findByLabelText('Quantity');
    expect(screen.queryByTestId('line-items-rows')).toBeNull();
    expect(quantity).not.toHaveAttribute('min');
    expect(quantity).not.toHaveAttribute('max');
    expect(quantity).not.toHaveAttribute('placeholder', 'Authored bound');
    expect(authoredCompute).not.toHaveBeenCalled();
    expect(authoredResolver).not.toHaveBeenCalled();

    const hostCompute = vi.fn(() => ({ amount: 25 }));
    const hostResolver = vi.fn(() => ({ min: 2 }));
    rerender(<SchemaRenderer schema={schema} value={value} onChange={onChange} displayMode="rows" computeRow={hostCompute} resolveColumn={hostResolver} columns={moneyField.columns as GridColumn[]} />);
    expect(await screen.findByTestId('line-items-rows')).toBeInTheDocument();
    expect(amountText()).toContain('25');
    expect(screen.getByLabelText('Quantity')).toHaveAttribute('min', '2');
    expect(authoredCompute).not.toHaveBeenCalled();
    expect(authoredResolver).not.toHaveBeenCalled();
    expect(hostCompute).toHaveBeenCalled();
    expect(hostResolver).toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it.each([undefined, 'grid', 'list'] as const)('ignores host computation in display mode %s', (displayMode) => {
    const compute = vi.fn(() => ({ amount: 99 }));
    const onChange = vi.fn();
    render(
      <GridField
        field={moneyField as never}
        value={[{ description: 'Standard line', quantity: 2, unit_price: 10, amount: null }]}
        onChange={onChange}
        displayMode={displayMode}
        computeRow={compute}
      />,
    );
    expect(screen.getByTestId('line-items-total')).toHaveTextContent('20');
    if (displayMode !== 'list') {
      fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '3' } });
      expect(onChange).toHaveBeenLastCalledWith([{ description: 'Standard line', quantity: 3, unit_price: 10, amount: 30 }]);
    }
    expect(compute).not.toHaveBeenCalled();
  });
});
