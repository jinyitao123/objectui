import { afterEach, describe, expect, it, vi } from 'vitest';
import * as React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { registerAllFields } from '@object-ui/fields';
import { MePermissionsProvider, type MePermissionsResponse } from '@object-ui/permissions';
import { MasterDetailForm } from './MasterDetailForm';

registerAllFields();
afterEach(() => cleanup());

const parentSchema = {
  name: 'invoice',
  fields: {
    reference: { type: 'text', label: 'Reference' },
    total_amount: { type: 'currency', label: 'Total amount' },
    tax_rate: { type: 'number', label: 'Tax rate' },
  },
};

const childSchema = {
  name: 'invoice_line',
  fields: {
    invoice: { type: 'master_detail', label: 'Invoice', reference: 'invoice' },
    description: { type: 'text', label: 'Description' },
    amount: { type: 'currency', label: 'Amount' },
  },
};

function permissions(amountReadable: boolean, taxReadable = true): MePermissionsResponse {
  return {
    authenticated: true,
    userId: 'finance-reader',
    tenantId: 'org-1',
    roles: ['finance_reader'],
    permissionSets: ['finance_reader'],
    objects: {
      invoice: { allowRead: true, allowEdit: true, allowCreate: true },
      invoice_line: { allowRead: true, allowEdit: true, allowCreate: true },
    },
    fields: {
      'invoice.reference': { readable: true, editable: true },
      'invoice.total_amount': { readable: true, editable: true },
      'invoice.tax_rate': { readable: taxReadable, editable: taxReadable },
      'invoice_line.description': { readable: true, editable: true },
      'invoice_line.amount': { readable: amountReadable, editable: amountReadable },
    },
  };
}

function dataSource(line: Record<string, unknown> | null) {
  return {
    getObjectSchema: vi.fn(async (objectName: string) => objectName === 'invoice' ? parentSchema : childSchema),
    findOne: vi.fn(async () => ({ id: 'invoice-1', reference: 'INV-1', total_amount: 190, tax_rate: 0 })),
    find: vi.fn(async (objectName: string) => ({ data: objectName === 'invoice_line' && line ? [line] : [] })),
    batchTransaction: vi.fn(async () => ({ results: [{ id: 'invoice-1' }] })),
    create: vi.fn(), update: vi.fn(), delete: vi.fn(), bulk: vi.fn(),
  } as any;
}

function renderInvoice(line: Record<string, unknown> | null, amountReadable: boolean, taxReadable = true, mode: 'edit' | 'create' = 'edit') {
  const ds = dataSource(line);
  render(
    <MePermissionsProvider initialPermissions={permissions(amountReadable, taxReadable)}>
      <MasterDetailForm
        schema={{
          objectName: 'invoice', mode, recordId: mode === 'edit' ? 'invoice-1' : undefined,
          fields: ['reference', 'total_amount', 'tax_rate'], taxRateField: 'tax_rate',
          details: [{
            childObject: 'invoice_line', relationshipField: 'invoice',
            amountField: 'amount', totalField: 'total_amount',
            columns: [
              { name: 'description', label: 'Description', type: 'text' },
              { name: 'amount', label: 'Amount', type: 'currency' },
            ],
          }],
        } as any}
        dataSource={ds}
      />
    </MePermissionsProvider>,
  );
  return ds;
}

