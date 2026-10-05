import React from 'react';
import { cn, LazyIcon } from '@object-ui/components';

export interface ListSummaryItem {
  /** Stable key for this summary item. */
  id: string;
  /** Short label shown above the value. */
  label: string;
  /** Optional decorative icon; labels remain the accessible name. */
  icon?: string | React.ReactNode;
  /** Value already resolved by the host; this component never queries data. */
  value: React.ReactNode;
}

export interface ListSummaryProps extends React.HTMLAttributes<HTMLDListElement> {
  items: readonly ListSummaryItem[];
  itemClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
}

/**
 * A compact, host-driven summary for list pages. It renders values supplied by
 * the host and has no data-source or business-query dependency.
 */
export function ListSummary({
  items,
  className,
  itemClassName,
  labelClassName,
  valueClassName,
  'aria-label': ariaLabel = 'List summary',
  ...props
}: ListSummaryProps) {
  if (items.length === 0) return null;

  return (
    <div data-slot="list-summary-container" className="@container min-w-0 max-w-full">
      <dl
        data-slot="list-summary"
        className={cn('grid min-w-0 max-w-full grid-cols-1 gap-[var(--ui-list-summary-gap,0.75rem)] @sm:grid-cols-2 @2xl:grid-cols-4', className)}
        aria-label={ariaLabel}
        {...props}
      >
        {items.map((item) => (
          <div
            key={item.id}
            data-slot="list-summary-item"
            className={cn(
              'flex min-w-0 min-h-[var(--ui-list-summary-card-height,61.5px)] flex-col justify-center gap-[var(--ui-list-summary-item-gap,0.125rem)] overflow-hidden rounded-[var(--ui-list-summary-card-radius,0.375rem)] border border-border bg-card px-[var(--ui-list-summary-padding-inline,1rem)] py-[var(--ui-list-summary-padding-block,0.875rem)]',
              itemClassName,
            )}
          >
            <dt
              className={cn(
                'min-w-0 break-words text-[length:var(--ui-list-summary-label-font-size,0.75rem)] leading-[var(--ui-list-summary-label-line-height,1rem)] font-[weight:var(--ui-list-summary-label-font-weight,400)] text-muted-foreground',
                labelClassName,
              )}
            >
              {item.icon != null ? (
                <span data-slot="list-summary-label-row" className="flex min-w-0 items-center gap-[var(--ui-list-summary-icon-gap,0.5rem)]">
                  <span data-slot="list-summary-label-icon" aria-hidden="true" className="inline-flex size-[var(--ui-list-summary-icon-size,16px)] shrink-0 items-center justify-center [&>svg]:size-full">
                    {typeof item.icon === 'string' ? <LazyIcon name={item.icon} /> : item.icon}
                  </span>
                  <span className="min-w-0 break-words">{item.label}</span>
                </span>
              ) : item.label}
            </dt>
            <dd
              className={cn(
                'min-w-0 break-words text-[length:var(--ui-list-summary-value-font-size,1.25rem)] leading-[var(--ui-list-summary-value-line-height,1.25rem)] font-[weight:var(--ui-list-summary-value-font-weight,600)] text-foreground',
                valueClassName,
              )}
            >
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
