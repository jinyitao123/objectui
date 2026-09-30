/**
 * Small presentation helpers shared by dashboard KPI headers.
 * The data remains in DashboardWidget metadata; these helpers add no schema.
 */

import React from 'react';
import { cn, getLazyIcon, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@object-ui/components';
import { CircleHelp } from 'lucide-react';
import { VARIANT_ICON_CLASSES, type MetricColorVariant } from './colorVariants';

export function MetricHelpTooltip({ description }: { description?: string }) {
  if (!description) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={description}
            data-dashboard-metric-help=""
            className="shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [display:var(--ui-dashboard-metric-help-display,none)]"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <CircleHelp
              aria-hidden="true"
              className="h-[var(--ui-dashboard-metric-help-icon-size,0.875rem)] w-[var(--ui-dashboard-metric-help-icon-size,0.875rem)]"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">{description}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function MetricHeaderTitle({
  title,
  icon,
  description,
  colorVariant = 'default',
  className,
}: {
  title: React.ReactNode;
  icon?: string;
  description?: string;
  colorVariant?: MetricColorVariant;
  className?: string;
}) {
  const Icon = icon ? getLazyIcon(icon) : null;
  const iconClasses = VARIANT_ICON_CLASSES[colorVariant] || VARIANT_ICON_CLASSES.default;

  return (
    <div className={cn('flex min-w-0 items-center gap-[var(--ui-dashboard-metric-header-gap,0.5rem)]', className)}>
      {Icon ? (
        <span
          aria-hidden="true"
          data-dashboard-metric-icon=""
          data-dashboard-metric-color-variant={colorVariant}
          className={cn(
            'grid h-[var(--ui-dashboard-metric-icon-size,2rem)] w-[var(--ui-dashboard-metric-icon-size,2rem)] shrink-0 place-items-center rounded-md',
            iconClasses,
          )}
        >
          {/* eslint-disable-next-line react-hooks/static-components -- getLazyIcon returns a module-cached component for each name. */}
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <div className="min-w-0 flex-1">{title}</div>
      <MetricHelpTooltip description={description} />
    </div>
  );
}
