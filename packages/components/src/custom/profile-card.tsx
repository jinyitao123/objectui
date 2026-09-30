/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 * Licensed under the MIT license in the repository root.
 */
import * as React from 'react';
import {
  Card as PrimitiveCard,
  CardHeader as PrimitiveCardHeader,
  CardTitle as PrimitiveCardTitle,
  CardDescription as PrimitiveCardDescription,
  CardContent as PrimitiveCardContent,
  CardFooter as PrimitiveCardFooter,
} from '../ui/card';
import { cn } from '../lib/utils';

/** Host card geometry over unchanged Shadcn primitives. */
export const Card = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof PrimitiveCard>>(
  ({ className, ...props }, ref) => (
    <PrimitiveCard ref={ref} className={cn('min-w-0 rounded-[var(--ui-card-radius,0.5rem)] [box-shadow:var(--ui-card-shadow,var(--tw-shadow))]', className)} {...props} />
  ),
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof PrimitiveCardHeader>>(
  ({ className, ...props }, ref) => (
    <PrimitiveCardHeader ref={ref} className={cn("relative p-[var(--ui-card-padding,1.5rem)] pb-[var(--ui-card-header-padding-bottom,1.5rem)] after:content-[''] after:[display:var(--ui-card-divider-display,none)] after:absolute after:inset-x-[var(--ui-card-padding,1.5rem)] after:bottom-0 after:border-b after:border-border", className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof PrimitiveCardTitle>>(
  ({ className, ...props }, ref) => (
    <PrimitiveCardTitle ref={ref} className={cn('text-[length:var(--ui-card-title-font-size,1.5rem)] leading-[var(--ui-card-title-line-height,1)] font-[number:var(--ui-card-title-font-weight,600)]', className)} {...props} />
  ),
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = PrimitiveCardDescription;

export const CardContent = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof PrimitiveCardContent>>(
  ({ className, ...props }, ref) => (
    <PrimitiveCardContent ref={ref} className={cn('p-[var(--ui-card-padding,1.5rem)] pt-[var(--ui-card-content-padding-top,0px)]', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.ComponentPropsWithoutRef<typeof PrimitiveCardFooter>>(
  ({ className, ...props }, ref) => (
    <PrimitiveCardFooter ref={ref} className={cn('p-[var(--ui-card-padding,1.5rem)] pt-[var(--ui-card-footer-padding-top,0px)]', className)} {...props} />
  ),
);
CardFooter.displayName = 'CardFooter';
