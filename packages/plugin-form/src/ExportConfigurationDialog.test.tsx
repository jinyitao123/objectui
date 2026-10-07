import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentRegistry } from '@object-ui/core';
import { I18nProvider } from '@object-ui/i18n';
import { ExportConfigurationDialog } from './ExportConfigurationDialog';
import type { ExportConfigurationDialogProps } from './ExportConfigurationDialog';
import './index';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const fields = [
  { key: 'order_code', label: 'Order' },
  { key: 'customer_id', label: 'Customer' },
  { key: 'total_amount', label: 'Amount' },
];

const previewRows = Array.from({ length: 6 }, (_, index) => ({
  order_code: `Order ${index + 1}`,
  customer_id: `Customer ${index + 1}`,
  total_amount: `$${(index + 1) * 10}`,
}));

function renderDialog(
  language: 'en' | 'zh',
  overrides: Partial<ExportConfigurationDialogProps> = {},
) {
  const onExport = vi.fn(() => Promise.resolve());
  const onOpenChange = vi.fn();
  const props: ExportConfigurationDialogProps = {
    open: true,
    onOpenChange,
    permittedFields: fields,
    initialFields: ['order_code', 'customer_id'],
    initialScope: 'page',
    initialFormat: 'csv',
    initialFileName: 'project-tasks',
    currentPageCount: 12,
    filteredTotalCount: 37,
    previewRows,
    onExport,
    ...overrides,
  };

  const view = render(
    <I18nProvider config={{ defaultLanguage: language, detectBrowserLanguage: false }} persistLanguage={false}>
      <ExportConfigurationDialog {...props} />
    </I18nProvider>,
  );

  return { ...view, onExport, onOpenChange };
}

describe('ExportConfigurationDialog', () => {
  it('renders localized Chinese labels from the current locale pack', async () => {
    renderDialog('zh');

    expect(await screen.findByRole('dialog', { name: '导出数据' })).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: '导出范围' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '当前页：12 条' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '全部筛选结果：37 条' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '导出' })).toBeInTheDocument();
  });

  it('keeps the shared description fallback screen-reader-only and the body scrollable between fixed chrome', async () => {
    renderDialog('en');
    const dialog = await screen.findByRole('dialog', { name: 'Export data' });

    expect(within(dialog).getByText('Complete the form fields, then submit or cancel.'))
      .toHaveClass('sr-only');
    expect(dialog.querySelector('[data-slot="composite-dialog-body"]'))
      .toHaveClass('min-h-0', 'overflow-y-auto');
    expect(dialog.querySelector('[data-testid="composite-dialog-footer"]'))
      .toHaveClass('shrink-0');
  });

  it('emits the exact host-selected scope, ordered fields, format, and file name', async () => {
    const user = userEvent.setup();
    const { onExport, onOpenChange } = renderDialog('en');

    expect(await screen.findByRole('dialog', { name: 'Export data' })).toBeInTheDocument();
    expect(screen.getByRole('table').querySelectorAll('tbody tr')).toHaveLength(5);
    expect(screen.getByText('Customer 5')).toBeInTheDocument();
    expect(screen.queryByText('Customer 6')).not.toBeInTheDocument();
    expect(screen.queryByText('customer_id')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Move Customer up' }));
    await user.click(screen.getByRole('button', { name: 'Add Amount' }));
    await user.click(screen.getByRole('button', { name: 'Move Amount up' }));
    await user.click(screen.getByRole('button', { name: 'Remove Order' }));
    await user.click(screen.getByRole('radio', { name: 'All filtered results: 37' }));
    await user.click(screen.getByRole('radio', { name: 'Excel (.xlsx)' }));
    await user.clear(screen.getByRole('textbox', { name: 'File name' }));
    await user.type(screen.getByRole('textbox', { name: 'File name' }), 'task-export');
    await user.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(onExport).toHaveBeenCalledWith(
      'all',
      ['customer_id', 'total_amount'],
      'xlsx',
      'task-export',
    ));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('blocks exporting without a selected field or a file name', async () => {
    const user = userEvent.setup();
    const { onExport } = renderDialog('en', { initialFields: [], initialFileName: '' });

    expect(await screen.findByRole('button', { name: 'Export' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Select at least one field to export.');
    await user.click(screen.getByRole('button', { name: 'Add Order' }));
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
    expect(screen.getByText('Enter a file name.')).toBeInTheDocument();
    expect(onExport).not.toHaveBeenCalled();
  });

  it('drops revoked fields so ordering and re-grants cannot restore an old selection', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn(() => Promise.resolve());
    const props: ExportConfigurationDialogProps = {
      open: true, onOpenChange: vi.fn(), permittedFields: fields,
      initialFields: fields.map(field => field.key), initialScope: 'page',
      initialFormat: 'csv', initialFileName: 'tasks', currentPageCount: 12,
      filteredTotalCount: 37, previewRows, onExport,
    };
    const dialog = (permittedFields: typeof fields) => (
      <I18nProvider config={{ defaultLanguage: 'en', detectBrowserLanguage: false }} persistLanguage={false}>
        <ExportConfigurationDialog {...props} permittedFields={permittedFields} />
      </I18nProvider>
    );
    const { rerender } = render(dialog(fields));
    await screen.findByRole('button', { name: 'Remove Customer' });
    rerender(dialog(fields.filter(field => field.key !== 'customer_id')));
    expect(screen.queryByRole('button', { name: 'Remove Customer' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Move Amount up' }));
    rerender(dialog(fields));
    expect(screen.getByRole('button', { name: 'Add Customer' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove Customer' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Export' }));
    await waitFor(() => expect(onExport).toHaveBeenCalledWith(
      'page', ['total_amount', 'order_code'], 'csv', 'tasks',
    ));
  });

  it('uses CompositeDialog discard confirmation for an edited draft', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog('en', { initialFields: ['order_code'] });

    await user.click(screen.getByRole('button', { name: 'Add Customer' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('alertdialog', { name: 'Discard changes?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Keep editing' }));
    expect(screen.getByRole('button', { name: 'Remove Customer' })).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('registers as a presentation-only React Page runtime capability', () => {
    const registration = ComponentRegistry.getReactRuntimeComponents()
      .find(item => item.name === 'ExportConfigurationDialog');

    expect(registration?.component).toBe(ExportConfigurationDialog);
    expect(registration?.injectDataSource).toBe(false);
    expect(ComponentRegistry.getConfig('ExportConfigurationDialog')).toBeUndefined();
  });

  it('does not fetch data while rendering or editing its local export draft', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const user = userEvent.setup();

    renderDialog('en');
    await screen.findByRole('dialog', { name: 'Export data' });
    await user.click(screen.getByRole('button', { name: 'Add Amount' }));

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
