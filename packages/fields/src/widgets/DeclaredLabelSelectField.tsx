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
import type { SelectFieldMetadata, SelectOptionMetadata } from '@object-ui/types';
import { SelectField } from './SelectField.js';
import {
  DECLARED_LABEL_CONFIGURATION_MESSAGES,
  resolveDeclaredLabelConfiguration,
  resolveTranslatedDeclaredLabelOptions,
} from './declaredLabelFieldOptions.js';
import { toDomProps } from './toDomProps.js';
import { useFieldTranslation } from './useFieldTranslation.js';
import type { FieldWidgetComponentProps } from './types.js';

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
  const configuration = resolveDeclaredLabelConfiguration(field);
  const translateError = (messageKey: keyof typeof DECLARED_LABEL_CONFIGURATION_MESSAGES) =>
    String(t(messageKey, { defaultValue: DECLARED_LABEL_CONFIGURATION_MESSAGES[messageKey] }));

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
  const translated = resolveTranslatedDeclaredLabelOptions(configuration.options, localized);
  if (!translated.ok) {
    return (
      <ConfigurationError
        props={props}
        message={translateError(translated.messageKey)}
      />
    );
  }

  const selectOptions: SelectOptionMetadata[] = translated.options.map(({ storedValue, displayLabel }) => ({
    value: storedValue,
    label: displayLabel,
  }));

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
