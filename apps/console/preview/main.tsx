import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Checkbox,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@object-ui/components';
import { I18nProvider } from '@object-ui/i18n';
import { SchemaRenderer, SchemaRendererProvider } from '@object-ui/react';
import type { ObjectFormSchema } from '@object-ui/types';
import '@object-ui/fields';
import '@object-ui/plugin-form';
import '@object-ui/plugin-grid';
import '@object-ui/plugin-list';
import { ComponentPreviewDataSource } from './fixture-data';
import { MasterDetailFixture } from './master-detail-fixture';
import { RelationshipFixture } from './relationship-fixture';
import './preview.css';

const LIST_SCHEMA = {
  type: 'list-view',
  objectName: 'preview_purchase_request',
  viewType: 'grid',
  columns: [
    { field: 'code', width: 180 },
    { field: 'title', width: 260 },
    { field: 'supplier', width: 200 },
    { field: 'status', width: 120 },
    { field: 'requested_on', width: 130 },
    { field: 'amount', width: 140 },
    { field: 'owner', width: 170 },
    { field: 'cost_center', width: 140 },
  ],
  searchableFields: ['code', 'title', 'supplier', 'owner'],
  resizable: true,
};

const FORM_FIELDS = [
  'code', 'title', 'supplier', 'department', 'requested_on', 'need_by',
  'amount', 'status', 'owner', 'cost_center', 'memo',
];

const COMPACT_FORM: ObjectFormSchema = {
  type: 'object-form',
  objectName: 'preview_purchase_request',
  mode: 'create',
  title: 'Purchase request',
  description: 'Grouped two-column form rendered by ObjectForm.',
  layout: 'grid',
  columns: 2,
  fields: FORM_FIELDS,
  initialValues: {
    code: 'REQ-PREVIEW-NEW',
    requested_on: '2026-09-30',
    need_by: '2026-10-15',
    status: 'draft',
    department: 'engineering',
    amount: 2400,
  },
  sections: [
    { name: 'request', label: 'Request details', description: 'Core request information.', columns: 2, fields: ['code', 'title', 'supplier', 'department', 'status'] },
    { name: 'schedule', label: 'Schedule and estimate', columns: 2, fields: ['requested_on', 'need_by', 'amount', 'cost_center'] },
    { name: 'owner', label: 'Ownership', columns: 2, fields: ['owner', 'memo'] },
  ],
};

const LONG_FORM_FIELDS = [
  'code', 'title', 'supplier', 'department', 'requested_on', 'need_by',
  'amount', 'status', 'owner', 'cost_center', 'memo',
];

