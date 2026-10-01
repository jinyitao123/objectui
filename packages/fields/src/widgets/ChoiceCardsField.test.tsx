/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nProvider } from '@object-ui/i18n';
import { ComponentRegistry } from '@object-ui/core';
import type { FieldMetadata, SelectFieldMetadata, SelectOptionMetadata } from '@object-ui/types';
import { FORM_FIELD_TYPES, resolveFormWidgetType } from '../index.js';
import { ChoiceCardsField } from './ChoiceCardsField.js';

const OBJECT_NAME = 'choice_cards_test_purchase';
const FIELD: SelectFieldMetadata = {
  name: 'purchase_reason',
  type: 'select',
  label: 'Purchase reason',
  options: [
    { value: 'stock_replenishment', label: 'Stock replenishment', description: 'Restock materials for normal operations.' },
    { value: 'project_order', label: 'Project purchase', description: 'Buy items for a defined project.' },
  ],
};

function renderWithTranslations(children: React.ReactNode) {
  return render(
    <I18nProvider
      config={{
        defaultLanguage: 'en',
        detectBrowserLanguage: false,
        resources: {
          en: {
            fields: {
              choiceCards: {
                selectOnly: 'Choice cards require a select field.',
                singleValueOnly: 'Choice cards support one selected value. Use a multi-value widget for this field.',
              },
            },
            crm: {
              objects: { [OBJECT_NAME]: { label: 'Test purchase' } },
              fieldOptions: {
                [OBJECT_NAME]: {
                  purchase_reason: {
                    stock_replenishment: 'Stock purchase (localized)',
                    project_order: 'Project purchase (localized)',
                  },
                },
              },
            },
          },
        },
      }}
    >
      {children}
    </I18nProvider>,
  );
}

describe('ChoiceCardsField', () => {
  it('displays localized labels and descriptions while writing the machine value', () => {
    const onChange = vi.fn();
    const renderOptionIcon = vi.fn((option: SelectOptionMetadata) => (
      option.value === 'project_order' ? <svg data-testid="project-choice-icon" viewBox="0 0 16 16" /> : null
    ));
    renderWithTranslations(
      <ChoiceCardsField
        field={FIELD}
        objectName={OBJECT_NAME}
        value="stock_replenishment"
        onChange={onChange}
        renderOptionIcon={renderOptionIcon}
      />,
    );

    const project = screen.getByRole('radio', { name: 'Project purchase (localized)' });
    expect(screen.getByText('Buy items for a defined project.')).toBeInTheDocument();
    expect(project).toHaveAttribute('aria-describedby');
    expect(screen.getByTestId('project-choice-icon').closest('[data-slot="choice-card-icon"]')).toBeInTheDocument();
    expect(renderOptionIcon).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'project_order' }),
      FIELD,
    );
    expect(FIELD.options?.[1]).not.toHaveProperty('icon');
    fireEvent.click(project);
    expect(onChange).toHaveBeenCalledWith('project_order');
  });

  it('uses RadioGroup keyboard selection and stores the next machine value', async () => {
    const onChange = vi.fn();
    renderWithTranslations(
      <ChoiceCardsField
        field={FIELD}
        value="stock_replenishment"
        onChange={onChange}
      />,
    );

    const current = screen.getByRole('radio', { name: 'Stock replenishment' });
    act(() => current.focus());
    await act(async () => {
      fireEvent.keyDown(current, { key: 'ArrowRight' });
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(onChange).toHaveBeenCalledWith('project_order');
  });

  it('disables selection and shows the same option label and description in readonly mode', () => {
    const onChange = vi.fn();
    const disabled = renderWithTranslations(
      <ChoiceCardsField field={FIELD} value="stock_replenishment" onChange={onChange} disabled />,
    );

    const project = screen.getByRole('radio', { name: 'Project purchase' });
    expect(project).toBeDisabled();
    fireEvent.click(project);
    expect(onChange).not.toHaveBeenCalled();

    disabled.unmount();
    renderWithTranslations(
      <ChoiceCardsField field={FIELD} value="project_order" onChange={onChange} readonly />,
    );
    expect(screen.getByText('Project purchase')).toBeInTheDocument();
    expect(screen.getByText('Buy items for a defined project.')).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('filters cascading options and clears a value no longer offered', () => {
    const onChange = vi.fn();
    const field = {
      ...FIELD,
      dependsOn: 'country',
      options: [
        { value: 'zj', label: 'Zhejiang', visibleWhen: "record.country == 'cn'" },
        { value: 'ca', label: 'California', visibleWhen: "record.country == 'us'" },
      ],
    } as unknown as SelectFieldMetadata;

    renderWithTranslations(
      <ChoiceCardsField
        field={field}
        value="ca"
        onChange={onChange}
        dependentValues={{ country: 'cn' }}
      />,
    );

    expect(screen.getByRole('radio', { name: 'Zhejiang' })).toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'California' })).not.toBeInTheDocument();
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it.each([
    ['a non-select field', { name: 'purchase_reason', type: 'text' }, /require a select field/i],
    ['a multi-value select', { ...FIELD, multiple: true }, /support one selected value/i],
  ])('refuses %s with a configuration message', (_case, field, message) => {
    renderWithTranslations(
      <ChoiceCardsField
        field={field as unknown as FieldMetadata}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(message);
  });

  it('is registered under the lazy widget key and classified as a group-labelled field', () => {
    expect(FORM_FIELD_TYPES).toContain('choice-cards');
    expect(resolveFormWidgetType('choice-cards')).toBe('choice-cards');
    expect(ComponentRegistry.getMeta('choice-cards', 'field')?.labelling).toBe('group');
  });
});
