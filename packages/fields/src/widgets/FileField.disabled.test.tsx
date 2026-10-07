import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { I18nProvider } from '@object-ui/i18n';
import { UploadProvider, type UploadAdapter } from '@object-ui/providers';
import type { FieldMetadata } from '@object-ui/types';
import { FileField } from './FileField';

const field: FieldMetadata = { name: 'evidence', label: 'Evidence', type: 'file', multiple: true, accept: ['image/*'] };
const existing = { id: 'existing-file', name: 'evidence.png', size: 12, mimeType: 'image/png', url: '/api/v1/storage/files/existing-file' };

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function setup(disabled = true) {
  vi.stubGlobal('navigator', { maxTouchPoints: 1, userAgent: 'Mobile' });
  const upload = vi.fn(async (file: File | Blob) => ({ meta: { fileId: 'uploaded-file' }, name: 'new.png', size: file.size, mimeType: file.type, url: '/api/v1/storage/files/uploaded-file' }));
  const adapter: UploadAdapter = { name: 'test', upload };
  const onChange = vi.fn();
  const view = (locked: boolean) => <I18nProvider config={{ defaultLanguage: 'en', detectBrowserLanguage: false }}><UploadProvider adapter={adapter}><FileField field={field} value={[existing]} onChange={onChange} disabled={locked} aria-label="Evidence" /></UploadProvider></I18nProvider>;
  const rendered = render(view(disabled));
  return { ...rendered, upload, onChange, view };
}

describe('FileField disabled editing', () => {
  it('disables file and camera inputs, dropzone and removal while keeping the existing download', () => {
    const { container } = setup();
    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'));
    expect(inputs).toHaveLength(2);
    inputs.forEach(input => expect(input).toBeDisabled());
    expect(screen.getByRole('button', { name: 'Evidence' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Evidence' })).toHaveAttribute('tabindex', '-1');
    expect(screen.getByTestId('file-field-camera-button')).toBeDisabled();
    Array.from(container.querySelectorAll('button')).forEach(button => expect(button).toBeDisabled());
    expect(screen.getByRole('link', { name: 'evidence.png' })).toHaveAttribute('href', existing.url);
  });

  it('never reaches the upload adapter or value callback for disabled picks, camera events or drops', async () => {
    const { container, upload, onChange } = setup();
    const file = new File(['synthetic'], 'new.png', { type: 'image/png' });
    await act(async () => {
      container.querySelectorAll('input[type="file"]').forEach(input => fireEvent.change(input, { target: { files: [file] } }));
      fireEvent.drop(screen.getByRole('button', { name: 'Evidence' }), { dataTransfer: { files: [file] } });
    });
    expect(upload).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'evidence.png' })).toBeVisible();
  });

  it('does not open either picker through disabled click or keyboard activation', () => {
    setup();
    const click = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {});
    const dropzone = screen.getByRole('button', { name: 'Evidence' });
    fireEvent.click(dropzone);
    fireEvent.keyDown(dropzone, { key: 'Enter' });
    fireEvent.keyDown(dropzone, { key: ' ' });
    fireEvent.click(screen.getByTestId('file-field-camera-button'));
    expect(click).not.toHaveBeenCalled();
  });

  it('retains working uploads when the same field becomes editable', async () => {
    const { container, upload, onChange, rerender, view } = setup();
    rerender(view(false));
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(input).not.toBeDisabled();
    fireEvent.change(input, { target: { files: [new File(['synthetic'], 'new.png', { type: 'image/png' })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(upload).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toEqual([existing, 'uploaded-file']);
  });
});
