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
  /** Optional supporting text shown independently below the value. */
  description?: React.ReactNode;
  /** Disable this item when the host enables interactive selection. */
  disabled?: boolean;
}

export interface ListSummaryProps extends React.HTMLAttributes<HTMLElement> {
  items: readonly ListSummaryItem[];
  /** Enable native-button selection and report the selected id to the host. */
  onItemSelect?: (id: string) => void;
  /** Controlled selected item id. The component never owns selection state. */
  selectedItemId?: string;
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
  onItemSelect,
  selectedItemId,
  className,
  itemClassName,
  labelClassName,
  valueClassName,
  'aria-label': ariaLabel = 'List summary',
  ...props
}: ListSummaryProps) {
  if (items.length === 0) return null;

  const gridClassName = cn(
    'grid min-w-0 max-w-full grid-cols-1 gap-[var(--ui-list-summary-gap,0.75rem)] @sm:grid-cols-2 @2xl:grid-cols-[repeat(var(--ui-list-summary-columns,4),minmax(0,1fr))]',
    className,
  );
  const labelClassNameBase = cn(
    'min-w-0 break-words text-[length:var(--ui-list-summary-label-font-size,0.75rem)] leading-[var(--ui-list-summary-label-line-height,1rem)] font-[weight:var(--ui-list-summary-label-font-weight,400)] text-muted-foreground',
    labelClassName,
  );
  const valueClassNameBase = cn(
    'min-w-0 break-words text-[length:var(--ui-list-summary-value-font-size,1.25rem)] leading-[var(--ui-list-summary-value-line-height,1.25rem)] font-[weight:var(--ui-list-summary-value-font-weight,600)] text-foreground',
    valueClassName,
  );
  const descriptionClassName =
    'mt-[var(--ui-list-summary-description-margin-top,0px)] min-w-0 break-words text-[length:var(--ui-list-summary-description-font-size,12px)] leading-[var(--ui-list-summary-description-line-height,16px)] font-[weight:var(--ui-list-summary-description-font-weight,400)] text-muted-foreground';
  const itemClassNameBase =
    'flex min-w-0 min-h-[var(--ui-list-summary-card-height,61.5px)] flex-col justify-center gap-[var(--ui-list-summary-item-gap,0.125rem)] overflow-hidden rounded-[var(--ui-list-summary-card-radius,0.375rem)] border border-border bg-card px-[var(--ui-list-summary-padding-inline,1rem)] py-[var(--ui-list-summary-padding-block,0.875rem)]';

  if (onItemSelect) {
    return (
      <div data-slot="list-summary-container" className="@container min-w-0 max-w-full">
        <div
          {...props}
          data-slot="list-summary"
          role="group"
          aria-label={ariaLabel}
          className={gridClassName}
        >
          {items.map((item) => {
            const hasDescription = item.description !== undefined && item.description !== null;
            return (
              <button
                key={item.id}
                type="button"
                data-slot="list-summary-item"
                aria-pressed={selectedItemId === item.id}
                disabled={item.disabled}
                onClick={() => onItemSelect(item.id)}
                className={cn(
                  itemClassNameBase,
                  hasDescription && 'gap-0',
                  'text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 aria-pressed:border-2 aria-pressed:border-primary aria-pressed:ring-1 aria-pressed:ring-primary disabled:cursor-not-allowed disabled:opacity-50',
                  itemClassName,
                )}
              >
                <span className={hasDescription ? cn(labelClassNameBase, 'mb-[var(--ui-list-summary-item-gap,0.125rem)]') : labelClassNameBase}>
                  {item.icon != null ? (
                    <span data-slot="list-summary-label-row" className="flex min-w-0 items-center gap-[var(--ui-list-summary-icon-gap,0.5rem)]">
                      <span data-slot="list-summary-label-icon" aria-hidden="true" className="inline-flex size-[var(--ui-list-summary-icon-size,16px)] shrink-0 items-center justify-center [&>svg]:size-full">
                        {typeof item.icon === 'string' ? <LazyIcon name={item.icon} /> : item.icon}
                      </span>
                      <span className="min-w-0 break-words">{item.label}</span>
                    </span>
                  ) : item.label}
                </span>
                <span className={valueClassNameBase}>{item.value}</span>
                {hasDescription ? <span data-slot="list-summary-description" className={descriptionClassName}>{item.description}</span> : null}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div data-slot="list-summary-container" className="@container min-w-0 max-w-full">
      <dl
        data-slot="list-summary"
        className={gridClassName}
        aria-label={ariaLabel}
        {...props}
      >
        {items.map((item) => {
          const hasDescription = item.description !== undefined && item.description !== null;
          return (
            <div
              key={item.id}
              data-slot="list-summary-item"
              className={cn(itemClassNameBase, hasDescription && 'gap-0', itemClassName)}
            >
              <dt className={hasDescription ? cn(labelClassNameBase, 'mb-[var(--ui-list-summary-item-gap,0.125rem)]') : labelClassNameBase}>
                {item.icon != null ? (
                  <span data-slot="list-summary-label-row" className="flex min-w-0 items-center gap-[var(--ui-list-summary-icon-gap,0.5rem)]">
                    <span data-slot="list-summary-label-icon" aria-hidden="true" className="inline-flex size-[var(--ui-list-summary-icon-size,16px)] shrink-0 items-center justify-center [&>svg]:size-full">
                      {typeof item.icon === 'string' ? <LazyIcon name={item.icon} /> : item.icon}
                    </span>
                    <span className="min-w-0 break-words">{item.label}</span>
                  </span>
                ) : item.label}
              </dt>
              <dd className={valueClassNameBase}>{item.value}</dd>
              {hasDescription ? <dd data-slot="list-summary-description" className={descriptionClassName}>{item.description}</dd> : null}
            </div>
          );
        })}
      </dl>
    </div>
  );
}
