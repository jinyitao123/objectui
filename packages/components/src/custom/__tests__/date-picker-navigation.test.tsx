import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '@object-ui/i18n'
import { DatePicker, type DatePickerProps } from '../date-picker'
import { CompositeDialog } from '../composite-dialog'

function Harness({ onValueChange, ...props }: DatePickerProps) {
  const [value, setValue] = React.useState(props.value ?? '2026-10-07')
  return <DatePicker {...props} value={value} aria-label="Due date" onValueChange={(next) => {
    setValue(next)
    onValueChange?.(next)
  }} />
}

function renderPicker(props: DatePickerProps = {}, language = 'en') {
  return render(<I18nProvider persistLanguage={false} config={{ defaultLanguage: language, detectBrowserLanguage: false }}>
    <Harness {...props} />
  </I18nProvider>)
}

function ControlledDialogPicker() {
  const [value, setValue] = React.useState('2026-10-07')
  const [blurs, setBlurs] = React.useState(0)
  return <CompositeDialog open title="Edit deadline" onOpenChange={() => {}}>
    <button type="button">First focus</button>
    <form data-blurs={blurs}>
      <DatePicker value={value} onValueChange={setValue} aria-label="Due date"
        onBlur={() => setBlurs((count) => count + 1)}
        openOnFocus editFormat="iso" calendarNavigation="year-month" />
    </form>
  </CompositeDialog>
}

