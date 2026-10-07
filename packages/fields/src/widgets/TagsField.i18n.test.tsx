/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * Tag chips need a localized removal name for assistive technology too.
 */

import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@object-ui/i18n';
import { TagsField } from './TagsField';

const field = { name: 'tags', label: '标签', type: 'tags' } as any;

describe('TagsField removal accessible name', () => {
  it('translates the tag-specific remove label in Chinese', () => {
    render(
      <I18nProvider config={{ defaultLanguage: 'zh', detectBrowserLanguage: false }} persistLanguage={false}>
        <TagsField value={['接口验收,工控']} onChange={vi.fn()} field={field} />
      </I18nProvider>,
    );

    expect(screen.getByRole('button', { name: '移除 接口验收,工控' })).toBeInTheDocument();
  });

  it('keeps the English fallback when no locale provider is mounted', () => {
    render(<TagsField value={['review']} onChange={vi.fn()} field={field} />);

    expect(screen.getByRole('button', { name: 'Remove review' })).toBeInTheDocument();
  });
});
