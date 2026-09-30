import { ValueDataSource } from '@object-ui/core';

export interface PreviewRequest {
  id: string;
  code: string;
  title: string;
  supplier: string;
  status: string;
  requested_on: string;
  need_by: string;
  amount: number;
  owner: string;
  department: string;
  cost_center: string;
  memo: string;
}

const options = {
  supplier: [
    { value: 'northwind', label: 'Northwind Supply' },
    { value: 'contoso', label: 'Contoso Parts' },
    { value: 'fabrikam', label: 'Fabrikam Tools' },
    { value: 'adatum', label: 'A. Datum Components' },
  ],
  status: [
    { value: 'draft', label: 'Draft', color: '#64748b' },
    { value: 'review', label: 'In review', color: '#d97706' },
    { value: 'approved', label: 'Approved', color: '#15803d' },
    { value: 'received', label: 'Received', color: '#2563eb' },
  ],
  department: [
    { value: 'operations', label: 'Operations' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'facilities', label: 'Facilities' },
  ],
} as const;

const objectSchema = {
  name: 'preview_purchase_request',
  label: 'Purchase request fixture',
  displayNameField: 'code',
  fields: {
    id: { type: 'text', label: 'Record ID', readonly: true },
    code: { type: 'text', label: 'Request ID', required: true },
    title: { type: 'text', label: 'Request title', required: true },
    supplier: { type: 'select', label: 'Supplier', options: options.supplier },
    status: { type: 'select', label: 'Status', options: options.status },
    requested_on: { type: 'date', label: 'Requested on', required: true },
    need_by: { type: 'date', label: 'Need by' },
    amount: { type: 'currency', label: 'Estimated amount', currency: 'USD' },
    owner: { type: 'text', label: 'Request owner' },
    department: { type: 'select', label: 'Department', options: options.department },
    cost_center: { type: 'text', label: 'Cost center' },
    memo: { type: 'textarea', label: 'Business justification' },
  },
};

const requestFixtures: PreviewRequest[] = [
  { id: 'fixture-001', code: 'REQ-2026-001', title: 'Workshop safety supplies', supplier: 'northwind', status: 'review', requested_on: '2026-09-03', need_by: '2026-09-18', amount: 3480, owner: 'Alex Morgan', department: 'operations', cost_center: 'OPS-104', memo: 'Replace depleted protective equipment.' },
  { id: 'fixture-002', code: 'REQ-2026-002', title: 'Prototype connectors', supplier: 'contoso', status: 'approved', requested_on: '2026-09-05', need_by: '2026-09-21', amount: 12850, owner: 'Jordan Lee', department: 'engineering', cost_center: 'ENG-220', memo: 'Parts for the September prototype build.' },
  { id: 'fixture-003', code: 'REQ-2026-003', title: 'Meeting room displays', supplier: 'fabrikam', status: 'draft', requested_on: '2026-09-08', need_by: '2026-10-02', amount: 6240, owner: 'Riley Chen', department: 'facilities', cost_center: 'FAC-018', memo: 'Two shared-room displays and mounting kits.' },
  { id: 'fixture-004', code: 'REQ-2026-004', title: 'Bench power modules', supplier: 'adatum', status: 'received', requested_on: '2026-08-12', need_by: '2026-08-29', amount: 9460, owner: 'Taylor Kim', department: 'engineering', cost_center: 'ENG-220', memo: 'Replacement modules for test benches.' },
  { id: 'fixture-005', code: 'REQ-2026-005', title: 'Packing station labels', supplier: 'northwind', status: 'approved', requested_on: '2026-08-21', need_by: '2026-09-10', amount: 1850, owner: 'Casey Patel', department: 'operations', cost_center: 'OPS-104', memo: 'Thermal labels for the packing stations.' },
  { id: 'fixture-006', code: 'REQ-2026-006', title: 'Calibration adapters', supplier: 'contoso', status: 'review', requested_on: '2026-07-16', need_by: '2026-08-05', amount: 7720, owner: 'Morgan Diaz', department: 'engineering', cost_center: 'ENG-221', memo: 'Adapters for the annual calibration cycle.' },
  { id: 'fixture-007', code: 'REQ-2026-007', title: 'Air filter replacements', supplier: 'fabrikam', status: 'received', requested_on: '2026-07-24', need_by: '2026-08-12', amount: 2380, owner: 'Avery Brooks', department: 'facilities', cost_center: 'FAC-019', memo: 'Quarterly replacement set for the lab.' },
  { id: 'fixture-008', code: 'REQ-2026-008', title: 'ESD work mats', supplier: 'adatum', status: 'draft', requested_on: '2026-06-11', need_by: '2026-06-30', amount: 5140, owner: 'Quinn Park', department: 'operations', cost_center: 'OPS-107', memo: 'Add anti-static mats to two assembly benches.' },
  { id: 'fixture-009', code: 'REQ-2026-009', title: 'Storage cabinet locks', supplier: 'northwind', status: 'approved', requested_on: '2026-06-20', need_by: '2026-07-08', amount: 960, owner: 'Jamie Rivera', department: 'facilities', cost_center: 'FAC-018', memo: 'Keyed locks for shared material cabinets.' },
];

/** All reads and writes stay in this page's memory. */
export class ComponentPreviewDataSource extends ValueDataSource<PreviewRequest> {
  constructor() {
    super({ items: requestFixtures, idField: 'id' });
  }

  override async getObjectSchema(objectName: string): Promise<typeof objectSchema> {
    return { ...objectSchema, name: objectName };
  }
}