describe('DatePicker optional editing and period navigation', () => {
  it.each(['caption', 'next', 'day'])('keeps the first %s pointer action after controlled typing inside a dialog', async (action) => {
    const user = userEvent.setup()
    render(<I18nProvider persistLanguage={false} config={{ defaultLanguage: 'en', detectBrowserLanguage: false }}>
      <ControlledDialogPicker />
    </I18nProvider>)
    const input = screen.getByRole('textbox', { name: 'Due date' })
    await user.click(input)
    await user.clear(input)
    await user.keyboard('2026-11-15')
    expect(input).toHaveFocus()
    const name = action === 'caption' ? 'November 2026' : action === 'next' ? 'Next period' : 'Monday, November 16, 2026'
    const target = screen.getByRole('button', { name, hidden: true })
    await user.pointer({ keys: '[MouseLeft>]', target })
    expect(input).toHaveFocus()
    await user.pointer({ keys: '[/MouseLeft]' })
    if (action === 'caption') expect(screen.getByRole('group', { name: 'Year', hidden: true })).toBeInTheDocument()
    else if (action === 'next') expect(screen.getByRole('button', { name: 'December 2026', hidden: true })).toBeInTheDocument()
    else expect(input).toHaveValue('November 16, 2026')
    expect(screen.getByRole('dialog', { name: 'Edit deadline' })).toBeInTheDocument()
  })

  it('opens on focus without stealing typing focus, edits ISO and formats on blur', async () => {
    const user = userEvent.setup()
    renderPicker({ openOnFocus: true, editFormat: 'iso' }, 'zh')
    const input = screen.getByRole('textbox', { name: 'Due date' })
    expect(input).toHaveValue('2026年10月7日')
    await user.click(input)
    expect(input).toHaveFocus()
    expect(input).toHaveValue('2026-10-07')
    expect(screen.getByRole('grid')).toBeInTheDocument()
    await user.clear(input)
    await user.type(input, '2026-11-15')
    expect(input).toHaveFocus()
    fireEvent.blur(input)
    expect(input).toHaveValue('2026年11月15日')
  })

  it('closes on Escape without reopening on restored focus or reaching the parent', async () => {
    const user = userEvent.setup()
    const parentKey = vi.fn()
    render(<div onKeyDown={parentKey}><Harness openOnFocus editFormat="iso" /></div>)
    const input = screen.getByRole('textbox', { name: 'Due date' })
    await user.click(input)
    expect(screen.getByRole('grid')).toBeInTheDocument()
    parentKey.mockClear()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(input).toHaveFocus()
    expect(parentKey).not.toHaveBeenCalled()
    await user.click(input)
    expect(screen.getByRole('grid')).toBeInTheDocument()
    await user.click(document.body)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(input).toHaveFocus()
  })

  it.each(['2026-10-07', 'bad date'])('clears %s inline once and clears parsing validity', async (value) => {
    const user = userEvent.setup()
    const changed = vi.fn()
    const validity = vi.fn()
    renderPicker({ value, clearable: true, onValueChange: changed, onValidityChange: validity })
    const input = screen.getByRole('textbox', { name: 'Due date' })
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(changed).toHaveBeenCalledExactlyOnceWith('')
    expect(input).toHaveValue('')
    expect(input).not.toHaveAttribute('aria-invalid', 'true')
    expect((input as HTMLInputElement).validity.valid).toBe(true)
    expect(validity).toHaveBeenLastCalledWith(true)
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
  })

  it.each([{ disabled: true }, { readOnly: true }])('prevents opening or clearing a protected input %j', async (protection) => {
    const user = userEvent.setup()
    const changed = vi.fn()
    renderPicker({ ...protection, clearable: true, openOnFocus: true, onValueChange: changed })
    const input = screen.getByRole('textbox', { name: 'Due date' })
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Calendar' })).toBeDisabled()
    await user.click(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(changed).not.toHaveBeenCalled()
  })

  it('keeps a new keyboard draft editable immediately after inline clear', async () => {
    const user = userEvent.setup()
    renderPicker({ clearable: true, openOnFocus: true, editFormat: 'iso' })
    const input = screen.getByRole('textbox', { name: 'Due date' })
    await user.click(input)
    await user.click(within(input.parentElement!).getByRole('button', { name: 'Clear' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(input).toHaveFocus()
    await user.keyboard('2026-11-15')
    expect(input).toHaveValue('2026-11-15')
    expect((input as HTMLInputElement).validity.valid).toBe(true)
  })

  it('navigates twelve years, then months, then the day grid without submitting a parent form', async () => {
    const user = userEvent.setup()
    const submitted = vi.fn((event: React.FormEvent) => event.preventDefault())
    const changed = vi.fn()
    render(<I18nProvider persistLanguage={false} config={{ defaultLanguage: 'en', detectBrowserLanguage: false }}>
      <form onSubmit={submitted}><Harness calendarNavigation="year-month" onValueChange={changed} popoverClassName="host-calendar" /></form>
    </I18nProvider>)
    await user.click(screen.getByRole('button', { name: 'Calendar' }))
    expect(screen.getByRole('dialog')).toHaveClass('host-calendar')
    await user.click(screen.getByRole('button', { name: 'October 2026' }))
    const years = screen.getByRole('group', { name: 'Year' })
    expect(within(years).getAllByRole('button')).toHaveLength(12)
    expect(within(years).getByRole('button', { name: '2019' })).toBeInTheDocument()
    expect(within(years).getByRole('button', { name: '2030' })).toBeInTheDocument()
    expect(within(years).getByRole('button', { name: '2026' })).toHaveFocus()
    expect(screen.queryByRole('grid')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Today' })).not.toBeInTheDocument()
    await user.keyboard('{ArrowRight}{Enter}')
    const months = screen.getByRole('group', { name: 'Month' })
    expect(within(months).getAllByRole('button')).toHaveLength(12)
    expect(within(months).getByRole('button', { name: 'October' })).toHaveFocus()
    await user.keyboard('{ArrowRight}{Enter}')
    expect(screen.getByRole('button', { name: 'November 2027' })).toBeInTheDocument()
    expect(screen.getByRole('grid')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
    expect(changed).not.toHaveBeenCalled()
    expect(submitted).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Monday, November 15, 2027' }))
    expect(changed).toHaveBeenCalledExactlyOnceWith('2027-11-15')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByRole('textbox')).toHaveValue('November 15, 2027')
  })

  it('honors year, month and day boundaries while moving decades and years', async () => {
    const user = userEvent.setup()
    renderPicker({ calendarNavigation: 'year-month', minDate: '2025-06-17', maxDate: '2030-03-18' })
    await user.click(screen.getByRole('button', { name: 'Calendar' }))
    await user.click(screen.getByRole('button', { name: 'October 2026' }))
    expect(screen.getByRole('button', { name: '2019' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous period' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Next period' }))
    expect(screen.getByText('2030 - 2039')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next period' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '2031' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '2030' }))
    expect(screen.getByRole('button', { name: 'April' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next period' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Previous period' }))
    expect(screen.getByRole('button', { name: '2029' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'April' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: '2029' }))
    await user.click(screen.getByRole('button', { name: '2025' }))
    expect(screen.getByRole('button', { name: 'May' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'June' }))
    expect(screen.getByRole('button', { name: 'Monday, June 16, 2025' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Tuesday, June 17, 2025' })).toBeEnabled()
  })

  it('retains locale text, closed-on-focus and the existing month picker by default', async () => {
    const user = userEvent.setup()
    renderPicker()
    await user.click(screen.getByRole('textbox'))
    expect(screen.getByRole('textbox')).toHaveValue('October 7, 2026')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Calendar' }))
    expect(screen.getByRole('dialog')).toHaveClass('w-[280px]', 'p-0')
    await user.click(screen.getByRole('button', { name: 'October 2026' }))
    expect(screen.getByRole('group', { name: 'Month' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Year' })).not.toBeInTheDocument()
  })

  it('preserves Escape propagation for callers that omit the focus/navigation options', async () => {
    const user = userEvent.setup()
    const parentKey = vi.fn()
    render(<I18nProvider persistLanguage={false} config={{ defaultLanguage: 'en', detectBrowserLanguage: false }}><div onKeyDown={parentKey}><Harness /></div></I18nProvider>)
    await user.click(screen.getByRole('button', { name: 'Calendar' }))
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(parentKey.mock.calls.some(([event]) => event.key === 'Escape')).toBe(true)
  })
})
