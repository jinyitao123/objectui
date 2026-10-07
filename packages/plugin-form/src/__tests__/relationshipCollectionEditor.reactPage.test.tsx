import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import { ComponentRegistry } from '@object-ui/core';
import { AdapterCtx, SchemaRenderer } from '@object-ui/react';
import { ObjectStackAdapter } from '@object-ui/data-objectstack';
import { MePermissionsProvider, type MePermissionsResponse } from '@object-ui/permissions';
import { registerAllFields } from '@object-ui/fields';
import '@object-ui/components';
import '../index';

registerAllFields();

const objectSchemas = {
  contact: {
    name: 'contact',
    fields: {
      customer_id: { type: 'lookup', label: 'Customer', reference: 'customer', required: true },
      full_name: { type: 'text', label: 'Full name', required: true },
      secret_note: { type: 'text', label: 'Secret note' },
    },
  },
  contact_channel: {
    name: 'contact_channel',
    fields: {
      contact_id: { type: 'lookup', label: 'Contact', reference: 'contact', required: true },
      value: { type: 'text', label: 'Value', required: true },
    },
  },
};

interface RelationshipRuntimeDraftRow {
  values: Record<string, unknown>;
  children: Array<{ rows: RelationshipRuntimeDraftRow[] }>;
}

interface RelationshipRuntimeValidation {
  valid: boolean;
  draft?: { rows: RelationshipRuntimeDraftRow[] };
}

interface RelationshipRuntimeProbe {
  authorDataSourceCalls: string[];
  contacts: RelationshipRuntimeDraftRow[] | null;
  controller: { validate: () => Promise<RelationshipRuntimeValidation> } | null;
  validation: RelationshipRuntimeValidation | null;
}

declare global {
  interface Window {
    __relationshipRuntimeProbe: RelationshipRuntimeProbe;
  }
}

const permissions: MePermissionsResponse = {
  authenticated: true,
  userId: 'u-react-runtime',
  tenantId: null,
  roles: ['editor'],
  permissionSets: ['editor'],
  objects: {
    contact: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true },
    contact_channel: { allowCreate: true, allowRead: true, allowEdit: true, allowDelete: true },
  },
  fields: {
    'contact.secret_note': { readable: true, editable: false },
  },
};

const source = `
function Page() {
  const [contacts, setContacts] = React.useState([
    { draftKey: 'contact-a', values: { full_name: 'Ada Lovelace', secret_note: 'private' } },
  ]);
  const [channels, setChannels] = React.useState({
    'contact-a': [{ draftKey: 'channel-a', values: { value: 'ada@example.test' } }],
  });
  const [controller, setController] = React.useState(null);
  const [ticks, setTicks] = React.useState(0);

  return (
    <div>
      <button type="button" data-testid="rerender-page" onClick={() => setTicks((value) => value + 1)}>{ticks}</button>
      <RelationshipCollectionEditor
        parentObjectName="customer"
        childObjectName="contact"
        relationshipField="customer_id"
        dataSource={{ getObjectSchema: (name) => {
          window.__relationshipRuntimeProbe.authorDataSourceCalls.push(name);
          return Promise.reject(new Error('The page supplied data source must be ignored.'));
        } }}
        value={contacts}
        onChange={(next) => {
          window.__relationshipRuntimeProbe.contacts = next;
          setContacts(next);
        }}
        onControllerReady={(next) => {
          window.__relationshipRuntimeProbe.controller = next;
          setController(next);
        }}
        title="Contacts"
        itemLabel="Contact"
      >
        {({ row, onControllerReady }) => (
          <RelationshipCollectionEditor
            parentObjectName="contact"
            childObjectName="contact_channel"
            relationshipField="contact_id"
            dataSource={{ getObjectSchema: () => Promise.reject(new Error('Wrong data source.')) }}
            value={channels[row.draftKey] || []}
            onChange={(next) => setChannels((current) => ({ ...current, [row.draftKey]: next }))}
            onControllerReady={onControllerReady}
            nestedEditorRequired={false}
            title="Channels"
            itemLabel="Channel"
          >
            {({ row: channel }) => <span data-testid="nested-render-slot">{channel.values.value}</span>}
          </RelationshipCollectionEditor>
        )}
      </RelationshipCollectionEditor>
      <button type="button" data-testid="validate-collections" onClick={async () => {
        if (controller) window.__relationshipRuntimeProbe.validation = await controller.validate();
      }}>
        Validate drafts
      </button>
    </div>
  );
}`;

