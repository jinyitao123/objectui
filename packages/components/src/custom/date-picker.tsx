/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

"use client"

import * as React from "react"
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import type { Matcher, MonthCaptionProps } from "react-day-picker"
import { useDisplayLocale, useObjectTranslation } from "@object-ui/i18n"

import { cn } from "../lib/utils"
import { Button, Input } from "./profile-controls"
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
  /** Existing field/schema copy and metadata remain the source of the label. */
  label?: string
  placeholder?: string
  className?: string
  disabled?: boolean
  minDate?: Date | string
  maxDate?: Date | string
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
        className="gap-1 font-medium"
      >
        {monthCaption}
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
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

export function DatePicker({
  date: dateProp,
  onDateChange,
  value: valueProp,
  onValueChange,
  label,
  placeholder,
  className,
  disabled,
  minDate: minDateValue,
  maxDate: maxDateValue,
  ...inputProps
}: DatePickerProps) {
  const locale = useDisplayLocale()
  const { t, language } = useObjectTranslation()
  const datePlaceholder = placeholder ?? t("calendar.datePickerPlaceholder")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const editingRef = React.useRef(false)
  const inputErrorId = React.useId()
  const monthPickerId = React.useId()
  const [open, setOpen] = React.useState(false)
  const [monthPickerOpen, setMonthPickerOpen] = React.useState(false)

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
    inputRef.current?.setCustomValidity(nextError ?? "")
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
    editingRef.current = false
    const nextValue = nextDate ? dateToValue(nextDate) : ""
    const nextError = nextDate ? rangeError(nextDate) : undefined
    setDraft(nextDate && !nextError ? formatCalendarDate(nextDate, locale) : nextValue)
    setInputError(nextError ?? "")
    if (nextDate) setDisplayMonth(nextDate)
    inputRef.current?.setCustomValidity(nextError ?? "")
    emitDate(nextDate)
    setOpen(false)
  }

  const handleInputChange = (nextValue: string) => {
    setDraft(nextValue)
    if (!nextValue.trim()) {
      setInputError("")
      inputRef.current?.setCustomValidity("")
      emitDate(undefined)
      return
    }

    const parsed = parseDateText(nextValue, locale)
    const nextError = parsed ? rangeError(parsed) : invalidFormatMessage()
    setInputError(nextError ?? "")
    inputRef.current?.setCustomValidity(nextError ?? "")
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
      event.currentTarget.setCustomValidity(nextError ?? "")
      if (!nextError) setDraft(formatCalendarDate(parsed, locale))
    } else if (event.currentTarget.value.trim()) {
      const message = invalidFormatMessage()
      setInputError(message)
      event.currentTarget.setCustomValidity(message)
    }
    inputProps.onBlur?.(event)
  }

  const handleInputKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      handlePopoverOpenChange(true)
    } else if (event.key === "Enter" && inputError) {
      event.preventDefault()
      inputRef.current?.reportValidity()
    }
    inputProps.onKeyDown?.(event)
  }

  const handlePopoverOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    setMonthPickerOpen(false)
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
    onToggleMonthPicker: () => setMonthPickerOpen((current) => !current),
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

  return (
    <div className="w-full">
      <Popover open={open} onOpenChange={handlePopoverOpenChange}>
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
              inputError && "aria-invalid:border-destructive",
              className,
            )}
            aria-invalid={inputError ? true : inputProps["aria-invalid"]}
            aria-describedby={describedBy}
            aria-errormessage={inputError ? inputErrorId : inputProps["aria-errormessage"]}
            onChange={(event) => handleInputChange(event.currentTarget.value)}
            onFocus={(event) => {
              editingRef.current = true
              inputProps.onFocus?.(event)
            }}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
          />
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t("calendar.a11y.region")}
              disabled={disabled}
              className="absolute right-0 top-0 h-full rounded-l-none border-0"
            >
              <CalendarIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </PopoverTrigger>
        </div>
        <PopoverContent
          align="start"
          className="w-[280px] p-0"
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            inputRef.current?.focus({ preventScroll: true })
          }}
        >
          <DatePickerMonthPickerContext.Provider value={datePickerCaptionContext}>
            <Calendar
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
              autoFocus
            />
          </DatePickerMonthPickerContext.Provider>
          <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled || todayUnavailable}
              onClick={() => selectDate(today)}
            >
              {t("calendar.today")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => selectDate(undefined)}
            >
              {t("lookup.clear")}
            </Button>
          </div>
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
