/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import * as React from 'react';
import { cn } from '../lib/utils';

export type ResourceScheduleId = string | number;

export interface ResourceScheduleResource {
  id: ResourceScheduleId;
  label: string;
  description?: string;
}

export interface ResourceScheduleDateColumn {
  key: string;
  label: string;
  description?: string;
  isToday?: boolean;
}

export interface ResourceScheduleEvent {
  id: ResourceScheduleId;
  resourceId: ResourceScheduleId;
  dateKey: string;
  title: string;
  subtitle?: string;
}

export interface ResourceScheduleGridProps {
  resources: readonly ResourceScheduleResource[];
  dateColumns: readonly ResourceScheduleDateColumn[];
  events: readonly ResourceScheduleEvent[];
  resourceHeaderLabel?: string;
  emptyLabel?: string;
  renderEvent?: (event: ResourceScheduleEvent) => React.ReactNode;
  renderResource?: (resource: ResourceScheduleResource) => React.ReactNode;
  onEventClick?: (event: ResourceScheduleEvent) => void;
  className?: string;
  'aria-label'?: string;
}

function typedId(id: ResourceScheduleId): string {
  return `${typeof id}:${String(id)}`;
}

function cellKey(resourceId: ResourceScheduleId, dateKey: string): string {
  return JSON.stringify([typedId(resourceId), dateKey]);
}

/**
 * A host-driven resource-by-date matrix. It owns layout only: the host supplies
 * the resource rows, date columns, matching events, and any click behavior.
 */
export function ResourceScheduleGrid({
  resources,
  dateColumns,
  events,
  resourceHeaderLabel = 'Resource',
  emptyLabel,
  renderEvent,
  renderResource,
  onEventClick,
  className,
  'aria-label': ariaLabel = 'Resource schedule',
}: ResourceScheduleGridProps) {
  const resourceIds = new Set(resources.map((resource) => resource.id));
  const dateKeys = new Set(dateColumns.map((date) => date.key));
  const eventsByCell = new Map<string, ResourceScheduleEvent[]>();

  for (const event of events) {
    // Unmatched events belong to host-owned surfaces such as an unplanned list.
    if (!event.dateKey || !resourceIds.has(event.resourceId) || !dateKeys.has(event.dateKey)) continue;
    const key = cellKey(event.resourceId, event.dateKey);
    const cellEvents = eventsByCell.get(key);
    if (cellEvents) cellEvents.push(event);
    else eventsByCell.set(key, [event]);
  }

  const showEmptyState = resources.length === 0 || dateColumns.length === 0;

  return (
    <div
      data-slot="resource-schedule-grid"
      className={cn('min-w-0 max-w-full', className)}
    >
      <div
        data-slot="resource-schedule-scroll"
        className="min-w-0 max-w-full overflow-x-auto overscroll-x-contain"
      >
        <table
          aria-label={ariaLabel}
          className="w-max min-w-full border-separate border-spacing-0 text-left"
        >
          <thead>
            <tr>
              <th
                scope="col"
                className={cn(
                  'sticky left-0 z-30 w-[var(--ui-resource-schedule-resource-width,132px)] min-w-[var(--ui-resource-schedule-resource-width,132px)] border-b border-r border-border bg-background px-[var(--ui-resource-schedule-cell-padding,5.25px)] py-0 align-middle text-left text-[11px] leading-[16.5px] font-medium text-muted-foreground',
                  'h-[var(--ui-resource-schedule-header-height,47.25px)]',
                )}
              >
                <div className="flex h-full min-w-0 items-center break-words">
                  {resourceHeaderLabel}
                </div>
              </th>
              {dateColumns.map((date) => (
                <th
                  key={date.key}
                  scope="col"
                  aria-current={date.isToday ? 'date' : undefined}
                  className={cn(
                    'w-[var(--ui-resource-schedule-date-min-width,110px)] min-w-[var(--ui-resource-schedule-date-min-width,110px)] border-b border-r border-border px-[var(--ui-resource-schedule-cell-padding,5.25px)] py-0 align-middle text-left text-[11px] leading-[16.5px] font-medium text-muted-foreground',
                    'h-[var(--ui-resource-schedule-header-height,47.25px)]',
                    date.isToday && 'bg-muted/40',
                  )}
                  title={date.description}
                >
                  <div className="flex h-full min-w-0 flex-col justify-center break-words">
                    <span>{date.label}</span>
                    {date.description && (
                      <span className="text-[10px] leading-3 text-muted-foreground">
                        {date.description}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!showEmptyState && resources.map((resource) => (
              <tr
                key={typedId(resource.id)}
                className="h-[var(--ui-resource-schedule-row-min-height,86px)]"
              >
                <th
                  scope="row"
                  aria-label={resource.label}
                  className="sticky left-0 z-20 w-[var(--ui-resource-schedule-resource-width,132px)] min-w-[var(--ui-resource-schedule-resource-width,132px)] border-b border-r border-border bg-background p-[var(--ui-resource-schedule-cell-padding,5.25px)] align-middle text-left"
                >
                  <div className="flex min-w-0 items-center break-words">
                    {renderResource ? renderResource(resource) : (
                      <span className="min-w-0">
                        <span className="block text-[11px] leading-[16.5px] font-medium text-foreground">
                          {resource.label}
                        </span>
                        {resource.description && (
                          <span className="mt-0.5 block break-words text-[10px] leading-3 text-muted-foreground">
                            {resource.description}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </th>
                {dateColumns.map((date) => {
                  const cellEvents = eventsByCell.get(cellKey(resource.id, date.key)) ?? [];
                  return (
                    <td
                      key={date.key}
                      data-slot="resource-schedule-cell"
                      className={cn(
                        'w-[var(--ui-resource-schedule-date-min-width,110px)] min-w-[var(--ui-resource-schedule-date-min-width,110px)] border-b border-r border-border p-[var(--ui-resource-schedule-cell-padding,5.25px)] align-top',
                        date.isToday && 'bg-muted/20',
                      )}
                    >
                      <div className="flex min-w-0 flex-col gap-1">
                        {cellEvents.map((event) => {
                          const content = renderEvent ? renderEvent(event) : (
                            <>
                              <span className="block break-words text-[11px] leading-[16.5px] font-medium">
                                {event.title}
                              </span>
                              {event.subtitle && (
                                <span className="mt-0.5 block break-words text-[10px] leading-3 text-muted-foreground">
                                  {event.subtitle}
                                </span>
                              )}
                            </>
                          );

                          return onEventClick ? (
                            <button
                              key={typedId(event.id)}
                              type="button"
                              aria-label={`${event.title}, ${resource.label}, ${date.label}`}
                              data-slot="resource-schedule-event"
                              onClick={() => onEventClick(event)}
                              className="block w-full min-w-0 rounded border border-border bg-card px-2 py-1 text-left text-card-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {content}
                            </button>
                          ) : (
                            <div
                              key={typedId(event.id)}
                              data-slot="resource-schedule-event"
                              className="min-w-0 rounded border border-border bg-card px-2 py-1 text-card-foreground"
                            >
                              {content}
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {showEmptyState && (
          <div
            data-slot="resource-schedule-empty-state"
            className="sticky left-0 z-10 flex min-h-[var(--ui-resource-schedule-row-min-height,86px)] w-full min-w-0 items-center justify-center border-b border-border bg-background px-[var(--ui-resource-schedule-cell-padding,5.25px)] py-[var(--ui-resource-schedule-cell-padding,5.25px)] text-sm text-muted-foreground"
          >
            {emptyLabel}
          </div>
        )}
      </div>
    </div>
  );
}
