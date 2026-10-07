/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * The shared navigation handler used by console ActionProvider surfaces.
 */

import { useCallback } from 'react';
import type { NavigationHandler } from '@object-ui/core';
import { normalizeConsoleRouterPath } from '../console/organizations/resolveHomeUrl.js';

/**
 * Keep Action navigation on the Console router seam. Router-relative paths
 * that already include the deployment mount are normalized before the router
 * applies its basename; external and new-tab requests retain their browser
 * navigation path unchanged.
 */
export function useConsoleActionNavigation(
  routerNavigate: (url: string) => void,
): NavigationHandler {
  return useCallback<NavigationHandler>((url, options) => {
    if (options?.external || options?.newTab) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    routerNavigate(normalizeConsoleRouterPath(url));
  }, [routerNavigate]);
}
