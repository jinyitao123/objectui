import { describe, expect, it } from 'vitest';
import {
  projectRelationshipDraftValues,
  resolveRelationshipCollectionMetadata,
  type RelationshipObjectSchemaLike,
} from './RelationshipCollectionEditor';

describe('relationship collection metadata', () => {
  const contactSchema: RelationshipObjectSchemaLike = {
    name: 'contact',
    fields: {
      customer_id: { type: 'lookup', reference: 'customer' },
      full_name: { type: 'text' },
      owner_id: { type: 'lookup', reference: 'user' },
      active: { type: 'boolean', widget: 'checkbox' },
    },
  };

  it('resolves the child lookup from metadata and keeps other lookup fields editable', () => {
    expect(resolveRelationshipCollectionMetadata(contactSchema, 'customer')).toEqual({
      ok: true,
      relationshipField: 'customer_id',
      fieldNames: ['full_name', 'owner_id', 'active'],
    });
  });

  it('uses an explicit relationship field when the child has multiple parent links', () => {
    const schema: RelationshipObjectSchemaLike = {
      fields: {
        customer_id: { type: 'lookup', reference: 'customer' },
        contact_id: { type: 'lookup', reference: 'contact' },
        channel_value: { type: 'text' },
      },
    };

    expect(resolveRelationshipCollectionMetadata(schema, 'contact', 'contact_id')).toMatchObject({
      ok: true,
      relationshipField: 'contact_id',
      fieldNames: ['customer_id', 'channel_value'],
    });
  });

  it('rejects an explicit field that does not point to the requested parent', () => {
    expect(resolveRelationshipCollectionMetadata(contactSchema, 'account', 'customer_id')).toMatchObject({
      ok: false,
      error: {
        kind: 'wrong-reference',
        fieldName: 'customer_id',
      },
    });
  });

  it('rejects missing and non-relationship fields instead of inventing a relation', () => {
    expect(resolveRelationshipCollectionMetadata(contactSchema, 'customer', 'missing')).toMatchObject({
      ok: false,
      error: { kind: 'missing-field', fieldName: 'missing' },
    });
    expect(resolveRelationshipCollectionMetadata({
      fields: { customer_id: { type: 'text', reference: 'customer' } },
    }, 'customer', 'customer_id')).toMatchObject({
      ok: false,
      error: { kind: 'unsupported-field-type', fieldName: 'customer_id' },
    });
    expect(resolveRelationshipCollectionMetadata({ fields: { name: { type: 'text' } } }, 'customer'))
      .toMatchObject({ ok: false, error: { kind: 'missing-relationship' } });
  });

  it('projects only declared child fields so relationship IDs and draft-only keys stay out', () => {
    expect(projectRelationshipDraftValues({
      full_name: 'Ada Lovelace',
      customer_id: 'customer-1',
      draftKey: 'row-1',
      extra: 'not in metadata',
    }, ['full_name', 'owner_id'])).toEqual({ full_name: 'Ada Lovelace' });
  });
});
