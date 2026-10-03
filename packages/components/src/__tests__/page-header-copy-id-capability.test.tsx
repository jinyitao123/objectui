/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComponentRegistry } from '@object-ui/core';
import { ActionProvider, RecordContextProvider } from '@object-ui/react';
import '../renderers/layout/containers';

function PageHeader({ schema }: { schema: any }) {
  const Component = ComponentRegistry.get('page:header');
  if (!Component) throw new Error('page:header not registered');
  // eslint-disable-next-line react-hooks/static-components -- registry component is stable
  return <Component schema={schema} />;
}

function renderHeader(canCopyRecordId: boolean, schema: any = { type: 'page:header' }) {
  return render(
    <ActionProvider>
      <RecordContextProvider
        objectName="sales_record"
        recordId="record-1"
        data={{ id: 'record-1', name: 'Sales record' }}
        objectSchema={{ name: 'sales_record', label: 'Sales record' }}
        canCopyRecordId={canCopyRecordId}
      >
        <PageHeader schema={schema} />
      </RecordContextProvider>
    </ActionProvider>,
  );
}

describe('record PageHeader ID copy authorization', () => {
  it('does not let a page schema show a record ID without host authorization', () => {
    renderHeader(false, { type: 'page:header', showCopyId: true });
    expect(screen.queryByRole('button', { name: 'Copy record ID' })).toBeNull();
  });

  it('shows the copy action when the record host authorizes it', () => {
    renderHeader(true);
    expect(screen.getByRole('button', { name: /copyRecordId|Copy record ID/ })).toBeTruthy();
  });

  it('respects the page schema opt-out even when the host authorizes it', () => {
    renderHeader(true, { type: 'page:header', showCopyId: false });
    expect(screen.queryByRole('button', { name: 'Copy record ID' })).toBeNull();
  });
});
