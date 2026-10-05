import React from 'react';
import { cn, LazyIcon } from '@object-ui/components';
import { ChevronRight } from 'lucide-react';

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
  /** Optional compact-card footer label. A chevron is shown when this is present. */
  actionLabel?: React.ReactNode;
  /** Disable this item when the host enables interactive selection. */
  disabled?: boolean;
}

export interface ListSummaryProps extends React.HTMLAttributes<HTMLElement> {
  items: readonly ListSummaryItem[];
  /** Compact, navigational card presentation. The default preserves the current summary. */
  variant?: 'default' | 'compact';
  /** Enable native-button selection and report the selected id to the host. */
  onItemSelect?: (id: string) => void;
  /** Controlled selected item id. The component never owns selection state. */
  selectedItemId?: string;
  /** Enable native-button activation without implying controlled selection. */
  onItemActivate?: (id: string) => void;
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
  variant = 'default',
  onItemSelect,
  selectedItemId,
  onItemActivate,
  className,
  itemClassName,
  labelClassName,
  valueClassName,
  'aria-label': ariaLabel = 'List summary',
  ...props
}: ListSummaryProps) {
  if (items.length === 0) return null;

  const gridClassName = variant === 'compact'
    ? cn('grid min-w-0 max-w-full grid-cols-1 gap-[var(--ui-list-summary-compact-grid-gap,10.5px)]', className)
    : cn(
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

  const compactItemClassNameBase =
    'grid min-w-0 min-h-[var(--ui-list-summary-compact-card-height,84.75px)] grid-cols-[minmax(0,1fr)_minmax(0,auto)] overflow-hidden rounded-[var(--ui-list-summary-compact-card-radius,7px)] border border-border bg-card p-[var(--ui-list-summary-compact-padding,10.5px)]';
  const compactLabelClassName = cn(
    'm-0 flex min-h-[var(--ui-list-summary-compact-header-height,19.25px)] min-w-0 items-center gap-[var(--ui-list-summary-compact-icon-gap,5.25px)] break-words text-[length:var(--ui-list-summary-compact-label-font-size,12.5px)] leading-[var(--ui-list-summary-compact-label-line-height,18.75px)] font-[weight:var(--ui-list-summary-compact-label-font-weight,600)] text-foreground',
    labelClassName,
  );
  const compactValueClassName = cn(
    'm-0 inline-flex min-h-[var(--ui-list-summary-compact-value-height,19.25px)] min-w-0 max-w-full self-center items-center justify-self-end break-words rounded-[var(--ui-list-summary-compact-value-radius,3.5px)] bg-muted px-[var(--ui-list-summary-compact-value-padding-inline,5.25px)] py-[var(--ui-list-summary-compact-value-padding-block,1.75px)] text-right text-[length:var(--ui-list-summary-compact-value-font-size,10.5px)] leading-[var(--ui-list-summary-compact-value-line-height,15.75px)] font-[weight:var(--ui-list-summary-compact-value-font-weight,700)] text-foreground',
    valueClassName,
  );
  const compactDescriptionClassName =
    'm-0 col-span-2 mt-[var(--ui-list-summary-compact-description-margin-top,3.5px)] min-w-0 max-w-full break-words text-[length:var(--ui-list-summary-compact-description-font-size,11.5px)] leading-[var(--ui-list-summary-compact-description-line-height,17.25px)] font-[weight:var(--ui-list-summary-compact-description-font-weight,500)] text-muted-foreground';
  const compactActionClassName =
    'm-0 col-span-2 mt-[var(--ui-list-summary-compact-action-margin-top,5.25px)] flex min-w-0 max-w-full items-center gap-[var(--ui-list-summary-compact-action-gap,3.5px)] break-words text-[length:var(--ui-list-summary-compact-action-font-size,11px)] leading-[var(--ui-list-summary-compact-action-line-height,16.5px)] font-[weight:var(--ui-list-summary-compact-action-font-weight,600)] text-primary';

  if (variant === 'compact') {
    if (onItemSelect || onItemActivate) {
      const selectedActivation = Boolean(onItemSelect);
      const activateItem = onItemSelect ?? onItemActivate;
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
              const hasActionLabel = item.actionLabel !== undefined && item.actionLabel !== null && item.actionLabel !== false;
              return (
                <button
                  key={item.id}
                  type="button"
                  data-slot="list-summary-item"
                  aria-pressed={selectedActivation ? selectedItemId === item.id : undefined}
                  disabled={item.disabled}
                  onClick={() => activateItem?.(item.id)}
                  className={cn(
                    compactItemClassNameBase,
                    'text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
                    selectedActivation && 'aria-pressed:border-2 aria-pressed:border-primary aria-pressed:ring-1 aria-pressed:ring-primary',
                    itemClassName,
                  )}
                >
                  <span className={compactLabelClassName}>
                    {item.icon != null && (
                      <span data-slot="list-summary-label-icon" aria-hidden="true" className="inline-flex size-[var(--ui-list-summary-compact-icon-size,13px)] shrink-0 items-center justify-center [&>svg]:size-full">
                        {typeof item.icon === 'string' ? <LazyIcon name={item.icon} /> : item.icon}
                      </span>
                    )}
                    <span className="min-w-0 break-words">{item.label}</span>
                  </span>
                  <span data-slot="list-summary-value" className={compactValueClassName}>{item.value}</span>
                  {hasDescription ? <span data-slot="list-summary-description" className={compactDescriptionClassName}>{item.description}</span> : null}
                  {hasActionLabel ? (
                    <span data-slot="list-summary-action" className={compactActionClassName}>
                      <span className="min-w-0 break-words">{item.actionLabel}</span>
                      <ChevronRight aria-hidden="true" className="h-[var(--ui-list-summary-compact-arrow-size,11px)] w-[var(--ui-list-summary-compact-arrow-size,11px)] shrink-0" />
                    </span>
                  ) : null}
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
            const hasActionLabel = item.actionLabel !== undefined && item.actionLabel !== null && item.actionLabel !== false;
            return (
              <div key={item.id} data-slot="list-summary-item" className={cn(compactItemClassNameBase, itemClassName)}>
                <dt className={compactLabelClassName}>
                  {item.icon != null && (
                    <span data-slot="list-summary-label-icon" aria-hidden="true" className="inline-flex size-[var(--ui-list-summary-compact-icon-size,13px)] shrink-0 items-center justify-center [&>svg]:size-full">
                      {typeof item.icon === 'string' ? <LazyIcon name={item.icon} /> : item.icon}
                    </span>
                  )}
                  <span className="min-w-0 break-words">{item.label}</span>
                </dt>
                <dd data-slot="list-summary-value" className={compactValueClassName}>{item.value}</dd>
                {hasDescription ? <dd data-slot="list-summary-description" className={compactDescriptionClassName}>{item.description}</dd> : null}
                {hasActionLabel ? (
                  <dd data-slot="list-summary-action" className={compactActionClassName}>
                    <span className="min-w-0 break-words">{item.actionLabel}</span>
                    <ChevronRight aria-hidden="true" className="h-[var(--ui-list-summary-compact-arrow-size,11px)] w-[var(--ui-list-summary-compact-arrow-size,11px)] shrink-0" />
                  </dd>
                ) : null}
              </div>
            );
          })}
        </dl>
      </div>
    );
  }

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

  if (onItemActivate) {
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
                disabled={item.disabled}
                onClick={() => onItemActivate(item.id)}
                className={cn(
                  itemClassNameBase,
                  hasDescription && 'gap-0',
                  'text-left transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
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
