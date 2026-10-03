/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 */
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { hasReportedCapabilities } from '../hasReportedCapabilities.js';
import { MePermissionsProvider } from '../MePermissionsProvider.js';
import { usePermissions } from '../usePermissions.js';

function CapabilityProbe() {
  const permissions = usePermissions();
  return (
    <>
      <span data-testid="studio">{String(hasReportedCapabilities(permissions, ['studio.access']))}</span>
      <span data-testid="setup">{String(hasReportedCapabilities(permissions, ['setup.access']))}</span>
    </>
  );
}

function renderPermissions(systemPermissions?: string[]) {
  return render(
    <MePermissionsProvider
      initialPermissions={{
        authenticated: true,
        userId: 'user-1',
        tenantId: 'org-1',
        roles: [],
        permissionSets: [],
        ...(systemPermissions === undefined ? {} : { systemPermissions }),
        objects: {},
        fields: {},
      }}
    >
      <CapabilityProbe />
    </MePermissionsProvider>,
  );
}

afterEach(cleanup);

describe('reported capability authorization', () => {
  it('fails closed when a backend never reported capabilities', () => {
    renderPermissions(undefined);
    expect(screen.getByTestId('studio').textContent).toBe('false');
    expect(screen.getByTestId('setup').textContent).toBe('false');
  });

  it('fails closed for a genuinely empty capability set', () => {
    renderPermissions([]);
    expect(screen.getByTestId('studio').textContent).toBe('false');
    expect(screen.getByTestId('setup').textContent).toBe('false');
  });

  it('allows the reported studio capability only', () => {
    renderPermissions(['studio.access']);
    expect(screen.getByTestId('studio').textContent).toBe('true');
    expect(screen.getByTestId('setup').textContent).toBe('false');
  });

  it('allows the reported setup capability only', () => {
    renderPermissions(['setup.access']);
    expect(screen.getByTestId('studio').textContent).toBe('false');
    expect(screen.getByTestId('setup').textContent).toBe('true');
  });
});
