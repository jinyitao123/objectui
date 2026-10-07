/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * ExportConfigurationDialog — host-controlled configuration for a synchronous
 * record export. This component presents a selection draft and never queries
 * records or owns export permissions, persistence, or background jobs.
 */

import React from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { createSafeTranslation } from '@object-ui/i18n';
import {
  Button,
  CompositeDialog,
  Input,
  Label,
  RadioGroup,
  RadioGroupItem,
} from '@object-ui/components';

const useExportConfigurationTranslation = createSafeTranslation(
  {
    'common.cancel': 'Cancel',
    'common.export': 'Export',
    'form.exportConfiguration.title': 'Export data',
    'form.exportConfiguration.scope': 'Export scope',
    'form.exportConfiguration.currentPage': 'Current page: {{count}}',
    'form.exportConfiguration.allFiltered': 'All filtered results: {{count}}',
    'form.exportConfiguration.availableFields': 'Available fields',
    'form.exportConfiguration.selectedFields': 'Fields to export',
    'form.exportConfiguration.addField': 'Add',
    'form.exportConfiguration.noAvailableFields': 'No additional fields can be added.',
    'form.exportConfiguration.noFields': 'Select at least one field to export.',
    'form.exportConfiguration.removeField': 'Remove {{field}}',
    'form.exportConfiguration.moveFieldUp': 'Move {{field}} up',
    'form.exportConfiguration.moveFieldDown': 'Move {{field}} down',
    'form.exportConfiguration.fileName': 'File name',
    'form.exportConfiguration.fileNameRequired': 'Enter a file name.',
    'form.exportConfiguration.format': 'Format',
    'form.exportConfiguration.formatCsv': 'CSV',
    'form.exportConfiguration.formatXlsx': 'Excel (.xlsx)',
    'form.exportConfiguration.formatJson': 'JSON',
    'form.exportConfiguration.preview': 'Preview (up to {{count}} rows)',
    'form.exportConfiguration.noPreviewRows': 'No preview rows are available.',
    'form.exportConfiguration.exporting': 'Exporting…',
    'form.exportConfiguration.exportFailed': 'Export failed. Please try again.',
  },
  'form.exportConfiguration.title',
);

export type ExportConfigurationScope = 'page' | 'all';
export type ExportConfigurationFormat = 'csv' | 'xlsx' | 'json';

/** `key` is host-owned data identity; only the display `label` is rendered. */
export interface ExportConfigurationField {
  key: string;
  label: string;
}

/** Values are already formatted for display by the host. Keys are never shown. */
export type ExportConfigurationPreviewRow = Readonly<Record<string, React.ReactNode>>;

export interface ExportConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permittedFields: readonly ExportConfigurationField[];
  initialFields: readonly string[];
  initialScope: ExportConfigurationScope;
  initialFormat: ExportConfigurationFormat;
  initialFileName: string;
  currentPageCount: number;
  filteredTotalCount: number;
  previewRows: readonly ExportConfigurationPreviewRow[];
  onExport: (
    scope: ExportConfigurationScope,
    fields: readonly string[],
    format: ExportConfigurationFormat,
    fileName: string,
  ) => void | Promise<void>;
}

interface ExportDraft {
  scope: ExportConfigurationScope;
  fields: string[];
  format: ExportConfigurationFormat;
  fileName: string;
}

