/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@object-ui/i18n';
import { DateField } from '../DateField';
import type { FieldWidgetComponentProps } from '../types';

const boundedField = {
  name: 'due_on',
  label: 'Due on',
  type: 'date',
  min_date: '2026-06-17',
  max_date: '2026-06-18',
} as FieldWidgetComponentProps<string>['field'];

const baseProps: FieldWidgetComponentProps<string> = {
  field: boundedField,
  value: '',
  onChange: vi.fn(),
  readonly: false,
};

function useCompactProfile() {
  document.documentElement.dataset.uiProfile = 'compact-enterprise';
}

function withLocale(node: React.ReactNode, locale = 'en') {
  return (
    <I18nProvider
      config={{ defaultLanguage: locale, detectBrowserLanguage: false }}
      persistLanguage={false}
    >
      {node}
    </I18nProvider>
  );
}

function localDateValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.uiProfile;
});

describe('DateField compact-enterprise calendar picker', () => {
  it('keeps the native date input outside the compact profile', () => {
    const onChange = vi.fn();
    const { container } = render(withLocale(
      <DateField
        {...baseProps}
        value="2026-06-17T00:00:00.000Z"
        onChange={onChange}
        id="due-on"
        name="due_on"
        aria-describedby="due-on-help"
        aria-required="true"
        error="Invalid date"
      />,
    ));
    const input = container.querySelector('input[type="date"]') as HTMLInputElement;

    expect(input).toBeInTheDocument();
    expect(input.value).toBe('2026-06-17');
    expect(input.min).toBe('2026-06-17');
    expect(input.max).toBe('2026-06-18');
    expect(input.id).toBe('due-on');
    expect(input.name).toBe('due_on');
    expect(input).toHaveAttribute('aria-describedby', 'due-on-help');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).toHaveAttribute('aria-invalid', 'true');

    fireEvent.change(input, { target: { value: '2026-06-18' } });
    expect(onChange).toHaveBeenCalledWith('2026-06-18');
  });

  it('renders editable full-year text, a right-side calendar trigger, six weeks and bounded choices', async () => {
    useCompactProfile();
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(withLocale(
      <DateField
        {...baseProps}
        value="2026-06-17T00:00:00.000Z"
        onChange={onChange}
        id="due-on"
        name="due_on"
        aria-describedby="due-on-help"
        aria-required="true"
        data-testid="due-on-input"
      />,
    ));
    const input = screen.getByTestId('due-on-input') as HTMLInputElement;
    const calendarButton = screen.getByRole('button', { name: 'Calendar' });
    const displayDate = new Intl.DateTimeFormat('en', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(2026, 5, 17));

    expect(input).toHaveAttribute('type', 'text');
    expect(input.readOnly).toBe(false);
    expect(input.value).toBe(displayDate);
    expect(input).toHaveAttribute('id', 'due-on');
    expect(input).toHaveAttribute('name', 'due_on');
    expect(input).toHaveAttribute('aria-describedby', 'due-on-help');
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(calendarButton.className).toContain('right-0');

    input.focus();
    await user.keyboard('{ArrowDown}');
    const grid = await screen.findByRole('grid');
    const content = screen.getByRole('dialog');
    expect(content.className).toContain('w-[280px]');
    expect(grid.querySelectorAll('tbody tr')).toHaveLength(6);
    expect(content.querySelectorAll('select')).toHaveLength(0);
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeEnabled();

    const caption = new Intl.DateTimeFormat('en', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(2026, 5, 1));
    const captionButton = screen.getByRole('button', { name: caption });
    await user.click(captionButton);
    const monthPicker = screen.getByRole('group', { name: 'Month' });
    expect(within(monthPicker).getByText('2026')).toBeInTheDocument();
    expect(within(monthPicker).getByRole('button', { name: 'June' })).toBeEnabled();
    expect(within(monthPicker).getByRole('button', { name: 'July' })).toBeDisabled();
    expect(content.textContent).not.toContain('timeline.viewMode.year');
    await user.click(captionButton);

    const beforeMinimum = new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(
      new Date(2026, 5, 16),
    );
    const atMaximum = new Intl.DateTimeFormat('en', { dateStyle: 'full' }).format(
      new Date(2026, 5, 18),
    );
    expect(screen.getByRole('button', { name: beforeMinimum })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: atMaximum }));
    expect(onChange).toHaveBeenCalledWith('2026-06-18');
    await waitFor(() => expect(input).toHaveFocus());
    expect(input.value).toBe(
      new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric' }).format(
        new Date(2026, 5, 18),
      ),
    );
    expect(screen.queryByRole('grid')).not.toBeInTheDocument();
  });

  it('formats the editable date with the active display locale and year', () => {
    useCompactProfile();
    const locale = 'zh';
    const onChange = vi.fn();
    const expected = new Intl.DateTimeFormat(locale, {
      calendar: 'gregory',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(2026, 8, 29));
    const alternateDate = new Intl.DateTimeFormat(locale, {
      calendar: 'gregory',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(2026, 8, 30));

    render(withLocale(
      <DateField
        {...baseProps}
        field={{ type: 'date', name: 'date', label: 'Date' }}
        value="2026-09-29"
        onChange={onChange}
      />,
      locale,
    ));

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input).toHaveValue(expected);
    input.focus();
    fireEvent.change(input, { target: { value: alternateDate } });
    expect(onChange).toHaveBeenCalledWith('2026-09-30');
    expect(input.checkValidity()).toBe(true);
  });

  it('marks malformed or out-of-range text invalid instead of keeping the previous date', () => {
    useCompactProfile();
    const onChange = vi.fn();
    render(withLocale(
      <DateField
        {...baseProps}
        value="2026-06-17"
        onChange={onChange}
        data-testid="date-input"
      />,
    ));
    const input = screen.getByTestId('date-input') as HTMLInputElement;

    fireEvent.change(input, { target: { value: 'not a date' } });
    expect(onChange).toHaveBeenLastCalledWith('not a date');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.checkValidity()).toBe(false);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.change(input, { target: { value: '2026-06-16' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-06-16');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.checkValidity()).toBe(false);

    fireEvent.change(input, { target: { value: '2026-06-18' } });
    expect(onChange).toHaveBeenLastCalledWith('2026-06-18');
    expect(input.checkValidity()).toBe(true);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('supports Today and Clear actions and returns focus to the editable input', async () => {
    useCompactProfile();
    const user = userEvent.setup();
    const onChange = vi.fn();
    const freeDateField = { type: 'date', name: 'created_on', label: 'Created on' } as FieldWidgetComponentProps<string>['field'];
    render(withLocale(
      <DateField
        {...baseProps}
        field={freeDateField}
        value="2026-06-17"
        onChange={onChange}
        data-testid="created-on-input"
      />,
    ));
    const input = screen.getByTestId('created-on-input') as HTMLInputElement;
    const calendarButton = screen.getByRole('button', { name: 'Calendar' });

    await user.click(calendarButton);
    await user.click(screen.getByRole('button', { name: 'Today' }));
    expect(onChange).toHaveBeenLastCalledWith(localDateValue(new Date()));
    await waitFor(() => expect(input).toHaveFocus());

    await user.click(calendarButton);
    await user.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onChange).toHaveBeenLastCalledWith('');
    await waitFor(() => expect(input).toHaveFocus());
  });

  it('keeps disabled and readonly states non-interactive', () => {
    useCompactProfile();
    const { container, rerender } = render(withLocale(<DateField {...baseProps} disabled />));
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Calendar' })).toBeDisabled();

    rerender(withLocale(<DateField {...baseProps} readonly value="2026-06-17" />));
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('span')?.textContent).toBeTruthy();
  });
});
