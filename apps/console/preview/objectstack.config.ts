import { defineStack } from '@objectstack/spec';
import type { IMetadataService, Plugin } from '@objectstack/spec/contracts';
import componentPreviewStack, { ComponentPreviewPurchaseMetrics } from './model-fixture.config';

/**
 * Preview-only startup bridge for the ObjectStack 17.3 artifact-ingestion gap:
 * dataset metadata is present in the source Stack but is not ingested from its
 * compiled artifact. Reuse that exact Dataset definition in MetadataManager's
 * in-memory registry so the native Dashboard and Report can resolve it. This
 * does not repair the platform artifact loader or alter renderer behavior.
 */
const previewDatasetMetadataBridge = {
  name: 'org.objectstack.component-preview.dataset-metadata-bridge',
  version: '0.1.0',
  dependencies: ['com.objectstack.metadata'],
  requiresServices: ['metadata'],
  init() {
    // ObjectKernel invokes init() for every plugin; registration waits until start().
  },
  async start(context) {
    const metadata = context.getService('metadata') as IMetadataService;
    if (typeof metadata.registerInMemory !== 'function') {
      throw new Error('The preview metadata bridge requires MetadataManager.registerInMemory().');
    }

    metadata.registerInMemory(
      'dataset',
      ComponentPreviewPurchaseMetrics.name,
      ComponentPreviewPurchaseMetrics,
    );
  },
} satisfies Plugin;

export default defineStack({
  ...componentPreviewStack,
  plugins: [...(componentPreviewStack.plugins ?? []), previewDatasetMetadataBridge],
});
