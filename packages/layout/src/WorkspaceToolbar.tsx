import React from 'react';
import { cn } from '@object-ui/components';

export interface WorkspaceToolbarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'aria-label' | 'children' | 'role'> {
  /** Accessible name for the group of workspace controls. */
  'aria-label': string;
  /** Host-controlled search input or search controls. */
  search?: React.ReactNode;
  /** Host-controlled filters, status tabs, or scope controls. */
  filters?: React.ReactNode;
  /** Secondary actions such as refresh or export. */
  auxiliaryActions?: React.ReactNode;
  /** The primary action for the current workspace. */
  primaryAction?: React.ReactNode;
}

/**
 * A responsive layout for host-owned workspace search, filters, and actions.
 * It does not own control state, data queries, or action permissions.
 */
export function WorkspaceToolbar({
  search,
  filters,
  auxiliaryActions,
  primaryAction,
  className,
  'aria-label': ariaLabel,
  ...props
}: WorkspaceToolbarProps) {
  const hasActions = auxiliaryActions != null || primaryAction != null;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      data-slot="workspace-toolbar"
      className={cn(
        'flex w-full min-w-0 max-w-full flex-wrap items-center gap-[var(--ui-button-gap,0.5rem)]',
        className,
      )}
      {...props}
    >
      {search != null && (
        <div
          data-slot="workspace-toolbar-search"
          className="min-w-[min(100%,16rem)] max-w-full flex-[1_1_16rem]"
        >
          {search}
        </div>
      )}
      {filters != null && (
        <div
          data-slot="workspace-toolbar-filters"
          className="flex min-w-0 max-w-full flex-[1_1_auto] flex-wrap items-center gap-[var(--ui-button-gap,0.5rem)]"
        >
          {filters}
        </div>
      )}
      {hasActions && (
        <div
          data-slot="workspace-toolbar-actions"
          className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-[var(--ui-button-gap,0.5rem)]"
        >
          {auxiliaryActions != null && (
            <div
              data-slot="workspace-toolbar-auxiliary-actions"
              className="flex min-w-0 max-w-full flex-wrap items-center gap-[var(--ui-button-gap,0.5rem)]"
            >
              {auxiliaryActions}
            </div>
          )}
          {primaryAction != null && (
            <div data-slot="workspace-toolbar-primary-action" className="flex shrink-0 items-center">
              {primaryAction}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
