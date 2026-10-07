import * as React from 'react';
import { Item as RadioItem } from '@radix-ui/react-radio-group';
import { RadioGroup } from '../ui/radio-group';
import { cn } from '../lib/utils';

export interface SegmentedRadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

/** Controlled React presentation; it does not declare a serialized field type. */
export interface SegmentedRadioGroupProps extends Omit<
  React.ComponentPropsWithoutRef<typeof RadioGroup>,
  'children' | 'defaultValue' | 'value' | 'onValueChange' | 'orientation'
> {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly SegmentedRadioOption[];
}

/** Equal-width radio choices with the same keyboard behavior as RadioGroup. */
export const SegmentedRadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroup>,
  SegmentedRadioGroupProps
>(({ value, onValueChange, options, disabled, className, ...props }, ref) => (
  <RadioGroup
    {...props}
    ref={ref}
    value={value}
    onValueChange={onValueChange}
    disabled={disabled}
    orientation="horizontal"
    className={cn('flex w-full gap-0', className)}
  >
    {options.map((option) => (
      <RadioItem
        key={option.value}
        value={option.value}
        disabled={disabled || option.disabled}
        className="relative flex min-w-0 flex-1 basis-0 items-center justify-center border-y border-r border-input first:border-l first:rounded-l-[var(--ui-control-radius,0.375rem)] last:rounded-r-[var(--ui-control-radius,0.375rem)] h-[var(--ui-control-height,2.5rem)] px-[var(--ui-button-padding-x,1rem)] text-[length:var(--ui-control-font-size,0.875rem)] leading-[var(--ui-control-line-height,1.25rem)] bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="truncate">{option.label}</span>
      </RadioItem>
    ))}
  </RadioGroup>
));

SegmentedRadioGroup.displayName = 'SegmentedRadioGroup';
