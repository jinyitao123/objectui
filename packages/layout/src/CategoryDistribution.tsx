import React from 'react';
import { cn } from '@object-ui/components';

export interface CategoryDistributionItem {
  /** Stable host-owned key for this category. */
  id: string;
  /** Human-readable category name. */
  label: string;
  /** Non-negative count supplied by the host. */
  value: number;
}

export interface CategoryDistributionProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Categories and counts already resolved by the host. */
  items: readonly CategoryDistributionItem[];
  /** Optional visible heading. */
  title?: string;
  /** Host-owned message shown when the item collection is empty. */
  emptyText?: string;
  /** Message shown when any item has an invalid count. */
  invalidText?: string;
  /** Minimum visible width for positive bars; zero counts remain zero. */
  minPercent?: number;
}

/** A host-driven category count list. It never queries or interprets business data. */
export function CategoryDistribution({
  items,
  title,
  emptyText = 'No distribution data available.',
  invalidText = 'Distribution unavailable.',
  minPercent = 0,
  className,
  role,
  'aria-label': ariaLabel,
  ...props
}: CategoryDistributionProps) {
  const valid = items.every(item => Number.isFinite(item.value) && item.value >= 0);
  const empty = items.length === 0;
  const maximum = valid ? items.reduce((largest, item) => Math.max(largest, item.value), 0) : 0;
  const minimum = Number.isFinite(minPercent) ? Math.min(100, Math.max(0, minPercent)) : 0;
  const name = ariaLabel || title || 'Category distribution';

  return (
    <div
      {...props}
      role={role || 'group'}
      aria-label={name}
      className={cn('min-w-0 max-w-full', className)}
    >
      {title && (
        <h3 className="mb-[var(--ui-category-distribution-title-gap,8px)] min-w-0 break-words text-[length:var(--ui-category-distribution-title-font-size,0.875rem)] leading-[var(--ui-category-distribution-title-line-height,1.25rem)] font-semibold">
          {title}
        </h3>
      )}
      {empty || !valid ? (
        <p
          role={valid ? 'status' : 'alert'}
          className="m-0 min-w-0 break-words px-0 py-[var(--ui-category-distribution-empty-padding-block,14px)] text-center text-[length:var(--ui-category-distribution-empty-font-size,12px)] leading-[var(--ui-category-distribution-empty-line-height,18px)] text-muted-foreground"
        >
          {valid ? emptyText : invalidText}
        </p>
      ) : (
        <dl className="m-0 grid min-w-0 gap-y-[var(--ui-category-distribution-row-gap,5.25px)] text-[length:var(--ui-category-distribution-font-size,11.5px)] leading-[var(--ui-category-distribution-line-height,16px)]">
          {items.map(item => {
            const ratio = maximum > 0 ? (item.value / maximum) * 100 : 0;
            const width = item.value === 0
              ? 0
              : Math.min(100, Math.max(minimum, Math.round(ratio * 100) / 100));
            return (
              <div
                key={item.id}
                className="grid min-w-0 grid-cols-[minmax(0,var(--ui-category-distribution-label-width,76px))_minmax(0,1fr)] items-center gap-x-[var(--ui-category-distribution-column-gap,8px)]"
              >
                <dt className="m-0 min-w-0 break-words text-muted-foreground">{item.label}</dt>
                <dd className="m-0 grid min-w-0 grid-cols-[minmax(0,1fr)_var(--ui-category-distribution-count-width,34px)] items-center gap-x-[var(--ui-category-distribution-count-gap,8px)]">
                  <svg
                    aria-hidden="true"
                    focusable="false"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    className="block h-[var(--ui-category-distribution-bar-height,8.75px)] w-full overflow-hidden rounded-full text-primary"
                  >
                    <rect x="0" y="0" width="100" height="100" rx="50" className="fill-muted" />
                    <rect
                      data-slot="category-distribution-bar"
                      x="0"
                      y="0"
                      width={width}
                      height="100"
                      rx="50"
                      className="fill-current"
                    />
                  </svg>
                  <span className="min-w-0 break-words text-right tabular-nums text-foreground">{item.value}</span>
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}
