import { useRef, useState } from 'react';
import { Field, ObjectSchema } from '@objectstack/spec/data';
import { ValueDataSource } from '@object-ui/core';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@object-ui/components';
import type { ObjectFormController } from '@object-ui/components';
import { ObjectForm } from '@object-ui/plugin-form';
import { SchemaRendererProvider } from '@object-ui/react';
import {
  RelationshipCollectionEditor,
  type RelationshipCollectionEditorController,
  type RelationshipDraftRow,
} from '@object-ui/plugin-form';

const customerObject = 'preview_customer_draft';
const contactObject = 'preview_contact_draft';
const channelObject = 'preview_channel_draft';
const required = { required: true, storage: { notNull: true } } as const;
const schemas = [
  ObjectSchema.create({
    name: customerObject, label: 'Customer', pluralLabel: 'Customers', nameField: 'name',
    fields: {
      name: Field.text({ label: 'Customer name', ...required }),
      description: Field.textarea({ label: 'Description' }),
    },
  }),
  ObjectSchema.create({
    name: contactObject, label: 'Contact', pluralLabel: 'Contacts', nameField: 'name',
    fields: {
      customer_id: Field.lookup(customerObject, { label: 'Customer', ...required }),
      name: Field.text({ label: 'Name', ...required }),
      job_title: Field.text({ label: 'Job title' }),
      department: Field.text({ label: 'Department' }),
      remarks: Field.text({ label: 'Remarks' }),
    },
  }),
  ObjectSchema.create({
    name: channelObject, label: 'Contact channel', pluralLabel: 'Contact channels', nameField: 'name',
    fields: {
      contact_id: Field.lookup(contactObject, { label: 'Contact', ...required }),
      channel_type: Field.select({
        label: 'Type', ...required,
        options: [
          { value: 'mobile', label: 'Mobile' }, { value: 'telephone', label: 'Telephone' },
          { value: 'email', label: 'Email' }, { value: 'wechat', label: 'WeChat' },
          { value: 'dingtalk', label: 'DingTalk' }, { value: 'qq', label: 'QQ' },
          { value: 'linkedin', label: 'LinkedIn' }, { value: 'other', label: 'Other' },
        ],
      }),
      name: Field.text({ label: 'Label', ...required }),
      value: Field.text({ label: 'Contact information', ...required }),
    },
  }),
];

class RelationshipPreviewDataSource extends ValueDataSource<Record<string, unknown>> {
  constructor() { super({ items: [] }); }
  override async getObjectSchema(objectName: string) {
    const schema = schemas.find((candidate) => candidate.name === objectName);
    if (!schema) throw new Error('The requested preview object is not registered.');
    return schema;
  }
}

function initialChannels(key: string): RelationshipDraftRow[] {
  return [
    { draftKey: `${key}-mobile`, values: { channel_type: 'mobile', name: 'Work mobile', value: '' } },
    { draftKey: `${key}-telephone`, values: { channel_type: 'telephone', name: 'Office telephone', value: '' } },
    { draftKey: `${key}-email`, values: { channel_type: 'email', name: 'Work email', value: '' } },
  ];
}

const hasText = (value: unknown) => typeof value === 'string' && value.trim().length > 0;

/** Validate nested lookup drafts without any persistence or transaction claims. */
export function RelationshipFixture() {
  const [dataSource] = useState(() => new RelationshipPreviewDataSource());
  const [customer, setCustomer] = useState<Record<string, unknown>>({});
  const [contacts, setContacts] = useState<RelationshipDraftRow[]>([{ draftKey: 'initial-contact', values: {} }]);
  const [channels, setChannels] = useState<Record<string, RelationshipDraftRow[]>>({
    'initial-contact': initialChannels('initial-contact'),
  });
  const customerController = useRef<ObjectFormController | null>(null);
  const contactsController = useRef<RelationshipCollectionEditorController | null>(null);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState('');

  const updateContacts = (nextRows: RelationshipDraftRow[]) => {
    setContacts(nextRows);
    setChannels((current) => Object.fromEntries(nextRows.map((row) => [
      row.draftKey, current[row.draftKey] ?? initialChannels(row.draftKey),
    ])));
    setFeedback('');
  };

  const checkDraft = async () => {
    setChecking(true);
    setFeedback('');
    try {
      if (!customerController.current || !contactsController.current) {
        setFeedback('Wait until all fields have loaded.');
        return;
      }
      const parent = await customerController.current.validate();
      const collection = await contactsController.current.validate();
      if (!parent.valid || !collection.valid) {
        const messages = [
          ...(!parent.valid ? [...Object.values(parent.errors), parent.formError ?? ''] : []),
          ...(!collection.valid ? collection.errors.map((error) => error.message) : []),
        ].filter(Boolean);
        setFeedback(messages.join(' '));
        return;
      }
      const contactCount = collection.draft.rows.length;
      const channelCount = collection.draft.rows.reduce((count, row) =>
        count + row.children.reduce((total, group) => total + group.rows.length, 0), 0);
      setFeedback(`Draft validated: ${contactCount} contacts and ${channelCount} contact channels. Nothing was saved.`);
    } finally {
      setChecking(false);
    }
  };

  return (
    <SchemaRendererProvider dataSource={dataSource}>
      <Card>
        <CardHeader><CardTitle>Customer with contacts</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p role="note" className="text-sm text-muted-foreground">
            This preview checks drafts only. It does not create customer records.
          </p>
          <ObjectForm
            schema={{
              type: 'object-form', objectName: customerObject, mode: 'create', formType: 'simple',
              layout: 'grid', columns: 2,
              showSubmit: false, showCancel: false, showReset: false,
              submitHandler: (values) => { setCustomer(values); },
            }}
            dataSource={dataSource}
            values={customer}
            onValuesChange={(values) => { setCustomer(values); setFeedback(''); }}
            onControllerReady={(controller) => { customerController.current = controller; }}
          />
          <RelationshipCollectionEditor
            parentObjectName={customerObject}
            childObjectName={contactObject}
            dataSource={dataSource}
            value={contacts}
            onChange={updateContacts}
            title="Contacts" itemLabel="Contact" addLabel="Add contact" removeLabel="Remove"
            columns={4}
            canRemoveRow={() => contacts.length > 1}
            includeRow={(row) => Object.values(row.values).some(hasText)
              || (channels[row.draftKey] ?? []).some((channel) => hasText(channel.values.value))}
            onControllerReady={(controller) => { contactsController.current = controller; }}
          >
            {({ row, onControllerReady }) => (
              <RelationshipCollectionEditor
                parentObjectName={contactObject} childObjectName={channelObject}
                dataSource={dataSource} value={channels[row.draftKey] ?? []}
                onChange={(nextRows) => {
                  setChannels((current) => ({ ...current, [row.draftKey]: nextRows }));
                  setFeedback('');
                }}
                title="Contact information" itemLabel="Channel" addLabel="Add channel" removeLabel="Remove"
                presentation="rows" columns={3}
                createDraftValues={() => ({ channel_type: 'mobile', name: 'Work mobile', value: '' })}
                includeRow={(channel) => hasText(channel.values.value)}
                onControllerReady={onControllerReady}
              />
            )}
          </RelationshipCollectionEditor>
          <div className="flex items-center gap-3">
            <Button type="button" onClick={checkDraft} disabled={checking}>Check draft</Button>
            {feedback && <p role="status" className="text-sm">{feedback}</p>}
          </div>
        </CardContent>
      </Card>
    </SchemaRendererProvider>
  );
}