function ControlsSection() {
  const [submitted, setSubmitted] = useState(false);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Buttons and actions</CardTitle>
          <CardDescription>Public profile-aware controls from ObjectUI Components.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setSubmitted(true)}>Primary action</Button>
          <Button variant="outline">Secondary action</Button>
          <Button variant="destructive">Destructive action</Button>
          <Button disabled>Disabled action</Button>
          {submitted && <Badge variant="secondary">In-memory interaction</Badge>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Input states</CardTitle>
          <CardDescription>Default, validation error, disabled and selection controls.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="preview-search">Search</Label>
            <Input id="preview-search" placeholder="Search fixture records" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="preview-required">Required field</Label>
            <Input id="preview-required" aria-invalid="true" aria-describedby="preview-required-error" placeholder="Enter a value" />
            <p id="preview-required-error" className="text-xs text-destructive">This field is required.</p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="preview-disabled">Disabled field</Label>
            <Input id="preview-disabled" disabled value="Read-only fixture value" readOnly />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="preview-select">Status</Label>
            <Select defaultValue="review">
              <SelectTrigger id="preview-select" aria-label="Status">
                <SelectValue placeholder="Choose a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">In review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="received">Received</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="preview-confirmed" defaultChecked />
            <Label htmlFor="preview-confirmed">Include optional detail</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="preview-notify" defaultChecked />
            <Label htmlFor="preview-notify">Notify request owner</Label>
          </div>
          <div className="grid gap-1.5 sm:col-span-2">
            <Label htmlFor="preview-notes">Notes</Label>
            <Textarea id="preview-notes" placeholder="Add a short note" rows={3} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FormsSection() {
  const [longFormOpen, setLongFormOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState('');

  const longFormSchema: ObjectFormSchema = {
    type: 'object-form',
    objectName: 'preview_purchase_request',
    mode: 'create',
    formType: 'modal',
    open: longFormOpen,
    onOpenChange: setLongFormOpen,
    modalSize: 'full',
    modalCloseButton: true,
    title: 'New fixture request',
    description: 'A long form shown in the native ObjectForm modal. Saving writes only to this page’s memory.',
    layout: 'grid',
    columns: 2,
    fields: LONG_FORM_FIELDS,
    initialValues: {
      code: 'REQ-PREVIEW-MODAL',
      status: 'draft',
      requested_on: '2026-09-30',
      need_by: '2026-10-15',
      department: 'operations',
    },
    sections: [
      { name: 'basics', label: 'Request details', columns: 2, fields: ['code', 'title', 'supplier', 'department', 'status'] },
      { name: 'schedule', label: 'Schedule and estimate', columns: 2, fields: ['requested_on', 'need_by', 'amount', 'cost_center'] },
      { name: 'ownership', label: 'Ownership', columns: 2, fields: ['owner', 'memo'] },
    ],
    onSuccess: (record) => {
      const code = typeof record.code === 'string' ? record.code : 'Fixture record';
      setSavedMessage(`${code} was added to the in-memory fixture.`);
    },
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Grouped two-column form</CardTitle>
          <CardDescription>ObjectForm builds sections and fields from the fixture object schema.</CardDescription>
        </CardHeader>
        <CardContent>
          <SchemaRenderer schema={COMPACT_FORM} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Long-form modal</CardTitle>
          <CardDescription>Open a full form with grouped sections and a scrollable body.</CardDescription>
        </CardHeader>
        <CardContent className="grid content-start gap-3">
          <Button onClick={() => { setSavedMessage(''); setLongFormOpen(true); }}>Open long form</Button>
          {savedMessage && <p role="status" className="text-sm text-muted-foreground">{savedMessage}</p>}
          <SchemaRenderer schema={longFormSchema} />
        </CardContent>
      </Card>
    </div>
  );
}

function ListSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>List states and horizontal scroll</CardTitle>
        <CardDescription>Native ListView/ObjectGrid over the same in-memory fixture used by the forms.</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        <div className="min-w-0 overflow-x-auto rounded-md border">
          <SchemaRenderer schema={LIST_SCHEMA} />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Scroll wide columns on desktop. Narrow windows use the current native card layout.</p>
      </CardContent>
    </Card>
  );
}

function PreviewApp() {
  const [dataSource] = useState(() => new ComponentPreviewDataSource());
  const [sample, setSample] = useState(() => {
    const value = new URLSearchParams(window.location.search).get('sample');
    return value === 'forms' || value === 'list' || value === 'details' || value === 'relationships' ? value : 'controls';
  });
  const selectSample = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('sample', value);
    window.history.replaceState({}, '', url);
    setSample(value);
  };

  return (
    <I18nProvider>
      <SchemaRendererProvider dataSource={dataSource}>
        <MemoryRouter>
          <main className="min-h-screen bg-background text-foreground">
            <header className="border-b bg-card">
              <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight">Component Geometry Preview</h1>
                  <p className="mt-1 text-sm text-muted-foreground">Reusable ObjectUI controls, forms, and list renderers.</p>
                </div>
                <Badge variant="secondary">Fixture only · in-memory data</Badge>
              </div>
            </header>

            <div className="mx-auto max-w-screen-2xl px-4 py-5 sm:px-6 lg:px-8">
              <Tabs value={sample} onValueChange={selectSample} className="grid min-w-0 gap-4">
                <TabsList className="h-auto flex-wrap justify-start">
                  <TabsTrigger value="controls">Controls</TabsTrigger>
                  <TabsTrigger value="forms">Forms</TabsTrigger>
                  <TabsTrigger value="list">List</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="relationships">Relationships</TabsTrigger>
                </TabsList>
                <TabsContent value="controls" className="min-w-0"><ControlsSection /></TabsContent>
                <TabsContent value="forms" className="min-w-0"><FormsSection /></TabsContent>
                <TabsContent value="list" className="min-w-0"><ListSection /></TabsContent>
                <TabsContent value="details" className="min-w-0"><MasterDetailFixture /></TabsContent>
                <TabsContent value="relationships" className="min-w-0"><RelationshipFixture /></TabsContent>
              </Tabs>
            </div>
          </main>
        </MemoryRouter>
      </SchemaRendererProvider>
    </I18nProvider>
  );
}

createRoot(document.getElementById('root')!).render(<PreviewApp />);
