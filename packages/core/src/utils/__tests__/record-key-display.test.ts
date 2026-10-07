import { describe, expect, it } from 'vitest';
import { isDatabaseKeyDisplay, isDatabaseKeyField } from '../record-key-display.js';

describe('isDatabaseKeyDisplay', () => {
  it('recognizes raw, short, and formatted database keys', () => {
    expect(isDatabaseKeyDisplay('aRecord123456789', 'aRecord123456789')).toBe(true);
    expect(isDatabaseKeyDisplay('#aRecord1…', 'aRecord123456789')).toBe(true);
    expect(isDatabaseKeyDisplay('Record #aRecord123456789', 'aRecord123456789')).toBe(true);
    expect(isDatabaseKeyDisplay('  aRecord123456789  ', 'aRecord123456789')).toBe(true);
  });

  it('keeps readable business names that happen to look code-like', () => {
    expect(isDatabaseKeyDisplay('CRM-2048', 'aRecord123456789')).toBe(false);
    expect(isDatabaseKeyDisplay('Acme Corporation', 'aRecord123456789')).toBe(false);
  });
});

describe('isDatabaseKeyField', () => {
  it('recognizes the reserved row identity fields and preserves business IDs', () => {
    expect(isDatabaseKeyField('id')).toBe(true);
    expect(isDatabaseKeyField('_id')).toBe(true);
    expect(isDatabaseKeyField('customer_code')).toBe(false);
  });
});
