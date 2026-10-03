/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ComponentRegistry } from '@object-ui/core';
import { MePermissionsProvider, hasReportedCapabilities, usePermissions } from '@object-ui/permissions';
import { ActionProvider, RecordContextProvider } from '@object-ui/react';
import '@object-ui/components';

function PageHeader() {
  const Component = ComponentRegistry.get('page:header');
  if (!Component) throw new Error('page:header not registered');
  // eslint-disable-next-line react-hooks/static-components -- registry component is stable
  return <Component schema={{ type: 'page:header', showCopyId: true }} />;
}

function RecordHeaderFromPermissionResponse() {
  const permissions = usePermissions();
  const canCopyRecordId =
    hasReportedCapabilities(permissions, ['studio.access']) ||
    hasReportedCapabilities(permissions, ['setup.access']);
  return (
    <RecordContextProvider
      objectName="sales_record"
      recordId="record-1"
      data={{ id: 'record-1', name: 'Sales record' }}
      objectSchema={{ name: 'sales_record', label: 'Sales record' }}
      canCopyRecordId={canCopyRecordId}
    >
      <PageHeader />
    </RecordContextProvider>
  );
}

function renderHeader(systemPermissions?: string[], schemaReports = true) {
  return render(
    <MePermissionsProvider
      initialPermissions={{
        authenticated: true,
        userId: 'user-1',
        tenantId: 'org-1',
        roles: [],
        permissionSets: [],
        ...(schemaReports ? { systemPermissions } : {}),
        objects: {},
        fields: {},
      }}
    >
      <ActionProvider><RecordHeaderFromPermissionResponse /></ActionProvider>
    </MePermissionsProvider>,
  );
}

const copyButton = () => screen.queryByRole('button', { name: /copyRecordId|Copy record ID/ });

describe('native record PageHeader record-ID copy capability', () => {
  it('hides for an explicitly reported empty grant set', () => {
    renderHeader([]);
    expect(copyButton()).toBeNull();
  });

  it('hides when the backend did not report a capability set', () => {
    renderHeader(undefined, false);
    expect(copyButton()).toBeNull();
  });

  it.each(['studio.access', 'setup.access'])('shows only for reported %s', (capability) => {
    renderHeader([capability]);
    expect(copyButton()).toBeTruthy();
  });
});
