/**
 * ObjectUI control wrappers that opt into host-provided geometry tokens.
 *
 * Every token fallback matches the unwrapped Shadcn primitive so importing a
 * wrapper does not change the default Console geometry when no profile is set.
 */

import * as React from 'react';
import type { VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';
import {
  Button as UiButton,
  buttonVariants as uiButtonVariants,
  type ButtonProps,
} from '../ui/button';
import { Input as UiInput } from '../ui/input';
import { Label as UiLabel } from '../ui/label';
import {
  SelectItem as UiSelectItem,
  SelectTrigger as UiSelectTrigger,
} from '../ui/select';
import { Textarea as UiTextarea } from '../ui/textarea';
import { NativeSelect as UiNativeSelect } from './native-select';

type ButtonVariantProps = VariantProps<typeof uiButtonVariants> & {
  class?: string;
  className?: string;
};

/** Same variants as the Shadcn button, with the console geometry token seam. */
// eslint-disable-next-line react-refresh/only-export-components -- `buttonVariants` is part of the public Button API.
export function buttonVariants(options?: ButtonVariantProps): string {
  const { class: classProp, className, ...variantProps } = options ?? {};
  const size = variantProps.size;
  let sizeClasses: string | undefined;
  switch (size) {
    case null:
      break;
    case undefined:
    case 'default':
      sizeClasses =
        'h-[var(--ui-control-height,2.5rem)] px-[var(--ui-button-padding-x,1rem)] py-[var(--ui-button-padding-y,0.5rem)]';
      break;
    case 'sm':
      sizeClasses =
        'h-[var(--ui-control-small-height,2.25rem)] px-[var(--ui-button-small-padding-x,0.75rem)]';
      break;
    case 'lg':
      sizeClasses = 'h-[var(--ui-control-large-height,2.75rem)]';
      break;
    case 'icon':
      sizeClasses =
        'h-[var(--ui-icon-button-size,2.5rem)] w-[var(--ui-icon-button-size,2.5rem)]';
      break;
    default:
      break;
  }

  return cn(
    uiButtonVariants(variantProps),
    'gap-[var(--ui-button-gap,0.5rem)] rounded-[var(--ui-control-radius,0.375rem)] text-[length:var(--ui-control-font-size,0.875rem)] leading-[var(--ui-control-line-height,1.25rem)]',
    size === 'icon'
      ? '[&_svg]:size-[var(--ui-icon-button-icon-size,1rem)]'
      : '[&_svg]:size-[var(--ui-button-icon-size,1rem)]',
    sizeClasses,
    className,
    classProp,
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, size, variant, ...props }, ref) => (
    <UiButton
      {...props}
      ref={ref}
      size={size}
      variant={variant}
      data-ui-control="button"
      data-ui-button-size={size ?? 'default'}
      className={buttonVariants({ size, variant, className })}
    />
  ),
);
Button.displayName = 'Button';

export const Input = React.forwardRef<
  React.ElementRef<typeof UiInput>,
  React.ComponentPropsWithoutRef<typeof UiInput>
>(({ className, ...props }, ref) => (
  <UiInput
    {...props}
    ref={ref}
    className={cn(
      'h-[var(--ui-control-height,2.5rem)] rounded-[var(--ui-control-radius,0.375rem)] px-[var(--ui-input-padding-x,0.75rem)] py-[var(--ui-input-padding-y,0.5rem)] text-[length:var(--ui-control-font-size,1rem)] md:text-[length:var(--ui-control-font-size,0.875rem)]',
      'leading-[var(--ui-control-line-height,1.5rem)] md:leading-[var(--ui-control-line-height,1.25rem)] aria-invalid:border-[var(--ui-invalid-border-color,var(--color-input))]',
      className,
    )}
  />
));
Input.displayName = 'Input';

export const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof UiSelectTrigger>,
  React.ComponentPropsWithoutRef<typeof UiSelectTrigger>
>(({ className, ...props }, ref) => (
  <UiSelectTrigger
    {...props}
    ref={ref}
    className={cn(
      'h-[var(--ui-control-height,2.5rem)] rounded-[var(--ui-control-radius,0.375rem)] px-[var(--ui-input-padding-x,0.75rem)] py-[var(--ui-input-padding-y,0.5rem)] text-[length:var(--ui-control-font-size,0.875rem)] leading-[var(--ui-control-line-height,1.25rem)] aria-invalid:border-[var(--ui-invalid-border-color,var(--color-input))]',
      className,
    )}
  />
));
SelectTrigger.displayName = UiSelectTrigger.displayName;

export const Textarea = React.forwardRef<
  React.ElementRef<typeof UiTextarea>,
  React.ComponentPropsWithoutRef<typeof UiTextarea>
>(({ className, ...props }, ref) => (
  <UiTextarea
    {...props}
    ref={ref}
    className={cn(
      'min-h-[var(--ui-textarea-min-height,5rem)] rounded-[var(--ui-control-radius,0.375rem)] px-[var(--ui-input-padding-x,0.75rem)] py-[var(--ui-textarea-padding-y,0.5rem)] text-[length:var(--ui-control-font-size,1rem)] md:text-[length:var(--ui-control-font-size,0.875rem)]',
      'leading-[var(--ui-control-line-height,1.5rem)] md:leading-[var(--ui-control-line-height,1.25rem)] aria-invalid:border-[var(--ui-invalid-border-color,var(--color-input))]',
      className,
    )}
  />
));
Textarea.displayName = UiTextarea.displayName;

export const SelectItem = React.forwardRef<
  React.ElementRef<typeof UiSelectItem>,
  React.ComponentPropsWithoutRef<typeof UiSelectItem>
>(({ className, ...props }, ref) => (
  <UiSelectItem
    {...props}
    ref={ref}
    className={cn(
      'py-[var(--ui-menu-item-padding-y,0.375rem)] text-[length:var(--ui-control-font-size,0.875rem)] leading-[var(--ui-control-line-height,1.25rem)]',
      className,
    )}
  />
));
SelectItem.displayName = UiSelectItem.displayName;

export const Label = React.forwardRef<
  React.ElementRef<typeof UiLabel>,
  React.ComponentPropsWithoutRef<typeof UiLabel>
>(({ className, ...props }, ref) => (
  <UiLabel
    {...props}
    ref={ref}
    className={cn(
      'text-[length:var(--ui-label-font-size,var(--ui-control-font-size,0.875rem))] leading-[var(--ui-label-line-height,1)]',
      className,
    )}
  />
));
Label.displayName = UiLabel.displayName;

export const NativeSelect = React.forwardRef<
  React.ElementRef<typeof UiNativeSelect>,
  React.ComponentPropsWithoutRef<typeof UiNativeSelect>
>(({ className, ...props }, ref) => (
  <UiNativeSelect
    {...props}
    ref={ref}
    className={cn(
      'h-[var(--ui-control-height,2.5rem)] rounded-[var(--ui-control-radius,0.375rem)] px-[var(--ui-input-padding-x,0.75rem)] py-[var(--ui-input-padding-y,0.5rem)] text-[length:var(--ui-control-font-size,0.875rem)] leading-[var(--ui-control-line-height,1.25rem)] aria-invalid:border-[var(--ui-invalid-border-color,var(--color-input))]',
      className,
    )}
  />
));
NativeSelect.displayName = UiNativeSelect.displayName;
