/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 * Licensed under the MIT license in the repository root.
 */
import * as React from 'react';
import { cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from './profile-card';

export interface DocumentWorkspaceProps {
  /** The primary document content. */
  main: React.ReactNode;
  /** Supporting information or actions shown beside the document. */
  sidebar: React.ReactNode;
  /** Accessible name for the complementary sidebar landmark. */
  sidebarLabel?: string;
  /** Classes for the two-column layout. */
  className?: string;
  /** Classes for the primary content column. */
  mainClassName?: string;
  /** Classes for the supporting sidebar column. */
  sidebarClassName?: string;
}

/**
 * A container-responsive primary document and supporting sidebar layout.
 * Narrow content containers stack; wider containers use a flexible main column
 * and a sidebar capped by its minimum width. It deliberately has no resizer.
 */
export function DocumentWorkspace({
  main,
  sidebar,
  sidebarLabel,
  className,
  mainClassName,
  sidebarClassName,
}: DocumentWorkspaceProps): React.ReactElement {
  return (
    <div className="@container min-w-0" data-slot="document-workspace-container">
      <div
        className={cn(
          'grid min-w-0 grid-cols-1 items-start gap-[var(--ui-document-workspace-gap,18px)] @4xl:grid-cols-[minmax(0,2.3fr)_minmax(15rem,1fr)]',
          className,
        )}
        data-slot="document-workspace"
      >
        <div className={cn('min-w-0', mainClassName)} data-slot="document-workspace-main">
          {main}
        </div>
        <aside
          aria-label={sidebarLabel}
          className={cn('min-w-0', sidebarClassName)}
          data-slot="document-workspace-sidebar"
        >
          {sidebar}
        </aside>
      </div>
    </div>
  );
}

export interface DocumentSectionProps {
  /** Visible section title and accessible heading text. */
  title: string;
  /** Optional visible step number preceding the title. */
  stepNumber?: number | string;
  /** Stable heading id for in-page links. Generated when omitted. */
  headingId?: string;
  /** Optional controls aligned at the end of the section header. */
  actions?: React.ReactNode;
  /** Section body. */
  children?: React.ReactNode;
  /** Classes for the section card. */
  className?: string;
}

/** A titled document section using the public host-aware Card geometry. */
export function DocumentSection({
  title,
  stepNumber,
  headingId,
  actions,
  children,
  className,
}: DocumentSectionProps): React.ReactElement {
  const generatedHeadingId = React.useId();
  const resolvedHeadingId = headingId ?? generatedHeadingId;

  return (
    <section
      aria-labelledby={resolvedHeadingId}
      className={cn('min-w-0', className)}
      data-slot="document-section"
    >
      <Card className="overflow-hidden" data-slot="document-section-card">
        <CardHeader
          className={cn(
            'flex-row items-center justify-between gap-3 space-y-0',
            'pt-[var(--ui-document-section-header-padding-top,var(--ui-card-padding,1.5rem))]',
            'pb-[var(--ui-document-section-header-padding-bottom,var(--ui-card-header-padding-bottom,1.5rem))]',
            'after:inset-x-[var(--ui-document-section-divider-inset,0px)]',
          )}
          data-slot="document-section-header"
        >
          <CardTitle
            className={cn(
              'flex min-w-0 flex-1 items-center gap-[var(--ui-document-section-heading-gap,0.5rem)]',
              'text-[length:var(--ui-document-section-title-font-size,0.875rem)]',
              'leading-[var(--ui-document-section-title-line-height,1.25rem)]',
              'font-[number:var(--ui-document-section-title-font-weight,700)]',
            )}
          >
            {stepNumber != null && (
              <span
                aria-hidden="true"
                className={cn(
                  'inline-flex shrink-0 items-center justify-center rounded-full bg-primary leading-none text-primary-foreground',
                  'size-[var(--ui-document-section-step-size,1.25rem)]',
                  'text-[length:var(--ui-document-section-step-font-size,0.75rem)]',
                  'font-[number:var(--ui-document-section-step-font-weight,700)]',
                )}
                data-slot="document-section-step"
              >
                {stepNumber}
              </span>
            )}
            <h2
              className="m-0 min-w-0"
              data-slot="document-section-title"
              id={resolvedHeadingId}
            >
              {title}
            </h2>
          </CardTitle>
          {actions != null && (
            <div
              className="flex shrink-0 items-center gap-[var(--ui-document-section-action-gap,0.5rem)]"
              data-slot="document-section-actions"
            >
              {actions}
            </div>
          )}
        </CardHeader>
        <CardContent
          className="pt-[var(--ui-document-section-body-padding-top,var(--ui-card-content-padding-top,1.25rem))]"
          data-slot="document-section-content"
        >
          {children}
        </CardContent>
      </Card>
    </section>
  );
}
