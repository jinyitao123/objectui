import { describe, expect, it } from 'vitest';
import { limitInferredColumns } from './autoLayout';

describe('compact profile inferred form columns', () => {
  it('caps only the opt-in profile at two columns', () => {
    expect(limitInferredColumns(4, 'compact-enterprise')).toBe(2);
    expect(limitInferredColumns(2, 'compact-enterprise')).toBe(2);
    expect(limitInferredColumns(1, 'compact-enterprise')).toBe(1);
    expect(limitInferredColumns(4)).toBe(4);
    expect(limitInferredColumns(4, 'other')).toBe(4);
  });
});
