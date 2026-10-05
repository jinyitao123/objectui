/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { Suspense } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ComponentRegistry } from '@object-ui/core';
import { I18nProvider } from '@object-ui/i18n';
import '@object-ui/components';
import type { FieldMetadata, FormSchema } from '@object-ui/types';
import { FORM_FIELD_TYPES, registerField, resolveFormWidgetType } from '../index.js';
import { DeclaredLabelComboboxField } from './DeclaredLabelComboboxField.js';

const OBJECT_NAME = 'declared_label_combobox_test_service_order';
const OPTIONS = [
  { label: '维修', value: 'repair' },
  { label: '安装', value: 'install' },
];
const TEXT_FIELD = {
  name: 'service_type',
  type: 'text' as const,
  label: 'Service type',
  options: OPTIONS,
} as unknown as FieldMetadata;

function renderRegisteredForm(onSubmit: FormSchema['onSubmit'], readonly = false) {
  const Form = ComponentRegistry.get('form');
  if (!Form) throw new Error('The form renderer is not registered.');

  const schema: FormSchema = {
    type: 'form',
    mode: 'edit',
    objectName: OBJECT_NAME,
    columns: 1,
    showSubmit: true,
    showCancel: false,
    submitLabel: 'Save',
    defaultValues: { service_type: '维修' },
    fields: [{
      name: 'service_type',
      label: 'Service type',
      type: 'text',
      widget: 'declared-label-combobox',
      field: TEXT_FIELD,
      ...(readonly ? { readonly: true } : {}),
    }],
    onSubmit,
  };

  return render(
    <I18nProvider
      config={{
        defaultLanguage: 'en',
        detectBrowserLanguage: false,
        resources: {
          en: {
            crm: {
              objects: { [OBJECT_NAME]: { label: 'Service orders' } },
              fieldOptions: {
                [OBJECT_NAME]: { service_type: { repair: 'Repair', install: 'Installation' } },
              },
            },
          },
        },
      }}
    >
      <Suspense fallback={<div>Loading field</div>}>
        <Form schema={schema} />
      </Suspense>
    </I18nProvider>,
  );
}

beforeAll(() => registerField('declared-label-combobox'));

afterAll(() => {
  ComponentRegistry.unregister('declared-label-combobox');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DeclaredLabelComboboxField', () => {
  it('searches translated labels and stores the authored label through the registered form widget', async () => {
    const onSubmit = vi.fn();
    renderRegisteredForm(onSubmit);

    const trigger = await screen.findByRole('combobox', { name: 'Service type' });
    expect(trigger).toHaveTextContent('维修');
    fireEvent.click(trigger);

    const search = await screen.findByPlaceholderText('Search…');
    fireEvent.change(search, { target: { value: '安装' } });
    expect(screen.queryByRole('option', { name: '维修' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: '安装' }));
    await waitFor(() => expect(trigger).toHaveTextContent('安装'));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ service_type: '安装' }));
  });

  it('uses the shared object/field translation lookup while mapping back to the authored label', () => {
    const onChange = vi.fn();
    render(
      <I18nProvider
        config={{
          defaultLanguage: 'en',
          detectBrowserLanguage: false,
          resources: {
            en: {
              crm: {
                objects: { [OBJECT_NAME]: { label: 'Service orders' } },
                fieldOptions: {
                  [OBJECT_NAME]: { service_type: { repair: 'Repair', install: 'Installation' } },
                },
              },
            },
          },
        }}
      >
        <DeclaredLabelComboboxField
          field={TEXT_FIELD}
          objectName={OBJECT_NAME}
          value="维修"
          onChange={onChange}
        />
      </I18nProvider>,
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('Repair');
    fireEvent.click(trigger);
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'Installation' } });
    fireEvent.click(screen.getByRole('option', { name: 'Installation' }));
    expect(onChange).toHaveBeenCalledWith('安装');
  });

  it('allows an empty option directory and shows the Combobox empty state', () => {
    const field = { ...TEXT_FIELD, options: [] } as unknown as FieldMetadata;
    render(
      <DeclaredLabelComboboxField
        field={field}
        value=""
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('No options found')).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('retains an existing free-text value until the user selects a declared label', () => {
    const onChange = vi.fn();
    render(
      <DeclaredLabelComboboxField
        field={TEXT_FIELD}
        value="Historical service type"
        onChange={onChange}
      />,
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toHaveTextContent('Existing value: Historical service type');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.click(trigger);
    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: '安装' } });
    fireEvent.click(screen.getByRole('option', { name: '安装' }));
    expect(onChange).toHaveBeenCalledWith('安装');
  });

  it('forwards disabled and validation state to the focusable trigger', () => {
    render(
      <DeclaredLabelComboboxField
        field={TEXT_FIELD}
        value=""
        onChange={vi.fn()}
        disabled
        error="Required"
        id="service-type-control"
        aria-describedby="service-type-help"
      />,
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveAttribute('id', 'service-type-control');
    expect(trigger).toHaveAttribute('aria-describedby', 'service-type-help');
    expect(trigger).toHaveAttribute('aria-invalid', 'true');
  });

  it('keeps the read-only value named and described while showing its label', () => {
    render(
      <DeclaredLabelComboboxField
        field={TEXT_FIELD}
        value="维修"
        onChange={vi.fn()}
        readonly
        error="Required"
        id="service-type-readonly"
        aria-labelledby="service-type-label"
        aria-describedby="service-type-help"
      />,
    );

    const display = screen.getByText('维修');
    expect(display).toHaveAttribute('id', 'service-type-readonly');
    expect(display).toHaveAttribute('aria-labelledby', 'service-type-label');
    expect(display).toHaveAttribute('aria-describedby', 'service-type-help');
    expect(display).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('keeps the registered read-only form host group associated with its label and value', async () => {
    renderRegisteredForm(vi.fn(), true);

    const group = await screen.findByRole('group', { name: /Service type/ });
    expect(group).toHaveTextContent('维修');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.getByText('Service type')).not.toHaveAttribute('for');
  });

  it('is available through the field widget registry without replacing the old select alias', () => {
    expect(FORM_FIELD_TYPES).toContain('declared-label-combobox');
    expect(resolveFormWidgetType('declared-label-combobox')).toBe('declared-label-combobox');
    expect(ComponentRegistry.get('field:declared-label-combobox')).toBeDefined();
    expect(resolveFormWidgetType('declared-label-select')).toBe('declared-label-select');
  });
});
