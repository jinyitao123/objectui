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

/** Equal-width radio choices with synchronous keyboard selection. */
export const SegmentedRadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroup>,
  SegmentedRadioGroupProps
>(({ value, onValueChange, options, disabled, className, loop = true, ...props }, ref) => {
  const items = React.useRef(new Map<string, HTMLButtonElement>());
  const navigation = React.useRef<{ select: boolean; notified: boolean } | null>(null);
  const changeValue = (next: string) => {
    const current = navigation.current;
    if (next === value || (current && (!current.select || current.notified))) return;
    if (current) current.notified = true;
    onValueChange(next);
  };
  const navigate = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.defaultPrevented || event.target !== event.currentTarget || disabled
      || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const arrow = event.key === 'ArrowLeft' || event.key === 'ArrowRight';
    if (!arrow && event.key !== 'Home' && event.key !== 'End') return;
    const enabled = options.flatMap(option => {
      const node = items.current.get(option.value);
      return node && !option.disabled && !node.matches(':disabled') ? [{ node, value: option.value }] : [];
    });
    const index = enabled.findIndex(item => item.node === event.currentTarget);
    if (index < 0) return;
    event.preventDefault();
    const group = event.currentTarget.closest('[role="radiogroup"]');
    const rtl = group?.getAttribute('dir') === 'rtl';
    const step = (event.key === 'ArrowRight' ? 1 : -1) * (rtl ? -1 : 1);
    const nextIndex = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : index + step;
    const target = enabled[loop
      ? (nextIndex + enabled.length) % enabled.length
      : Math.max(0, Math.min(nextIndex, enabled.length - 1))];
    // Radix defers roving focus until after a quick keyup can clear its arrow
    // flag. Move and select together here, without changing the primitives.
    // A held arrow may also trigger Radix's focus-click: forward only once.
    navigation.current = { select: arrow, notified: false };
    try {
      target.node.focus();
      if (arrow && target.node.ownerDocument.activeElement === target.node) changeValue(target.value);
    } finally {
      navigation.current = null;
    }
  };
  return (
  <RadioGroup
    {...props}
    ref={ref}
    value={value}
    onValueChange={changeValue}
    disabled={disabled}
    loop={loop}
    orientation="horizontal"
    className={cn('flex w-full gap-0', className)}
  >
    {options.map((option) => (
      <RadioItem
        key={option.value}
        ref={node => { if (node) items.current.set(option.value, node); else items.current.delete(option.value); }}
        value={option.value}
        disabled={disabled || option.disabled}
        onKeyDown={navigate}
        className="relative flex min-w-0 flex-1 basis-0 items-center justify-center border-y border-r border-input first:border-l first:rounded-l-[var(--ui-control-radius,0.375rem)] last:rounded-r-[var(--ui-control-radius,0.375rem)] h-[var(--ui-control-height,2.5rem)] px-[var(--ui-button-padding-x,1rem)] text-[length:var(--ui-control-font-size,0.875rem)] leading-[var(--ui-control-line-height,1.25rem)] bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="truncate">{option.label}</span>
      </RadioItem>
    ))}
  </RadioGroup>
  );
});

SegmentedRadioGroup.displayName = 'SegmentedRadioGroup';
