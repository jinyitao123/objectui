import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { I18nProvider } from '@object-ui/i18n'

import { DatePicker } from '../date-picker'

function renderDatePicker(language: 'en' | 'zh', placeholder?: string) {
  return render(
    <I18nProvider
      persistLanguage={false}
      config={{ defaultLanguage: language, detectBrowserLanguage: false }}
    >
      <DatePicker aria-label="Order date" placeholder={placeholder} />
    </I18nProvider>,
  )
}

describe('DatePicker default placeholder localization', () => {
  it.each([
    ['en', 'Pick a date'],
    ['zh', '请选择日期'],
  ] as const)('uses the %s calendar placeholder by default', (language, expected) => {
    renderDatePicker(language)

    expect(screen.getByRole('textbox', { name: 'Order date' })).toHaveAttribute(
      'placeholder',
      expected,
    )
  })

  it('preserves an explicitly authored placeholder', () => {
    renderDatePicker('zh', 'Choose the delivery date')

    expect(screen.getByRole('textbox', { name: 'Order date' })).toHaveAttribute(
      'placeholder',
      'Choose the delivery date',
    )
  })

  it('preserves an explicitly empty placeholder', () => {
    renderDatePicker('en', '')

    expect(screen.getByRole('textbox', { name: 'Order date' })).toHaveAttribute(
      'placeholder',
      '',
    )
  })
})
