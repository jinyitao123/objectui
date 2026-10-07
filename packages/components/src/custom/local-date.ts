/**
 * Convert dates at the UI boundary without interpreting a date-only value as
 * UTC midnight. Calendar values are local `YYYY-MM-DD` strings.
 */
export function dateToValue(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Parse a date-only value on local calendar boundaries, without UTC rollover. */
export function toCalendarDate(value: Date | string | undefined): Date | undefined {
  if (value == null || value === "") return undefined

  const text = value instanceof Date ? dateToValue(value) : value
  const dateOnly = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!dateOnly) {
    const parsed = new Date(text)
    if (Number.isNaN(parsed.getTime())) return undefined
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
  }

  const year = Number(dateOnly[1])
  const month = Number(dateOnly[2])
  const day = Number(dateOnly[3])
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
