import '@testing-library/jest-dom/vitest';
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { I18nProvider } from '@object-ui/i18n';
import type { DataSource } from '@object-ui/types';
import { ObjectForm } from './ObjectForm';

afterEach(cleanup);

const renderChineseForm = (dataSource: Record<string, unknown>) => render(
  <I18nProvider config={{ defaultLanguage: 'zh', detectBrowserLanguage: false }} persistLanguage={false}>
    <ObjectForm
      schema={{ type: 'object-form', objectName: 'example', mode: 'create' }}
      dataSource={dataSource as unknown as DataSource}
    />
  </I18nProvider>,
);

describe('ObjectForm status copy', () => {
  it('localizes the loading state on the normal ObjectForm path', () => {
    const pending = new Promise<never>(() => {});
    renderChineseForm({ getObjectSchema: () => pending });

    expect(screen.getByText('正在加载表单…')).toBeInTheDocument();
  });

  it('localizes the schema-load error state', async () => {
    renderChineseForm({ getObjectSchema: async () => { throw new Error('schema read failed'); } });

    expect(await screen.findByText('表单不可用')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('schema read failed')).toBeInTheDocument());
  });
});