function initialDraft(props: ExportConfigurationDialogProps): ExportDraft {
  const permitted = new Set(props.permittedFields.map(field => field.key));
  const seen = new Set<string>();
  const fields = props.initialFields.filter(key => {
    if (!permitted.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return {
    scope: props.initialScope,
    fields,
    format: props.initialFormat,
    fileName: props.initialFileName,
  };
}

function snapshotDraft(draft: ExportDraft): string {
  return JSON.stringify(draft);
}

function displayCount(value: number, language: string): string {
  return Number.isFinite(value) && value >= 0 ? value.toLocaleString(language) : '—';
}

export function ExportConfigurationDialog({
  open,
  onOpenChange,
  permittedFields,
  initialFields,
  initialScope,
  initialFormat,
  initialFileName,
  currentPageCount,
  filteredTotalCount,
  previewRows,
  onExport,
}: ExportConfigurationDialogProps): React.ReactElement {
  const { t, language } = useExportConfigurationTranslation();
  const firstDraft = initialDraft({
    open,
    onOpenChange,
    permittedFields,
    initialFields,
    initialScope,
    initialFormat,
    initialFileName,
    currentPageCount,
    filteredTotalCount,
    previewRows,
    onExport,
  });
  const [draft, setDraft] = React.useState(firstDraft);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const wasOpen = React.useRef(open);
  const baseline = React.useRef(snapshotDraft(firstDraft));
  const latestInitialDraft = React.useRef(firstDraft);
  latestInitialDraft.current = firstDraft;
  const permittedKeys = JSON.stringify(permittedFields.map(field => field.key));
  const idPrefix = React.useId();

  React.useEffect(() => {
    if (open && !wasOpen.current) {
      const next = latestInitialDraft.current;
      setDraft(next);
      baseline.current = snapshotDraft(next);
      setError('');
    }
    wasOpen.current = open;
  }, [open]);

  React.useEffect(() => {
    const allowed = new Set<string>(JSON.parse(permittedKeys));
    setDraft(current => {
      const fields = current.fields.filter(key => allowed.has(key));
      return fields.length === current.fields.length ? current : { ...current, fields };
    });
  }, [permittedKeys]);

  const dirty = snapshotDraft(draft) !== baseline.current;
  const fieldsByKey = new Map(permittedFields.map(field => [field.key, field]));
  const selectedFields = draft.fields
    .map(key => fieldsByKey.get(key))
    .filter((field): field is ExportConfigurationField => field !== undefined);
  const availableFields = permittedFields.filter(field => !draft.fields.includes(field.key));
  const preview = previewRows.slice(0, 5);
  const fileName = draft.fileName.trim();
  const fileNameId = `${idPrefix}-file-name`;
  const scopePageId = `${idPrefix}-scope-page`;
  const scopeAllId = `${idPrefix}-scope-all`;
  const formatCsvId = `${idPrefix}-format-csv`;
  const formatXlsxId = `${idPrefix}-format-xlsx`;
  const formatJsonId = `${idPrefix}-format-json`;

  function addField(key: string) {
    setDraft(current => current.fields.includes(key)
      ? current
      : { ...current, fields: [...current.fields, key] });
  }

  function removeField(key: string) {
    setDraft(current => ({ ...current, fields: current.fields.filter(field => field !== key) }));
  }

  function moveField(key: string, direction: -1 | 1) {
    setDraft(current => {
      const fields = current.fields.filter(field => fieldsByKey.has(field));
      const index = fields.indexOf(key);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= fields.length) return current;
      [fields[index], fields[nextIndex]] = [fields[nextIndex], fields[index]];
      return { ...current, fields };
    });
  }

  async function exportSelection() {
    if (busy || selectedFields.length === 0 || !fileName) return;
    setBusy(true);
    setError('');
    try {
      await onExport(draft.scope, selectedFields.map(field => field.key), draft.format, fileName);
      onOpenChange(false);
    } catch {
      setError(t('form.exportConfiguration.exportFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <CompositeDialog
      open={open}
      title={t('form.exportConfiguration.title')}
      onOpenChange={onOpenChange}
      busy={busy}
      confirmOnDiscard={dirty}
      footer={({ requestClose, busy: dialogBusy }) => (
        <div className="flex flex-wrap justify-end gap-[var(--ui-button-gap,0.5rem)]">
          <Button type="button" variant="outline" disabled={dialogBusy} onClick={requestClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            disabled={dialogBusy || selectedFields.length === 0 || !fileName}
            onClick={() => { void exportSelection(); }}
          >
            {dialogBusy ? t('form.exportConfiguration.exporting') : t('common.export')}
          </Button>
        </div>
      )}
    >
      <div className="space-y-4">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">
            {t('form.exportConfiguration.scope')}
          </legend>
          <RadioGroup
            aria-label={t('form.exportConfiguration.scope')}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            value={draft.scope}
            disabled={busy}
            onValueChange={value => {
              if (value === 'page' || value === 'all') setDraft(current => ({ ...current, scope: value }));
            }}
          >
            <div className="flex min-w-0 items-center gap-2 rounded-md border border-border p-3">
              <RadioGroupItem id={scopePageId} value="page" />
              <Label htmlFor={scopePageId} className="min-w-0 cursor-pointer">
                {t('form.exportConfiguration.currentPage', { count: displayCount(currentPageCount, language) })}
              </Label>
            </div>
            <div className="flex min-w-0 items-center gap-2 rounded-md border border-border p-3">
              <RadioGroupItem id={scopeAllId} value="all" />
              <Label htmlFor={scopeAllId} className="min-w-0 cursor-pointer">
                {t('form.exportConfiguration.allFiltered', { count: displayCount(filteredTotalCount, language) })}
              </Label>
            </div>
          </RadioGroup>
        </fieldset>

        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <section aria-labelledby={`${idPrefix}-available-fields`} className="min-w-0 space-y-2">
            <h3 id={`${idPrefix}-available-fields`} className="text-sm font-medium">
              {t('form.exportConfiguration.availableFields')}
            </h3>
            <ul className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-border p-2">
              {availableFields.length > 0 ? availableFields.map(field => (
                <li key={field.key} className="flex min-w-0 items-center justify-between gap-2 rounded-sm px-2 py-1.5">
                  <span className="min-w-0 truncate text-sm">{field.label}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`${t('form.exportConfiguration.addField')} ${field.label}`}
                    disabled={busy}
                    onClick={() => addField(field.key)}
                  >
                    {t('form.exportConfiguration.addField')}
                  </Button>
                </li>
              )) : (
                <li className="px-2 py-2 text-sm text-muted-foreground">
                  {t('form.exportConfiguration.noAvailableFields')}
                </li>
              )}
            </ul>
          </section>

          <section aria-labelledby={`${idPrefix}-selected-fields`} className="min-w-0 space-y-2">
            <h3 id={`${idPrefix}-selected-fields`} className="text-sm font-medium">
              {t('form.exportConfiguration.selectedFields')}
            </h3>
            {selectedFields.length > 0 ? (
              <ol className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {selectedFields.map((field, index) => (
                  <li key={field.key} className="flex min-w-0 items-center gap-1 rounded-sm px-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-sm">{field.label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-[var(--ui-toolbar-action-height,2rem)] w-[var(--ui-toolbar-action-height,2rem)]"
                      aria-label={t('form.exportConfiguration.moveFieldUp', { field: field.label })}
                      disabled={busy || index === 0}
                      onClick={() => moveField(field.key, -1)}
                    >
                      <ArrowUp aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-[var(--ui-toolbar-action-height,2rem)] w-[var(--ui-toolbar-action-height,2rem)]"
                      aria-label={t('form.exportConfiguration.moveFieldDown', { field: field.label })}
                      disabled={busy || index === selectedFields.length - 1}
                      onClick={() => moveField(field.key, 1)}
                    >
                      <ArrowDown aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-[var(--ui-toolbar-action-height,2rem)] w-[var(--ui-toolbar-action-height,2rem)]"
                      aria-label={t('form.exportConfiguration.removeField', { field: field.label })}
                      disabled={busy}
                      onClick={() => removeField(field.key)}
                    >
                      <span aria-hidden="true">×</span>
                    </Button>
                  </li>
                ))}
              </ol>
            ) : (
              <p role="status" className="rounded-md border border-border px-3 py-4 text-sm text-muted-foreground">
                {t('form.exportConfiguration.noFields')}
              </p>
            )}
          </section>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0 space-y-2">
            <Label htmlFor={fileNameId}>{t('form.exportConfiguration.fileName')}</Label>
            <Input
              id={fileNameId}
              aria-label={t('form.exportConfiguration.fileName')}
              value={draft.fileName}
              aria-invalid={!fileName}
              disabled={busy}
              onChange={event => setDraft(current => ({ ...current, fileName: event.target.value }))}
            />
            {!fileName && <p className="text-sm text-destructive">{t('form.exportConfiguration.fileNameRequired')}</p>}
          </div>

          <fieldset className="min-w-0 space-y-2">
            <legend className="mb-2 text-sm font-medium">{t('form.exportConfiguration.format')}</legend>
            <RadioGroup
              aria-label={t('form.exportConfiguration.format')}
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              value={draft.format}
              disabled={busy}
              onValueChange={value => {
                if (value === 'csv' || value === 'xlsx' || value === 'json') {
                  setDraft(current => ({ ...current, format: value }));
                }
              }}
            >
              {([
                ['csv', 'formatCsv', formatCsvId],
                ['xlsx', 'formatXlsx', formatXlsxId],
                ['json', 'formatJson', formatJsonId],
              ] as const).map(([value, labelKey, id]) => (
                <div key={value} className="flex min-w-0 items-center gap-2 rounded-md border border-border p-2">
                  <RadioGroupItem id={id} value={value} />
                  <Label htmlFor={id} className="min-w-0 cursor-pointer text-sm">
                    {t('form.exportConfiguration.' + labelKey)}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </fieldset>
        </div>

        <section aria-labelledby={`${idPrefix}-preview`} className="min-w-0 space-y-2">
          <h3 id={`${idPrefix}-preview`} className="text-sm font-medium">
            {t('form.exportConfiguration.preview', { count: 5 })}
          </h3>
          {selectedFields.length === 0 ? null : preview.length === 0 ? (
            <p className="rounded-md border border-border px-3 py-4 text-sm text-muted-foreground">
              {t('form.exportConfiguration.noPreviewRows')}
            </p>
          ) : (
            <div className="max-w-full overflow-auto rounded-md border border-border">
              <table className="min-w-full text-sm">
                <caption className="sr-only">{t('form.exportConfiguration.preview', { count: 5 })}</caption>
                <thead className="bg-muted/50">
                  <tr>
                    {selectedFields.map(field => (
                      <th key={field.key} scope="col" className="whitespace-nowrap px-3 py-2 text-left font-medium">
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t border-border">
                      {selectedFields.map(field => (
                        <td key={field.key} className="max-w-64 px-3 py-2">
                          {row[field.key] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </CompositeDialog>
  );
}
