import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { registerAllFields } from '@object-ui/fields';
import { PermissionProvider } from '@object-ui/permissions';
import type { DataSource } from '@object-ui/types';
import {
  RelationshipCollectionEditor,
  type RelationshipCollectionEditorController,
  type RelationshipDraftRow,
} from './RelationshipCollectionEditor';

registerAllFields();

const CONTACT_SCHEMA = {
  name: 'contact',
  fields: {
    customer_id: { type: 'lookup', label: 'Customer', reference: 'customer', required: true },
    full_name: { type: 'text', label: 'Full name', required: true },
    category: {
      type: 'select',
      label: 'Category',
      defaultValue: 'standard',
      options: [
        { label: 'Standard', value: 'standard' },
        { label: 'Strategic', value: 'strategic' },
      ],
    },
    manager_id: { type: 'lookup', label: 'Manager', reference: 'user' },
    is_primary: { type: 'boolean', label: 'Primary', widget: 'checkbox' },
  },
};

const CHANNEL_SCHEMA = {
  name: 'contact_channel',
  fields: {
    contact_id: { type: 'lookup', label: 'Contact', reference: 'contact', required: true },
    channel_type: {
      type: 'select',
      label: 'Channel type',
      defaultValue: 'email',
      options: [
        { label: 'Email', value: 'email' },
        { label: 'Mobile', value: 'mobile' },
      ],
    },
    value: { type: 'text', label: 'Value', required: true },
  },
};

const USER_SCHEMA = {
  name: 'user',
  fields: { name: { type: 'text', label: 'Name' } },
};

function makeDataSource() {
  const schemas: Record<string, unknown> = {
    contact: CONTACT_SCHEMA,
    contact_channel: CHANNEL_SCHEMA,
    user: USER_SCHEMA,
  };
  const create = vi.fn();
  const update = vi.fn();
  const remove = vi.fn();
  const find = vi.fn(async () => ({ data: [] }));
  const getObjectSchema = vi.fn(async (objectName: string) => schemas[objectName]);
  const dataSource = {
    getObjectSchema,
    find,
    findOne: vi.fn(),
    create,
    update,
    delete: remove,
  } as unknown as DataSource;
  return { dataSource, create, update, remove, getObjectSchema };
}

interface ContactHarnessProps {
  dataSource: DataSource;
  initialRows?: RelationshipDraftRow[];
  onControllerReady?: (controller: RelationshipCollectionEditorController | null) => void;
  onDraftChange?: (rows: RelationshipDraftRow[]) => void;
  includeRow?: (row: RelationshipDraftRow) => boolean;
  presentation?: 'cards' | 'rows';
  columns?: number;
  fields?: readonly string[];
}

function ContactHarness({
  dataSource,
  initialRows = [],
  onControllerReady,
  onDraftChange,
  includeRow,
  presentation,
  columns,
  fields,
}: ContactHarnessProps) {
  const [rows, setRows] = useState(initialRows);
  return (
    <RelationshipCollectionEditor
      parentObjectName="customer"
      childObjectName="contact"
      relationshipField="customer_id"
      dataSource={dataSource}
      value={rows}
      fields={fields}
      onChange={(next) => {
        onDraftChange?.(next);
        setRows(next);
      }}
      onControllerReady={onControllerReady}
      includeRow={includeRow}
      presentation={presentation}
      columns={columns}
      title="Contacts"
      itemLabel="Contact"
      addLabel="Add contact"
      createDraftValues={() => ({ category: 'standard' })}
    />
  );
}

interface NestedHarnessProps {
  dataSource: DataSource;
  onControllerReady?: (controller: RelationshipCollectionEditorController | null) => void;
  includeContact?: (row: RelationshipDraftRow) => boolean;
}

function NestedHarness({ dataSource, onControllerReady, includeContact }: NestedHarnessProps) {
  const [contacts, setContacts] = useState<RelationshipDraftRow[]>([
    { draftKey: 'contact-draft-a', values: {} },
  ]);
  const [channelsByContact, setChannelsByContact] = useState<Record<string, RelationshipDraftRow[]>>({
    'contact-draft-a': [{ draftKey: 'channel-draft-a', values: {} }],
  });

  return (
    <RelationshipCollectionEditor
      parentObjectName="customer"
      childObjectName="contact"
      relationshipField="customer_id"
      dataSource={dataSource}
      value={contacts}
      onChange={setContacts}
      onControllerReady={onControllerReady}
      includeRow={includeContact}
      title="Contacts"
      itemLabel="Contact"
    >
      {({ row, onControllerReady: registerChild }) => (
        <RelationshipCollectionEditor
          parentObjectName="contact"
          childObjectName="contact_channel"
          relationshipField="contact_id"
          dataSource={dataSource}
          value={channelsByContact[row.draftKey] ?? []}
          onChange={(next) => setChannelsByContact((current) => ({ ...current, [row.draftKey]: next }))}
          onControllerReady={registerChild}
          title="Channels"
          itemLabel="Channel"
        />
      )}
    </RelationshipCollectionEditor>
  );
}

