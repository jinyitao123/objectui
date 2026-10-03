/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * The persisted `template: 'react-source'` opts trusted React pages into
 * source-owned page chrome. Absence of that template preserves the shell.
 */

import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AdapterCtx, SchemaRenderer } from '@object-ui/react';
import '../renderers';

const adapter = { find: async () => [] } as any;

function renderPage(schema: Record<string, unknown>) {
  return render(
    <AdapterCtx.Provider value={adapter}>
      <SchemaRenderer schema={schema as any} />
    </AdapterCtx.Provider>,
  );
}

describe("PageRenderer's `react-source` template", () => {
  it('keeps the shell title and description for ordinary React pages', async () => {
    const { container } = renderPage({
      type: 'app',
      pageType: 'app',
      name: 'react_shell_default',
      label: 'Project Plan',
      description: 'The generated page description.',
      kind: 'react',
      source: 'function Page() { return <main>Plan content</main>; }',
    });

    await screen.findByText('Plan content');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Project Plan');
    expect(screen.getByText('The generated page description.')).toBeTruthy();
    expect(container.querySelector('[data-page-type="app"]')?.className).toContain('p-3');
  });

  it('renders only the source-owned heading and subtitle, with no shell inset', async () => {
    const { container } = renderPage({
      type: 'app',
      pageType: 'app',
      name: 'react_source_owned',
      label: 'Project Plan',
      description: 'The generated page description.',
      template: 'react-source',
      kind: 'react',
      source: `function Page() {
        return <main><h1>Project Plan</h1><p>Source-owned subtitle.</p><section>Plan content</section></main>;
      }`,
    });

    await waitFor(() => expect(screen.getByText('Plan content')).toBeTruthy());
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Project Plan');
    expect(screen.getByText('Source-owned subtitle.')).toBeTruthy();
    expect(screen.queryByText('The generated page description.')).toBeNull();

    const pageRoot = container.querySelector('[data-page-type="app"]');
    expect(pageRoot?.className).not.toContain('p-3');
    expect(pageRoot?.firstElementChild?.className).toBe('w-full');
  });

  it('does not apply the React source template to schema-authored pages', () => {
    renderPage({
      type: 'app',
      pageType: 'app',
      name: 'non_react_template_control',
      label: 'Schema Page',
      description: 'Schema page description.',
      template: 'react-source',
      children: { type: 'text', content: 'Schema body' },
    });

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Schema Page');
    expect(screen.getByText('Schema page description.')).toBeTruthy();
    expect(screen.getByText('Schema body')).toBeTruthy();
  });
});
