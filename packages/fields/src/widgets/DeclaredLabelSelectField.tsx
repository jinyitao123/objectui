/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { useSafeFieldLabel } from '@object-ui/i18n';
import { cn } from '@object-ui/components';
import type { FieldMetadata, SelectFieldMetadata, SelectOptionMetadata } from '@object-ui/types';
import { SelectField } from './SelectField.js';
import { toDomProps } from './toDomProps.js';
import { useFieldTranslation } from './useFieldTranslation.js';
import type { FieldWidgetComponentProps } from './types.js';

type DeclaredLabelOption = Pick<SelectOptionMetadata, 'value' | 'label'>;

const CONFIGURATION_MESSAGES = {
  'fields.declaredLabelSelect.textOnly': 'This widget requires a text field.',
  'fields.declaredLabelSelect.optionsRequired': 'Declare at least one option for this text field.',
  'fields.declaredLabelSelect.invalidOption': 'Each option needs a non-empty machine value and a plain-text label.',
  'fields.declaredLabelSelect.duplicateValue': 'Option machine values must be unique.',
  'fields.declaredLabelSelect.duplicateLabel': 'Option labels must be unique.',
  'fields.declaredLabelSelect.visibleWhenUnsupported': 'Options with visibility rules cannot be used by a label-stored text select.',
  'fields.declaredLabelSelect.optionDefaultUnsupported': 'Option defaults cannot be used by a label-stored text select; set a text default value instead.',
  'fields.declaredLabelSelect.invalidTranslatedLabel': 'An option label could not be translated to plain text.',
  'fields.declaredLabelSelect.duplicateTranslatedLabel': 'Option labels must remain unique in the active language.',
} as const;

type ConfigurationResult =
  | { ok: true; options: DeclaredLabelOption[] }
  | { ok: false; messageKey: keyof typeof CONFIGURATION_MESSAGES };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function labelKey(label: string): string {
  return label.trim().normalize('NFC');
}

function resolveConfiguration(field: FieldMetadata): ConfigurationResult {
  if (field.type !== 'text') {
    return { ok: false, messageKey: 'fields.declaredLabelSelect.textOnly' };
  }

  // The ObjectStack FieldSchema admits `options` on a text field, while the
  // ObjectUI FieldMetadata union only gives that slot to its select member.
  // Read the runtime metadata as unknown and validate it before narrowing.
  const rawOptions = (field as FieldMetadata & { options?: unknown }).options;
  if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
    return { ok: false, messageKey: 'fields.declaredLabelSelect.optionsRequired' };
  }

  const values = new Set<string>();
  const labels = new Set<string>();
  const options: DeclaredLabelOption[] = [];

  for (const option of rawOptions) {
    if (!isRecord(option)) {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.invalidOption' };
    }

    const { value, label } = option;
    if (typeof value !== 'string' || value.trim() === '' || typeof label !== 'string') {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.invalidOption' };
    }

    const canonicalLabel = labelKey(label);
    if (canonicalLabel === '') {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.invalidOption' };
    }
    if (values.has(value)) {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.duplicateValue' };
    }
    if (labels.has(canonicalLabel)) {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.duplicateLabel' };
    }

    // ObjectStack validates visibleWhen against the machine value. This widget
    // persists the option label, so accepting that rule would make the client
    // and server disagree about which value the predicate gates.
    if (option.visibleWhen !== undefined && option.visibleWhen !== null) {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.visibleWhenUnsupported' };
    }

    // ObjectStack applies `default: true` as the machine value on insert. A
    // text field using this widget stores the label instead, so that default
    // would contradict the displayed value.
    if (option.default === true) {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.optionDefaultUnsupported' };
    }

    values.add(value);
    labels.add(canonicalLabel);
    options.push({ value, label });
  }

  return { ok: true, options };
}

function ConfigurationError({
  props,
  message,
}: {
  props: FieldWidgetComponentProps<string>;
  message: string;
}): React.ReactElement {
  return (
    <output
      {...toDomProps(props)}
      role="alert"
      aria-invalid="true"
      data-testid="declared-label-select-config-error"
      className={cn(
        'flex min-h-9 items-center rounded-md border border-destructive/50 bg-destructive/5 px-3 text-sm text-destructive',
        props.className,
      )}
    >
      {message}
    </output>
  );
}

/**
 * A text-field select that persists the declared option label.
 *
 * The ASCII option value remains the stable i18n key. Only the displayed label
 * is translated; selection writes the original, untranslated label string so
 * changing locale never changes stored text.
 */
export function DeclaredLabelSelectField(props: FieldWidgetComponentProps<string>): React.ReactElement {
  const { field, value, onChange, objectName, ...hostProps } = props;
  const { t } = useFieldTranslation();
  const { translateOptions } = useSafeFieldLabel();
  const configuration = resolveConfiguration(field);
  const translateError = (messageKey: keyof typeof CONFIGURATION_MESSAGES) =>
    String(t(messageKey, { defaultValue: CONFIGURATION_MESSAGES[messageKey] }));

  if (!configuration.ok) {
    return (
      <ConfigurationError
        props={props}
        message={translateError(configuration.messageKey)}
      />
    );
  }

  const localized = objectName
    ? translateOptions(objectName, field.name, configuration.options)
    : configuration.options;
  const translatedLabels = new Set<string>();
  const selectOptions: SelectOptionMetadata[] = [];

  for (const [index, option] of configuration.options.entries()) {
    const translatedLabel = localized[index]?.label;
    if (typeof translatedLabel !== 'string' || labelKey(translatedLabel) === '') {
      return (
        <ConfigurationError
          props={props}
          message={translateError('fields.declaredLabelSelect.invalidTranslatedLabel')}
        />
      );
    }

    const canonicalDisplayLabel = labelKey(translatedLabel);
    if (translatedLabels.has(canonicalDisplayLabel)) {
      return (
        <ConfigurationError
          props={props}
          message={translateError('fields.declaredLabelSelect.duplicateTranslatedLabel')}
        />
      );
    }

    translatedLabels.add(canonicalDisplayLabel);
    selectOptions.push({ value: option.label, label: translatedLabel });
  }

  // Preserve an existing text value that predates or falls outside this option
  // list. SelectField clears values it cannot find among its options, so add a
  // display-only entry for the current value rather than silently erasing it.
  if (typeof value === 'string' && value !== '' && !configuration.options.some((option) => option.label === value)) {
    selectOptions.push({
      value,
      label: String(t('fields.declaredLabelSelect.unlistedValue', {
        defaultValue: 'Existing value: {{value}}',
        value,
      })),
    });
  }

  const selectField: SelectFieldMetadata = {
    name: field.name,
    type: 'select',
    label: field.label,
    placeholder: field.placeholder,
    options: selectOptions,
  };

  return (
    <SelectField
      {...hostProps}
      field={selectField}
      value={value}
      onChange={(selected) => {
        // SelectField emits the option's value. Here that value is the original
        // label, never the translated display string or the machine i18n key.
        if (selectOptions.some((option) => option.value === selected)) onChange(selected);
      }}
    />
  );
}
