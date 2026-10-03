import React from 'react';
import { Tabs, TabsList, TabsTrigger, cn } from '@object-ui/components';

export interface StatusTabItem {
  /** Stable controlled value sent to `onValueChange`. */
  value: string;
  label: string;
  /** Optional count supplied by the host using the same filter scope. */
  count?: string | number;
  disabled?: boolean;
}

export interface StatusTabsProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof Tabs>,
    'aria-label' | 'children' | 'defaultValue' | 'orientation' | 'onValueChange' | 'value'
  > {
  items: readonly StatusTabItem[];
  value: string;
  /** Accessible name for the tab list. */
  'aria-label': string;
  /** ID of the host's `role="tabpanel"` content area updated by these filters. */
  panelId: string;
  onValueChange: (value: string) => void;
  listClassName?: string;
  tabClassName?: string;
  countClassName?: string;
}

/**
 * A controlled status filter strip. The host owns the selected status, counts,
 * and resulting data query; this component only presents the tabs.
 */
export function StatusTabs({
  items,
  value,
  panelId,
  onValueChange,
  className,
  listClassName,
  tabClassName,
  countClassName,
  'aria-label': ariaLabel,
  ...props
}: StatusTabsProps) {
  return (
    <Tabs
      data-slot="status-tabs"
      value={value}
      onValueChange={onValueChange}
      orientation="horizontal"
      className={cn('min-w-0 max-w-full', className)}
      {...props}
    >
      <TabsList
        aria-label={ariaLabel}
        className={cn(
          'flex h-auto min-w-0 max-w-full flex-wrap justify-start gap-x-1 gap-y-1 rounded-none bg-transparent p-0 text-muted-foreground',
          listClassName,
        )}
      >
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            aria-controls={panelId}
            disabled={item.disabled}
            className={cn(
              'group min-w-0 max-w-full h-[var(--ui-status-tabs-height,2rem)] whitespace-normal break-words rounded-[var(--ui-status-tabs-radius,0.25rem)] px-[var(--ui-status-tabs-padding-inline,0.75rem)] py-[var(--ui-status-tabs-padding-block,0.25rem)] text-left text-[length:var(--ui-status-tabs-font-size,0.75rem)] leading-[var(--ui-status-tabs-line-height,1.25)] font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none',
              tabClassName,
            )}
          >
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  'ml-1.5 inline-flex min-w-5 shrink-0 justify-center rounded-full bg-muted px-1 text-[0.625rem] leading-4 text-muted-foreground group-data-[state=active]:text-foreground',
                  countClassName,
                )}
              >
                {item.count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
