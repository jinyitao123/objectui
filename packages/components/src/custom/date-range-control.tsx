"use client"

import * as React from "react"
import { CalendarIcon } from "lucide-react"
import type { DateRange, Matcher } from "react-day-picker"
import { useDisplayLocale, useObjectTranslation } from "@object-ui/i18n"

import { cn } from "../lib/utils"
import { Calendar } from "../ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Button } from "./profile-controls"
import { dateToValue, toCalendarDate } from "./local-date"

export interface DateRangeControlValue {
  from: string
  to: string
}

export interface DateRangeQuickRange {
  /** Host-owned copy; callers may localize it without adding a schema key. */
  label: string
  /** Calendar days to subtract from the local end date. Zero means today only. */
  daysBack: number
}

export interface DateRangeControlProps {
  /** Committed, date-only local calendar bounds in `YYYY-MM-DD` form. */
  value?: DateRangeControlValue
  /** Called only for a complete range or an explicit clear. */
  onValueChange: (value?: DateRangeControlValue) => void
  label?: string
  startPlaceholder?: string
  endPlaceholder?: string
  clearLabel?: string
  /** Defaults use common inclusive ranges; hosts can supply observed offsets. */
  quickRanges?: DateRangeQuickRange[]
  minDate?: string
  maxDate?: string
  disabled?: boolean
  className?: string
}

const DEFAULT_QUICK_RANGES: DateRangeQuickRange[] = [
  { label: "Today", daysBack: 0 },
  { label: "Last 7 days", daysBack: 6 },
  { label: "Last 30 days", daysBack: 29 },
]

function localRangeForDaysBack(daysBack: number, today: Date): DateRangeControlValue {
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const from = new Date(to)
  from.setDate(from.getDate() - daysBack)
  return { from: dateToValue(from), to: dateToValue(to) }
}

function rangeFromValue(value?: DateRangeControlValue): DateRange | undefined {
  if (!value) return undefined
  const from = toCalendarDate(value.from)
  const to = toCalendarDate(value.to)
  return from && to ? { from, to } : undefined
}

