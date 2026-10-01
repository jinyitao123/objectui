/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useId } from 'react';
import { useSafeFieldLabel } from '@object-ui/i18n';
import { cn, EmptyValue, Label, RadioGroup, RadioGroupItem } from '@object-ui/components';
import { isValueStillOffered, optionDisplayLabel } from '@object-ui/core';
import type { SelectFieldMetadata, SelectOptionMetadata } from '@object-ui/types';
import { FieldWidgetComponentProps } from './types.js';
import { toDomProps } from './toDomProps.js';
import { toHostGroupProps } from './toHostGroupProps.js';
import { OptionsEmptyState } from './OptionsEmptyState.js';
import { useCascadingOptions } from './useCascadingOptions.js';
import { useFieldTranslation } from './useFieldTranslation.js';

const CONFIGURATION_MESSAGES = {
  textOnly: {
    key: 'fields.choiceCards.selectOnly',
    fallback: 'Choice cards require a select field.',
  },
  singleValueOnly: {
    key: 'fields.choiceCards.singleValueOnly',
    fallback: 'Choice cards support one selected value. Use a multi-value widget for this field.',
  },
} as const;

/**
 * Code-owned icon rendering for a choice card.
 *
 * This is a React runtime slot, not field metadata. A host can map the
 * option's stable machine value to an imported icon component without adding
 * a non-spec `icon` key to `Field.options`.
 */
export type ChoiceCardsOptionIconRenderer = (
  option: SelectOptionMetadata,
  field: SelectFieldMetadata,
) => React.ReactNode;

/** Runtime props for the choice-card React component and code-owned adapters. */
export interface ChoiceCardsFieldProps extends FieldWidgetComponentProps<string> {
  renderOptionIcon?: ChoiceCardsOptionIconRenderer;
}

/**
 * A single-value select presented as descriptive, keyboard-accessible cards.
 * The field's machine option value remains the stored value; only the label is
 * localized for display. Option descriptions remain the authored plain text.
 */
