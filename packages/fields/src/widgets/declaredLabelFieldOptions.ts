/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import type { FieldMetadata, SelectOptionMetadata } from '@object-ui/types';

export type DeclaredLabelOption = Pick<SelectOptionMetadata, 'value' | 'label'>;

export const DECLARED_LABEL_CONFIGURATION_MESSAGES = {
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

export type DeclaredLabelConfigurationMessageKey = keyof typeof DECLARED_LABEL_CONFIGURATION_MESSAGES;

export type DeclaredLabelConfigurationResult =
  | { ok: true; options: DeclaredLabelOption[] }
  | { ok: false; messageKey: DeclaredLabelConfigurationMessageKey };

export interface TranslatedDeclaredLabelOption {
  /** The authored label, which remains the value stored in the text field. */
  storedValue: string;
  /** The active-language label shown to the user. */
  displayLabel: string;
}

export type TranslatedDeclaredLabelOptionsResult =
  | { ok: true; options: TranslatedDeclaredLabelOption[] }
  | { ok: false; messageKey: Extract<DeclaredLabelConfigurationMessageKey,
      'fields.declaredLabelSelect.invalidTranslatedLabel' | 'fields.declaredLabelSelect.duplicateTranslatedLabel'> };

export function declaredLabelKey(label: string): string {
  return label.trim().normalize('NFC');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validate the code-only options carried by a text field. */
export function resolveDeclaredLabelConfiguration(
  field: FieldMetadata,
  optionsRequired = true,
): DeclaredLabelConfigurationResult {
  if (field.type !== 'text') {
    return { ok: false, messageKey: 'fields.declaredLabelSelect.textOnly' };
  }

  // ObjectStack FieldSchema admits `options` on a text field, while ObjectUI's
  // FieldMetadata union only gives that slot to its select member. Validate
  // this runtime extension before narrowing it.
  const rawOptions = (field as FieldMetadata & { options?: unknown }).options;
  if (rawOptions === undefined && !optionsRequired) return { ok: true, options: [] };
  if (!Array.isArray(rawOptions) || (optionsRequired && rawOptions.length === 0)) {
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

    const canonicalLabel = declaredLabelKey(label);
    if (canonicalLabel === '') {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.invalidOption' };
    }
    if (values.has(value)) {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.duplicateValue' };
    }
    if (labels.has(canonicalLabel)) {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.duplicateLabel' };
    }

    // The text field stores labels, but ObjectStack evaluates visibleWhen and
    // option defaults against machine values. Refuse both mismatched rules.
    if (option.visibleWhen !== undefined && option.visibleWhen !== null) {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.visibleWhenUnsupported' };
    }
    if (option.default === true) {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.optionDefaultUnsupported' };
    }

    values.add(value);
    labels.add(canonicalLabel);
    options.push({ value, label });
  }

  return { ok: true, options };
}

/** Ensure translated labels are plain, non-empty, and unambiguous. */
export function resolveTranslatedDeclaredLabelOptions(
  options: readonly DeclaredLabelOption[],
  localized: readonly { label?: unknown }[],
): TranslatedDeclaredLabelOptionsResult {
  const translatedLabels = new Set<string>();
  const result: TranslatedDeclaredLabelOption[] = [];

  for (const [index, option] of options.entries()) {
    const translatedLabel = localized[index]?.label;
    if (typeof translatedLabel !== 'string' || declaredLabelKey(translatedLabel) === '') {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.invalidTranslatedLabel' };
    }

    const canonicalDisplayLabel = declaredLabelKey(translatedLabel);
    if (translatedLabels.has(canonicalDisplayLabel)) {
      return { ok: false, messageKey: 'fields.declaredLabelSelect.duplicateTranslatedLabel' };
    }

    translatedLabels.add(canonicalDisplayLabel);
    result.push({ storedValue: option.label, displayLabel: translatedLabel });
  }

  return { ok: true, options: result };
}
