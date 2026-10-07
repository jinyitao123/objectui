import React from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { I18nProvider } from "@object-ui/i18n"

import { DateRangeControl, type DateRangeControlProps } from "../date-range-control"

function renderRangeControl(props: Partial<DateRangeControlProps> = {}) {
  const onValueChange = props.onValueChange ?? vi.fn()
  const result = render(
    <I18nProvider
      persistLanguage={false}
      config={{ defaultLanguage: "en", detectBrowserLanguage: false }}
    >
      <DateRangeControl
        label="Sales date range"
        startPlaceholder="Start"
        endPlaceholder="End"
        onValueChange={onValueChange}
        {...props}
      />
    </I18nProvider>,
  )
  return { ...result, onValueChange }
}

function calendarButtonLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    calendar: "gregory",
    dateStyle: "full",
  }).format(date)
}

async function openCalendar(user: ReturnType<typeof userEvent.setup>) {
  const trigger = screen.getByRole("button", { name: "Sales date range" })
  await user.click(trigger)
  return { trigger, grids: screen.getAllByRole("grid") }
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("DateRangeControl", () => {
  it("commits only after a second calendar selection and renders two real months", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 5, 12))
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    renderRangeControl({ onValueChange })

    const { trigger, grids } = await openCalendar(user)
    expect(grids).toHaveLength(2)

    await user.click(screen.getByRole("button", { name: calendarButtonLabel(new Date(2026, 9, 5)) }))
    expect(onValueChange).not.toHaveBeenCalled()
    expect(screen.getAllByRole("grid")).toHaveLength(2)

    await user.click(screen.getByRole("button", { name: calendarButtonLabel(new Date(2026, 9, 10)) }))
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ from: "2026-10-05", to: "2026-10-10" })
    expect(screen.queryAllByRole("grid")).toHaveLength(0)
    expect(trigger).toBeInTheDocument()
  })

  it("cancels an unfinished draft on Escape without changing the committed value and restores focus", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 5, 12))
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    const value = { from: "2026-10-01", to: "2026-10-03" }
    renderRangeControl({ value, onValueChange })

    const { trigger } = await openCalendar(user)
    await user.click(screen.getByRole("button", { name: calendarButtonLabel(new Date(2026, 9, 6)) }))
    expect(onValueChange).not.toHaveBeenCalled()

    await user.keyboard("{Escape}")
    expect(onValueChange).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()
    expect(trigger).toHaveTextContent(
      new Intl.DateTimeFormat("en-US", { calendar: "gregory", year: "numeric", month: "numeric", day: "numeric" })
        .format(new Date(2026, 9, 1)),
    )
  })

  it("clears the complete value only when the clear action is activated", async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    renderRangeControl({ value: { from: "2026-10-01", to: "2026-10-03" }, clearLabel: "Clear dates", onValueChange })

    await openCalendar(user)
    await user.click(screen.getByRole("button", { name: "Clear dates" }))
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(undefined)
    expect(screen.queryAllByRole("grid")).toHaveLength(0)
  })

  it("emits host-configured local day offsets, including the observed 7- and 30-day ranges", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 5, 12))
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    renderRangeControl({
      onValueChange,
      quickRanges: [
        { label: "今天", daysBack: 0 },
        { label: "最近7天", daysBack: 7 },
        { label: "最近30天", daysBack: 30 },
      ],
    })

    await openCalendar(user)
    await user.click(screen.getByRole("button", { name: "今天" }))
    expect(onValueChange).toHaveBeenLastCalledWith({ from: "2026-10-05", to: "2026-10-05" })

    await openCalendar(user)
    await user.click(screen.getByRole("button", { name: "最近7天" }))
    expect(onValueChange).toHaveBeenLastCalledWith({ from: "2026-09-28", to: "2026-10-05" })

    await openCalendar(user)
    await user.click(screen.getByRole("button", { name: "最近30天" }))
    expect(onValueChange).toHaveBeenLastCalledWith({ from: "2026-09-05", to: "2026-10-05" })
  })

  it("reopens from the committed start month and shows the adjacent month", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 5, 12))
    const user = userEvent.setup()

    function ControlledRange() {
      const [value, setValue] = React.useState<DateRangeControlProps["value"]>()
      return (
        <DateRangeControl
          label="Sales date range"
          onValueChange={setValue}
          quickRanges={[{ label: "Last 30 days", daysBack: 30 }]}
          value={value}
        />
      )
    }

    render(
      <I18nProvider
        persistLanguage={false}
        config={{ defaultLanguage: "en", detectBrowserLanguage: false }}
      >
        <ControlledRange />
      </I18nProvider>,
    )

    await openCalendar(user)
    await user.click(screen.getByRole("button", { name: "Last 30 days" }))
    await user.click(screen.getByRole("button", { name: "Sales date range" }))

    expect(screen.getByText("September 2026")).toBeInTheDocument()
    expect(screen.getByText("October 2026")).toBeInTheDocument()
  })

  it("uses local calendar arithmetic across daylight-saving transitions", async () => {
    const previousTimezone = process.env.TZ
    process.env.TZ = "America/New_York"
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 2, 14, 0, 30))
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    try {
      renderRangeControl({ onValueChange, quickRanges: [{ label: "Last 7 inclusive", daysBack: 6 }] })
      await openCalendar(user)
      await user.click(screen.getByRole("button", { name: "Last 7 inclusive" }))
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ from: "2026-03-08", to: "2026-03-14" })
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ
      else process.env.TZ = previousTimezone
    }
  })

  it("disables dates and quick ranges outside host-provided bounds", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date(2026, 9, 5, 12))
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    renderRangeControl({
      onValueChange,
      minDate: "2026-10-01",
      maxDate: "2026-10-10",
      quickRanges: [{ label: "Last 30 days", daysBack: 30 }],
    })

    await openCalendar(user)
    expect(screen.getByRole("button", { name: calendarButtonLabel(new Date(2026, 9, 11)) })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Last 30 days" })).toBeDisabled()
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("does not open when disabled", async () => {
    const user = userEvent.setup()
    renderRangeControl({ disabled: true })
    const trigger = screen.getByRole("button", { name: "Sales date range" })

    expect(trigger).toBeDisabled()
    await user.click(trigger)
    expect(screen.queryByRole("grid")).toBeNull()
  })
})
