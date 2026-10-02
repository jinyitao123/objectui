import React, { useLayoutEffect, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { registerAllFields } from '@object-ui/fields';
import type { DataSource } from '@object-ui/types';
import { RelationshipCollectionEditor, type RelationshipDraftRow } from './RelationshipCollectionEditor';

registerAllFields();

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
    name: { type: 'text', label: 'Label' },
    value: { type: 'text', label: 'Value', required: true },
  },
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => { resolve = resolvePromise; });
  return { promise, resolve };
}

function makeDataSource({ delayFirstFormSchema = true }: { delayFirstFormSchema?: boolean } = {}) {
  const pendingFirstFormSchema = deferred<typeof CHANNEL_SCHEMA>();
  let schemaRequest = 0;
  const getObjectSchema = vi.fn(async (objectName: string) => {
    expect(objectName).toBe('contact_channel');
    schemaRequest += 1;
    // Request 1 belongs to the collection editor. Request 2 belongs to the
    // existing channel's real ObjectForm and deliberately finishes later.
    if (schemaRequest === 1) return CHANNEL_SCHEMA;
    if (schemaRequest === 2 && delayFirstFormSchema) return pendingFirstFormSchema.promise;
    return CHANNEL_SCHEMA;
  });
  const dataSource = {
    getObjectSchema,
    find: vi.fn(async () => ({ data: [] })),
    findOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as DataSource;
  return { dataSource, getObjectSchema, pendingFirstFormSchema };
}

function ChannelHarness({ dataSource }: { dataSource: DataSource }) {
  const [rows, setRows] = useState<RelationshipDraftRow[]>([
    {
      draftKey: 'channel-existing',
      values: { channel_type: 'email', name: 'Work email', value: 'ada@example.test' },
    },
  ]);
  return (
    <RelationshipCollectionEditor
      parentObjectName="contact"
      childObjectName="contact_channel"
      relationshipField="contact_id"
      dataSource={dataSource}
      value={rows}
      onChange={setRows}
      createDraftValues={() => ({ channel_type: 'mobile' })}
      presentation="rows"
      fields={['channel_type', 'name', 'value']}
      title="Channels"
      itemLabel="Channel"
      addLabel="Add channel"
    />
  );
}

function DelayedEchoChannelHarness({
  dataSource,
  pendingChanges,
  setRowsRef,
}: {
  dataSource: DataSource;
  pendingChanges: RelationshipDraftRow[][];
  setRowsRef: { current: ((rows: RelationshipDraftRow[]) => void) | null };
}) {
  const [rows, setRows] = useState<RelationshipDraftRow[]>([
    {
      draftKey: 'channel-existing',
      values: { channel_type: 'email', name: 'Work email', value: 'ada@example.test' },
    },
  ]);
  useLayoutEffect(() => {
    setRowsRef.current = setRows;
    return () => { setRowsRef.current = null; };
  }, [setRowsRef, setRows]);
  return (
    <RelationshipCollectionEditor
      parentObjectName="contact"
      childObjectName="contact_channel"
      relationshipField="contact_id"
      dataSource={dataSource}
      value={rows}
      onChange={(next) => pendingChanges.push(next)}
      createDraftValues={() => ({ channel_type: 'mobile' })}
      presentation="rows"
      fields={['channel_type', 'name', 'value']}
      title="Channels"
      itemLabel="Channel"
      addLabel="Add channel"
    />
  );
}

describe('RelationshipCollectionEditor asynchronous row initialization', () => {
  it('keeps a new channel when the existing channel form finishes loading afterward', async () => {
    const { dataSource, pendingFirstFormSchema } = makeDataSource();
    const { container } = render(<ChannelHarness dataSource={dataSource} />);

    const addButton = await screen.findByRole('button', { name: 'Add channel' });
    await waitFor(() => expect(dataSource.getObjectSchema).toHaveBeenCalledTimes(2));
    fireEvent.click(addButton);

    await waitFor(() => expect(dataSource.getObjectSchema).toHaveBeenCalledTimes(3));
    const rowsBeforeOldFormFinishes = container.querySelectorAll('[data-testid="relationship-draft-row"]');
    expect(rowsBeforeOldFormFinishes).toHaveLength(2);
    await within(rowsBeforeOldFormFinishes[1] as HTMLElement).findByRole('textbox', { name: 'Value' });

    await act(async () => {
      pendingFirstFormSchema.resolve(CHANNEL_SCHEMA);
    });
    await within(container.querySelectorAll('[data-testid="relationship-draft-row"]')[0] as HTMLElement)
      .findByRole('textbox', { name: 'Value' });

    expect(container.querySelectorAll('[data-testid="relationship-draft-row"]')).toHaveLength(2);
    expect(within(container.querySelectorAll('[data-testid="relationship-draft-row"]')[0] as HTMLElement)
      .getByRole('textbox', { name: 'Value' })).toHaveValue('ada@example.test');
    expect(within(container.querySelectorAll('[data-testid="relationship-draft-row"]')[1] as HTMLElement)
      .getByRole('textbox', { name: 'Value' })).toHaveValue('');
  });

  it('merges a real row-form edit into the latest draft while the host value echo is delayed', async () => {
    const { dataSource } = makeDataSource({ delayFirstFormSchema: false });
    const pendingChanges: RelationshipDraftRow[][] = [];
    const setRowsRef: { current: ((rows: RelationshipDraftRow[]) => void) | null } = { current: null };
    const { container } = render(
      <DelayedEchoChannelHarness
        dataSource={dataSource}
        pendingChanges={pendingChanges}
        setRowsRef={setRowsRef}
      />,
    );

    const existingRow = await screen.findByTestId('relationship-draft-row');
    const value = await within(existingRow).findByRole('textbox', { name: 'Value' });
    fireEvent.click(await screen.findByRole('button', { name: 'Add channel' }));
    expect(pendingChanges.at(-1)).toHaveLength(2);

    // The host has not echoed the new collection into the controlled `value`
    // prop yet. A real ObjectForm watch event still arrives from the old row.
    fireEvent.change(value, { target: { value: 'ada+updated@example.test' } });
    expect(pendingChanges.at(-1)?.[0]?.values.value).toBe('ada+updated@example.test');
    expect(pendingChanges.at(-1)).toHaveLength(2);

    await act(async () => {
      setRowsRef.current?.(pendingChanges.at(-1)!);
    });
    await waitFor(() => {
      expect(container.querySelectorAll('[data-testid="relationship-draft-row"]')).toHaveLength(2);
    });
  });
});
