/**
 * ObjectUI
 * Copyright (c) 2024-present ObjectStack Inc.
 */
import { describe, expect, it } from 'vitest';
import type { GridColumnDefinition } from '../field-types.js';
import { GridColumnDefinitionSchema } from '../zod/index.zod.js';

const expr = 'record.quantity * record.taxed_unit_price * (1 - record.discount_rate / 100)';

describe('GridField column type and schema contract', () => {
  it('types and validates computed currency columns with the runtime inputs', () => {
    const column: GridColumnDefinition = {
      name: 'taxed_subtotal',
      type: 'currency',
      computed: true,
      expr,
      scale: 4,
      prefix: '¥',
    };

    const parsed = GridColumnDefinitionSchema.safeParse(column);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data).toMatchObject(column);
  });

  it('requires expr and refuses the expression and formula spellings', () => {
    const alias = GridColumnDefinitionSchema.safeParse({
      name: 'taxed_subtotal', type: 'currency', computed: true, expression: expr,
    });
    expect(alias.success).toBe(false);
    expect(JSON.stringify(alias.error?.issues)).toContain('expression');
    expect(JSON.stringify(alias.error?.issues)).toContain('expr');

    expect(GridColumnDefinitionSchema.safeParse({
      name: 'taxed_subtotal', type: 'currency', computed: true, formula: expr,
    }).success).toBe(false);
  });
});
