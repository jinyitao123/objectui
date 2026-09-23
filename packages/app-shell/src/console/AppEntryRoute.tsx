import React, { lazy, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Empty, EmptyDescription, EmptyTitle, Spinner } from '@object-ui/components';
import type { ObjectStackAdapter } from '@object-ui/data-objectstack';
import { useObjectTranslation } from '@object-ui/i18n';
import { useExpressionContext } from '../providers/ExpressionProvider.js';
import { useMetadataItem } from '../providers/MetadataProvider.js';
import { useRecentItems } from '../context/RecentItemsProvider.js';
import { ObjectView } from '../views/ObjectView.js';

const PageView = lazy(() => import('../views/PageView.js').then(module => ({ default: module.PageView })));

export interface AppEntryRouteProps {
  dataSource: ObjectStackAdapter | null;
  objects: unknown[];
  onEdit?: (record: unknown) => void;
  externalRefreshKey: number;
}

export type AppEntryLookup = {
  item: unknown | null;
  loading: boolean;
  error: Error | null;
};

export type AppEntryResolution = 'loading' | 'error' | 'ambiguous' | 'page' | 'object' | 'missing';

export function resolveAppEntryLookup(
  page: AppEntryLookup,
  object: AppEntryLookup,
): AppEntryResolution {
  if (page.loading || object.loading) return 'loading';
  if (page.error || object.error) return 'error';
  if (page.item && object.item) return 'ambiguous';
  if (page.item) return 'page';
  if (object.item) return 'object';
  return 'missing';
}

function titleize(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, character => character.toUpperCase());
}

function appReferencesObject(app: unknown, objectName: string | undefined): boolean {
  if (!objectName || !app || typeof app !== 'object') return false;
  const definition = app as {
    navigation?: unknown;
    areas?: Array<{ navigation?: unknown }>;
  };
  const roots = [
    ...(Array.isArray(definition.navigation) ? definition.navigation : []),
    ...(Array.isArray(definition.areas)
      ? definition.areas.flatMap(area => Array.isArray(area?.navigation) ? area.navigation : [])
      : []),
  ];
  const matches = (items: unknown[]): boolean => items.some(item => {
    if (!item || typeof item !== 'object') return false;
    const node = item as { type?: unknown; objectName?: unknown; children?: unknown };
    if (node.type === 'object' && node.objectName === objectName) return true;
    return Array.isArray(node.children) && matches(node.children);
  });
  return matches(roots);
}

export function AppEntryRoute({
  dataSource,
  objects,
  onEdit,
  externalRefreshKey,
}: AppEntryRouteProps) {
  const { objectName: entryName, appName } = useParams<{ objectName: string; appName: string }>();
  const { app } = useExpressionContext();
  const { t } = useObjectTranslation();
  const { addRecentItem } = useRecentItems();
  const packageId = typeof (app as { _packageId?: unknown } | undefined)?._packageId === 'string'
    ? (app as { _packageId: string })._packageId
    : undefined;
  const page = useMetadataItem('page', packageId ? entryName : undefined, packageId);
  const packageObject = useMetadataItem('object', packageId ? entryName : undefined, packageId);
  const canResolveSharedObject = appReferencesObject(app, entryName);
  const needsSharedObject = !!packageId
    && !packageObject.loading
    && !packageObject.error
    && !packageObject.item
    && canResolveSharedObject;
  // ObjectStack applications may reference objects owned by a shared package.
  // Ask the global name directory only after the active package has no match,
  // and only for an object explicitly present in this app's navigation.
  const sharedObject = useMetadataItem('object', needsSharedObject ? entryName : undefined);
  const object = packageObject.item || !needsSharedObject
    ? packageObject
    : sharedObject;
  const resolution = packageId
    ? resolveAppEntryLookup(page, object)
    : 'error';

  const pageRecord = page.item as { label?: unknown } | null;
  const objectRecord = object.item as { name?: unknown; label?: unknown } | null;
  const resolvedType = resolution === 'page' ? 'page' : resolution === 'object' ? 'object' : null;
  const resolvedName = typeof objectRecord?.name === 'string' ? objectRecord.name : entryName ?? '';
  const resolvedLabel = resolvedType === 'page'
    ? (typeof pageRecord?.label === 'string' ? pageRecord.label : titleize(entryName ?? ''))
    : (typeof objectRecord?.label === 'string' ? objectRecord.label : resolvedName);
  const scopedObjects = objectRecord
    ? [objectRecord, ...objects.filter(candidate => (
      !candidate
      || typeof candidate !== 'object'
      || (candidate as { name?: unknown }).name !== resolvedName
    ))]
    : objects;

  useEffect(() => {
    if (!resolvedType || !entryName || !appName) return;
    addRecentItem({
      id: `${resolvedType}:${resolvedName}`,
      label: resolvedLabel,
      href: `/apps/${encodeURIComponent(appName)}/${encodeURIComponent(entryName)}`,
      type: resolvedType,
    });
  }, [addRecentItem, appName, entryName, resolvedLabel, resolvedName, resolvedType]);

  switch (resolution) {
    case 'loading':
      return (
        <div className="h-full flex items-center justify-center p-8" data-testid="app-entry-loading">
          <Spinner className="h-5 w-5 text-muted-foreground" />
        </div>
      );
    case 'error': {
      const error = page.error ?? object.error;
      const forbidden = error && (
        (error as Error & { httpStatus?: number }).httpStatus === 403
        || (error as Error & { status?: number }).status === 403
      );
      return (
        <div className="h-full flex items-center justify-center p-8" data-testid="app-entry-error">
          <Empty>
            <EmptyTitle>
              {forbidden
                ? t('empty.appEntryAccessDenied', { defaultValue: 'You do not have permission to open this entry.' })
                : t('empty.appEntryLoadError', { defaultValue: 'Unable to load this app entry.' })}
            </EmptyTitle>
            <EmptyDescription>
              {forbidden
                ? t('empty.appEntryAccessDeniedDescription', {
                  defaultValue: 'Your account is not authorized to open this entry.',
                })
                : t('empty.appEntryLoadErrorDescription', {
                  defaultValue: 'The entry could not be checked. Check your connection and try again.',
                })}
            </EmptyDescription>
          </Empty>
        </div>
      );
    }
    case 'ambiguous':
      return (
        <div className="h-full flex items-center justify-center p-8" data-testid="app-entry-ambiguous">
          <Empty>
            <EmptyTitle>{t('empty.appEntryAmbiguous', { defaultValue: 'This app entry is ambiguous.' })}</EmptyTitle>
            <EmptyDescription>
              {t('empty.appEntryAmbiguousDescription', {
                name: entryName,
                defaultValue: `This package defines both a page and an object named “${entryName}”. Rename one before publishing.`,
              })}
            </EmptyDescription>
          </Empty>
        </div>
      );
    case 'page':
      return <PageView pageNameOverride={entryName} />;
    case 'object':
      return (
        <ObjectView
          dataSource={dataSource}
          objects={scopedObjects}
          onEdit={onEdit}
          externalRefreshKey={externalRefreshKey}
        />
      );
    case 'missing':
    default:
      return (
        <div className="h-full flex items-center justify-center p-8" data-testid="app-entry-not-found">
          <Empty>
            <EmptyTitle>{t('console.notFound.title', { defaultValue: 'Page not found' })}</EmptyTitle>
            <EmptyDescription>
              {t('console.notFound.description', {
                defaultValue: 'The URL you followed does not match an entry in this app.',
              })}
            </EmptyDescription>
          </Empty>
        </div>
      );
  }
}