describe('RelationshipCollectionEditor', () => {
  it('orders selected controls and keeps model-bound hidden values subject to FLS', async () => {
    const { dataSource, create, update } = makeDataSource();
    let controller: RelationshipCollectionEditorController | null = null;
    const { container } = render(
      <PermissionProvider roles={[{ name: 'limited', label: 'Limited' }]}
        permissions={[{ object: 'contact', roles: { limited: {
          actions: ['create'], fieldPermissions: [{ field: 'manager_id', read: true, write: false }],
        } } }]} userRoles={['limited']}>
        <ContactHarness dataSource={dataSource} fields={['is_primary', 'full_name']}
          initialRows={[{ draftKey: 'selected-contact', values: { full_name: 'Ada', is_primary: true, manager_id: 'user-1' } }]}
          onControllerReady={(next) => { controller = next; }} />
      </PermissionProvider>,
    );
    await screen.findByRole('textbox', { name: 'Full name' });
    expect(Array.from(container.querySelectorAll('[data-field]'), (field) => field.getAttribute('data-field')))
      .toEqual(['is_primary', 'full_name']);
    expect(container.querySelector('[data-field="manager_id"]')).toBeNull();
    const result = await controller!.validate();
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.draft.rows[0].values).toMatchObject({ full_name: 'Ada', is_primary: true });
      expect(result.draft.rows[0].values).not.toHaveProperty('manager_id');
      expect(result.draft.rows[0].values).not.toHaveProperty('customer_id');
    }
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses unknown selected fields and does not silently render a partial field set', async () => {
    const { dataSource, create } = makeDataSource();
    let controller: RelationshipCollectionEditorController | null = null;
    render(<ContactHarness dataSource={dataSource} fields={['full_name', 'missing_field']}
      initialRows={[{ draftKey: 'bad-config', values: { full_name: 'Ada' } }]}
      onControllerReady={(next) => { controller = next; }} />);
    await screen.findByTestId('relationship-collection-error');
    expect(screen.queryByRole('textbox', { name: 'Full name' })).toBeNull();
    const result = await controller!.validate();
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors).toContainEqual(expect.objectContaining({ fieldName: 'missing_field' }));
    expect(create).not.toHaveBeenCalled();
  });

  it('renders metadata fields inline, keeps changes controlled, collects Enter locally, and validates once for the host', async () => {
    const { dataSource, create, update, remove } = makeDataSource();
    const changedRows: RelationshipDraftRow[][] = [];
    let controller: RelationshipCollectionEditorController | null = null;
    const { container } = render(
      <ContactHarness
        dataSource={dataSource}
        onDraftChange={(rows) => changedRows.push(rows)}
        onControllerReady={(next) => { controller = next; }}
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Add contact' }));
    const row = await screen.findByTestId('relationship-draft-row');
    const nameInput = await within(row).findByRole('textbox', { name: 'Full name' });
    expect(container.querySelector('[data-testid="field:contact.customer_id"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="field:contact.category"]')).toBeInTheDocument();
    await within(row).findByTestId('field:contact.manager_id');
    const primary = await within(row).findByRole('checkbox', { name: 'Primary' });

    fireEvent.change(nameInput, { target: { value: 'Ada Lovelace' } });
    fireEvent.click(primary);
    await waitFor(() => expect(changedRows.at(-1)?.[0]?.values).toMatchObject({ full_name: 'Ada Lovelace', is_primary: true }));

    const rowForm = row.querySelector('form');
    expect(rowForm).not.toBeNull();
    fireEvent.submit(rowForm!);
    await waitFor(() => expect(create).not.toHaveBeenCalled());
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect(within(row).queryByRole('button', { name: /apply|save/i })).not.toBeInTheDocument();

    await waitFor(() => expect(controller).not.toBeNull());
    const validation = await controller!.validate();
    expect(validation).toMatchObject({ valid: true });
    if (validation.valid) {
      expect(validation.draft.relationshipField).toBe('customer_id');
      expect(validation.draft.rows[0].values).toMatchObject({
        full_name: 'Ada Lovelace',
        category: 'standard',
        is_primary: true,
      });
      expect(validation.draft.rows[0].values).not.toHaveProperty('customer_id');
    }
    expect(create).not.toHaveBeenCalled();
  });

  it('returns all mounted row-field errors with stable row paths and composes nested collection drafts', async () => {
    const { dataSource } = makeDataSource();
    let controller: RelationshipCollectionEditorController | null = null;
    render(<NestedHarness dataSource={dataSource} onControllerReady={(next) => { controller = next; }} />);

    await screen.findByRole('textbox', { name: 'Full name' });
    await screen.findByRole('textbox', { name: 'Value' });
    expect(document.querySelector('[data-testid="field:contact_channel.contact_id"]')).not.toBeInTheDocument();
    await waitFor(() => expect(controller).not.toBeNull());
    const validation = await controller!.validate();

    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({
          rowKeys: ['contact-draft-a'],
          objectName: 'contact',
          fieldName: 'full_name',
        }),
        expect.objectContaining({
          rowKeys: ['contact-draft-a', 'channel-draft-a'],
          objectName: 'contact_channel',
          fieldName: 'value',
        }),
      ]));
      expect(validation.draft?.rows[0].children[0].childObjectName).toBe('contact_channel');
    }
  });

  it('lets the host omit a blank row from validation without imposing a contact-required policy', async () => {
    const { dataSource } = makeDataSource();
    let controller: RelationshipCollectionEditorController | null = null;
    render(
    <NestedHarness
        dataSource={dataSource}
        onControllerReady={(next) => { controller = next; }}
        includeContact={(row) => Boolean(row.values.full_name)}
      />,
    );
    await screen.findByRole('textbox', { name: 'Full name' });
    await screen.findByRole('textbox', { name: 'Value' });
    await waitFor(() => expect(controller).not.toBeNull());

    const validation = await controller!.validate();
    expect(validation).toMatchObject({ valid: true, draft: { rows: [] } });
  });

  it('refuses a composed row whose required nested editor never registered', async () => {
    const { dataSource } = makeDataSource();
    let controller: RelationshipCollectionEditorController | null = null;
    const [row] = [{ draftKey: 'contact-without-channel-editor', values: { full_name: 'Ada' } }];
    render(
      <RelationshipCollectionEditor
        parentObjectName="customer"
        childObjectName="contact"
        relationshipField="customer_id"
        dataSource={dataSource}
        value={[row]}
        onChange={vi.fn()}
        onControllerReady={(next) => { controller = next; }}
        title="Contacts"
        itemLabel="Contact"
      >
        {() => null}
      </RelationshipCollectionEditor>,
    );
    await screen.findByRole('textbox', { name: 'Full name' });
    await waitFor(() => expect(controller).not.toBeNull());

    const validation = await controller!.validate();
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.errors).toContainEqual(expect.objectContaining({
        rowKeys: ['contact-without-channel-editor'],
        message: 'The nested relationship editor is not ready.',
      }));
    }
  });

  it('rejects validation results when rows are removed while a row validator is pending', async () => {
    const { dataSource } = makeDataSource();
    let controller: RelationshipCollectionEditorController | null = null;
    render(
      <ContactHarness
        dataSource={dataSource}
        initialRows={[{ draftKey: 'contact-pending', values: {} }]}
        onControllerReady={(next) => { controller = next; }}
      />,
    );
    const row = await screen.findByTestId('relationship-draft-row');
    await within(row).findByRole('textbox', { name: 'Full name' });
    await waitFor(() => expect(controller).not.toBeNull());

    const pendingValidation = controller!.validate();
    fireEvent.click(within(row).getByRole('button', { name: 'Remove Contact 1' }));
    const validation = await pendingValidation;

    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.errors).toContainEqual(expect.objectContaining({
        message: 'Relationship drafts changed while validation was running. Validate again before saving.',
      }));
    }
  });

  it('does not validate externally supplied rows as writable when object create permission is denied', async () => {
    const { dataSource } = makeDataSource();
    let controller: RelationshipCollectionEditorController | null = null;
    render(
      <PermissionProvider
        roles={[{ name: 'reader', label: 'Reader' }]}
        permissions={[{ object: 'contact', roles: { reader: { actions: ['read'] } } }]}
        userRoles={['reader']}
      >
        <ContactHarness
          dataSource={dataSource}
          initialRows={[{ draftKey: 'contact-read-only', values: { full_name: 'Ada' } }]}
          onControllerReady={(next) => { controller = next; }}
        />
      </PermissionProvider>,
    );
    await screen.findByRole('textbox', { name: 'Full name' });
    await waitFor(() => expect(controller).not.toBeNull());

    const validation = await controller!.validate();
    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.errors).toContainEqual(expect.objectContaining({
        rowKeys: [],
        message: 'You do not have permission to create records for this object.',
      }));
    }
  });

  it('inherits ObjectForm field write permissions for the rendered lookup and validated values', async () => {
    const { dataSource } = makeDataSource();
    let controller: RelationshipCollectionEditorController | null = null;
    const { container } = render(
      <PermissionProvider
        roles={[{ name: 'limited', label: 'Limited' }]}
        permissions={[{
          object: 'contact',
          roles: {
            limited: {
              actions: ['create'],
              fieldPermissions: [{ field: 'manager_id', read: true, write: false }],
            },
          },
        }]}
        userRoles={['limited']}
      >
        <ContactHarness
          dataSource={dataSource}
          initialRows={[{
            draftKey: 'contact-limited-field',
            values: { full_name: 'Ada', manager_id: 'user-1' },
          }]}
          onControllerReady={(next) => { controller = next; }}
        />
      </PermissionProvider>,
    );
    await screen.findByRole('textbox', { name: 'Full name' });
    const lookupTrigger = await waitFor(() => {
      const trigger = container.querySelector<HTMLButtonElement>('[data-testid="lookup-trigger-manager_id"]');
      if (!trigger) throw new Error('The metadata lookup field has not rendered.');
      return trigger;
    });
    expect(lookupTrigger).toBeDisabled();
    await waitFor(() => expect(controller).not.toBeNull());

    const validation = await controller!.validate();
    expect(validation).toMatchObject({ valid: true });
    if (validation.valid) {
      expect(validation.draft.rows[0].values).not.toHaveProperty('manager_id');
    }
  });

  it('keeps remaining row input attached to its draft key when a sibling is removed', async () => {
    const { dataSource, create, update, remove } = makeDataSource();
    const { container } = render(
      <ContactHarness
        dataSource={dataSource}
        initialRows={[
          { draftKey: 'contact-a', values: { full_name: 'Ada' } },
          { draftKey: 'contact-b', values: { full_name: 'Babbage' } },
        ]}
      />,
    );
    await screen.findAllByRole('textbox', { name: 'Full name' });
    const first = container.querySelector('[data-row-key="contact-a"]') as HTMLElement;
    const secondBefore = container.querySelector('[data-row-key="contact-b"]') as HTMLElement;
    expect(secondBefore.querySelector('input[name="full_name"]')).toHaveValue('Babbage');

    fireEvent.click(within(first).getByRole('button', { name: 'Remove Contact 1' }));

    await waitFor(() => expect(container.querySelector('[data-row-key="contact-a"]')).not.toBeInTheDocument());
    const secondAfter = container.querySelector('[data-row-key="contact-b"]') as HTMLElement;
    expect(secondAfter.querySelector('input[name="full_name"]')).toHaveValue('Babbage');
    expect(create).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it('offers a compact rows presentation while retaining metadata fields and the same controller validation', async () => {
    const { dataSource } = makeDataSource();
    let controller: RelationshipCollectionEditorController | null = null;
    const { container } = render(
      <ContactHarness
        dataSource={dataSource}
        initialRows={[{ draftKey: 'contact-row', values: { full_name: 'Ada' } }]}
        presentation="rows"
        columns={3}
        onControllerReady={(next) => { controller = next; }}
      />,
    );
    const row = await screen.findByTestId('relationship-draft-row');
    await within(row).findByTestId('field:contact.manager_id');
    const form = row.querySelector('form');
    expect(form?.querySelector('.lg\\:grid-cols-3')).toBeInTheDocument();
    expect(form?.className).toContain('[&_label]:sr-only');
    const header = container.querySelector('[data-testid="relationship-column-header"]');
    expect(header).toHaveTextContent('Full name');
    expect(header).toHaveTextContent('Category');
    expect(header).toHaveTextContent('Manager');
    expect(header).not.toHaveTextContent('Customer');
    expect(row).toHaveAttribute('role', 'group');
    expect(row.querySelector('input[name="full_name"]')).toHaveValue('Ada');
    expect(within(row).queryByText('Contact 1')).not.toBeInTheDocument();
    await waitFor(() => expect(controller).not.toBeNull());

    const validation = await controller!.validate();
    expect(validation).toMatchObject({ valid: true, draft: { rows: [{ values: { full_name: 'Ada' } }] } });
    expect(container.querySelector('[data-testid="field:contact.customer_id"]')).not.toBeInTheDocument();
  });
});
