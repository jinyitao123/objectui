import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailSection } from '../DetailSection';

describe('DetailSection hides the database key field', () => {
  it('omits id and _id fields from authored details while keeping business fields', () => {
    render(
      <DetailSection
        section={{
          fields: [
            { name: 'id', label: 'Internal ID', type: 'text' },
            { name: '_id', label: 'Storage ID', type: 'text' },
            { name: 'customer_code', label: 'Customer Code', type: 'text' },
          ] as any,
        }}
        data={{ id: 'db-key-1', _id: 'db-key-2', customer_code: 'CUS-2048' }}
        objectSchema={{
          fields: {
            id: { type: 'text' },
            _id: { type: 'text' },
            customer_code: { type: 'text' },
          },
        }}
      />,
    );

    expect(screen.getByText('CUS-2048')).toBeTruthy();
    expect(document.body.textContent).not.toContain('db-key-1');
    expect(document.body.textContent).not.toContain('db-key-2');
    expect(document.body.textContent).not.toContain('Internal ID');
  });
});
