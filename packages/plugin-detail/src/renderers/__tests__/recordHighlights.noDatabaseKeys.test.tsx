import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

const captured = vi.hoisted(() => ({ fields: [] as Array<{ name: string }> }));

vi.mock('@object-ui/react', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useRecordContext: () => ({ objectName: 'customer', data: { id: 'db-key', name: 'Customer' } }),
    useRegisterHighlightFields: vi.fn(),
  };
});

vi.mock('@object-ui/permissions', () => ({
  usePermissions: () => ({ hasCapabilities: () => true }),
  useFieldPermissions: () => ({ readableFields: (names: string[]) => names }),
}));

vi.mock('../../HeaderHighlight', () => ({
  HeaderHighlight: ({ fields }: { fields: Array<{ name: string }> }) => {
    captured.fields = fields;
    return <div data-testid="highlight-fields" />;
  },
}));

import { RecordHighlightsRenderer } from '../record-highlights';

describe('record:highlights keeps storage identity out of the visible strip', () => {
  it('filters id fields from explicitly authored highlights', () => {
    render(<RecordHighlightsRenderer schema={{ fields: ['id', '_id', 'name'] } as any} />);
    expect(captured.fields.map((field) => field.name)).toEqual(['name']);
  });
});
