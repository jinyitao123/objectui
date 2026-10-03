import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@object-ui/i18n';
import { GridField } from './GridField';

const renderChineseGrid = (field: Record<string, unknown>, value: Record<string, unknown>[] = [{}]) => render(
  <I18nProvider config={{ defaultLanguage: 'zh', detectBrowserLanguage: false }} persistLanguage={false}>
    <GridField
      value={value}
      onChange={vi.fn()}
      field={field as never}
      renderSelectionToolbar={() => null}
    />
  </I18nProvider>,
);

describe('GridField localized controls', () => {
  it('localizes required feedback and row selection/removal names', () => {
    renderChineseGrid({
      allow_delete: true,
      columns: [{ name: 'name', label: '名称', type: 'text', required: true }],
    });

    expect(screen.getByLabelText('选择第 1 行')).toBeInTheDocument();
    expect(screen.getByLabelText('移除行')).toBeInTheDocument();
    const invalidCell = screen.getByTestId('line-items-invalid-0-name');
    expect(invalidCell).toHaveAttribute('title', '名称不能为空');
    expect(invalidCell.querySelector('input')).toHaveAttribute('aria-invalid', 'true');
  });

  it('localizes computed, duplicate, and add-line affordances', () => {
    renderChineseGrid({
      columns: [
        { name: 'quantity', label: '数量', type: 'number' },
        { name: 'amount', label: '金额', type: 'currency', computed: true, expr: 'record.quantity * 10' },
      ],
    });

    expect(screen.getAllByTitle('计算字段')).toHaveLength(2);
    expect(screen.getByLabelText('复制行')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '添加行' })).toBeInTheDocument();
  });
});
