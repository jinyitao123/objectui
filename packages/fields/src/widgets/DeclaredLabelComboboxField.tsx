/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { useSafeFieldLabel } from '@object-ui/i18n';
import { Combobox, EmptyValue, cn } from '@object-ui/components';
import { DECLARED_LABEL_CONFIGURATION_MESSAGES, resolveDeclaredLabelConfiguration, resolveTranslatedDeclaredLabelOptions } from './declaredLabelFieldOptions.js';
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
      data-testid="declared-label-combobox-config-error"
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
 * Searchable text-field choice picker that stores the authored option label.
 * The machine option value is used only to resolve translations; it is never
 * written to the text field.
 */
export function DeclaredLabelComboboxField(props: FieldWidgetComponentProps<string>): React.ReactElement {
  const { field, value, onChange, objectName, readonly, className, error } = props;
  const { t } = useFieldTranslation();
  const { translateOptions } = useSafeFieldLabel();
  const configuration = resolveDeclaredLabelConfiguration(field, false);
  const translateError = (messageKey: keyof typeof DECLARED_LABEL_CONFIGURATION_MESSAGES) =>
    String(t(messageKey, { defaultValue: DECLARED_LABEL_CONFIGURATION_MESSAGES[messageKey] }));

  if (!configuration.ok) {
    return <ConfigurationError props={props} message={translateError(configuration.messageKey)} />;
  }

  const localized = objectName
    ? translateOptions(objectName, field.name, configuration.options)
    : configuration.options;
  const translated = resolveTranslatedDeclaredLabelOptions(configuration.options, localized);
  if (!translated.ok) {
    return <ConfigurationError props={props} message={translateError(translated.messageKey)} />;
  }

  const options = translated.options.map(({ displayLabel }) => ({
    // Combobox filters its Command items by `value`, so use the visible label
    // as the search key. Selection maps back to the authored label below.
    value: displayLabel,
    label: displayLabel,
  }));
  const storedByDisplayLabel = new Map(
    translated.options.map(({ storedValue, displayLabel }) => [displayLabel, storedValue]),
  );
  const selected = translated.options.find((option) => option.storedValue === value);
  let selectedValue = selected?.displayLabel ?? '';

  // Retain an existing free-text value if it predates or falls outside the
  // configured choices. Make its internal key unique if it collides with a
  // translated search label, so choosing it can never write another label.
  if (typeof value === 'string' && value !== '' && !selected) {
    let historicalKey = value;
    while (storedByDisplayLabel.has(historicalKey)) historicalKey = `__existing_value__${historicalKey}`;
    options.push({
      value: historicalKey,
      label: String(t('fields.declaredLabelSelect.unlistedValue', {
        defaultValue: 'Existing value: {{value}}',
        value,
      })),
    });
    storedByDisplayLabel.set(historicalKey, value);
    selectedValue = historicalKey;
  }

  if (readonly) {
    const display = selected?.displayLabel ?? (typeof value === 'string' ? value : '');
    const { name: _domName, ...displayDomProps } = toDomProps(props);
    return display ? (
      <span {...displayDomProps} className={cn('text-sm', className)} aria-invalid={!!error}>
        {display}
      </span>
    ) : (
      <EmptyValue {...displayDomProps} className={className} aria-invalid={!!error} />
    );
  }

  // A Combobox trigger is a button, not a form submission control. Keep the
  // same DOM whitelist as other field pickers and withhold the field name.
  const { name: _domName, ...triggerDomProps } = toDomProps(props);

  return (
    <Combobox
      {...triggerDomProps}
      options={options}
      value={selectedValue}
      onValueChange={(displayLabel) => {
        const storedValue = storedByDisplayLabel.get(displayLabel);
        if (storedValue !== undefined) onChange(storedValue);
      }}
      placeholder={field.placeholder || String(t('common.selectOption'))}
      searchPlaceholder={String(t('table.search'))}
      emptyText={String(t('lookup.noOptions'))}
      disabled={props.disabled}
      className={cn(
        'w-full h-[var(--ui-control-height,2.5rem)] rounded-[var(--ui-control-radius,0.375rem)] px-[var(--ui-input-padding-x,0.75rem)] py-[var(--ui-input-padding-y,0.5rem)] font-normal',
        className,
      )}
      aria-invalid={!!error}
    />
  );
}

export default DeclaredLabelComboboxField;
