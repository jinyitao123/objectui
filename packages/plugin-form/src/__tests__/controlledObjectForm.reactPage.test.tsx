/**
 * The controlled ObjectForm runtime contract must survive the same public
 * React Page block scope that Forge pages use, and must validate without
 * entering any persistence route.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { ComponentRegistry } from '@object-ui/core';
import { AdapterCtx, SchemaRenderer, SchemaRendererProvider } from '@object-ui/react';
import { MePermissionsProvider } from '@object-ui/permissions';
import { registerAllFields, useUploadingSignal } from '@object-ui/fields';
import '@object-ui/components';
import { ObjectForm } from '../ObjectForm';
import '../index';

registerAllFields();

function FakeUploadField({ onChange }: { onChange?: (value: unknown) => void }) {
  const [uploading, setUploading] = React.useState(false);
  useUploadingSignal(uploading);
  return (
    <div>
      <button type="button" data-testid="start-upload" onClick={() => setUploading(true)}>
        Start upload
      </button>
      <button
        type="button"
        data-testid="finish-upload"
        onClick={() => {
          onChange?.('file_123');
          setUploading(false);
        }}
      >
        Finish upload
      </button>
    </div>
  );
}

ComponentRegistry.register('file', FakeUploadField as any, { namespace: 'field' });

const objectSchema = {
  name: 'controlled_runtime_record',
  fieldGroups: [{ key: 'delivery', label: 'Delivery', collapse: 'collapsed' }],
  fields: {
    title: { type: 'text', label: 'Title', required: true },
    priority: { type: 'text', label: 'Priority', defaultValue: 'normal' },
    status: { type: 'text', label: 'Status' },
    locked_value: { type: 'text', label: 'Locked value', readonlyWhen: "record.status == 'closed'" },
    expected_on: { type: 'date', label: 'Expected date', required: true, group: 'delivery' },
    private_note: { type: 'text', label: 'Private note' },
    system_value: { type: 'text', label: 'System value', system: true },
    note: { type: 'text', label: 'Note' },
    attachment: { type: 'file', label: 'Attachment' },
  },
};

const permissions = {
  authenticated: true,
  userId: 'u-controlled-form',
  tenantId: null,
  roles: ['purchase_clerk'],
  permissionSets: ['purchase_clerk'],
  objects: {
    controlled_runtime_record: {
      allowCreate: true,
      allowRead: true,
      allowEdit: true,
      allowDelete: false,
    },
  },
  fields: {
    'controlled_runtime_record.private_note': { readable: true, editable: false },
  },
};

const pageSource = `
function Page() {
  const [objectName, setObjectName] = React.useState('controlled_runtime_record');
  const [values, setValues] = React.useState({
    title: 'Initial title',
    status: 'closed',
    locked_value: 'Frozen value',
    expected_on: '2026-10-05',
    private_note: 'read only',
    system_value: 'server owned',
    note: 'Keep me',
    attachment: '',
  });
  const [controller, setController] = React.useState(null);
  return (
    <div>
      <ObjectForm
        objectName={objectName}
        mode="create"
        showSubmit={false}
        values={values}
        onValuesChange={(next) => {
          window.__controlledObjectFormProbe.changes.push(next);
          setValues((current) => ({ ...current, ...next }));
        }}
        onControllerReady={(next) => {
          window.__controlledObjectFormProbe.ready.push(next);
          if (next) window.__controlledObjectFormProbe.controller = next;
          setController(next);
        }}
        submitHandler={(payload) => window.__controlledObjectFormProbe.submitHandler(payload)}
      />
      <button
        type="button"
        data-testid="validate-controlled-form"
        onClick={async () => {
          if (controller) window.__controlledObjectFormProbe.result = await controller.validate();
        }}
      >
        Validate
      </button>
      <button
        type="button"
        data-testid="set-controlled-value"
        onClick={() => setValues((current) => ({ ...current, title: 'Externally updated title' }))}
      >
        Set controlled value
      </button>
      <button
        type="button"
        data-testid="clear-required-value"
        onClick={() => setValues((current) => ({ ...current, title: '' }))}
      >
        Clear required value
      </button>
      <button type="button" data-testid="load-broken-schema" onClick={() => setObjectName('broken_record')}>
        Load broken schema
      </button>
    </div>
  );
}`;

function makeAdapter() {
  return {
    getObjectSchema: vi.fn(async (name: string) => {
      if (name === 'broken_record') throw new Error('schema unavailable');
      return objectSchema;
    }),
    create: vi.fn(async () => ({ id: 'created' })),
    update: vi.fn(async () => ({ id: 'updated' })),
    findOne: vi.fn(async () => ({
      id: 'record-1',
      title: 'Loaded title',
      expected_on: '2026-10-01',
      status: 'closed',
      locked_value: 'Frozen value',
    })),
    find: vi.fn(async () => []),
  } as any;
}

function renderReactPage(adapter: any, source = pageSource) {
  return render(
    <AdapterCtx.Provider value={adapter}>
      <MePermissionsProvider initialPermissions={permissions as any}>
        <SchemaRenderer
          schema={{
            type: 'home',
            kind: 'react',
            name: 'controlled_object_form_page',
            source,
          } as any}
        />
      </MePermissionsProvider>
    </AdapterCtx.Provider>,
  );
}

beforeEach(() => {
  (window as any).__controlledObjectFormProbe = {
    changes: [],
    ready: [],
    controller: null,
    result: null,
    submitHandler: vi.fn(),
  };
});

afterAll(() => {
  registerAllFields();
  delete (window as any).__controlledObjectFormProbe;
});

describe('controlled ObjectForm through the React Page SDK', () => {
  it('returns an invalid validate-only result while object metadata is loading', async () => {
    let resolveSchema: ((value: typeof objectSchema) => void) | undefined;
    const pendingSchema = new Promise<typeof objectSchema>((resolve) => { resolveSchema = resolve; });
    const adapter = makeAdapter();
    adapter.getObjectSchema.mockImplementation(async (name: string) =>
      name === 'pending_record' ? pendingSchema : objectSchema,
    );
    const probe = (window as any).__controlledObjectFormProbe;
    const pendingPageSource = pageSource.replace("'controlled_runtime_record'", "'pending_record'");
    const { unmount } = renderReactPage(adapter, pendingPageSource);

    await waitFor(() => expect(probe.controller).toBeTruthy());
    await act(async () => {
      probe.result = await probe.controller.validate();
    });
    expect(probe.result).toMatchObject({
      valid: false,
      errors: {},
      formError: 'The form is still loading.',
    });
    expect(adapter.create).not.toHaveBeenCalled();
    expect(adapter.update).not.toHaveBeenCalled();
    expect(probe.submitHandler).not.toHaveBeenCalled();

    resolveSchema?.(objectSchema);
    unmount();
  });

  it('keeps one RHF instance, validates without writing, applies FLS, and reveals native errors', async () => {
    const adapter = makeAdapter();
    const probe = (window as any).__controlledObjectFormProbe;

    // The runtime contract is not registered as authorable component metadata.
    const configInputs = ComponentRegistry.getConfig('object-form')?.inputs?.map((input: any) => input.name) ?? [];
    expect(configInputs).not.toContain('values');
    expect(configInputs).not.toContain('onValuesChange');
    expect(configInputs).not.toContain('onControllerReady');

    const { container, unmount } = renderReactPage(adapter);
    await waitFor(() => expect(probe.controller).toBeTruthy());
    await waitFor(() => expect(adapter.getObjectSchema).toHaveBeenCalledWith('controlled_runtime_record'));
    await waitFor(() => {
      if (!container.querySelector('input[name="note"]')) throw new Error('ObjectForm fields have not loaded');
    });

    const note = container.querySelector('input[name="note"]') as HTMLInputElement | null;
    const priority = container.querySelector('input[name="priority"]') as HTMLInputElement | null;
    const privateNote = container.querySelector('input[name="private_note"]') as HTMLInputElement | null;
    const expectedOn = container.querySelector('input[name="expected_on"]') as HTMLInputElement | null;
    expect(note).not.toBeNull();
    expect(priority?.value).toBe('normal'); // object defaults fill omitted controlled keys
    expect(privateNote?.disabled).toBe(true);
    expect(note?.value).toBe('Keep me');
    expect(probe.changes).toEqual([]); // initial defaults/controlled values are not user edits

    const deliveryHeader = screen.getByText('Delivery').closest('[role="button"]');
    expect(deliveryHeader?.getAttribute('aria-expanded')).toBe('false');
    note!.focus();
    fireEvent.change(note!, { target: { value: 'Edited note' } });
    await waitFor(() => expect(probe.changes.at(-1)).toEqual(expect.objectContaining({ note: 'Edited note' })));
    expect(document.activeElement).toBe(note);
    expect(note!.value).toBe('Edited note');
    expect(deliveryHeader?.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(screen.getByTestId('set-controlled-value'));
    const title = container.querySelector('input[name="title"]') as HTMLInputElement | null;
    await waitFor(() => expect(title?.value).toBe('Externally updated title'));
    expect(document.activeElement).toBe(note);
    expect(deliveryHeader?.getAttribute('aria-expanded')).toBe('false');

    // The file widget publishes the real upload-in-flight signal. Validation
    // must refuse while it is active and must not reach any persistence hook.
    fireEvent.click(screen.getByTestId('start-upload'));
    await waitFor(() => expect(screen.getByTestId('upload-in-flight-notice')).toBeTruthy());
    fireEvent.click(screen.getByTestId('validate-controlled-form'));
    await waitFor(() => expect(probe.result?.valid).toBe(false));
    expect(probe.result.formError).toMatch(/upload/i);
    expect(adapter.create).not.toHaveBeenCalled();
    expect(adapter.update).not.toHaveBeenCalled();
    expect(probe.submitHandler).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('finish-upload'));
    await waitFor(() => expect(screen.queryByTestId('upload-in-flight-notice')).toBeNull());

    fireEvent.click(screen.getByTestId('validate-controlled-form'));
    await waitFor(() => expect(probe.result?.valid).toBe(true));
    expect(probe.result.values).toMatchObject({
      title: 'Externally updated title',
      priority: 'normal',
      expected_on: '2026-10-05',
      note: 'Edited note',
      attachment: 'file_123',
    });
    expect(probe.result.values).not.toHaveProperty('private_note');
    expect(probe.result.values).not.toHaveProperty('system_value');
    expect(adapter.create).not.toHaveBeenCalled();
    expect(adapter.update).not.toHaveBeenCalled();
    expect(probe.submitHandler).not.toHaveBeenCalled();

    // Native custom validity participates in validate-only and follows the
    // same collapsed-group reveal/focus path as normal invalid submission.
    expectedOn!.setCustomValidity('Choose a valid date.');
    fireEvent.click(screen.getByTestId('validate-controlled-form'));
    await waitFor(() => expect(probe.result?.valid).toBe(false));
    expect(probe.result.errors.expected_on).toBe('Choose a valid date.');
    await waitFor(() => expect(deliveryHeader?.getAttribute('aria-expanded')).toBe('true'));
    await waitFor(() => expect(document.activeElement).toBe(expectedOn));
    expect(adapter.create).not.toHaveBeenCalled();
    expect(adapter.update).not.toHaveBeenCalled();
    expect(probe.submitHandler).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('clear-required-value'));
    fireEvent.click(screen.getByTestId('validate-controlled-form'));
    await waitFor(() => expect(probe.result?.valid).toBe(false));
    expect(probe.result.errors.title).toBeTruthy();
    expect(adapter.create).not.toHaveBeenCalled();
    expect(adapter.update).not.toHaveBeenCalled();
    expect(probe.submitHandler).not.toHaveBeenCalled();

    const staleController = probe.controller;
    fireEvent.click(screen.getByTestId('load-broken-schema'));
    await screen.findByText('schema unavailable');
    const unavailableResult = await staleController.validate();
    expect(unavailableResult).toMatchObject({
      valid: false,
      errors: {},
    });
    expect(unavailableResult.formError).toBeTruthy();
    unmount();
    await waitFor(() => expect(probe.ready.at(-1)).toBeNull());
    expect(adapter.create).not.toHaveBeenCalled();
    expect(adapter.update).not.toHaveBeenCalled();
    expect(probe.submitHandler).not.toHaveBeenCalled();
  });

  it('supports host-controlled values in edit mode through the same Page block chain', async () => {
    const adapter = makeAdapter();
    const probe = (window as any).__controlledObjectFormProbe;
    const editPageSource = pageSource.replace('mode="create"', 'mode="edit" recordId="record-1"');
    const { container } = renderReactPage(adapter, editPageSource);
    await waitFor(() => expect(probe.controller).toBeTruthy());
    await waitFor(() => expect(adapter.findOne).toHaveBeenCalledWith('controlled_runtime_record', 'record-1'));

    const title = await waitFor(() => {
      const input = container.querySelector('input[name="title"]') as HTMLInputElement | null;
      if (!input) throw new Error('title field has not rendered');
      return input;
    });
    expect(title.value).toBe('Initial title');
    expect(screen.getByText('Frozen value')).toBeTruthy();
    expect(container.querySelector('[data-field="locked_value"] input')).toBeNull();
    fireEvent.click(screen.getByTestId('validate-controlled-form'));
    await waitFor(() => expect(probe.result?.valid).toBe(true));
    expect(probe.result.values.title).toBe('Initial title');
    expect(probe.result.values).not.toHaveProperty('locked_value');
    expect(adapter.create).not.toHaveBeenCalled();
    expect(adapter.update).not.toHaveBeenCalled();
    expect(probe.submitHandler).not.toHaveBeenCalled();
  });

  it('rejects controlled runtime props on unsupported form variants', async () => {
    const onControllerReady = vi.fn();
    const adapter = makeAdapter();
    function VariantHost() {
      const [formType, setFormType] = React.useState<'simple' | 'tabbed'>('simple');
      return (
        <>
          <button
            type="button"
            data-testid="toggle-form-variant"
            onClick={() => setFormType((current) => current === 'simple' ? 'tabbed' : 'simple')}
          >
            Toggle form variant
          </button>
          <ObjectForm
            schema={{
              type: 'object-form',
              objectName: 'controlled_runtime_record',
              mode: 'create',
              formType,
              ...(formType === 'tabbed'
                ? { sections: [{ label: 'Details', fields: ['title'] }] }
                : {}),
            } as any}
            dataSource={adapter}
            values={{ title: 'Controlled' }}
            onControllerReady={onControllerReady}
          />
        </>
      );
    }
    const { findByTestId } = render(
      <SchemaRendererProvider dataSource={adapter}>
        <MePermissionsProvider initialPermissions={permissions as any}>
          <VariantHost />
        </MePermissionsProvider>
      </SchemaRendererProvider>,
    );
    await waitFor(() => expect(onControllerReady).toHaveBeenCalledWith(expect.objectContaining({ validate: expect.any(Function) })));
    fireEvent.click(screen.getByTestId('toggle-form-variant'));
    expect(await findByTestId('object-form-runtime-unsupported')).toBeTruthy();
    await waitFor(() => expect(onControllerReady.mock.calls.at(-1)?.[0]).toBeNull());
    fireEvent.click(screen.getByTestId('toggle-form-variant'));
    await waitFor(() => expect(onControllerReady.mock.calls.filter(([controller]) => controller !== null).length).toBeGreaterThan(1));
    expect(adapter.create).not.toHaveBeenCalled();
    expect(adapter.update).not.toHaveBeenCalled();
  });
});
