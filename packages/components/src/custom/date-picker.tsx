/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react"
import { Anchor as PopoverAnchor } from "@radix-ui/react-popover"
import type { Matcher, MonthCaptionProps } from "react-day-picker"
import { useDisplayLocale, useObjectTranslation } from "@object-ui/i18n"

import { cn } from "../lib/utils"
import { Button, Input, buttonVariants } from "./profile-controls"
import { Calendar } from "../ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { dateToValue, toCalendarDate } from "./local-date"

type TextInputProps = Omit<
  React.ComponentPropsWithoutRef<typeof Input>,
  "className" | "disabled" | "onChange" | "placeholder" | "type" | "value"
>

export interface DatePickerProps extends TextInputProps {
  /** Existing DatePicker callers may continue to use the Date-valued API. */
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  /** DateField uses this string-valued channel to preserve its form contract. */
  value?: string
  onValueChange?: (value: string) => void
  /** Date parsing/range validity; empty input is valid, independently of required. */
  onValidityChange?: (valid: boolean) => void
  /** Existing field/schema copy and metadata remain the source of the label. */
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date | string
  maxDate?: Date | string
  /** Show an inline clear button for both valid values and invalid drafts. */
  clearable?: boolean
  /** Open the calendar when the input receives user focus. */
  openOnFocus?: boolean
  /** Use ISO text during editing, retaining locale formatting on blur. */
  editFormat?: "locale" | "iso"
  /** Opt into decade → year → month navigation; the default month picker is unchanged. */
  calendarNavigation?: "month" | "year-month"
  /** Apply a host's geometry profile to the portaled calendar surface. */
  popoverClassName?: string
}

function stripDirectionMarks(value: string): string {
  return value.replace(/[\u061c\u200e\u200f]/gu, "")
}

function normalizeLocaleDigits(value: string, locale: string): string {
  let result = stripDirectionMarks(value)
  const formatter = new Intl.NumberFormat(locale, { useGrouping: false })
  for (let digit = 0; digit <= 9; digit += 1) {
    const localized = stripDirectionMarks(formatter.format(digit))
    if (localized !== String(digit)) {
      result = result.split(localized).join(String(digit))
    }
  }
  return result
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
}

function escapeLocaleLiteral(value: string): string {
  return stripDirectionMarks(value)
    .split(/(\s+)/u)
    .map((part) => (/^\s+$/u.test(part) ? "\\s*" : escapeRegex(part)))
    .join("")
}

function makeDatePattern(locale: string, monthStyle: "long" | "numeric") {
  const options: Intl.DateTimeFormatOptions = {
    calendar: "gregory",
    year: "numeric",
    month: monthStyle,
    day: "numeric",
  }
  const formatter = new Intl.DateTimeFormat(locale, options)
  const monthNames = new Map<string, number>()

  if (monthStyle === "long") {
    for (let month = 0; month < 12; month += 1) {
      const monthPart = formatter
        .formatToParts(new Date(2006, month, 22))
        .find((part) => part.type === "month")?.value
      if (monthPart) {
        monthNames.set(normalizeLocaleDigits(monthPart, locale).toLocaleLowerCase(locale), month + 1)
      }
    }
  }

  const monthAlternatives = [...monthNames.keys()]
    .sort((left, right) => right.length - left.length)
    .map(escapeRegex)
    .join("|")
  const pattern = formatter
    .formatToParts(new Date(2006, 10, 22))
    .map((part) => {
      if (part.type === "year") return "(?<year>\\p{N}{1,4})"
      if (part.type === "day") return "(?<day>\\p{N}{1,2})"
      if (part.type === "month") {
        return monthStyle === "long"
          ? `(?<monthName>${monthAlternatives})`
          : "(?<month>\\p{N}{1,2})"
      }
      return escapeLocaleLiteral(part.value)
    })
    .join("")

  return { regex: new RegExp(`^${pattern}$`, "iu"), monthNames }
}

function makeLocalDate(year: number, month: number, day: number): Date | undefined {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return undefined
  }
  const date = new Date(0)
  date.setFullYear(year, month - 1, day)
  date.setHours(0, 0, 0, 0)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return undefined
  }
  return date
}

