import type { MasterDetailFormSchema } from '@object-ui/plugin-form';
import { SchemaRenderer } from '@object-ui/react';
import { Card, CardHeader, CardTitle, CardContent } from '@object-ui/components';
import { PREVIEW_REQUEST_LINE_OBJECT } from './fixture-data';

const MASTER_DETAIL_DRAFT_FIXTURE = {
  type: 'object-master-detail-form',
  objectName: 'preview_purchase_request',
  mode: 'create',
  title: 'Purchase request draft',
  showSubmit: false,
  fields: ['code', 'title', 'supplier', 'requested_on', 'need_by'],
  initialValues: {
    code: 'REQ-DRAFT-2026-014',
    title: 'Calibration equipment',
    supplier: 'contoso',
    requested_on: '2026-09-30',
    need_by: '2026-10-18',
  },
  details: [
    {
      childObject: PREVIEW_REQUEST_LINE_OBJECT,
      title: 'Request lines',
      minRows: 1,
      maxRows: 12,
      totalField: 'amount',
      addLabel: 'Add line',
    },
  ],
} satisfies MasterDetailFormSchema;

/**
 * Preview the native parent form + controlled child LineItemsField composition.
 * It deliberately hides Save because the preview adapter has no atomic
 * parent/child transaction endpoint.
 */
export function MasterDetailFixture() {
  return (
    <Card data-testid="master-detail-fixture">
      <CardHeader><CardTitle>Purchase request draft</CardTitle></CardHeader>
      <CardContent className="space-y-3">
      <p className="text-xs text-muted-foreground" role="note">
        Parent and line edits stay in draft state. Atomic parent-and-child persistence is not wired to this preview data source.
      </p>
      <SchemaRenderer schema={MASTER_DETAIL_DRAFT_FIXTURE} />
      </CardContent>
    </Card>
  );
}