function makeAdapter() {
  const adapter = new ObjectStackAdapter({
    baseUrl: 'http://objectstack.test',
    autoReconnect: false,
    fetch: vi.fn(async () => new Response('{}', { status: 500 })),
  });
  vi.spyOn(adapter, 'getObjectSchema').mockImplementation(async (name: string) => {
    if (name === 'contact') return objectSchemas.contact;
    if (name === 'contact_channel') return objectSchemas.contact_channel;
    return undefined;
  });
  vi.spyOn(adapter, 'find').mockResolvedValue({ data: [], total: 0 });
  vi.spyOn(adapter, 'findOne').mockResolvedValue(null);
  vi.spyOn(adapter, 'create').mockRejectedValue(new Error('Unexpected data-source create in a draft-only page.'));
  vi.spyOn(adapter, 'update').mockRejectedValue(new Error('Unexpected data-source update in a draft-only page.'));
  vi.spyOn(adapter, 'delete').mockRejectedValue(new Error('Unexpected data-source delete in a draft-only page.'));
  return adapter;
}

function renderReactPage(adapter: ReturnType<typeof makeAdapter>, pageSource = source) {
  return render(
    <AdapterCtx.Provider value={adapter}>
      <MePermissionsProvider initialPermissions={permissions}>
        <SchemaRenderer schema={{
          type: 'home',
          kind: 'react',
          name: 'relationship_runtime_page',
          source: pageSource,
        } as never} />
      </MePermissionsProvider>
    </AdapterCtx.Provider>,
  );
}

class ErrorBoundary extends React.Component<React.PropsWithChildren, { message?: string }> {
  state: { message?: string } = {};

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    return this.state.message
      ? <div data-testid="scope-error">{this.state.message}</div>
      : this.props.children;
  }
}

function PureRuntimeProbe({ dataSource, children }: React.PropsWithChildren<{ dataSource?: unknown }>) {
  return <div data-testid="pure-runtime-probe" data-source={String(dataSource)}>{children}</div>;
}

beforeEach(() => {
  window.__relationshipRuntimeProbe = {
    authorDataSourceCalls: [],
    contacts: null,
    controller: null,
    validation: null,
  };
});

afterEach(() => {
  ComponentRegistry.unregisterReactRuntimeComponent('ObjectForm');
  ComponentRegistry.unregisterReactRuntimeComponent('PureRuntimeProbe');
});