function monthIsOutsideRange(
  year: number,
  month: number,
  minDate: Date | undefined,
  maxDate: Date | undefined,
): boolean {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  return Boolean((minDate && lastDay < minDate) || (maxDate && firstDay > maxDate))
}

function parseWithPattern(value: string, locale: string, monthStyle: "long" | "numeric") {
  const { regex, monthNames } = makeDatePattern(locale, monthStyle)
  const groups = regex.exec(value)?.groups
  if (!groups) return undefined

  const year = Number(groups.year)
  const day = Number(groups.day)
  const month = groups.month
    ? Number(groups.month)
    : monthNames.get(normalizeLocaleDigits(groups.monthName ?? "", locale).toLocaleLowerCase(locale))
  if (month == null) return undefined
  return makeLocalDate(year, month, day)
}

function parseDateText(value: string, locale: string): Date | undefined {
  const normalized = normalizeLocaleDigits(value.trim(), locale)
  const iso = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T.*)?$/u)
  if (iso) return makeLocalDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  return (
    parseWithPattern(normalized, locale, "long") ??
    parseWithPattern(normalized, locale, "numeric")
  )
}

function formatCalendarDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    calendar: "gregory",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date)
}

type DatePickerMonthPickerContextValue = {
  locale: string
  monthPickerOpen: boolean
  monthPickerId: string
  monthLabel: string
  previousPeriodLabel: string
  nextPeriodLabel: string
  minDate?: Date
  maxDate?: Date
  yearMonthNavigation?: boolean
  onToggleMonthPicker: () => void
  onSelectYear: (year: number) => void
  onSelectMonth: (month: number) => void
}

const DatePickerMonthPickerContext =
  React.createContext<DatePickerMonthPickerContextValue | null>(null)

