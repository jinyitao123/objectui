/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MePermissionsProvider } from '@object-ui/permissions';
import type { MePermissionsResponse } from '@object-ui/permissions';
import { DetailView } from '../DetailView';
import type { DetailViewSchema } from '@object-ui/types';

// `DetailView` probes the current record's write verdict during render. Keep
// the authenticated fetch boundary local to this test; never fall through to
// happy-dom's real localhost socket.
vi.stubGlobal('fetch', vi.fn(async () => ({
  ok: true,
  json: async () => ({ record: { visible: false } }),
}) as Response));

const INTERNAL_ID = 'record-internal-0001';
const schema: DetailViewSchema = {
  type: 'detail-view',
  title: 'Account',
  objectName: 'account',
  resourceId: INTERNAL_ID,
  data: { id: INTERNAL_ID, name: 'Acme' },
  fields: [{ name: 'name', label: 'Name' }],
};

function renderWithCapabilities(systemPermissions?: string[]) {
  const permissions: MePermissionsResponse = {
    authenticated: true,
    userId: 'viewer-1',
    tenantId: 'org-1',
    roles: ['sales_owner'],
    permissionSets: ['sales-owner'],
    objects: { account: { allowRead: true, allowEdit: false } },
    fields: {},
    ...(systemPermissions === undefined ? {} : { systemPermissions }),
  };
  return render(
    <MePermissionsProvider initialPermissions={permissions}>
      <DetailView schema={schema} />
    </MePermissionsProvider>,
  );
}

describe('DetailView record ID copy affordance', () => {
  it('hides the internal-ID tool for ordinary business users', () => {
    const { container } = renderWithCapabilities([]);

    expect(screen.queryByRole('button', { name: 'Copy record ID' })).toBeNull();
    expect(container.textContent).not.toContain(INTERNAL_ID);
  });

  it.each(['studio.access', 'setup.access'])('shows the tool for the %s capability', (capability) => {
    renderWithCapabilities([capability]);

    expect(screen.getByRole('button', { name: 'Copy record ID' })).toBeInTheDocument();
  });

  it('keeps the tool hidden when the backend did not report capabilities', () => {
    renderWithCapabilities(undefined);

    expect(screen.queryByRole('button', { name: 'Copy record ID' })).toBeNull();
  });
});
