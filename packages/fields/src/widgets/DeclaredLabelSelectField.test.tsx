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
import { DeclaredLabelSelectField } from './DeclaredLabelSelectField.js';

const OBJECT_NAME = 'declared_label_select_test_contact';
const OPTIONS = [
  { label: '男', value: 'male' },
  { label: '女', value: 'female' },
];

const TEXT_FIELD = {
  name: 'gender',
  type: 'text' as const,
  label: 'Gender',
  options: OPTIONS,
};

function runtimeField(options: unknown, type = 'text'): FieldMetadata {
  return { name: 'gender', type, label: 'Gender', options } as unknown as FieldMetadata;
}

function addPointerSupport(): void {
  class MockPointerEvent extends Event {
    button: number;
    ctrlKey: boolean;
    pointerType: string;

    constructor(
      type: string,
      init: { button?: number; ctrlKey?: boolean; pointerType?: string } = {},
    ) {
      super(type, { bubbles: true, cancelable: true });
      this.button = init.button ?? 0;
      this.ctrlKey = init.ctrlKey ?? false;
      this.pointerType = init.pointerType ?? 'mouse';
    }
  }

  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    value: MockPointerEvent,
  });
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  });
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
  });
}

function renderRegisteredForm(onSubmit: FormSchema['onSubmit']) {
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
    defaultValues: { gender: '男', notes: 'Keep this value' },
    fields: [{
      name: 'gender',
      label: 'Gender',
      type: 'text',
      widget: 'declared-label-select',
      field: TEXT_FIELD,
    }, { name: 'notes', label: 'Notes', type: 'input' }],
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
              objects: { [OBJECT_NAME]: { label: 'Test contacts' } },
              fieldOptions: {
                [OBJECT_NAME]: { gender: { male: 'Male localized', female: 'Female localized' } },
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

beforeAll(() => {
  addPointerSupport();
  // The same lazy registry entry used by `registerAllFields` / ObjectForm.
  registerField('declared-label-select');
});

afterAll(() => {
  ComponentRegistry.unregister('declared-label-select');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DeclaredLabelSelectField — label storage and translated display', () => {
  it('resolves option translations by machine value but submits the original label', async () => {
    const onSubmit = vi.fn();
    renderRegisteredForm(onSubmit);

    const trigger = await screen.findByRole('combobox', { name: 'Gender' });
    expect(trigger).toHaveTextContent('Male localized');
    expect(screen.getByRole('textbox', { name: 'Notes' })).not.toHaveAttribute('objectname');

    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' });
    fireEvent.click(await screen.findByRole('option', { name: 'Female localized' }));
    await waitFor(() => expect(trigger).toHaveTextContent('Female localized'));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ gender: '女' }));
  });

  it('keeps and displays a historical text value missing from declared choices', () => {
    const onChange = vi.fn();
    render(
      <DeclaredLabelSelectField
        field={TEXT_FIELD}
        value="Historical title"
        onChange={onChange}
      />,
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('Existing value: Historical title');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not change the value when the reused select is disabled', () => {
    const onChange = vi.fn();
    render(
      <DeclaredLabelSelectField
        field={TEXT_FIELD}
        value="男"
        onChange={onChange}
        disabled
      />,
    );

    const trigger = screen.getByRole('combobox');
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('DeclaredLabelSelectField — configuration refusals', () => {
  it.each([
    ['a non-text field', runtimeField(OPTIONS, 'select'), 'requires a text field'],
    ['a non-string label', runtimeField([{ value: 'male', label: { en: 'Male' } }]), 'plain-text label'],
    ['duplicate labels', runtimeField([{ value: 'male', label: 'Choice' }, { value: 'female', label: 'Choice' }]), 'labels must be unique'],
    ['duplicate machine values', runtimeField([{ value: 'same', label: 'Male' }, { value: 'same', label: 'Female' }]), 'machine values must be unique'],
    ['conditional options', runtimeField([{ value: 'male', label: 'Male', visibleWhen: "record.active == true" }]), 'visibility rules cannot be used'],
    ['option defaults', runtimeField([{ value: 'male', label: 'Male', default: true }]), 'Option defaults cannot be used'],
  ])('shows a clear error for %s', (_description, field, message) => {
    render(
      <DeclaredLabelSelectField
        field={field}
        value=""
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(message);
  });

  it('rejects labels that collide after localization', () => {
    const field = runtimeField([
      { value: 'male', label: 'Man' },
      { value: 'female', label: 'Woman' },
    ]);

    render(
      <I18nProvider
        config={{
          defaultLanguage: 'en',
          detectBrowserLanguage: false,
          resources: {
            en: {
              crm: {
                objects: { [OBJECT_NAME]: { label: 'Test contacts' } },
                fieldOptions: { [OBJECT_NAME]: { gender: { male: 'Choice', female: 'Choice' } } },
              },
            },
          },
        }}
      >
        <DeclaredLabelSelectField
          field={field}
          objectName={OBJECT_NAME}
          value=""
          onChange={vi.fn()}
        />
      </I18nProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('unique in the active language');
  });
});

describe('DeclaredLabelSelectField registry surface', () => {
  it('is discoverable through the same lazy field registry used by ObjectForm', () => {
    expect(FORM_FIELD_TYPES).toContain('declared-label-select');
    expect(resolveFormWidgetType('declared-label-select')).toBe('declared-label-select');
    expect(ComponentRegistry.get('field:declared-label-select')).toBeDefined();
  });
});
