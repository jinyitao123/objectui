/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * React page source uses the host's navigation bridge for internal routes.
 */

import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AdapterCtx, HostNavigationProvider, SchemaRenderer } from '@object-ui/react';
import '../renderers';

const adapter = { find: async () => [] } as any;
const navigationPage = `
function Page() {
  const [count, setCount] = React.useState(0);
  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Count {count}</button>
      <button onClick={() => navigate('/apps/com.acme.crm/forge_customer')}>Open customer</button>
    </div>
  );
}`;
const navigationPageSchema = {
  type: 'home',
  kind: 'react',
  name: 'navigation_page',
  source: navigationPage,
};

function Host({ navigate }: { navigate: (to: string, options?: { replace?: boolean }) => void }) {
  return (
    <HostNavigationProvider value={{ navigate }}>
      <AdapterCtx.Provider value={adapter}>
        <SchemaRenderer schema={navigationPageSchema} />
      </AdapterCtx.Provider>
    </HostNavigationProvider>
  );
}

describe("kind:'react' page navigation", () => {
  it('uses the host SPA navigate for an in-app page target', async () => {
    const navigate = vi.fn();
    render(<Host navigate={navigate} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Open customer' }));

    expect(navigate).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith('/apps/com.acme.crm/forge_customer', undefined);
  });

  it('uses the latest host navigate without resetting the page state', async () => {
    const firstNavigate = vi.fn();
    const latestNavigate = vi.fn();
    const { rerender } = render(<Host navigate={firstNavigate} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Count 0' }));
    expect(await screen.findByRole('button', { name: 'Count 1' })).toBeTruthy();

    rerender(<Host navigate={latestNavigate} />);

    expect(screen.getByRole('button', { name: 'Count 1' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Open customer' }));
    await waitFor(() => expect(latestNavigate).toHaveBeenCalledOnce());
    expect(latestNavigate).toHaveBeenCalledWith('/apps/com.acme.crm/forge_customer', undefined);
    expect(firstNavigate).not.toHaveBeenCalled();
  });
});
