import { defineStack } from '@objectstack/spec';
import { Field, ObjectSchema, defineSeed } from '@objectstack/spec/data';
import { DashboardSchema, defineApp, defineDataset, defineReport } from '@objectstack/spec/ui';

const objectName = 'component_preview_purchase_request';
const datasetName = 'component_preview_purchase_metrics';
const dashboardName = 'component_preview_purchase_dashboard';

const statuses = [
  { value: 'new', label: 'New' },
  { value: 'active', label: 'In progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'complete', label: 'Complete' },
];

const suppliers = [
  'Fixture Supplier A',
  'Fixture Supplier B',
  'Fixture Supplier C',
  'Fixture Supplier D',
] as const;

const required = { required: true, storage: { notNull: true } } as const;

/** Independent development-only object for validating native report widgets. */
const ComponentPreviewPurchaseRequest = ObjectSchema.create({
  name: objectName,
  label: 'Component Preview Request Fixture',
  pluralLabel: 'Component Preview Request Fixtures',
  icon: 'chart-column',
  nameField: 'request_code',
  sharingModel: 'public_read',
  fields: {
    request_code: Field.text({ label: 'Fixture request code', ...required, unique: true, maxLength: 64 }),
    request_title: Field.text({ label: 'Fixture request title', ...required, maxLength: 255 }),
    supplier_name: Field.text({ label: 'Fixture supplier', ...required, maxLength: 120 }),
    request_status: Field.select(statuses, { label: 'Fixture status', ...required, defaultValue: 'new' }),
    requested_on: Field.date({ label: 'Fixture request date', ...required }),
    amount: Field.currency({ label: 'Fixture amount', precision: 18, scale: 2 }),
    cost_center: Field.text({ label: 'Fixture cost center', maxLength: 64 }),
  },
  listViews: {
    all: {
      label: 'All fixture requests',
      type: 'grid',
      columns: ['request_code', 'request_title', 'supplier_name', 'request_status', 'requested_on', 'amount', 'cost_center'],
    },
  },
  enable: { apiEnabled: true, searchable: true, trackHistory: true },
});

const ComponentPreviewPurchaseRequestSeed = defineSeed(ComponentPreviewPurchaseRequest, {
  externalId: 'request_code',
  mode: 'upsert',
  env: ['dev'],
  records: [
    { request_code: 'CPR-2601-001', request_title: 'Fixture component request 01', supplier_name: suppliers[0], request_status: 'new', requested_on: '2026-01-12', amount: 3200, cost_center: 'FX-01' },
    { request_code: 'CPR-2601-002', request_title: 'Fixture component request 02', supplier_name: suppliers[1], request_status: 'active', requested_on: '2026-01-26', amount: 6800, cost_center: 'FX-02' },
    { request_code: 'CPR-2602-003', request_title: 'Fixture component request 03', supplier_name: suppliers[2], request_status: 'ready', requested_on: '2026-02-08', amount: 4750, cost_center: 'FX-01' },
    { request_code: 'CPR-2602-004', request_title: 'Fixture component request 04', supplier_name: suppliers[0], request_status: 'complete', requested_on: '2026-02-21', amount: 9100, cost_center: 'FX-03' },
    { request_code: 'CPR-2603-005', request_title: 'Fixture component request 05', supplier_name: suppliers[3], request_status: 'new', requested_on: '2026-03-05', amount: 2600, cost_center: 'FX-02' },
    { request_code: 'CPR-2603-006', request_title: 'Fixture component request 06', supplier_name: suppliers[1], request_status: 'active', requested_on: '2026-03-19', amount: 7350, cost_center: 'FX-01' },
    { request_code: 'CPR-2604-007', request_title: 'Fixture component request 07', supplier_name: suppliers[2], request_status: 'ready', requested_on: '2026-04-03', amount: 5400, cost_center: 'FX-03' },
    { request_code: 'CPR-2604-008', request_title: 'Fixture component request 08', supplier_name: suppliers[3], request_status: 'complete', requested_on: '2026-04-23', amount: 10200, cost_center: 'FX-02' },
    { request_code: 'CPR-2605-009', request_title: 'Fixture component request 09', supplier_name: suppliers[0], request_status: 'new', requested_on: '2026-05-09', amount: 3850, cost_center: 'FX-01' },
    { request_code: 'CPR-2605-010', request_title: 'Fixture component request 10', supplier_name: suppliers[2], request_status: 'active', requested_on: '2026-05-27', amount: 8150, cost_center: 'FX-03' },
    { request_code: 'CPR-2606-011', request_title: 'Fixture component request 11', supplier_name: suppliers[1], request_status: 'ready', requested_on: '2026-06-11', amount: 6250, cost_center: 'FX-02' },
    { request_code: 'CPR-2606-012', request_title: 'Fixture component request 12', supplier_name: suppliers[3], request_status: 'complete', requested_on: '2026-06-25', amount: 11900, cost_center: 'FX-01' },
  ],
});

export const ComponentPreviewPurchaseMetrics = defineDataset({
  name: datasetName,
  label: 'Component Preview Purchase Metrics',
  description: 'Fixture-only metrics for native ObjectUI geometry review.',
  object: objectName,
  dimensions: [
    { name: 'request_status', label: 'Fixture status', field: 'request_status', type: 'string' },
    { name: 'request_month', label: 'Fixture request month', field: 'requested_on', type: 'date', dateGranularity: 'month' },
    { name: 'supplier_name', label: 'Fixture supplier', field: 'supplier_name', type: 'string' },
  ],
  measures: [
    { name: 'request_count', label: 'Fixture request count', aggregate: 'count' },
    { name: 'amount_sum', label: 'Fixture amount', field: 'amount', aggregate: 'sum', currency: 'CNY', format: '¥0,0.00' },
    { name: 'amount_average', label: 'Average fixture amount', field: 'amount', aggregate: 'avg', currency: 'CNY', format: '¥0,0.00' },
    { name: 'amount_maximum', label: 'Largest fixture amount', field: 'amount', aggregate: 'max', currency: 'CNY', format: '¥0,0.00' },
  ],
});

const ComponentPreviewStatusReport = defineReport({
  name: 'component_preview_status_report',
  label: 'Fixture Requests by Status',
  description: 'A native Dataset Report over static development fixture rows.',
  type: 'summary',
  dataset: datasetName,
  rows: ['request_status'],
  values: ['request_count', 'amount_sum'],
  order: [{ by: 'request_count', direction: 'desc' }],
  chart: { type: 'bar', title: 'Fixture requests by status', xAxis: 'request_status', yAxis: 'request_count' },
});

const ComponentPreviewDashboard = DashboardSchema.parse({
  name: dashboardName,
  label: 'Component Preview Analytics',
  description: 'Native Dataset widgets over static development fixture rows.',
  header: { showTitle: true, showDescription: true },
  columns: 24,
  gap: 4,
  dateRange: { field: 'requested_on', defaultRange: 'this_year', allowCustomRange: true },
  globalFilters: [{
    name: 'request_status',
    field: 'request_status',
    object: objectName,
    label: 'Fixture status',
    type: 'select',
    options: statuses,
    scope: 'dashboard',
  }],
  widgets: [
    {
      id: 'fixture_request_count',
      title: 'Fixture requests',
      type: 'metric',
      dataset: datasetName,
      dimensions: [],
      values: ['request_count'],
      filterBindings: { dateRange: 'requested_on', request_status: 'request_status' },
      layout: { x: 0, y: 0, w: 6, h: 2 },
    },
    {
      id: 'fixture_amount_total',
      title: 'Fixture amount',
      type: 'metric',
      dataset: datasetName,
      dimensions: [],
      values: ['amount_sum'],
      filterBindings: { dateRange: 'requested_on', request_status: 'request_status' },
      layout: { x: 6, y: 0, w: 6, h: 2 },
    },
    {
      id: 'fixture_amount_average',
      title: 'Average fixture amount',
      type: 'metric',
      dataset: datasetName,
      dimensions: [],
      values: ['amount_average'],
      filterBindings: { dateRange: 'requested_on', request_status: 'request_status' },
      layout: { x: 12, y: 0, w: 6, h: 2 },
    },
    {
      id: 'fixture_amount_maximum',
      title: 'Largest fixture amount',
      type: 'metric',
      dataset: datasetName,
      dimensions: [],
      values: ['amount_maximum'],
      filterBindings: { dateRange: 'requested_on', request_status: 'request_status' },
      layout: { x: 18, y: 0, w: 6, h: 2 },
    },
    {
      id: 'fixture_month_trend',
      title: 'Fixture amount by month',
      type: 'line',
      dataset: datasetName,
      dimensions: ['request_month'],
      values: ['amount_sum'],
      chartConfig: { type: 'line', xAxis: { field: 'request_month' }, yAxis: [{ field: 'amount_sum' }] },
      options: { dateGranularity: 'month', sortBy: 'request_month', sortOrder: 'asc' },
      filterBindings: { dateRange: 'requested_on', request_status: 'request_status' },
      layout: { x: 0, y: 2, w: 15, h: 6 },
    },
    {
      id: 'fixture_status_distribution',
      title: 'Fixture requests by status',
      type: 'donut',
      dataset: datasetName,
      dimensions: ['request_status'],
      values: ['request_count'],
      chartConfig: { type: 'donut', xAxis: { field: 'request_status' }, yAxis: [{ field: 'request_count' }] },
      filterBindings: { dateRange: 'requested_on', request_status: 'request_status' },
      layout: { x: 15, y: 2, w: 9, h: 6 },
    },
    {
      id: 'fixture_supplier_ranking',
      title: 'Fixture suppliers by amount',
      type: 'horizontal-bar',
      dataset: datasetName,
      dimensions: ['supplier_name'],
      values: ['amount_sum'],
      chartConfig: { type: 'horizontal-bar', xAxis: { field: 'supplier_name' }, yAxis: [{ field: 'amount_sum' }] },
      options: { sortBy: 'amount_sum', sortOrder: 'desc', limit: 5 },
      filterBindings: { dateRange: 'requested_on', request_status: 'request_status' },
      layout: { x: 0, y: 8, w: 15, h: 6 },
    },
    {
      id: 'fixture_empty_state',
      title: 'Fixture empty state',
      type: 'bar',
      dataset: datasetName,
      dimensions: ['request_status'],
      values: ['request_count'],
      chartConfig: { type: 'bar', xAxis: { field: 'request_status' }, yAxis: [{ field: 'request_count' }] },
      filter: { request_status: '__no_fixture_match__' },
      filterBindings: { dateRange: 'requested_on' },
      layout: { x: 15, y: 8, w: 9, h: 6 },
    },
  ],
});

const ComponentPreviewApp = defineApp({
  name: 'component_geometry_preview',
  label: 'Component Geometry Preview',
  icon: 'chart-column',
  active: true,
  isDefault: true,
  areas: [{
    id: 'component_preview',
    label: 'Component Preview',
    icon: 'chart-column',
    navigation: [
      { id: 'fixture_dashboard', type: 'dashboard', label: 'Fixture Analytics', dashboardName },
      { id: 'fixture_report', type: 'report', label: 'Fixture Status Report', reportName: 'component_preview_status_report' },
      { id: 'fixture_requests', type: 'object', label: 'Fixture Requests', objectName },
    ],
  }],
});

export default defineStack({
  manifest: {
    id: 'org.objectstack.component-preview',
    namespace: 'component_preview',
    version: '0.1.0',
    type: 'app',
    name: 'Component Geometry Preview Fixture',
    engines: { protocol: '>=17.3.0 <18' },
  },
  apps: [ComponentPreviewApp],
  objects: [ComponentPreviewPurchaseRequest],
  datasets: [ComponentPreviewPurchaseMetrics],
  reports: [ComponentPreviewStatusReport],
  dashboards: [ComponentPreviewDashboard],
  data: [ComponentPreviewPurchaseRequestSeed],
});