function formatDate(value: string | undefined, locale: string, placeholder: string): string {
  const date = toCalendarDate(value)
  return date
    ? new Intl.DateTimeFormat(locale, {
        calendar: "gregory",
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).format(date)
    : placeholder
}

function isInBounds(
  range: DateRangeControlValue,
  minDate: string | undefined,
  maxDate: string | undefined,
): boolean {
  const min = minDate ? toCalendarDate(minDate) : undefined
  const max = maxDate ? toCalendarDate(maxDate) : undefined
  const from = toCalendarDate(range.from)
  const to = toCalendarDate(range.to)
  if (!from || !to || from > to) return false
  return !(min && from < min) && !(max && to > max)
}

export function DateRangeControl({
  value,
  onValueChange,
  label = "Select date range",
  startPlaceholder = "Start date",
  endPlaceholder = "End date",
  clearLabel,
  quickRanges,
  minDate,
  maxDate,
  disabled = false,
  className,
}: DateRangeControlProps) {
  const locale = useDisplayLocale()
  const { t } = useObjectTranslation()
  const clearText = clearLabel ?? t("lookup.clear")
  const ranges = quickRanges ?? DEFAULT_QUICK_RANGES
  const committedRange = rangeFromValue(value)
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<DateRange | undefined>(committedRange)
  const [selectionStart, setSelectionStart] = React.useState<Date | undefined>()

  React.useEffect(() => {
    if (!open) setDraft(committedRange)
  }, [open, value?.from, value?.to])

  React.useEffect(() => {
    if (!disabled || !open) return
    setOpen(false)
    setSelectionStart(undefined)
    setDraft(committedRange)
  }, [disabled, open, value?.from, value?.to])

  const min = minDate ? toCalendarDate(minDate) : undefined
  const max = maxDate ? toCalendarDate(maxDate) : undefined
  const disabledDays: Matcher[] = []
  if (min) disabledDays.push({ before: min })
  if (max) disabledDays.push({ after: max })

  const formatter = React.useMemo(() => ({
    formatCaption: (month: Date) =>
      new Intl.DateTimeFormat(locale, { calendar: "gregory", month: "long", year: "numeric" }).format(month),
    formatDay: (day: Date) => new Intl.NumberFormat(locale).format(day.getDate()),
    formatWeekdayName: (weekday: Date) =>
      new Intl.DateTimeFormat(locale, { weekday: "short" }).format(weekday),
  }), [locale])
  const calendarLabels = React.useMemo(() => ({
    labelDayButton: (day: Date) =>
      new Intl.DateTimeFormat(locale, { calendar: "gregory", dateStyle: "full" }).format(day),
    labelGrid: () => label,
    labelNav: () => label,
    labelNext: () => t("calendar.a11y.nextPeriod"),
    labelPrevious: () => t("calendar.a11y.previousPeriod"),
  }), [label, locale, t])

  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled && nextOpen) return
    setOpen(nextOpen)
    setSelectionStart(undefined)
    setDraft(nextOpen ? committedRange : rangeFromValue(value))
  }

  const commitRange = (range: DateRangeControlValue) => {
    if (disabled || !isInBounds(range, minDate, maxDate)) return
    onValueChange(range)
    setSelectionStart(undefined)
    setDraft(rangeFromValue(range))
    setOpen(false)
  }

  const handleCalendarSelect = (_range: DateRange | undefined, selectedDate: Date) => {
    if (disabled) return
    if (!selectionStart) {
      setSelectionStart(selectedDate)
      setDraft({ from: selectedDate, to: undefined })
      return
    }

    const first = selectionStart <= selectedDate ? selectionStart : selectedDate
    const last = selectionStart <= selectedDate ? selectedDate : selectionStart
    commitRange({ from: dateToValue(first), to: dateToValue(last) })
  }

  const selectQuickRange = (daysBack: number) => {
    if (disabled || !Number.isInteger(daysBack) || daysBack < 0) return
    const today = toCalendarDate(new Date())
    if (!today) return
    const range = localRangeForDaysBack(daysBack, today)
    if (!isInBounds(range, minDate, maxDate)) return
    onValueChange(range)
    setSelectionStart(undefined)
    setDraft(rangeFromValue(range))
    setOpen(false)
  }

  const clearRange = () => {
    if (disabled) return
    onValueChange(undefined)
    setSelectionStart(undefined)
    setDraft(undefined)
    setOpen(false)
  }

  const today = toCalendarDate(new Date())
  const displayedRange = committedRange
    ? `${formatDate(value?.from, locale, startPlaceholder)} ~ ${formatDate(value?.to, locale, endPlaceholder)}`
    : `${startPlaceholder} ~ ${endPlaceholder}`

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          aria-label={label}
          className={cn(
            "w-[var(--ui-date-range-control-width,260px)] min-w-0 justify-start gap-[var(--ui-date-range-control-gap,7px)]",
            className,
          )}
        >
          <CalendarIcon className="size-[var(--ui-date-range-control-icon-size,14px)] shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-left">{displayedRange}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="range"
          numberOfMonths={2}
          defaultMonth={committedRange?.from ?? today ?? new Date()}
          autoFocus
          selected={draft}
          onSelect={handleCalendarSelect}
          disabled={disabledDays.length ? disabledDays : undefined}
          excludeDisabled
          startMonth={min}
          endMonth={max}
          formatters={formatter}
          labels={calendarLabels}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2">
          <div className="flex flex-wrap items-center gap-1">
            {ranges.map((range) => {
              const next = today && Number.isInteger(range.daysBack) && range.daysBack >= 0
                ? localRangeForDaysBack(range.daysBack, today)
                : undefined
              const unavailable = !next || !isInBounds(next, minDate, maxDate)
              return (
                <Button
                  key={`${range.daysBack}:${range.label}`}
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled || unavailable}
                  aria-pressed={Boolean(next && value?.from === next.from && value?.to === next.to)}
                  onClick={() => selectQuickRange(range.daysBack)}
                >
                  {range.label}
                </Button>
              )
            })}
          </div>
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={clearRange}>
            {clearText}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