function DatePickerMonthCaption({
  calendarMonth,
  displayIndex: _displayIndex,
  className,
  ...captionProps
}: MonthCaptionProps) {
  const picker = React.useContext(DatePickerMonthPickerContext)
  if (!picker) {
    throw new Error("The date picker month caption must be inside its picker context.")
  }

  const month = calendarMonth.date
  const year = month.getFullYear()
  const monthCaption = new Intl.DateTimeFormat(picker.locale, {
    calendar: "gregory",
    month: "long",
    year: "numeric",
  }).format(month)
  const previousYearDisabled = picker.minDate
    ? year <= picker.minDate.getFullYear()
    : false
  const nextYearDisabled = picker.maxDate
    ? year >= picker.maxDate.getFullYear()
    : false
  const months = Array.from({ length: 12 }, (_, index) => {
    const monthDate = makeLocalDate(year, index + 1, 1)!
    return {
      index,
      date: monthDate,
      label: new Intl.DateTimeFormat(picker.locale, {
        calendar: "gregory",
        month: "long",
      }).format(monthDate),
      disabled: monthIsOutsideRange(year, index, picker.minDate, picker.maxDate),
    }
  })

  return (
    <div
      {...captionProps}
      className={cn(className, "relative flex items-center justify-center")}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-expanded={picker.monthPickerOpen}
        aria-controls={picker.monthPickerOpen ? picker.monthPickerId : undefined}
        onClick={picker.onToggleMonthPicker}
        className={cn("gap-1 font-medium", picker.yearMonthNavigation && "h-auto py-0")}
      >
        {monthCaption}
        {!picker.yearMonthNavigation && <ChevronDown className="h-4 w-4" aria-hidden="true" />}
      </Button>
      {picker.monthPickerOpen && (
        <div
          id={picker.monthPickerId}
          role="group"
          aria-label={picker.monthLabel}
          className="absolute left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-md"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={picker.previousPeriodLabel}
              disabled={previousYearDisabled}
              onClick={() => picker.onSelectYear(year - 1)}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span aria-live="polite">
              {new Intl.NumberFormat(picker.locale, { useGrouping: false }).format(year)}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={picker.nextPeriodLabel}
              disabled={nextYearDisabled}
              onClick={() => picker.onSelectYear(year + 1)}
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {months.map((monthOption) => (
              <Button
                key={monthOption.index}
                type="button"
                variant="ghost"
                size="sm"
                aria-pressed={monthOption.index === month.getMonth()}
                disabled={monthOption.disabled}
                onClick={() => picker.onSelectMonth(monthOption.index)}
                className="w-full justify-center px-2"
              >
                {monthOption.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

type CalendarPeriodPanelProps = {
  mode: "years" | "months"
  month: Date
  decade: number
  locale: string
  label: string
  previousLabel: string
  nextLabel: string
  minDate?: Date
  maxDate?: Date
  onPrevious: () => void
  onNext: () => void
  onHeadingClick: () => void
  onSelect: (value: number) => void
}

/** Navigation only: react-day-picker remains the owner of the day grid. */
function CalendarPeriodPanel({
  mode, month, decade, locale, label, previousLabel, nextLabel,
  minDate, maxDate, onPrevious, onNext, onHeadingClick, onSelect,
}: CalendarPeriodPanelProps) {
  const gridRef = React.useRef<HTMLDivElement>(null)
  const year = month.getFullYear()
  const number = new Intl.NumberFormat(locale, { useGrouping: false })
  const options = Array.from({ length: 12 }, (_, index) => {
    const value = mode === "years" ? decade - 1 + index : index
    return {
      value,
      label: mode === "years"
        ? number.format(value)
        : new Intl.DateTimeFormat(locale, { calendar: "gregory", month: "long" })
          .format(makeLocalDate(year, index + 1, 1)!),
      selected: mode === "years" ? value === year : index === month.getMonth(),
      outside: mode === "years" && (value < decade || value > decade + 9),
      disabled: mode === "years"
        ? Boolean((minDate && value < minDate.getFullYear()) || (maxDate && value > maxDate.getFullYear()))
        : monthIsOutsideRange(year, index, minDate, maxDate),
    }
  })
  const initialFocus = options.find((option) => option.selected && !option.disabled)?.value
    ?? options.find((option) => !option.disabled)?.value
  const [focused, setFocused] = React.useState(initialFocus)
  React.useEffect(() => {
    gridRef.current?.querySelector<HTMLButtonElement>(`button[data-value="${initialFocus}"]`)?.focus()
  }, [initialFocus, mode, decade, year])

  const navigateGrid: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    const index = options.findIndex((option) => option.value === focused)
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -3, ArrowDown: 3 }
    let next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : index + (steps[event.key] ?? 0)
    if (!(event.key in steps) && event.key !== "Home" && event.key !== "End") return
    event.preventDefault()
    const direction = event.key === "End" ? -1 : event.key === "Home" ? 1 : Math.sign(steps[event.key])
    while (next >= 0 && next < options.length && options[next].disabled) next += direction
    if (next < 0 || next >= options.length) return
    setFocused(options[next].value)
    gridRef.current?.querySelector<HTMLButtonElement>(`button[data-value="${options[next].value}"]`)?.focus()
  }
  const previousDisabled = Boolean(minDate && (mode === "years" ? decade - 1 : year - 1) < minDate.getFullYear())
  const nextDisabled = Boolean(maxDate && (mode === "years" ? decade + 10 : year + 1) > maxDate.getFullYear())
  const heading = mode === "years"
    ? `${number.format(decade)} - ${number.format(decade + 9)}`
    : new Intl.DateTimeFormat(locale, { calendar: "gregory", year: "numeric" }).format(month)

  return (
    <div className="p-[var(--ui-calendar-padding,10.5px)]">
      <div className="mb-[var(--ui-calendar-period-gap,10.5px)] flex items-center justify-between">
        <Button type="button" variant="ghost" size="icon" aria-label={previousLabel} disabled={previousDisabled} onClick={onPrevious} className="size-[var(--ui-calendar-nav-size,26.5px)]">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        {mode === "months" ? (
          <Button type="button" variant="ghost" size="sm" onClick={onHeadingClick} className="h-auto py-0">{heading}</Button>
        ) : <span aria-live="polite" className="text-[length:var(--ui-control-font-size,0.875rem)]">{heading}</span>}
        <Button type="button" variant="ghost" size="icon" aria-label={nextLabel} disabled={nextDisabled} onClick={onNext} className="size-[var(--ui-calendar-nav-size,26.5px)]">
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
      <div ref={gridRef} role="group" aria-label={label} className="grid grid-cols-3 gap-[var(--ui-calendar-option-gap,7px)] py-[var(--ui-calendar-option-padding-y,7px)]" onKeyDown={navigateGrid}>
        {options.map((option) => (
          <Button
            key={option.value} type="button" variant={option.selected ? "default" : "ghost"} size="sm"
            data-value={option.value} aria-pressed={option.selected} disabled={option.disabled}
            tabIndex={focused === option.value ? 0 : -1}
            onFocus={() => setFocused(option.value)} onClick={() => onSelect(option.value)}
            className={cn("h-[var(--ui-calendar-option-height,38.5px)] w-full justify-center px-1", option.outside && !option.selected && "text-muted-foreground")}
          >{option.label}</Button>
        ))}
      </div>
    </div>
  )
}

function DatePickerAnchor({ enabled, children }: { enabled: boolean; children: React.ReactElement }) {
  return enabled ? <PopoverAnchor asChild>{children}</PopoverAnchor> : children
}

export function DatePicker({
  date: dateProp,
  onDateChange,
  value: valueProp,
  onValueChange,
  onValidityChange,
  label,
  placeholder,
  className,
  disabled,
  minDate: minDateValue,
  maxDate: maxDateValue,
  clearable = false,
  openOnFocus = false,
  editFormat = "locale",
  calendarNavigation = "month",
  popoverClassName,
  ...inputProps
}: DatePickerProps) {
  const locale = useDisplayLocale()
  const { t, language } = useObjectTranslation()
  const datePlaceholder = placeholder ?? t("calendar.datePickerPlaceholder")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const validityCallback = React.useRef(onValidityChange)
  React.useEffect(() => { validityCallback.current = onValidityChange }, [onValidityChange])
  const reportDateValidity = (error: string | undefined) => {
    inputRef.current?.setCustomValidity(error ?? "")
    validityCallback.current?.(!error)
  }
  const editingRef = React.useRef(false)
  const restoringFocus = React.useRef(false)
  const [openedFromInput, setOpenedFromInput] = React.useState(false)
  const inputErrorId = React.useId()
  const monthPickerId = React.useId()
  const [open, setOpen] = React.useState(false)
  const [monthPickerOpen, setMonthPickerOpen] = React.useState(false)
  const [periodPanel, setPeriodPanel] = React.useState<"years" | "months" | null>(null)
  const [decade, setDecade] = React.useState(0)
  const yearMonthNavigation = calendarNavigation === "year-month"
  const readOnly = inputProps.readOnly

  const minDate = toCalendarDate(minDateValue)
  const maxDate = toCalendarDate(maxDateValue)
  const selectedValue = valueProp !== undefined
    ? valueProp
    : dateProp
      ? dateToValue(dateProp)
      : ""
  const selectedDate = parseDateText(selectedValue, locale)
  const fieldLabel = label || t("calendar.a11y.region")
  const [displayMonth, setDisplayMonth] = React.useState(
    () => selectedDate ?? minDate ?? toCalendarDate(new Date()) ?? new Date(),
  )

  const rangeError = (date: Date): string | undefined => {
    if (minDate && date < minDate) {
      return t("validation.min", {
        field: fieldLabel,
        min: formatCalendarDate(minDate, locale),
      })
    }
    if (maxDate && date > maxDate) {
      return t("validation.max", {
        field: fieldLabel,
        max: formatCalendarDate(maxDate, locale),
      })
    }
    return undefined
  }

  const invalidFormatMessage = () =>
    t("validation.pattern", { field: fieldLabel })

  const initialError = selectedValue
    ? selectedDate
      ? rangeError(selectedDate)
      : invalidFormatMessage()
    : ""
  const [draft, setDraft] = React.useState(() =>
    selectedDate && !initialError
      ? formatCalendarDate(selectedDate, locale)
      : selectedValue,
  )
  const [inputError, setInputError] = React.useState(initialError)

  React.useEffect(() => {
    if (editingRef.current) return

    const parsed = parseDateText(selectedValue, locale)
    const nextError = selectedValue
      ? parsed
        ? rangeError(parsed)
        : invalidFormatMessage()
      : ""
    setDraft(parsed && !nextError ? formatCalendarDate(parsed, locale) : selectedValue)
    setInputError(nextError ?? "")
    reportDateValidity(nextError)
    // The translation language is included separately from the display locale:
    // tenant locale controls date formatting; the active UI language controls errors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValue, locale, language, minDateValue, maxDateValue, label])

  const emitDate = (nextDate: Date | undefined) => {
    const value = nextDate ? dateToValue(nextDate) : ""
    onValueChange?.(value)
    onDateChange?.(nextDate)
  }

  const selectDate = (nextDate: Date | undefined) => {
    if (disabled || readOnly) return
    editingRef.current = false
    const nextValue = nextDate ? dateToValue(nextDate) : ""
    const nextError = nextDate ? rangeError(nextDate) : undefined
    setDraft(nextDate && !nextError ? formatCalendarDate(nextDate, locale) : nextValue)
    setInputError(nextError ?? "")
    if (nextDate) setDisplayMonth(nextDate)
    reportDateValidity(nextError)
    emitDate(nextDate)
    setOpen(false)
  }

  const handleInputChange = (nextValue: string) => {
    if (disabled || readOnly) return
    if (inputRef.current?.ownerDocument.activeElement === inputRef.current) editingRef.current = true
    setDraft(nextValue)
    if (!nextValue.trim()) {
      setInputError("")
      reportDateValidity("")
      emitDate(undefined)
      return
    }

    const parsed = parseDateText(nextValue, locale)
    const nextError = parsed ? rangeError(parsed) : invalidFormatMessage()
    setInputError(nextError ?? "")
    reportDateValidity(nextError)
    if (!parsed) {
      onValueChange?.(nextValue)
      onDateChange?.(undefined)
      return
    }
    if (!nextError) setDisplayMonth(parsed)
    emitDate(parsed)
  }

  const handleInputBlur: React.FocusEventHandler<HTMLInputElement> = (event) => {
    editingRef.current = false
    const parsed = parseDateText(event.currentTarget.value, locale)
    if (parsed) {
      const nextError = rangeError(parsed)
      setInputError(nextError ?? "")
      reportDateValidity(nextError)
      if (!nextError) setDraft(formatCalendarDate(parsed, locale))
    } else if (event.currentTarget.value.trim()) {
      const message = invalidFormatMessage()
      setInputError(message)
      reportDateValidity(message)
    }
    inputProps.onBlur?.(event)
  }

  const handleInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "ArrowDown") {
      setOpenedFromInput(false)
      event.preventDefault()
      handlePopoverOpenChange(true)
    } else if (event.key === "Enter" && inputError) {
      event.preventDefault()
      inputRef.current?.reportValidity()
    }
    inputProps.onKeyDown?.(event)
  }

  const handlePopoverOpenChange = (nextOpen: boolean) => {
    if (nextOpen && (disabled || readOnly)) return
    setOpen(nextOpen)
    setMonthPickerOpen(false)
    setPeriodPanel(null)
    if (nextOpen) {
      setDisplayMonth(selectedDate ?? minDate ?? toCalendarDate(new Date()) ?? new Date())
    }
  }

  const datePickerCaptionContext: DatePickerMonthPickerContextValue = {
    locale,
    monthPickerOpen,
    monthPickerId,
    monthLabel: t("calendar.month"),
    previousPeriodLabel: t("calendar.a11y.previousPeriod"),
    nextPeriodLabel: t("calendar.a11y.nextPeriod"),
    minDate,
    maxDate,
    yearMonthNavigation,
    onToggleMonthPicker: () => {
      if (yearMonthNavigation) {
        setDecade(Math.floor(displayMonth.getFullYear() / 10) * 10)
        setPeriodPanel("years")
      } else setMonthPickerOpen((current) => !current)
    },
    onSelectYear: (year) => {
      if ((minDate && year < minDate.getFullYear()) || (maxDate && year > maxDate.getFullYear())) {
        return
      }
      setDisplayMonth(makeLocalDate(year, displayMonth.getMonth() + 1, 1) ?? displayMonth)
    },
    onSelectMonth: (month) => {
      const year = displayMonth.getFullYear()
      if (monthIsOutsideRange(year, month, minDate, maxDate)) return
      setDisplayMonth(makeLocalDate(year, month + 1, 1) ?? displayMonth)
      setMonthPickerOpen(false)
    },
  }

  const disabledDates: Matcher[] = []
  if (minDate) disabledDates.push({ before: minDate })
  if (maxDate) disabledDates.push({ after: maxDate })
  const today = toCalendarDate(new Date())
  const todayUnavailable = Boolean(today && rangeError(today))
  const describedBy = [
    inputProps["aria-describedby"],
    inputError ? inputErrorId : undefined,
  ]
    .filter(Boolean)
    .join(" ") || undefined

  const formatters = {
    formatCaption: (month: Date) =>
      new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", calendar: "gregory" }).format(month),
    formatDay: (day: Date) => new Intl.NumberFormat(locale).format(day.getDate()),
    formatWeekdayName: (weekday: Date) =>
      new Intl.DateTimeFormat(locale, { weekday: "short" }).format(weekday),
  }
  const labels = {
    labelDayButton: (day: Date) =>
      new Intl.DateTimeFormat(locale, { dateStyle: "full", calendar: "gregory" }).format(day),
    labelGrid: () => t("calendar.a11y.grid"),
    labelNav: () => t("calendar.a11y.region"),
    labelNext: () => t("calendar.a11y.nextPeriod"),
    labelPrevious: () => t("calendar.a11y.previousPeriod"),
  }

  const beginInputEditing = () => {
    if (disabled || readOnly || restoringFocus.current) return
    editingRef.current = true
    const parsed = parseDateText(draft, locale)
    if (editFormat === "iso" && parsed && !rangeError(parsed)) setDraft(dateToValue(parsed))
    if (openOnFocus && !open) {
      setOpenedFromInput(true)
      handlePopoverOpenChange(true)
    }
  }

  const showInlineClear = clearable && Boolean(draft)

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={handlePopoverOpenChange}>
        <DatePickerAnchor enabled={yearMonthNavigation}>
        <div className="relative w-full">
          <Input
            {...inputProps}
            ref={inputRef}
            type="text"
            value={draft}
            placeholder={datePlaceholder}
            disabled={disabled}
            className={cn(
              "pr-[var(--ui-icon-button-size,2.5rem)]",
              showInlineClear && "pr-[calc(var(--ui-icon-button-size,2.5rem)*2)]",
              inputError && "aria-invalid:border-destructive",
              className,
            )}
            aria-invalid={inputError ? true : inputProps["aria-invalid"]}
            aria-describedby={describedBy}
            aria-errormessage={inputError ? inputErrorId : inputProps["aria-errormessage"]}
            onChange={(event) => handleInputChange(event.currentTarget.value)}
            onFocus={(event) => {
              beginInputEditing()
              inputProps.onFocus?.(event)
            }}
            onClick={(event) => {
              if (openOnFocus) beginInputEditing()
              inputProps.onClick?.(event)
            }}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
          />
          {showInlineClear && (
            <Button
              type="button" variant="ghost" size="icon" aria-label={t("lookup.clear")}
              disabled={disabled || readOnly}
              className="absolute right-[var(--ui-icon-button-size,2.5rem)] top-0 h-full border-0"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => selectDate(undefined)}
            ><X className="h-3.5 w-3.5" aria-hidden="true" /></Button>
          )}
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("calendar.a11y.region")}
              disabled={disabled || readOnly}
              onClick={() => setOpenedFromInput(false)}
              className="absolute right-0 top-0 h-full rounded-l-none border-0"
            >
              <CalendarIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
        </div>
        </DatePickerAnchor>
        <PopoverContent
          align="start"
          className={cn("w-[280px] p-0", yearMonthNavigation && "w-[var(--ui-calendar-width,280px)] rounded-[var(--ui-calendar-radius,7px)]", popoverClassName)}
          onOpenAutoFocus={(event) => {
            if (openedFromInput) event.preventDefault()
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            restoringFocus.current = true
            inputRef.current?.focus({ preventScroll: true })
            restoringFocus.current = false
          }}
          onEscapeKeyDown={(event) => {
            if (yearMonthNavigation || openOnFocus) event.stopPropagation()
          }}
          onPointerDown={(event) => {
            // Finish the pointer action before blur reformats a controlled draft.
            // Keyboard focus movement remains owned by the calendar and browser.
            // Bubble after Radix's capture phase has classified the press as inside.
            if (!(yearMonthNavigation || openOnFocus) || event.button !== 0) return
            const target = event.target
            if (inputRef.current?.ownerDocument.activeElement === inputRef.current
              && target instanceof Element && target.closest('button')) event.preventDefault()
          }}
          onInteractOutside={(event) => {
            if (openOnFocus && event.detail.originalEvent.target === inputRef.current) event.preventDefault()
          }}
        >
          {periodPanel ? (
            <CalendarPeriodPanel
              mode={periodPanel} month={displayMonth} decade={decade} locale={locale}
              label={periodPanel === "years" ? t("gantt.viewMode.year") : t("calendar.month")}
              previousLabel={labels.labelPrevious()} nextLabel={labels.labelNext()} minDate={minDate} maxDate={maxDate}
              onPrevious={() => {
                if (periodPanel === "years") setDecade((current) => current - 10)
                else setDisplayMonth(makeLocalDate(displayMonth.getFullYear() - 1, displayMonth.getMonth() + 1, 1)!)
              }}
              onNext={() => {
                if (periodPanel === "years") setDecade((current) => current + 10)
                else setDisplayMonth(makeLocalDate(displayMonth.getFullYear() + 1, displayMonth.getMonth() + 1, 1)!)
              }}
              onHeadingClick={() => {
                setDecade(Math.floor(displayMonth.getFullYear() / 10) * 10)
                setPeriodPanel("years")
              }}
              onSelect={(value) => {
                if (disabled || readOnly) return
                if (periodPanel === "years") {
                  setDisplayMonth(makeLocalDate(value, displayMonth.getMonth() + 1, 1)!)
                  setPeriodPanel("months")
                } else {
                  setDisplayMonth(makeLocalDate(displayMonth.getFullYear(), value + 1, 1)!)
                  setOpenedFromInput(false)
                  setPeriodPanel(null)
                }
              }}
            />
          ) : <>
          <DatePickerMonthPickerContext.Provider value={datePickerCaptionContext}>
            <Calendar
              className={yearMonthNavigation ? "w-full p-[var(--ui-calendar-padding,10.5px)] [--cell-size:var(--ui-calendar-day-size,35.2px)]" : undefined}
              classNames={yearMonthNavigation ? {
                button_previous: cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-[var(--ui-calendar-nav-size,26.5px)] w-[var(--ui-calendar-nav-size,26.5px)] p-0 aria-disabled:opacity-50"),
                button_next: cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-[var(--ui-calendar-nav-size,26.5px)] w-[var(--ui-calendar-nav-size,26.5px)] p-0 aria-disabled:opacity-50"),
                month_caption: "flex h-[var(--ui-calendar-nav-size,26.5px)] w-full items-center justify-center px-[var(--ui-calendar-nav-size,26.5px)]",
              } : undefined}
              mode="single"
              selected={selectedDate}
              onSelect={selectDate}
              disabled={disabledDates.length ? disabledDates : undefined}
              month={displayMonth}
              onMonthChange={(month) => {
                setDisplayMonth(month)
                setMonthPickerOpen(false)
              }}
              startMonth={minDate}
              endMonth={maxDate}
              captionLayout="label"
              fixedWeeks
              formatters={formatters}
              labels={labels}
              components={{ MonthCaption: DatePickerMonthCaption }}
              autoFocus={!openedFromInput}
            />
          </DatePickerMonthPickerContext.Provider>
          <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || readOnly || todayUnavailable}
              onClick={() => selectDate(today)}
            >
              {t("calendar.today")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || readOnly}
              onClick={() => selectDate(undefined)}
            >
              {t("lookup.clear")}
            </Button>
          </div>
          </>}
        </PopoverContent>
      </Popover>
      {inputError && (
        <p id={inputErrorId} role="alert" className="mt-1 text-sm text-destructive">
          {inputError}
        </p>
      )}
    </div>
  )
}
