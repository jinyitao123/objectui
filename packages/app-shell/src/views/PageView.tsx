/**
 * Page View Component
 *
 * Renders a custom page based on the pageName parameter. Page *authoring*
 * happens in the metadata studio (canvas + inspector), not here — runtime is
 * pure rendering. For parity with the view/report/dashboard runtime editors,
 * admins get a lightweight "Edit in studio" affordance that deep-links to the
 * page's studio editor (`/apps/:app/metadata/page/:name`) rather than
 * embedding the heavyweight page canvas in the runtime.
 */

import { useState } from 'react';
import { useParams, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { SchemaRenderer, useAdapter } from '@object-ui/react';
import { Empty, EmptyTitle, EmptyDescription, Spinner } from '@object-ui/components';
import { FileText, Pencil } from 'lucide-react';
import { useObjectTranslation } from '@object-ui/i18n';
import { useWorkspaceAdminStatus } from '@object-ui/auth';
import { MetadataPanel, useMetadataInspector } from './MetadataInspector.js';
import { useMetadataItem } from '../providers/MetadataProvider.js';
import { useExpressionContext } from '../providers/ExpressionProvider.js';
import { ConsoleActionRuntimeProvider } from '../hooks/useConsoleActionRuntime.js';
import { InterfaceListPage } from './InterfaceListPage.js';

export function PageView({ pageNameOverride }: { pageNameOverride?: string } = {}) {
  const { t } = useObjectTranslation();
  const { pageName: routePageName } = useParams<{ pageName: string }>();
  const pageName = pageNameOverride ?? routePageName;
  const [searchParams] = useSearchParams();
  const { showDebug } = useMetadataInspector();
  const navigate = useNavigate();
  const location = useLocation();
  // Editing a page mutates the shared metadata definition, so the entry point
  // is admin-only (mirrors the view/report/dashboard runtime editors).
  const { isAdmin } = useWorkspaceAdminStatus();

  // ADR-0048 Phase 2 — try the current app's package first. The package-aware
  // item endpoint avoids loading every page just to resolve this route.
  const { app: activeApp } = useExpressionContext();
  const packageId = typeof (activeApp as any)?._packageId === 'string'
    ? (activeApp as any)._packageId
    : undefined;
  const scopedPage = useMetadataItem('page', packageId ? pageName : undefined, packageId);
  // Preserve the old fallback order when the active package does not define
  // this page. A request failure is not a miss, so it never falls through to a
  // different package's page.
  const fallbackPageName = packageId && !scopedPage.loading && !scopedPage.error && !scopedPage.item
    ? pageName
    : (packageId ? undefined : pageName);
  const fallbackPage = useMetadataItem('page', fallbackPageName);
  const page = packageId ? scopedPage.item ?? fallbackPage.item : fallbackPage.item;
  const pageLoading = packageId
    ? scopedPage.loading || (!scopedPage.error && !scopedPage.item && fallbackPage.loading)
    : fallbackPage.loading;
  const pageError = scopedPage.error ?? fallbackPage.error;
  const dataSource = useAdapter();
  // Bumped after a successful page action so embedded data (lists, etc.)
  // re-fetch. Threaded into the page context AND used to remount the renderer.
  const [refreshKey, setRefreshKey] = useState(0);

  if (!page) {
    if (pageLoading) {
      return (
        <div className="h-full flex items-center justify-center p-8" data-testid="page-loading">
          <Spinner className="h-5 w-5 text-muted-foreground" />
        </div>
      );
    }
    if (pageError) {
      return (
        <div className="h-full flex items-center justify-center p-8" data-testid="page-load-error">
          <Empty>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <EmptyTitle>{t('empty.pageLoadError', { defaultValue: 'Unable to load page' })}</EmptyTitle>
            <EmptyDescription>
              {t('empty.pageLoadErrorDescription', {
                defaultValue: 'The page could not be loaded. Check your connection and try again.',
              })}
            </EmptyDescription>
          </Empty>
        </div>
      );
    }
    return (
      <div className="h-full flex items-center justify-center p-8">
        <Empty>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileText className="h-6 w-6 text-muted-foreground" />
          </div>
          <EmptyTitle>{t('empty.pageNotFound')}</EmptyTitle>
          <EmptyDescription>
            {t('empty.pageNotFoundDescription', { name: pageName })}
          </EmptyDescription>
        </Empty>
      </div>
    );
  }

  const params = Object.fromEntries(searchParams.entries());

  // Resolve the app segment from the path (`/apps/:app/:pageName`) so the deep
  // link survives whatever Router basename the host mounts under.
  const appName = location.pathname.match(/\/apps\/([^/]+)/)?.[1];
  const canEditInStudio = isAdmin && !!appName && !!pageName;
  const openInStudio = () => {
    if (!canEditInStudio) return;
    navigate(`/apps/${appName}/metadata/page/${encodeURIComponent(pageName!)}`);
  };

  return (
    // Mount the shared action runtime without reading the full objects list.
    // It loads object definitions only if a user opens parameter collection
    // that needs field-backed choices.
    <ConsoleActionRuntimeProvider
      dataSource={dataSource}
      onRefresh={() => setRefreshKey((k) => k + 1)}
    >
      <div className="flex flex-row h-full w-full overflow-hidden relative">
        <div className="flex-1 overflow-auto h-full relative">
          {canEditInStudio && (
            <button
              type="button"
              onClick={openInStudio}
              className="absolute right-3 top-3 z-30 inline-flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background/90 text-muted-foreground shadow-sm backdrop-blur hover:bg-accent hover:text-accent-foreground"
              data-testid="page-edit-in-studio-button"
              title={t('common.editInStudio', { defaultValue: 'Edit in studio' })}
              aria-label={t('common.editInStudio', { defaultValue: 'Edit in studio' })}
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          )}
          {(page as any).interfaceConfig?.source ? (
            // ADR-0047 interface mode: the page binds a source view into a
            // curated list surface — rendered directly, not via regions.
            <InterfaceListPage key={refreshKey} page={page} reserveEditAffordance={canEditInStudio} />
          ) : (
            <SchemaRenderer
              key={refreshKey}
              schema={{
                ...page,
                // `type` stays the SchemaNode discriminator ComponentRegistry
                // dispatches on. The spec's page KIND (`record|home|app|utility|
                // list`) rides `pageType`, which PageRenderer reads — without
                // this mapping every page fell back to `pageType: 'record'`,
                // so non-record pages got the record max-width, a wrong
                // `data-page-type` and a suppressed header (framework#1878 §3
                // naming-drift recheck).
                //
                // ⭐ This is the WRITING end of the page-kind to node-type
                // channel, and a comment here was not enough: two cards audited
                // the READING end and concluded the registrations it feeds were
                // undeclared (objectui#9263, re-ruled letter E "⛔ not a
                // defect", and objectui#9576). The channel is now declared at
                // both reading ends — `@object-ui/types`' `SchemaRegistry` map
                // at its `'page'` entry, and the `PageRenderer` registrations in
                // `@object-ui/components`. Each END is pinned by a DIFFERENT
                // file, because no one package can import both.
                //
                // ⛔ Change this mapping and `page-kind-writing-end-9718`, in
                // this package's `views/__tests__`, goes red by design and names
                // the kind that stopped being written (objectui#9718): it is the
                // declaration, not an incidental assertion.
                //
                // ⚠️ The reading end's pin — `page-kind-node-type-channel-9642`
                // (objectui#9642) — does NOT answer for this line. It lives in
                // `@object-ui/components`, which does not depend on this
                // package, so its module graph cannot reach this file: gutting
                // this mapping leaves it green, and deleting a registration
                // turns it red. Both directions were measured on objectui#9718.
                type: (page as any).type || 'page',
                pageType: (page as any).type,
                context: { ...(page as any).context, params, refreshKey },
              }}
            />
          )}
        </div>
        <MetadataPanel
          open={showDebug}
          sections={[{ title: 'Page Configuration', data: page }]}
        />
      </div>
    </ConsoleActionRuntimeProvider>
  );
}