describe('trusted React runtime components through the React Page SDK', () => {
  it('composes collapsible sections and controlled segmented radio choices without persistence', async () => {
    const adapter = makeAdapter();
    for (const name of ['FormSectionContainer', 'SegmentedRadioGroup']) {
      expect(ComponentRegistry.getReactRuntimeComponents().find(entry => entry.name === name)?.injectDataSource).toBe(false);
    }
    renderReactPage(adapter, `
function Page() {
  const [priority, setPriority] = React.useState('medium');
  const [name, setName] = React.useState('');
  const [disabled, setDisabled] = React.useState(false);
  return <>
    <FormSectionContainer label="Basics" columns={2} collapsible showBorder={false}>
      <input aria-label="Name" value={name} onChange={event => setName(event.target.value)} />
      <SegmentedRadioGroup aria-label="Priority" value={priority} onValueChange={setPriority}
        disabled={disabled} options={[{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }]} />
    </FormSectionContainer>
    <button onClick={() => setDisabled(true)}>Disable choices</button>
    <output aria-label="Draft">{name + ':' + priority}</output>
  </>;
}`);
    const name = await screen.findByRole('textbox', { name: 'Name' });
    fireEvent.change(name, { target: { value: 'Host draft' } });
    fireEvent.click(screen.getByRole('radio', { name: 'High' }));
    expect(screen.getByRole('status', { name: 'Draft' })).toHaveTextContent('Host draft:high');
    const header = screen.getByRole('button', { name: 'Basics' });
    fireEvent.keyDown(header, { key: 'Enter' });
    expect(header).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument();
    fireEvent.keyDown(header, { key: ' ' });
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Host draft');
    expect(screen.getByRole('radio', { name: 'High' })).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Disable choices' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Low' }));
    expect(screen.getByRole('radio', { name: 'Low' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'High' })).toBeChecked();
    expect(adapter.getObjectSchema).not.toHaveBeenCalled();
    expect(adapter.create).not.toHaveBeenCalled();
    expect(adapter.update).not.toHaveBeenCalled();
  });

  it('keeps function children, controlled relationship drafts, field permissions, and host adapter authority', async () => {
    const adapter = makeAdapter();
    const probe = window.__relationshipRuntimeProbe!;
    const registeredRuntimeNames = ComponentRegistry.getReactRuntimeComponents().map(({ name }) => name);
    expect(registeredRuntimeNames).toContain('RelationshipCollectionEditor');
    expect(registeredRuntimeNames).toContain('CompositeDialog');
    const { container } = renderReactPage(adapter);

    const nameInput = await screen.findByRole('textbox', { name: 'Full name' }) as HTMLInputElement;
    expect(await screen.findByTestId('nested-render-slot')).toHaveTextContent('ada@example.test');
    await screen.findByRole('textbox', { name: 'Secret note' });
    expect(container.querySelector<HTMLInputElement>('input[name="secret_note"]')).toBeDisabled();
    await waitFor(() => expect(adapter.getObjectSchema).toHaveBeenCalledWith('contact'));
    await waitFor(() => expect(adapter.getObjectSchema).toHaveBeenCalledWith('contact_channel'));
    expect(probe.authorDataSourceCalls).toEqual([]);

    nameInput.focus();
    fireEvent.change(nameInput, { target: { value: 'Ada Byron' } });
    await waitFor(() => expect(probe.contacts?.[0]?.values.full_name).toBe('Ada Byron'));
    expect(document.activeElement).toBe(nameInput);
    fireEvent.click(screen.getByTestId('rerender-page'));
    expect(container.querySelector('input[name="full_name"]')).toBe(nameInput);
    expect(document.activeElement).toBe(nameInput);

    const rowForm = container.querySelector('[data-row-key="contact-a"] form');
    expect(rowForm).not.toBeNull();
    fireEvent.click(screen.getByTestId('validate-collections'));
    await waitFor(() => {
      if (!probe.validation?.valid) throw new Error(JSON.stringify(probe.validation));
    });
    const validation = probe.validation!;
    expect(validation.draft?.rows[0].values).toMatchObject({ full_name: 'Ada Byron' });
    expect(validation.draft?.rows[0].values).not.toHaveProperty('secret_note');
    expect(validation.draft?.rows[0].children[0].rows[0].values).toEqual({ value: 'ada@example.test' });
    fireEvent.submit(rowForm!);
    expect(adapter.create).not.toHaveBeenCalled();
    expect(adapter.update).not.toHaveBeenCalled();
    expect(adapter.delete).not.toHaveBeenCalled();
  });

  it('rejects a runtime component whose name collides with an existing public scope component', async () => {
    ComponentRegistry.registerReactRuntimeComponent('ObjectForm', () => null);
    const adapter = makeAdapter();
    const { findByRole } = render(
      <ErrorBoundary>
        <AdapterCtx.Provider value={adapter}>
          <SchemaRenderer schema={{ type: 'home', kind: 'react', name: 'scope_collision', source: 'function Page() { return <div />; }' } as never} />
        </AdapterCtx.Provider>
      </ErrorBoundary>,
    );
    expect(await findByRole('alert')).toHaveTextContent('collides with an existing page scope name');
  });

  it('preserves ReactNode children and leaves the supplied dataSource untouched for pure components', async () => {
    ComponentRegistry.registerReactRuntimeComponent('PureRuntimeProbe', PureRuntimeProbe, {
      injectDataSource: false,
    });
    const adapter = makeAdapter();
    const pageSource = `
function Page() {
  return <PureRuntimeProbe dataSource="page-owned-value"><strong data-testid="pure-child">Slot content</strong></PureRuntimeProbe>;
}`;

    renderReactPage(adapter, pageSource);
    expect(await screen.findByTestId('pure-child')).toHaveTextContent('Slot content');
    expect(screen.getByTestId('pure-runtime-probe')).toHaveAttribute('data-source', 'page-owned-value');
    expect(adapter.getObjectSchema).not.toHaveBeenCalled();
  });

  it('injects CompositeDialog while retaining its React children and function footer', async () => {
    const adapter = makeAdapter();
    const pageSource = `
function Page() {
  return (
    <CompositeDialog
      open={true}
      title="Compound draft"
      onOpenChange={() => {}}
      busy={true}
      dataSource={{ marker: 'ignored-presentation-prop' }}
      footer={({ requestClose, busy }) => (
        <button type="button" data-testid="composite-footer" onClick={requestClose}>
          {busy ? 'Saving' : 'Close'}
        </button>
      )}
    >
      <div data-testid="composite-children">Parent and child forms</div>
    </CompositeDialog>
  );
}`;

    renderReactPage(adapter, pageSource);
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(await screen.findByTestId('composite-children')).toHaveTextContent('Parent and child forms');
    const footer = await screen.findByTestId('composite-footer');
    expect(footer).toHaveTextContent('Saving');
    fireEvent.click(footer);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(adapter.create).not.toHaveBeenCalled();
    expect(adapter.update).not.toHaveBeenCalled();
  });

  it('injects the controlled accessible Switch without adapter access or persistence', async () => {
    const adapter = makeAdapter();
    const registration = ComponentRegistry.getReactRuntimeComponents().find(entry => entry.name === 'Switch');
    expect(registration?.injectDataSource).toBe(false);
    renderReactPage(adapter, `
function Page() {
  const [checked, setChecked] = React.useState(false);
  const [disabled, setDisabled] = React.useState(false);
  return <>
    <Switch aria-label="Project module" checked={checked} onCheckedChange={setChecked} disabled={disabled} />
    <button onClick={() => setDisabled(true)}>Lock module</button>
  </>;
}`);
    const control = await screen.findByRole('switch', { name: 'Project module' });
    expect(control).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(control);
    expect(control).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Lock module' }));
    expect(control).toBeDisabled();
    fireEvent.click(control);
    expect(control).toHaveAttribute('aria-checked', 'true');
    expect(adapter.getObjectSchema).not.toHaveBeenCalled();
    expect(adapter.create).not.toHaveBeenCalled();
    expect(adapter.update).not.toHaveBeenCalled();
  });
});