export function ChoiceCardsField(props: ChoiceCardsFieldProps): React.ReactElement {
  const {
    value,
    onChange,
    field,
    readonly,
    className,
    dependentValues,
    dependsOn: dependsOnProp,
    emptyHint,
    dataSource: _dataSource,
    objectName,
    error,
    renderOptionIcon,
    ...hostProps
  } = props;
  const config = field as SelectFieldMetadata;
  const isSelectField = field.type === 'select';
  const isMultiple = isSelectField && config.multiple === true;
  const rawOptions: SelectOptionMetadata[] = isSelectField && Array.isArray(config.options)
    ? config.options
    : [];
  const dependsOn = field?.dependsOn ?? dependsOnProp;
  const { options, gated, dependsOnFields } = useCascadingOptions(
    rawOptions,
    dependsOn,
    dependentValues,
  );
  const groupId = useId();
  const fieldName = hostProps.name || field.name || hostProps.id || '';
  const { t } = useFieldTranslation();
  const { translateOptions } = useSafeFieldLabel();
  const localizedRawOptions = objectName
    ? translateOptions(objectName, field.name, rawOptions)
    : rawOptions;
  const localizedOptions = objectName
    ? translateOptions(objectName, field.name, options)
    : options;

  // Match the existing fixed-option widgets: a value no longer offered after a
  // parent change or predicate update is cleared through the host's onChange.
  useEffect(() => {
    if (!isSelectField || isMultiple || readonly) return;
    if (rawOptions.length === 0 || gated) return;
    if (value === undefined || value === null || value === '') return;
    if (!isValueStillOffered(value, options)) onChange(undefined as unknown as string);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options, gated]);

  if (!isSelectField || isMultiple) {
    const message = !isSelectField
      ? CONFIGURATION_MESSAGES.textOnly
      : CONFIGURATION_MESSAGES.singleValueOnly;
    return (
      <output
        {...toDomProps(hostProps)}
        role="alert"
        aria-invalid="true"
        data-testid="choice-cards-config-error"
        className={cn(
          'flex min-h-9 items-center rounded-md border border-destructive/50 bg-destructive/5 px-3 text-sm text-destructive',
          className,
        )}
      >
        {String(t(message.key, { defaultValue: message.fallback }))}
      </output>
    );
  }

  const hostGroupProps = toHostGroupProps(hostProps, 'instead-of-the-inputs');

  if (readonly) {
    if (value == null || value === '') return <EmptyValue {...hostGroupProps} />;
    const option = localizedRawOptions.find((candidate) => candidate.value === value);
    if (!option) return <span {...hostGroupProps} className="text-sm">{String(value)}</span>;

    return (
      <div {...hostGroupProps} className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-foreground">{optionDisplayLabel(option)}</span>
        {option.description ? (
          <span className="text-xs text-muted-foreground">{option.description}</span>
        ) : null}
      </div>
    );
  }

  if (options.length === 0) {
    return (
      <OptionsEmptyState
        emptyHint={emptyHint}
        gated={gated}
        dependsOnFields={dependsOnFields}
        testId={fieldName ? `choice-cards-empty-${fieldName}` : undefined}
        className="min-h-9"
        hostGroupProps={hostGroupProps}
      />
    );
  }

  const disabled = !!props.disabled;
  const wideColumns = localizedOptions.length <= 1 ? '@min-[600px]:grid-cols-1'
    : localizedOptions.length === 2 ? '@min-[600px]:grid-cols-2'
      : localizedOptions.length === 3 ? '@min-[600px]:grid-cols-3'
        : localizedOptions.length === 4 ? '@min-[600px]:grid-cols-4'
          : '@min-[600px]:grid-cols-5';

  return (
    <div className="@container min-w-0">
      <RadioGroup
        {...toDomProps(hostProps)}
        value={value ?? ''}
        onValueChange={onChange}
        disabled={disabled}
        orientation="horizontal"
        className={cn(
          'grid-cols-1 gap-[var(--ui-choice-card-gap,10px)] @min-[300px]:grid-cols-2 @min-[450px]:grid-cols-3',
          wideColumns,
          className,
        )}
        aria-invalid={!!error}
        data-testid={fieldName ? `choice-cards-${fieldName}` : undefined}
      >
        {localizedOptions.map((option, index) => {
          const optionValue = String(option.value);
          const optionId = `${groupId}-${index}`;
          const labelId = `${optionId}-label`;
          const descriptionId = `${optionId}-description`;
          const hasDescription = typeof option.description === 'string' && option.description.length > 0;
          const checked = value != null && String(value) === optionValue;
          const optionIcon = renderOptionIcon?.(option, config);
          const hasOptionIcon = optionIcon !== null && optionIcon !== undefined && optionIcon !== false;

          return (
            <div key={optionValue} className="relative min-w-0">
              <RadioGroupItem
                id={optionId}
                value={optionValue}
                aria-labelledby={labelId}
                aria-describedby={hasDescription ? descriptionId : undefined}
                data-testid={`choice-card-option-${optionValue}`}
                className={cn(
                  'peer absolute inset-0 z-10 h-full w-full rounded-md border-0 bg-transparent p-0 opacity-0',
                  'focus-visible:opacity-0 focus-visible:ring-0',
                )}
              />
              <Label
                htmlFor={optionId}
                className={cn(
                  'flex min-h-[var(--ui-choice-card-min-height,68px)] cursor-pointer flex-col gap-[var(--ui-choice-card-content-gap,2px)] rounded-md border bg-background px-[var(--ui-choice-card-padding-x,8px)] py-[var(--ui-choice-card-padding-y,6px)] text-left transition-colors',
                  'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2',
                  checked ? 'border-primary bg-accent/40' : 'border-input hover:bg-muted/40',
                  disabled && 'cursor-not-allowed opacity-60',
                )}
              >
                <span className="flex min-w-0 items-center gap-[var(--ui-choice-card-icon-gap,6px)]">
                  {hasOptionIcon ? (
                    <span
                      aria-hidden="true"
                      data-slot="choice-card-icon"
                      className="inline-flex size-[var(--ui-choice-card-icon-size,14px)] shrink-0 items-center justify-center text-primary"
                    >
                      {optionIcon}
                    </span>
                  ) : null}
                  <span
                    id={labelId}
                    className="block min-w-0 truncate text-[length:var(--ui-choice-card-title-font-size,12.25px)] font-medium leading-[var(--ui-choice-card-title-line-height,17.5px)] text-foreground"
                  >
                    {optionDisplayLabel(option)}
                  </span>
                </span>
                {hasDescription ? (
                  <span
                    id={descriptionId}
                    className="line-clamp-2 text-[length:var(--ui-choice-card-description-font-size,12.25px)] font-normal leading-[var(--ui-choice-card-description-line-height,14px)] text-muted-foreground"
                  >
                    {option.description}
                  </span>
                ) : null}
              </Label>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