describe('MasterDetailForm line totals preserve unknown field values', () => {
  it('does not render a rate total in an auto-derived grid whose money schema is omitted', async () => {
    const ds = dataSource({ id: 'line-1', invoice: 'invoice-1', description: 'Line A', quantity: 2, discount_rate: 0 });
    ds.getObjectSchema = vi.fn(async (objectName: string) => objectName === 'invoice' ? parentSchema : {
      name: 'invoice_line', fields: {
        invoice: { type: 'master_detail', reference: 'invoice', inlineEdit: 'grid' },
        description: { type: 'text', label: 'Description' },
        quantity: { type: 'number', label: 'Quantity' },
        discount_rate: { type: 'number', label: 'Discount rate' },
      },
    });
    render(<MePermissionsProvider initialPermissions={permissions(false, false)}>
      <MasterDetailForm schema={{ objectName: 'invoice', mode: 'edit', recordId: 'invoice-1', fields: ['reference'], details: [{ childObject: 'invoice_line' }] } as any} dataSource={ds} />
    </MePermissionsProvider>);
    expect(await screen.findByDisplayValue('Line A')).toBeInTheDocument();
    expect(screen.getAllByRole('spinbutton', { name: 'Quantity' }).some(input => input.getAttribute('value') === '2')).toBe(true);
    expect(screen.queryByTestId('line-items-total')).toBeNull();
    expect(screen.queryByTestId('md-grand-total')).toBeNull();
  });
  it('omits a masked amount column and shows unknown document totals', async () => {
    const ds = renderInvoice({ id: 'line-1', invoice: 'invoice-1', description: 'Line A' }, false, true);
    await waitFor(() => expect(ds.find).toHaveBeenCalledWith('invoice_line', {
      $filter: { invoice: 'invoice-1' }, $top: 500,
    }));
    expect(await screen.findByTestId('md-subtotal')).toHaveTextContent('—');
    expect(screen.getByTestId('md-grand-total')).toHaveTextContent('—');
    expect(screen.queryByText('Amount')).toBeNull();
    expect(screen.getByDisplayValue('Line A')).toBeInTheDocument();
  });

  it('shows an em dash when the amount permission allows reads but the server omitted the saved value', async () => {
    const ds = renderInvoice({ id: 'line-1', invoice: 'invoice-1', description: 'Line A' }, true, true);
    await waitFor(() => expect(ds.find).toHaveBeenCalled());
    expect(await screen.findByTestId('md-grand-total')).toHaveTextContent('—');
    expect(screen.getByText('Amount')).toBeInTheDocument();
  });

  it('preserves the existing parent total in an edit batch when the returned line omits its amount', async () => {
    const ds = renderInvoice({ id: 'line-1', invoice: 'invoice-1', description: 'Line A' }, true, false);
    await waitFor(() => expect(ds.find).toHaveBeenCalled());
    expect(await screen.findByTestId('line-items-total')).toHaveTextContent('—');
    const reference = await screen.findByLabelText('Reference');
    fireEvent.change(reference, { target: { value: 'INV-2' } });

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => expect(ds.batchTransaction).toHaveBeenCalledTimes(1), { timeout: 2500 });
    const parentUpdate = ds.batchTransaction.mock.calls[0][0].find(
      (operation: { object?: string; action?: string }) => operation.object === 'invoice' && operation.action === 'update',
    );
    expect(parentUpdate?.data).toMatchObject({ reference: 'INV-2' });
    expect(parentUpdate?.data).toHaveProperty('total_amount', 190);
  });

  it('shows an em dash for a readable but invalid saved amount', async () => {
    const ds = renderInvoice({ id: 'line-1', invoice: 'invoice-1', description: 'Line A', amount: 'not-a-number' }, true, true);
    await waitFor(() => expect(ds.find).toHaveBeenCalled());
    expect(await screen.findByTestId('md-grand-total')).toHaveTextContent('—');
  });

  it('uses an em dash in the per-grid footer when the amount is masked and tax is unavailable', async () => {
    const ds = renderInvoice({ id: 'line-1', invoice: 'invoice-1', description: 'Line A' }, false, false);
    await waitFor(() => expect(ds.find).toHaveBeenCalled());
    expect(await screen.findByTestId('line-items-total')).toHaveTextContent('—');
    expect(screen.queryByText('Amount')).toBeNull();
    expect(screen.queryByTestId('md-grand-total')).toBeNull();
  });

  it('keeps a genuinely readable zero as zero', async () => {
    const ds = renderInvoice({ id: 'line-1', invoice: 'invoice-1', description: 'Line A', amount: 0 }, true, false);
    await waitFor(() => expect(ds.find).toHaveBeenCalled());
    expect(await screen.findByTestId('line-items-total')).toHaveTextContent('0');
  });

  it('sums readable saved line amounts, while a valid empty create collection remains zero', async () => {
    const ds = renderInvoice({ id: 'line-1', invoice: 'invoice-1', description: 'Line A', amount: 12.5 }, true, true);
    await waitFor(() => expect(ds.find).toHaveBeenCalled());
    expect(await screen.findByTestId('md-grand-total')).toHaveTextContent('¥12.50');
    cleanup();

    const empty = renderInvoice(null, true, false, 'create');
    await waitFor(() => expect(screen.getByTestId('md-form-submit')).toBeInTheDocument());
    expect(await screen.findByTestId('line-items-total')).toHaveTextContent('0');
    fireEvent.click(screen.getByRole('button', { name: /create/i }));
    await waitFor(() => expect(empty.batchTransaction).toHaveBeenCalledTimes(1));
    expect(empty.batchTransaction.mock.calls[0][0].some((operation: { object?: string }) => operation.object === 'invoice_line')).toBe(false);
    expect(empty.find).not.toHaveBeenCalled();
  });
});
